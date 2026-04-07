import os
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

def detect_kpis(query: str, schema_context: dict) -> list[str]:
    """
    Given a user query and the database schema context, automatically detect
    1 to 3 numeric KPIs (Key Performance Indicators) to measure.
    """
    
    # Extract only numeric/useful columns to keep the prompt clean.
    # Exclude obvious IDs, metadata, or pure string categories unless they are counts.
    cols = schema_context.get("columns", [])
    
    col_names = ", ".join([c["column_name"] for c in cols])
    
    prompt = f"""You are an expert Data Analyst and Business Intelligence Agent.
The user has asked the following analytical question:
"{query}"

The available database table has the following columns:
{col_names}

Your objective is to identify 1 to 3 numeric Key Performance Indicators (KPIs) to track, aggregate, or visualize to best answer this question.
A KPI should be a measurable business metric like 'sales', 'profit', 'quantity', 'sessions', 'discount', or 'revenue'.
If no numeric column perfectly matches, infer the best numeric proxy (e.g., 'count of orders' -> 'count').

OUTPUT FORMAT:
Return ONLY a valid JSON object containing a "kpis" array of strings (lowercase).
Do not add any conversational text or explanations.
Example output:
{{
  "kpis": ["sales", "profit"]
}}
"""
    
    try:
        model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a JSON-only API. You output raw JSON objects and nothing else."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        raw_text = response.choices[0].message.content.strip()
        
        # Robust parsing
        parsed = json.loads(raw_text)
        kpis = parsed.get("kpis", [])
        
        
        if isinstance(kpis, list):
            clean_kpis = [str(k).strip() for k in kpis if str(k).strip()][:3]
            return clean_kpis
                
    except Exception as e:
        print(f"KPI Agent Failed: {e}")
        
    return []
