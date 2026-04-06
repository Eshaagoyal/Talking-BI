"""Tests for deterministic chart preference enforcement in deep_prep."""

import json
from backend.agents import deep_prep



def test_clean_and_structure_enforces_single_chart_preference(monkeypatch):
    raw_data = [
        {"Region": "Central", "Sales": 100.0, "Order Date": "2024-01-01"},
        {"Region": "South", "Sales": 80.0, "Order Date": "2024-02-01"},
        {"Region": "North", "Sales": 95.0, "Order Date": "2024-03-01"},
    ]

    # Model intentionally returns wrong chart type to verify post-enforcement.
    model_plan = {
        "data_quality": {"issues_found": []},
        "dashboard_plan": {
            "dashboard_1": {
                "title": "A",
                "description": "d",
                "chart_type": "bar",
                "x_axis": "Region",
                "y_axis": "Sales",
                "aggregation": "SUM",
            },
            "dashboard_2": {
                "title": "B",
                "description": "d",
                "chart_type": "line",
                "x_axis": "Order Date",
                "y_axis": "Sales",
                "aggregation": "SUM",
            },
        },
    }
    monkeypatch.setattr(deep_prep, "call_gemini", lambda _prompt: json.dumps(model_plan))

    out = deep_prep.clean_and_structure(
        raw_data,
        user_query="show sales",
        kpis=["sales"],
        num_dashboards=2,
        preferred_chart_types=["pie"],
    )
    d1 = out["dashboard_plan"]["dashboard_1"]["chart_type"]
    d2 = out["dashboard_plan"]["dashboard_2"]["chart_type"]
    assert d1 == "pie"
    assert d2 == "pie"
    assert out["data_quality"]["requested_chart_types"] == ["pie"]
    assert out["data_quality"]["applied_chart_types"] == ["pie", "pie"]

