import os
import re
import time
import psycopg2
import psycopg2.extras
from openai import OpenAI
from dotenv import load_dotenv
from typing import Any, Dict, List, Optional, Tuple

load_dotenv()
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

# Tables to ignore when picking default / listing (system noise)
IGNORED_TABLE_PREFIXES = ("pg_",)
IGNORED_TABLE_NAMES = frozenset({"spatial_ref_sys"})


def call_gemini(prompt: str) -> str:
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep(20)
                continue
            raise e
    return ""


def get_connection():
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        raise ValueError("SUPABASE_DB_URL not set in .env")
    return psycopg2.connect(url)


def test_connection():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        LIMIT 1;
    """)
    table = cur.fetchone()
    cur.execute(f'SELECT COUNT(*) FROM "{table[0]}";') if table else None
    count = cur.fetchone()[0] if table else 0
    cur.close()
    conn.close()
    return {"status": "connected", "table": table[0] if table else None, "rows": count}


def _detect_text_date_format(samples: List[str]) -> Optional[Tuple[str, str]]:
    """
    If values look like dates stored as text, return (PostgreSQL TO_DATE format string, example).
    """
    if not samples:
        return None
    checks = [
        (re.compile(r"^\d{2}-\d{2}-\d{4}$"), "DD-MM-YYYY"),
        (re.compile(r"^\d{4}-\d{2}-\d{2}(?:[ T].*)?$"), "YYYY-MM-DD"),
        (re.compile(r"^\d{2}/\d{2}/\d{4}$"), "MM/DD/YYYY"),
        (re.compile(r"^\d{4}-\d{2}$"), "YYYY-MM"),
    ]
    for raw in samples[:8]:
        s = str(raw).strip()
        head = s[:10] if len(s) >= 10 else s
        for rx, fmt in checks:
            if fmt == "YYYY-MM":
                if rx.match(s):
                    return (fmt, s)
            elif rx.match(head) or rx.match(s):
                return (fmt, s)
    return None


def explore_database() -> dict:
    """
    SQLAgent-style exploration (arXiv 2602.01952): schema, samples, stats, date semantics.
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = [row[0] for row in cur.fetchall()]

    if not tables:
        raise Exception("No tables found in public schema. Upload your dataset first.")

    exploration = {}

    for table in tables:
        if table in IGNORED_TABLE_NAMES:
            continue
        if any(table.startswith(p) for p in IGNORED_TABLE_PREFIXES):
            continue

        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table,))
        cols_meta = cur.fetchall()

        cur.execute(f'SELECT COUNT(*) FROM "{table}";')
        row_count = cur.fetchone()[0]

        columns = []
        for col_name, col_type, nullable in cols_meta:
            col_info: Dict[str, Any] = {
                "name": col_name,
                "type": col_type,
                "nullable": nullable == "YES",
                "samples": [],
                "null_count": 0,
                "unique_count": 0,
                "stats": {},
                "text_date_format": None,
                "date_expr": None,
            }

            try:
                cur.execute(f'SELECT COUNT(*) FROM "{table}" WHERE "{col_name}" IS NULL;')
                col_info["null_count"] = cur.fetchone()[0]
            except Exception:
                pass

            null_pct = col_info["null_count"] / row_count if row_count > 0 else 0
            col_info["null_pct"] = round(null_pct * 100, 1)

            if null_pct < 0.8:
                try:
                    cur.execute(f"""
                        SELECT DISTINCT "{col_name}"
                        FROM "{table}"
                        WHERE "{col_name}" IS NOT NULL
                        LIMIT 8;
                    """)
                    col_info["samples"] = [str(r[0]) for r in cur.fetchall()]
                except Exception:
                    pass

                try:
                    cur.execute(f'SELECT COUNT(DISTINCT "{col_name}") FROM "{table}";')
                    col_info["unique_count"] = cur.fetchone()[0]
                except Exception:
                    pass

            if col_type in (
                "numeric", "integer", "bigint", "smallint",
                "double precision", "real", "decimal", "float",
            ):
                try:
                    cur.execute(f"""
                        SELECT
                            ROUND(MIN("{col_name}")::numeric, 2),
                            ROUND(MAX("{col_name}")::numeric, 2),
                            ROUND(AVG("{col_name}")::numeric, 2),
                            ROUND(SUM("{col_name}")::numeric, 2)
                        FROM "{table}"
                        WHERE "{col_name}" IS NOT NULL;
                    """)
                    s = cur.fetchone()
                    if s and s[0] is not None:
                        col_info["stats"] = {
                            "min": float(s[0]),
                            "max": float(s[1]),
                            "avg": float(s[2]),
                            "sum": float(s[3]),
                        }
                except Exception:
                    pass

            if col_type in ("text", "character varying", "varchar", "character") and col_info["samples"]:
                hint = _detect_text_date_format(col_info["samples"])
                if hint:
                    fmt, _ex = hint
                    col_info["text_date_format"] = fmt
                    col_info["date_expr"] = f"TO_DATE(\"{col_name}\", '{fmt}')"

            columns.append(col_info)

        exploration[table] = {"row_count": row_count, "columns": columns}

    cur.close()
    conn.close()
    return exploration


