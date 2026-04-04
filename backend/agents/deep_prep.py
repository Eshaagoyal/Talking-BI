import json
import os
import re
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


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


def clean_and_structure(
    raw_data: list,
    user_query: str,
    kpis: list,
    num_dashboards: int = 4
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

    # Clamp num_dashboards
    num_dashboards = max(2, min(4, num_dashboards))

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

    # Only include requested number of dashboards
    active_templates = {
        k: v for k, v in dashboard_templates.items()
        if int(k.split("_")[1]) <= num_dashboards
    }

    prompt = f"""You are DeepPrep — a BI dashboard planning agent (arXiv 2602.07371).
You received actual SQL query results and must plan {num_dashboards} dashboard panels.

USER REQUEST: "{user_query}"
KPIs REQUESTED: {kpi_text}
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

DASHBOARD ROLES TO FILL:
{json.dumps(active_templates, indent=2)}

STRICT RULES:
1. x_axis MUST be an exact column name from the actual columns list
2. y_axis MUST be an exact column name from the numeric columns list
3. chart_type must be: bar / line / pie / area
4. Use "pie" only for proportional breakdowns (max 8 categories)
5. Use "line" or "area" for time-based trends
6. Use "bar" for comparisons
7. aggregation must be: SUM / AVG / COUNT
8. Titles must be descriptive and specific to the data
9. No markdown in any text field

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
    {chr(10).join([
        f'"dashboard_{i+1}": {{"title": "...", "description": "...", "chart_type": "...", "x_axis": "...", "y_axis": "...", "aggregation": "..."}}'
        for i in range(num_dashboards)
    ])}
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
        # Validate all column references exist in actual data
        for key, dash in plan.get("dashboard_plan", {}).items():
            if dash.get("x_axis") not in actual_columns:
                dash["x_axis"] = best["cat_col"] or actual_columns[0]
            if dash.get("y_axis") not in roles["numeric"]:
                dash["y_axis"] = best["primary_metric"] or roles["numeric"][0] if roles["numeric"] else actual_columns[-1]
        return plan

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

        return fallback_plan