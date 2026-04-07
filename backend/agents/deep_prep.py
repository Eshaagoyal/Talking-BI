import json
import os
import re
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)


def call_gemini(prompt: str) -> str:
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                messages=[
                    {"role": "system", "content": "You are a JSON-only object API. You output raw JSON objects and nothing else."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                max_tokens=2048,
                temperature=0.1
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep(20)
                continue
            raise e
    return ""


def detect_column_roles(raw_data: list) -> dict:
    """
    Dynamically detect column roles from actual returned data.
    No hardcoding — works for any sales dataset.
    """
    if not raw_data:
        return {"numeric": [], "text": [], "date": [], "all": []}

    all_cols = list(raw_data[0].keys())
    numeric, text, date = [], [], []

    for col in all_cols:
        # Collect non-null samples
        samples = [
            str(row[col]) for row in raw_data[:20]
            if row.get(col) is not None
        ]
        if not samples:
            continue

        # Try numeric first
        try:
            float(str(samples[0]).replace(",", "").replace("$", ""))
            numeric.append(col)
            continue
        except (ValueError, TypeError):
            pass

        # Try date detection
        s = samples[0]
        if (re.match(r'^\d{2}-\d{2}-\d{4}', s) or
                re.match(r'^\d{4}-\d{2}-\d{2}', s) or
                re.match(r'^\d{4}-\d{2}$', s) or
                re.match(r'^\d{2}/\d{2}/\d{4}', s)):
            date.append(col)
            continue

        # Everything else is text/categorical
        text.append(col)

    return {"numeric": numeric, "text": text, "date": date, "all": all_cols}


def pick_best_columns(roles: dict, kpis: list) -> dict:
    """
    Intelligently pick the best x/y columns for each dashboard type.
    Prioritises KPI-matching columns, date columns for trends,
    low-cardinality text for grouping.
    """
    numeric = roles["numeric"]
    text = roles["text"]
    date = roles["date"]
    kpi_lower = [k.lower() for k in kpis]

    # Primary metric — try to match KPI names first
    primary_metric = None
    for col in numeric:
        if any(k in col.lower() for k in kpi_lower):
            primary_metric = col
            break
    if not primary_metric:
        # Fallback: prefer columns named like revenue/sales/profit/amount
        for col in numeric:
            if any(k in col.lower() for k in ["sale", "revenue", "amount", "profit", "income"]):
                primary_metric = col
                break
    if not primary_metric and numeric:
        primary_metric = numeric[0]

    # Secondary metric
    secondary_metric = None
    for col in numeric:
        if col != primary_metric:
            if any(k in col.lower() for k in ["profit", "margin", "cost", "quantity", "qty"]):
                secondary_metric = col
                break
    if not secondary_metric:
        secondary_metric = next((c for c in numeric if c != primary_metric), primary_metric)

    # Best category column (low cardinality preferred)
    cat_col = None
    for col in text:
        if any(k in col.lower() for k in ["category", "segment", "type", "group", "class", "dept"]):
            cat_col = col
            break
    if not cat_col and text:
        cat_col = text[0]

    # Second category (region/market/territory)
    cat_col2 = None
    for col in text:
        if col != cat_col and any(k in col.lower() for k in ["region", "market", "territory", "country", "area", "zone"]):
            cat_col2 = col
            break
    if not cat_col2:
        cat_col2 = next((c for c in text if c != cat_col), cat_col)

    # Time column (for trend dashboard)
    time_col = date[0] if date else None
    if not time_col:
        # Try to find a text column that looks like time
        for col in text:
            if any(k in col.lower() for k in ["date", "month", "year", "period", "time", "week"]):
                time_col = col
                break
    if not time_col:
        time_col = cat_col  # fallback

    return {
        "primary_metric": primary_metric,
        "secondary_metric": secondary_metric,
        "cat_col": cat_col,
        "cat_col2": cat_col2,
        "time_col": time_col
    }


def _looks_time_like(name: str) -> bool:
    n = (name or "").lower()
    return any(t in n for t in ("date", "month", "year", "period", "time", "week", "quarter"))


def _finalize_dashboard_plan(
    plan: dict,
    prefs: list,
    roles: dict,
    actual_columns: list,
    best: dict,
) -> dict:
    """
    Deterministic post-processing:
    - Enforce user chart preferences (hard, not just prompt hint)
    - Keep axes valid against actual columns
    - Use COUNT fallback when numeric measures are unavailable
    """
    dq = plan.setdefault("data_quality", {})
    issues = dq.setdefault("issues_found", [])
    dplan = plan.setdefault("dashboard_plan", {})
    keys = sorted(
        dplan.keys(),
        key=lambda k: int(re.search(r"(\d+)$", k).group(1)) if re.search(r"(\d+)$", k) else 999,
    )

    preferred_applied = []
    seen_signatures = set()
    for idx, key in enumerate(keys):
        dash = dplan.get(key, {})
        x_axis = dash.get("x_axis")
        y_axis = dash.get("y_axis")
        aggregation = str(dash.get("aggregation", "SUM")).upper()

        # Always keep valid axes
        if x_axis not in actual_columns:
            x_axis = best["cat_col"] or (roles["text"][0] if roles["text"] else actual_columns[0])
            dash["x_axis"] = x_axis
            issues.append(f"{key}: x_axis normalized to '{x_axis}'.")

        if roles["numeric"]:
            if y_axis not in roles["numeric"]:
                y_axis = best["primary_metric"] or roles["numeric"][0]
                dash["y_axis"] = y_axis
                issues.append(f"{key}: y_axis normalized to numeric column '{y_axis}'.")
            if aggregation not in {"SUM", "AVG", "COUNT"}:
                dash["aggregation"] = "SUM"
                issues.append(f"{key}: aggregation normalized to SUM.")
        else:
            # No numeric data: force robust categorical count charting
            dash["y_axis"] = x_axis
            dash["aggregation"] = "COUNT"
            issues.append(f"{key}: no numeric columns found; using COUNT by '{x_axis}'.")

        # Hard enforce chart preference if provided
        if prefs:
            desired = prefs[idx % len(prefs)]
            dash["chart_type"] = desired
            preferred_applied.append(desired)
        else:
            desired = str(dash.get("chart_type", "bar")).lower().strip() or "bar"
            dash["chart_type"] = desired if desired in {"bar", "line", "pie", "area"} else "bar"

        # Compatibility tuning
        if dash["chart_type"] == "pie" and x_axis in roles["numeric"] and roles["text"]:
            dash["x_axis"] = roles["text"][0]
            issues.append(f"{key}: pie chart switched to text x_axis '{dash['x_axis']}' for category slices.")

        if dash["chart_type"] in {"line", "area"} and not _looks_time_like(dash.get("x_axis", "")):
            if roles["date"]:
                dash["x_axis"] = roles["date"][0]
                issues.append(f"{key}: {dash['chart_type']} chart x_axis shifted to date column '{dash['x_axis']}'.")

        # Reduce duplicate panels: avoid same (type, x, y, aggregation) across dashboards.
        sig = (
            dash.get("chart_type"),
            dash.get("x_axis"),
            dash.get("y_axis"),
            str(dash.get("aggregation", "SUM")).upper(),
        )
        if sig in seen_signatures:
            candidate_x = [best.get("cat_col2"), best.get("time_col"), best.get("cat_col")]
            candidate_y = [best.get("secondary_metric"), best.get("primary_metric")]
            candidate_agg = ["AVG", "SUM", "COUNT"]
            changed = False
            for cx in candidate_x:
                if not cx or cx not in actual_columns:
                    continue
                for cy in candidate_y:
                    if roles["numeric"]:
                        if not cy or cy not in roles["numeric"]:
                            continue
                    else:
                        cy = cx
                    for ca in candidate_agg:
                        new_sig = (dash.get("chart_type"), cx, cy, ca)
                        if new_sig in seen_signatures:
                            continue
                        # For line/area, prefer time-like x-axis when available
                        if dash.get("chart_type") in {"line", "area"} and roles["date"] and cx not in roles["date"]:
                            continue
                        dash["x_axis"] = cx
                        dash["y_axis"] = cy
                        dash["aggregation"] = ca
                        seen_signatures.add(new_sig)
                        issues.append(
                            f"{key}: adjusted axes/aggregation to avoid duplicate panel ({dash['chart_type']} {cx}/{cy} {ca})."
                        )
                        changed = True
                        break
                    if changed:
                        break
                if changed:
                    break
            if not changed:
                # Keep current if no better alternative found.
                seen_signatures.add(sig)
        else:
            seen_signatures.add(sig)

        dplan[key] = dash

    if prefs:
        dq["requested_chart_types"] = prefs
        dq["applied_chart_types"] = preferred_applied
    return plan


def clean_and_structure(
    raw_data: list,
    user_query: str,
    kpis: list,
    num_dashboards: int = 4,
    preferred_chart_types: list = None,
) -> dict:
    """
    DeepPrep agent — implements arXiv 2602.07371.
    Execution-grounded: reads actual returned data to plan dashboards.
    Dynamic: works for any sales dataset — no hardcoding.
    Respects num_dashboards (2, 3, or 4).
    """
    if not raw_data:
        return {
            "data_quality": {
                "total_rows": 0,
                "columns_available": [],
                "issues_found": ["No data returned from SQL query"]
            },
            "dashboard_plan": {}
        }

    actual_columns = list(raw_data[0].keys())
    sample = raw_data[:8]
    roles = detect_column_roles(raw_data)
    best = pick_best_columns(roles, kpis)
    kpi_text = ", ".join(kpis)
    allowed_ct = {"bar", "line", "pie", "area"}
    prefs = [c.lower().strip() for c in (preferred_chart_types or []) if c and c.lower().strip() in allowed_ct]
    pref_line = (
        f"USER PREFERRED CHART TYPES (use these types across panels in order, cycling when needed; still obey column semantics): {json.dumps(prefs)}"
        if prefs
        else "USER CHART PREFERENCE: none — choose the best mix of bar, line, pie, and area for the data."
    )

    is_auto = (num_dashboards == 0)

    # Build dashboard templates based on count
    dashboard_templates = {
        "dashboard_1": {
            "role": "KPI Overview — bar chart comparing main metric across top category",
            "chart_type": "bar",
            "suggested_x": best["cat_col"],
            "suggested_y": best["primary_metric"]
        },
        "dashboard_2": {
            "role": "Trend Analysis — line/area chart showing metric over time or progression",
            "chart_type": "line",
            "suggested_x": best["time_col"],
            "suggested_y": best["primary_metric"]
        },
        "dashboard_3": {
            "role": "Segment Breakdown — pie chart showing proportional distribution of sales",
            "chart_type": "pie",
            "suggested_x": best["cat_col"],
            "suggested_y": best["primary_metric"]
        },
        "dashboard_4": {
            "role": "Regional/Comparative View — bar chart comparing secondary dimension",
            "chart_type": "bar",
            "suggested_x": best["cat_col2"],
            "suggested_y": best["secondary_metric"]
        }
    }

    if is_auto:
        active_templates = dashboard_templates
        auto_rule = "AUTO-LAYOUT MODE: You must autonomously decide the number of charts to generate (up to 4). CRITICAL RULE: DO NOT create redundant charts. You must generate exactly ONE chart per unique combination of (Metric + Category). If the SQL only returned 1 category column and 2 metric columns, you MUST return exactly 2 charts. Generating 3 or 4 charts in that scenario is illegal and redundant."
        output_keys_example = '"dashboard_1": {...},\n    "dashboard_N": {...} // Generate 1 to 4 dashboard keys depending on the unique combinations.'
    else:
        num_dashboards = max(2, min(4, num_dashboards))
        active_templates = {
            k: v for k, v in dashboard_templates.items()
            if int(k.split("_")[1]) <= num_dashboards
        }
        auto_rule = f"STRICT COUNT MODE: You MUST generate exactly {num_dashboards} dashboards to fulfill the layout requirement."
        output_keys_example = chr(10).join([
            f'"dashboard_{i+1}": {{"title": "...", "description": "...", "chart_type": "...", "x_axis": "...", "y_axis": "...", "aggregation": "..."}}' + ("," if i < num_dashboards - 1 else "")
            for i in range(num_dashboards)
        ])

    prompt = f"""You are DeepPrep — a BI dashboard planning agent (arXiv 2602.07371).
You are execution-grounded: the SQL already ran; you only assign axes from columns that EXIST in the result rows.
If a column is text but holds dates (see sample patterns), you may still use it on x_axis for line/bar (categories are date strings).

USER REQUEST: "{user_query}"
KPIs REQUESTED: {kpi_text}
{pref_line}
TOTAL ROWS RETURNED: {len(raw_data)}

ACTUAL COLUMNS IN THE DATA:
- All columns: {json.dumps(actual_columns)}
- Numeric columns (valid for y_axis): {json.dumps(roles["numeric"])}
- Text/category columns (valid for x_axis): {json.dumps(roles["text"])}
- Date/time columns (best for trends): {json.dumps(roles["date"])}

SAMPLE DATA (first 5 rows):
{json.dumps(sample[:5], indent=2, default=str)}

SUGGESTED COLUMNS (from analysis):
- Primary metric: {best["primary_metric"]}
- Secondary metric: {best["secondary_metric"]}
- Main category: {best["cat_col"]}
- Region/second category: {best["cat_col2"]}
- Time column: {best["time_col"]}

DASHBOARD ROLES TO FILL (Use these as inspiration):
{json.dumps(active_templates, indent=2)}

STRICT RULES:
1. {auto_rule}
2. x_axis MUST be an exact column name from the actual columns list
3. y_axis MUST be an exact column name from the numeric columns list
4. chart_type must be: bar / line / pie / area
5. Use "pie" only for proportional breakdowns (max 8 categories)
6. Use "line" or "area" for time-based trends
7. Use "bar" for comparisons
8. aggregation must be: SUM / AVG / COUNT
9. Titles must be descriptive and specific to the data
10. No markdown in any text field

Return ONLY valid JSON — no markdown, no backticks, no explanation:
{{
  "data_quality": {{
    "total_rows": {len(raw_data)},
    "columns_available": {json.dumps(actual_columns)},
    "numeric_columns": {json.dumps(roles["numeric"])},
    "text_columns": {json.dumps(roles["text"])},
    "date_columns": {json.dumps(roles["date"])},
    "issues_found": []
  }},
  "dashboard_plan": {{
    {output_keys_example}
  }}
}}"""

    raw = call_gemini(prompt)

    # Clean markdown from Gemini response
    raw = re.sub(r"```json\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"```\s*", "", raw).strip()

    # Extract JSON from response (handles thinking model output)
    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group()

    try:
        plan = json.loads(raw)
        return _finalize_dashboard_plan(plan, prefs, roles, actual_columns, best)

    except (json.JSONDecodeError, Exception):
        # Smart fallback using detected columns
        fallback_plan = {
            "data_quality": {
                "total_rows": len(raw_data),
                "columns_available": actual_columns,
                "numeric_columns": roles["numeric"],
                "text_columns": roles["text"],
                "date_columns": roles["date"],
                "issues_found": ["Used fallback plan — Gemini JSON parse failed"]
            },
            "dashboard_plan": {}
        }

        configs = [
            ("dashboard_1", "KPI Overview", "bar", best["cat_col"], best["primary_metric"], "SUM"),
            ("dashboard_2", "Trend Analysis", "line", best["time_col"], best["primary_metric"], "SUM"),
            ("dashboard_3", "Segment Breakdown", "pie", best["cat_col"], best["primary_metric"], "SUM"),
            ("dashboard_4", "Regional Comparison", "bar", best["cat_col2"], best["secondary_metric"], "AVG"),
        ]

        for i, (key, title, chart, x, y, agg) in enumerate(configs[:num_dashboards]):
            fallback_plan["dashboard_plan"][key] = {
                "title": title,
                "description": f"{agg} of {y} by {x}",
                "chart_type": chart,
                "x_axis": x or actual_columns[0],
                "y_axis": y or (roles["numeric"][0] if roles["numeric"] else actual_columns[-1]),
                "aggregation": agg
            }

        return _finalize_dashboard_plan(fallback_plan, prefs, roles, actual_columns, best)