def _eligible_table_names(exploration: dict) -> List[str]:
    return [
        t
        for t in exploration
        if t not in IGNORED_TABLE_NAMES and not any(t.startswith(p) for p in IGNORED_TABLE_PREFIXES)
    ]


def _default_primary_table(exploration: dict) -> str:
    """When dataset_key is empty or 'primary', pick a sensible default table."""
    elig = _eligible_table_names(exploration)
    if not elig:
        raise ValueError("No usable tables found in the public schema. Upload a dataset or create a table in Supabase.")
    for prefer in ("global_superstore", "sales"):
        if prefer in elig:
            return prefer
    return max(elig, key=lambda t: exploration[t]["row_count"])


def resolve_focus_tables(exploration: dict, dataset_key: str) -> Tuple[List[str], str]:
    """
    NL→SQL targets exactly one table: the selected dataset (Postgres table name).
    dataset_key 'primary' or empty → default (global_superstore, then sales, then largest table).
    """
    raw = (dataset_key or "").strip()
    if not raw or raw == "primary":
        key = _default_primary_table(exploration)
    else:
        key = raw

    if key not in exploration:
        raise ValueError(
            f'Unknown dataset "{key}". Use GET /datasets for tables available in your database.'
        )
    elig = _eligible_table_names(exploration)
    if key not in elig:
        raise ValueError(f'Table "{key}" cannot be used as a dataset (filtered).')
    return ([key], "")


def list_datasets() -> List[Dict[str, Any]]:
    """
    Lightweight list of public tables (name + row count) for the dataset picker.
    Same eligibility rules as resolve_focus_tables.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """
    )
    names = [row[0] for row in cur.fetchall()]
    out: List[Dict[str, Any]] = []
    for name in names:
        if name in IGNORED_TABLE_NAMES:
            continue
        if any(name.startswith(p) for p in IGNORED_TABLE_PREFIXES):
            continue
        cur.execute(f'SELECT COUNT(*) FROM "{name}";')
        cnt = int(cur.fetchone()[0])
        out.append({"name": name, "row_count": cnt})
    cur.close()
    conn.close()
    return out


def build_date_casting_block(exploration: dict, focus_tables: List[str]) -> str:
    lines = ["=== DATE CASTING (mandatory for TEXT/VARCHAR date columns) ===\n"]
    found = False
    for t in focus_tables:
        if t not in exploration:
            continue
        for col in exploration[t]["columns"]:
            if col.get("date_expr") and col.get("text_date_format"):
                found = True
                lines.append(
                    f'- Table "{t}" column "{col["name"]}" is stored as {col["type"]} but values match '
                    f"{col['text_date_format']}. For filters, sorting, or date_trunc use: {col['date_expr']}\n"
                    f'  Example month bucket: date_trunc(\'month\', {col["date_expr"]})\n'
                )
    if not found:
        lines.append("(No text-as-date columns detected in focus tables.)\n")
    return "".join(lines)


def build_schema_context(exploration: dict, focus_tables: List[str], preamble_note: str = "") -> str:
    lines = []
    lines.append("=== DATABASE SCHEMA (auto-explored, SQLAgent / explore-then-generate) ===\n")
    if preamble_note:
        lines.append(preamble_note)
    lines.append(f"=== FOCUS TABLES (you MUST query only these unless joining within them) ===\n")
    lines.append(", ".join(f'"{t}"' for t in focus_tables) + "\n\n")
    lines.append(build_date_casting_block(exploration, focus_tables))

    for table_name in focus_tables:
        if table_name not in exploration:
            continue
        table_info = exploration[table_name]
        row_count = table_info["row_count"]
        lines.append(f'TABLE: "{table_name}" — {row_count:,} rows\n')
        lines.append("COLUMNS:\n")

        for col in table_info["columns"]:
            name = col["name"]
            dtype = col["type"]
            samples = col["samples"]
            stats = col["stats"]
            null_pct = col["null_pct"]
            unique = col["unique_count"]

            parts = [f'  "{name}" ({dtype})']

            if null_pct > 50:
                parts.append(f"⚠ {null_pct}% NULL — avoid unless needed")
                lines.append(" | ".join(parts) + "\n")
                continue

            if stats:
                parts.append(
                    f"min={stats['min']:,} max={stats['max']:,} "
                    f"avg={stats['avg']:,} sum={stats['sum']:,}"
                )

            if samples:
                sample_str = " / ".join(samples[:4])
                parts.append(f"e.g. {sample_str}")

            if col.get("text_date_format"):
                parts.append(
                    f"TEXT-DATE as {col['text_date_format']} → use {col['date_expr']} for date logic"
                )

            if unique > 0 and dtype not in (
                "numeric", "integer", "bigint", "double precision", "real", "decimal", "float",
            ):
                if unique <= 20:
                    parts.append(f"low cardinality ({unique}) — GOOD for GROUP BY")
                elif unique <= 200:
                    parts.append(f"medium cardinality ({unique}) — OK for GROUP BY")
                else:
                    parts.append(f"high cardinality ({unique}) — avoid GROUP BY on raw column; prefer buckets/top-N")

            lines.append(" | ".join(parts) + "\n")

        lines.append("\n")

    lines.append("""=== SQL RULES (PostgreSQL / Supabase) ===
1. Use ONLY tables listed under FOCUS TABLES. Double-quote all identifiers: "Sales", "Order Date".
2. For any column documented as TEXT-DATE, never compare or order it as a plain string for time intent — use TO_DATE or date_trunc on the given expression.
3. GROUP BY every non-aggregated selected column.
4. ORDER BY the main metric DESC (or relevant date ASC for trends).
5. Always end with LIMIT 200 (exactly).
6. Money/numbers: cast safely, e.g. SUM("amount"::numeric) or regexp_replace then ::numeric if values are messy strings.
7. Do not SELECT * — select only needed columns.
8. No semicolon at end of your answer.
""")
    return "".join(lines)


