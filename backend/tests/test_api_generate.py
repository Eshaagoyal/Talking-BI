"""API contract tests for generate-dashboards endpoint (mocked internals)."""

from fastapi.testclient import TestClient

import main as api_main


client = TestClient(api_main.app)


def test_generate_dashboards_requires_kpis():
    res = client.post(
        "/generate-dashboards",
        json={"query": "show sales", "kpis": [], "num_visualizations": 3, "dataset_key": "primary"},
    )
    assert res.status_code == 400
    assert "Provide at least one KPI" in res.json()["detail"]


def test_generate_dashboards_returns_400_for_unknown_dataset(monkeypatch):
    def _raise(*_args, **_kwargs):
        raise ValueError('Unknown dataset "missing_table". Use GET /datasets for tables available in your database.')

    monkeypatch.setattr(api_main, "run_sql_agent", _raise)

    res = client.post(
        "/generate-dashboards",
        json={"query": "show sales", "kpis": ["sales"], "num_visualizations": 3, "dataset_key": "missing_table"},
    )
    assert res.status_code == 400
    assert "Unknown dataset" in res.json()["detail"]


def test_generate_dashboards_happy_path_with_mocked_pipeline(monkeypatch):
    monkeypatch.setattr(
        api_main,
        "run_sql_agent",
        lambda *_args, **_kwargs: {
            "sql": 'SELECT "Region", SUM("Sales") AS "Sales" FROM "sales" GROUP BY "Region" LIMIT 200',
            "data": [{"Region": "Central", "Sales": 100.0}, {"Region": "South", "Sales": 80.0}],
            "row_count": 2,
            "focus_tables": ["sales"],
            "dataset_key": "sales",
        },
    )
    monkeypatch.setattr(
        api_main,
        "clean_and_structure",
        lambda *_args, **_kwargs: {
            "data_quality": {"requested_chart_types": ["bar"], "applied_chart_types": ["bar", "bar"]},
            "dashboard_plan": {
                "dashboard_1": {
                    "title": "Sales by Region",
                    "description": "SUM sales",
                    "chart_type": "bar",
                    "x_axis": "Region",
                    "y_axis": "Sales",
                    "aggregation": "SUM",
                }
            },
        },
    )
    monkeypatch.setattr(
        api_main,
        "build_chart_data",
        lambda *_args, **_kwargs: {
            "dashboard_1": {
                "title": "Sales by Region",
                "description": "SUM sales",
                "chart_type": "bar",
                "x_axis": "Region",
                "y_axis": "Sales",
                "data": [{"name": "Central", "value": 100.0}],
                "total_points": 1,
            }
        },
    )
    monkeypatch.setattr(
        api_main,
        "evaluate_insights",
        lambda *_args, **_kwargs: {
            "insight_summary": "Central is highest at 100.",
            "kpi_coverage_percent": 100,
            "kpis_covered": ["sales"],
            "kpis_missing": [],
            "recommendations": ["Track Central growth."],
            "top_insight": "Central leads with 100.",
        },
    )

    res = client.post(
        "/generate-dashboards",
        json={
            "query": "show sales by region",
            "kpis": ["sales"],
            "num_visualizations": 3,
            "dataset_key": "sales",
            "preferred_chart_types": ["bar"],
            "color_schema": "cyan",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "success"
    assert body["dataset_key"] == "sales"
    assert body["row_count"] == 2
    assert body["data_quality"]["applied_chart_types"] == ["bar", "bar"]

