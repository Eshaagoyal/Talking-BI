import os
import re
import json
import time
import psycopg2
import psycopg2.extras
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


# ─── Gemini caller with retry on quota errors ────────────────────────────────
def call_gemini(prompt: str) -> str:
    for attempt in range(3):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep(20)
                continue
            raise e
    return ""


# ─── Database connection ─────────────────────────────────────────────────────
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


# ─── Phase 1: Autonomous schema exploration (SQLAgent arXiv 2602.01952) ──────
def explore_database() -> dict:
    """
    Autonomously explore any database — reads tables, columns, types,
    sample values, null counts, cardinality, and numeric stats.
    Works with ANY dataset uploaded to Supabase — no hardcoding.
    """
    conn = get_connection()
    cur = conn.cursor()

    # Discover all public tables
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
        # Get column metadata
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position;
        """, (table,))
        cols_meta = cur.fetchall()

        # Row count
        cur.execute(f'SELECT COUNT(*) FROM "{table}";')
        row_count = cur.fetchone()[0]

        columns = []
        for col_name, col_type, nullable in cols_meta:
            col_info = {
                "name": col_name,
                "type": col_type,
                "nullable": nullable == "YES",
                "samples": [],
                "null_count": 0,
                "unique_count": 0,
                "stats": {}
            }

            # Null count
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{table}" WHERE "{col_name}" IS NULL;')
                col_info["null_count"] = cur.fetchone()[0]
            except Exception:
                pass

            # Skip mostly-null columns
            null_pct = col_info["null_count"] / row_count if row_count > 0 else 0
            col_info["null_pct"] = round(null_pct * 100, 1)

            # Sample values (only if not mostly null)
            if null_pct < 0.8:
                try:
                    cur.execute(f"""
                        SELECT DISTINCT "{col_name}"
                        FROM "{table}"
                        WHERE "{col_name}" IS NOT NULL
                        LIMIT 6;
                    """)
                    col_info["samples"] = [str(r[0]) for r in cur.fetchall()]
                except Exception:
                    pass

                # Cardinality
                try:
                    cur.execute(f'SELECT COUNT(DISTINCT "{col_name}") FROM "{table}";')
                    col_info["unique_count"] = cur.fetchone()[0]
                except Exception:
                    pass

            # Numeric stats
            if col_type in (
                "numeric", "integer", "bigint", "smallint",
                "double precision", "real", "decimal", "float"
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
                            "sum": float(s[3])
                        }
                except Exception:
                    pass

            columns.append(col_info)

        exploration[table] = {
            "row_count": row_count,
            "columns": columns
        }

    cur.close()
    conn.close()
    return exploration


def build_schema_context(exploration: dict) -> str:
    """
    Convert explored database info into a rich prompt context.
    Dynamically detects: date formats, high-null columns,
    numeric metrics, categorical dimensions, cardinality.
    """
    lines = []
    lines.append("=== DATABASE SCHEMA (auto-explored) ===\n")

    for table_name, table_info in exploration.items():
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

            # Build column line
            parts = [f'  "{name}" ({dtype})']

            # Null warning
            if null_pct > 50:
                parts.append(f"⚠ {null_pct}% NULL — avoid unless needed")
                lines.append(" | ".join(parts) + "\n")
                continue

            # Numeric stats
            if stats:
                parts.append(
                    f"min={stats['min']:,} max={stats['max']:,} "
                    f"avg={stats['avg']:,} sum={stats['sum']:,}"
                )

            # Sample values
            if samples:
                sample_str = " / ".join(samples[:4])
                parts.append(f"e.g. {sample_str}")

            # Detect date format from samples
            if samples:
                s0 = samples[0]
                if re.match(r'^\d{2}-\d{2}-\d{4}$', s0):
                    parts.append("DATE FORMAT DD-MM-YYYY → use TO_DATE(col,'DD-MM-YYYY')")
                elif re.match(r'^\d{4}-\d{2}-\d{2}', s0):
                    parts.append("DATE FORMAT YYYY-MM-DD → use TO_DATE(col,'YYYY-MM-DD')")
                elif re.match(r'^\d{2}/\d{2}/\d{4}$', s0):
                    parts.append("DATE FORMAT MM/DD/YYYY → use TO_DATE(col,'MM/DD/YYYY')")

            # Cardinality hint
            if unique > 0 and dtype not in ("numeric", "integer", "bigint", "double precision"):
                if unique <= 20:
                    parts.append(f"low cardinality ({unique} values) — GOOD for GROUP BY")
                elif unique <= 200:
                    parts.append(f"medium cardinality ({unique} values) — OK for GROUP BY")
                else:
                    parts.append(f"high cardinality ({unique} values) — AVOID GROUP BY")

            lines.append(" | ".join(parts) + "\n")

        lines.append("\n")

    lines.append("""=== SQL RULES (follow ALL) ===
