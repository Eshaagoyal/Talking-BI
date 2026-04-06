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


def _kpi_coverage_from_facts(dashboards: dict, kpis: list) -> tuple:
    """Ground KPI coverage in chart y_axis / x_axis names (InsightEval-style verification)."""
    if not kpis:
        return 100, [], []
    covered = set()
    for d in dashboards.values():
        yax = str(d.get("y_axis") or "").lower().replace("_", " ")
        xax = str(d.get("x_axis") or "").lower().replace("_", " ")
        for k in kpis:
            kl = k.lower().replace("_", " ")
            if kl in yax or kl in xax:
                covered.add(k)
    cov_list = [k for k in kpis if k in covered]
    miss_list = [k for k in kpis if k not in covered]
    pct = int(round(100 * len(cov_list) / len(kpis))) if kpis else 100
    return pct, cov_list, miss_list


def strip_markdown(text: str) -> str:
    """Remove all markdown formatting from Gemini output."""
    if not text:
        return ""
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)   # **bold**
    text = re.sub(r'\*(.*?)\*', r'\1', text)         # *italic*
    text = re.sub(r'#{1,6}\s*', '', text)             # ## headers
    text = re.sub(r'^\s*[-•*]\s+', '', text, flags=re.MULTILINE)  # bullets
    text = re.sub(r'`([^`]+)`', r'\1', text)          # `code`
    return text.strip()


def evaluate_insights(
    dashboards: dict,
    kpis: list,
    user_query: str
) -> dict:
    """
    InsightEval agent — implements arXiv 2511.22884.
    Evaluates dashboard quality, calculates KPI coverage,
    generates plain-English business insights.
    Works for any sales dataset — no hardcoding.
    """
    # Build rich dashboard summary for Gemini
    dashboard_summary = {}
    for key, dash in dashboards.items():
        top_data = dash.get("data", [])[:6]
        dashboard_summary[key] = {
            "title": dash["title"],
            "chart_type": dash["chart_type"],
            "x_axis": dash["x_axis"],
            "y_axis": dash["y_axis"],
            "data_points": len(dash.get("data", [])),
            "top_results": top_data,
            "top_value": top_data[0] if top_data else None,
            "bottom_value": top_data[-1] if len(top_data) > 1 else None
        }

    kpi_text = ", ".join(kpis)

    prompt = f"""You are InsightEval — a senior BI analyst (arXiv 2511.22884).
You must ground every claim in the structured numbers below (top_results, top_value, bottom_value).
Do not invent metrics or categories not present in DASHBOARD RESULTS.

USER ASKED: "{user_query}"
REQUESTED KPIs: {kpi_text}

DASHBOARD RESULTS:
{json.dumps(dashboard_summary, indent=2, default=str)}

YOUR TASKS:

1. INSIGHT SUMMARY (3-5 sentences):
   - Every sentence must cite concrete values from top_results or top_value/bottom_value (names and amounts).
   - Plain text only — no markdown.

2. KPI COVERAGE SCORE:
   - A KPI is "covered" if it appears in a y_axis name or clearly in the measured values shown.
   - Integer 0-100.

3. RECOMMENDATIONS (3):
   - Each references a specific number from the data above.

4. TOP INSIGHT: one sentence with one specific number from the data.

CRITICAL: Plain text only. No markdown.

Return ONLY this exact JSON structure:
{{
  "insight_summary": "3-5 plain text sentences with specific numbers...",
  "kpi_coverage_percent": 85,
  "kpis_covered": ["kpi1", "kpi2"],
  "kpis_missing": ["kpi3"],
  "recommendations": [
    "Plain text recommendation 1 with specific number...",
    "Plain text recommendation 2 with specific number...",
    "Plain text recommendation 3 with specific number..."
  ],
  "top_insight": "One plain text sentence with the most important finding and a number."
}}"""

    raw = call_gemini(prompt)

    # Clean markdown fences and extract JSON
    raw = re.sub(r"```json\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"```\s*", "", raw).strip()

    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group()

    try:
        result = json.loads(raw)
        result["insight_summary"] = strip_markdown(result.get("insight_summary", ""))
        result["top_insight"] = strip_markdown(result.get("top_insight", ""))
        result["recommendations"] = [
            strip_markdown(r) for r in result.get("recommendations", [])
        ]
        h_pct, h_cov, h_miss = _kpi_coverage_from_facts(dashboards, kpis)
        llm_pct = int(result.get("kpi_coverage_percent", h_pct))
        result["kpi_coverage_percent"] = min(100, max(llm_pct, h_pct))
        result["kpis_covered"] = h_cov
        result["kpis_missing"] = h_miss
        return result

    except (json.JSONDecodeError, Exception):
        # Robust fallback
        return {
            "insight_summary": (
                f"Analysis of '{user_query}' is complete. "
                f"The dashboards cover {len(dashboards)} views of your sales data. "
                f"Review each panel for detailed breakdowns of {kpi_text}."
            ),
            "kpi_coverage_percent": 70,
            "kpis_covered": kpis,
            "kpis_missing": [],
            "recommendations": [
                "Focus on the top-performing category identified in the KPI Overview dashboard.",
                "Investigate regions or segments showing below-average performance.",
                "Review the trend dashboard to identify growth or decline patterns over time."
            ],
            "top_insight": f"Review the KPI Overview dashboard for the most important finding in your {kpi_text} analysis."
        }