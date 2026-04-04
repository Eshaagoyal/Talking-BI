import os
import re
from collections import defaultdict


def build_chart_data(raw_data: list, dashboard_plan: dict) -> dict:
    """
    Doc2Chart agent — implements arXiv 2507.14819.
    Converts raw SQL results into chart-ready JSON for each dashboard.
    Fully dynamic — works for any dataset.
    """
    dashboards = {}

    for key, plan in dashboard_plan.items():
        x_col = plan.get("x_axis", "")
        y_col = plan.get("y_axis", "")
        aggregation = plan.get("aggregation", "SUM").upper()
        chart_type = plan.get("chart_type", "bar")

        aggregated = defaultdict(float)
        counts = defaultdict(int)

        for row in raw_data:
            x_val = _get_value(row, x_col)
            y_raw = _get_value(row, y_col)

            # Clean x value
            x_val = _clean_label(str(x_val)) if x_val is not None else "Unknown"

            # Clean y value — handle currency strings, commas, etc.
            try:
                y_str = str(y_raw).replace(",", "").replace("$", "").replace("%", "").strip()
                y_val = float(y_str) if y_str not in ("", "None", "null") else 0.0
            except (ValueError, TypeError):
                y_val = 0.0

            aggregated[x_val] += y_val
            counts[x_val] += 1

        # Apply aggregation
        if aggregation == "AVG":
            result = {
                k: round(v / counts[k], 2)
                for k, v in aggregated.items()
                if counts[k] > 0
            }
        elif aggregation == "COUNT":
            result = {k: counts[k] for k in counts}
        else:  # SUM (default)
            result = {k: round(v, 2) for k, v in aggregated.items()}

        # Remove zero/unknown noise
        result = {k: v for k, v in result.items() if v != 0 and k != "Unknown"}

        # Sort and limit
        max_items = 8 if chart_type == "pie" else 15
        sorted_data = sorted(result.items(), key=lambda x: x[1], reverse=True)[:max_items]
        chart_data = [{"name": k, "value": v} for k, v in sorted_data]

        dashboards[key] = {
            "title": plan.get("title", key),
            "description": plan.get("description", ""),
            "chart_type": chart_type,
            "x_axis": x_col,
            "y_axis": y_col,
            "data": chart_data,
            "total_points": len(chart_data)
        }

    return dashboards


def _get_value(row: dict, col_name: str):
    """
    Get column value with exact match first, then case-insensitive fallback.
    Handles column name mismatches between plan and actual data.
    """
    if col_name in row:
        return row[col_name]
    # Case-insensitive fallback
    col_lower = col_name.lower().strip()
    for k, v in row.items():
        if str(k).lower().strip() == col_lower:
            return v
    # Partial match fallback
    for k, v in row.items():
        if col_lower in str(k).lower() or str(k).lower() in col_lower:
            return v
    return None


def _clean_label(label: str) -> str:
    """Clean and truncate long labels for readability."""
    label = label.strip()
    # Remove trailing .0 from numeric labels stored as text
    if label.endswith(".0") and label[:-2].isdigit():
        label = label[:-2]
    # Truncate very long labels
    if len(label) > 30:
        label = label[:27] + "..."
    return label