def extract_sql_from_response(raw: str) -> str:
    raw = re.sub(r"```sql\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"```\s*", "", raw).strip()

    matches = re.findall(
        r"(SELECT\b.+?LIMIT\s+\d+)",
        raw,
        re.DOTALL | re.IGNORECASE,
    )
    if matches:
        return matches[-1].strip().rstrip(";")

    lines = raw.split("\n")
    result, collecting = [], False
    for line in lines:
        if line.strip().upper().startswith("SELECT"):
            collecting = True
        if collecting:
            result.append(line)
    sql = "\n".join(result).strip().rstrip(";")
    return sql if sql else raw.strip().rstrip(";")


def generate_sql(
    user_query: str,
    kpis: list,
    schema_context: str,
    previous_error: Optional[str] = None,
    failed_sql: Optional[str] = None,
) -> str:
    kpi_text = ", ".join(kpis) if kpis else "(none — infer from USER REQUEST and schema only)"

    repair = ""
    if previous_error:
        repair = f"""
=== PREVIOUS ATTEMPT FAILED (fix and return ONLY corrected SQL) ===
PostgreSQL error:
{previous_error}

Failed SQL:
{failed_sql or "(none)"}

Fix: use only real table/column names from the schema, correct TO_DATE formats, valid GROUP BY, and LIMIT 200.
"""

    prompt = f"""You are a senior PostgreSQL analyst (SQLAgent-style: schema-grounded SQL only).

{schema_context}
{repair}

USER REQUEST: "{user_query}"
USER-SUPPLIED KPIs (map to the closest matching numeric columns by name): {kpi_text}

Instructions:
- Produce ONE SELECT query that answers the user with aggregations appropriate to the question.
- Prefer SUM/AVG/COUNT on columns whose names align with the KPI tokens above (e.g. "sales" → "Sales", "profit" → "Profit").
- If the user implies time trends, use date_trunc on the documented date expression for TEXT dates.
- Prefer a single FOCUS table; join only if the question clearly needs two relations present in schema.

OUTPUT: Return ONLY the raw SQL. No markdown, no backticks, no explanation, no trailing semicolon. Must include LIMIT 200.

SQL:"""

    raw = call_gemini(prompt)
    return extract_sql_from_response(raw)


def run_sql(sql: str) -> list:
    # 1. Prevent destructive AI queries (SQL Injection safety)
    upper_sql = sql.upper()
    forbidden = ["DROP ", "DELETE ", "UPDATE ", "INSERT ", "ALTER ", "TRUNCATE "]
    if any(fw in upper_sql for fw in forbidden):
        raise ValueError("Security violation: Destructive SQL commands are strictly prohibited.")

    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        # 2. Prevent runaway queries (15 seconds maximum execution time)
        cur.execute("SET statement_timeout = 15000;")
        cur.execute(sql)
        rows = cur.fetchall()
    except Exception as e:
        cur.close()
        conn.close()
        raise Exception(f"{str(e)}")
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


def get_schema():
    exploration = explore_database()
    result = {}
    for table, info in exploration.items():
        result[table] = [
            {"column": c["name"], "type": c["type"]}
            for c in info["columns"]
        ]
    return result


def run_sql_agent(user_query: str, kpis: list, dataset_key: str = "primary") -> dict:
    """
    Full pipeline: explore → focus table → grounded prompt → SQL → execute → one repair pass.
    """
    exploration = explore_database()
    focus, note = resolve_focus_tables(exploration, dataset_key or "primary")
    schema_context = build_schema_context(exploration, focus, preamble_note=note)

    sql = generate_sql(user_query, kpis, schema_context)
    err_detail = ""
    try:
        data = run_sql(sql)
    except Exception as e1:
        err_detail = str(e1)
        sql = generate_sql(
            user_query,
            kpis,
            schema_context,
            previous_error=err_detail,
            failed_sql=sql,
        )
        data = run_sql(sql)

    return {
        "schema_context": schema_context,
        "sql": sql,
        "data": data,
        "row_count": len(data),
        "focus_tables": focus,
        "dataset_key": focus[0] if focus else None,
    }
