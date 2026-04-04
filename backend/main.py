import os
import time
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()

from agents.sql_agent import (
    run_sql_agent, get_schema, test_connection, extract_kpis_from_query
)
from agents.deep_prep import clean_and_structure
from agents.doc2chart import build_chart_data
from agents.insight_eval import evaluate_insights

app = FastAPI(title="Talking BI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DashboardRequest(BaseModel):
    query: str
    kpis: List[str] = []
    num_visualizations: Optional[int] = 4
    color_schema: Optional[str] = "blue"


class KPIRequest(BaseModel):
    query: str


class ChatRequest(BaseModel):
    message: str
    dashboard_context: dict = {}


@app.get("/")
def root():
    return {"message": "Talking BI backend is running"}


@app.get("/health")
def health():
    try:
        db = test_connection()
        gemini_ok = bool(os.getenv("GEMINI_API_KEY"))
        return {
            "status": "ok",
            "database": db,
            "gemini_key_set": gemini_ok,
            "overall": "ALL OK — ready to generate dashboards"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/schema")
def schema_endpoint():
    try:
        return get_schema()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-kpis")
def extract_kpis_endpoint(req: KPIRequest):
    try:
        kpis = extract_kpis_from_query(req.query)
        return {"kpis": kpis}
    except Exception as e:
        return {"kpis": ["sales", "profit"]}


@app.post("/generate-dashboards")
def generate_dashboards(req: DashboardRequest):
    try:
        kpis = req.kpis if req.kpis else extract_kpis_from_query(req.query)
        num_viz = max(2, min(4, req.num_visualizations or 4))

        sql_result = run_sql_agent(req.query, kpis)

        if sql_result["row_count"] == 0:
            raise HTTPException(
                status_code=404,
                detail="No data returned. Try a broader query."
            )

        prep_result = clean_and_structure(
            sql_result["data"],
            req.query,
            kpis,
            num_dashboards=num_viz
        )
        dashboard_plan = prep_result.get("dashboard_plan", {})

        if not dashboard_plan:
            raise HTTPException(
                status_code=500,
                detail="Dashboard planning failed. Try a different query."
            )

        charts = build_chart_data(sql_result["data"], dashboard_plan)
        insights = evaluate_insights(charts, kpis, req.query)

        return {
            "status": "success",
            "query": req.query,
            "kpis": kpis,
            "color_schema": req.color_schema,
            "sql_used": sql_result["sql"],
            "row_count": sql_result["row_count"],
            "num_dashboards": num_viz,
            "data_quality": prep_result.get("data_quality", {}),
            "dashboards": charts,
            "insights": insights
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    """Chatbot — answers questions about the current dashboard."""
    try:
        import google.generativeai as genai
        chat_model = genai.GenerativeModel("gemini-2.5-flash")

        context = req.dashboard_context
        prompt = f"""You are a helpful BI analyst chatbot. A user is looking at a dashboard and has a question.

Dashboard context:
- Original query: {context.get('query', 'unknown')}
- KPIs tracked: {context.get('kpis', [])}
- Insight summary: {context.get('insight_summary', 'not available')}
- Dashboard data: {json.dumps(context.get('dashboards', {}), default=str)[:2000]}

User question: "{req.message}"

Answer concisely in 2-4 sentences. Reference specific numbers from the data. Plain text only. No markdown."""

        response = chat_model.generate_content(prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))