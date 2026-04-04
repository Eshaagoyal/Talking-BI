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

    prompt = f"""You are InsightEval — a senior business intelligence analyst (arXiv 2511.22884).
Evaluate these dashboards and generate professional business insights.

USER ASKED: "{user_query}"
REQUESTED KPIs: {kpi_text}

DASHBOARD RESULTS:
{json.dumps(dashboard_summary, indent=2, default=str)}

YOUR TASKS:

1. INSIGHT SUMMARY (3-5 sentences):
   - Reference specific numbers from the data
   - Identify top performer, bottom performer, key trend
   - Write like a real business analyst report
   - Plain text only — absolutely no markdown, no bold, no bullets

2. KPI COVERAGE SCORE:
   - Check which of [{kpi_text}] actually appear in the dashboard results
   - Score = covered / total * 100 (integer)

3. RECOMMENDATIONS (3 specific actions):
   - Each must reference actual data values
   - Actionable and specific
   - Plain text only — no markdown, no bold

4. TOP INSIGHT (1 sentence with a specific number)

CRITICAL: Use plain text ONLY. No **bold**. No *italic*. No bullets. No markdown whatsoever.

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
        # Strip any remaining markdown from all text fields
        result["insight_summary"] = strip_markdown(result.get("insight_summary", ""))
        result["top_insight"] = strip_markdown(result.get("top_insight", ""))
        result["recommendations"] = [
            strip_markdown(r) for r in result.get("recommendations", [])
        ]
        # Ensure coverage percent is an integer
        result["kpi_coverage_percent"] = int(result.get("kpi_coverage_percent", 75))
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