1. Always double-quote column names: "Sales", "Order Date", "Sub-Category"
2. Use detected date format when filtering or extracting dates
3. GROUP BY all non-aggregated SELECT columns
4. ORDER BY main metric DESC
5. LIMIT 200 always
6. Round money: ROUND(SUM("col")::numeric, 2)
7. Avoid high-null and high-cardinality columns for grouping
8. Never use columns marked with ⚠ NULL warning for aggregation
""")

    return "".join(lines)


def extract_sql_from_response(raw: str) -> str:
    """
    Extract clean SQL from Gemini output.
    Handles thinking models that write reasoning before the SQL.
    Takes the LAST SELECT...LIMIT block as the final answer.
    """
    # Strip markdown fences
    raw = re.sub(r"```sql\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"```\s*", "", raw).strip()

    # Find all SELECT...LIMIT blocks — last one is the final clean answer
    matches = re.findall(
        r"(SELECT\b.+?LIMIT\s+\d+)",
        raw,
        re.DOTALL | re.IGNORECASE
    )
    if matches:
        return matches[-1].strip().rstrip(";")

    # Fallback: grab everything from first SELECT onwards
    lines = raw.split("\n")
    result, collecting = [], False
    for line in lines:
        if line.strip().upper().startswith("SELECT"):
            collecting = True
        if collecting:
            result.append(line)
    sql = "\n".join(result).strip().rstrip(";")
    return sql if sql else raw.strip().rstrip(";")


# ─── Phase 2: SQL generation ─────────────────────────────────────────────────
def generate_sql(user_query: str, kpis: list, schema_context: str) -> str:
    kpi_text = ", ".join(kpis) if kpis else "main revenue and profit metrics"

    prompt = f"""You are a senior PostgreSQL data analyst working with a sales database.

{schema_context}

USER REQUEST: "{user_query}"
KPIs TO FOCUS ON: {kpi_text}

Write ONE optimal PostgreSQL SELECT query that fully answers this request.
Follow ALL SQL rules listed above.

Think about:
- Which table has the relevant data?
- Which columns are the right dimensions (GROUP BY)?
- Which columns are the right metrics (aggregate)?
- Does this need date parsing?
- What is the best ORDER BY?

OUTPUT: Return ONLY the raw SQL query.
No explanation. No markdown. No backticks. No semicolon at end. Start with SELECT.

SQL:"""

    raw = call_gemini(prompt)
    return extract_sql_from_response(raw)


def run_sql(sql: str) -> list:
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute(sql)
        rows = cur.fetchall()
    except Exception as e:
        cur.close()
        conn.close()
        raise Exception(f"SQL failed: {str(e)}\n\nSQL attempted:\n{sql}")
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


def get_schema():
    """Returns schema in simple format for /schema endpoint."""
    exploration = explore_database()
    result = {}
    for table, info in exploration.items():
        result[table] = [
            {"column": c["name"], "type": c["type"]}
            for c in info["columns"]
        ]
    return result


def run_sql_agent(user_query: str, kpis: list) -> dict:
    """
    Full SQLAgent pipeline implementing arXiv 2602.01952:
    Phase 1: Explore database autonomously
    Phase 2: Generate SQL using explored context
    Phase 3: Execute and return results
    """
    # Phase 1 — explore
    exploration = explore_database()
    schema_context = build_schema_context(exploration)

    # Phase 2 — generate SQL
    sql = generate_sql(user_query, kpis, schema_context)

    # Phase 3 — execute
    data = run_sql(sql)

    return {
        "schema_context": schema_context,
        "sql": sql,
        "data": data,
        "row_count": len(data)
    }


def extract_kpis_from_query(query: str) -> list:
    """
    Auto-detect KPIs from natural language query.
    Returns list of KPI strings. Falls back to ["sales", "profit"].
    """
    prompt = f"""Extract the business KPI metric names from this query.
Query: "{query}"

Rules:
- Only extract measurable numeric metrics, not dimensions/categories
- Use lowercase
- Common examples: sales, revenue, profit, quantity, discount, margin, cost, units

Return ONLY a valid JSON array like: ["sales", "profit"]
No explanation. No markdown. Just the array."""

    try:
        raw = call_gemini(prompt)
        raw = re.sub(r"```json\s*|```\s*", "", raw).strip()
        # Find JSON array in response
        match = re.search(r'\[.*?\]', raw, re.DOTALL)
        if match:
            kpis = json.loads(match.group())
            return [k.lower() for k in kpis if isinstance(k, str)] or ["sales", "profit"]
    except Exception:
        pass
    return ["sales", "profit"]