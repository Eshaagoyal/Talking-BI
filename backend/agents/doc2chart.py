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
            # Edge Case Fix: If the SQL query itself executed a COUNT() and grouped it, 
            # Python's counts[k] will incorrectly be 1 (because SQL returned 1 row per group).
            # We should respect the SQL's computed numeric output if it's statistically significant.
            if sum(aggregated.values()) > sum(counts.values()):
                result = {k: round(v, 2) for k, v in aggregated.items()}
            else:
                result = {k: counts[k] for k in counts}
        else:  # SUM (default)
            result = {k: round(v, 2) for k, v in aggregated.items()}

        # Remove "Unknown" noise but DO NOT remove 0 values (valid data metrics)
        result = {k: v for k, v in result.items() if k != "Unknown"}

        # Sort and limit
        if chart_type in ("line", "area"):
            # Sort chronologically by the X-axis label
            sorted_data = sorted(result.items(), key=lambda x: str(x[0]))
            sorted_data = sorted_data[-15:] if len(result) > 15 else sorted_data
        else:
            sorted_data = sorted(result.items(), key=lambda x: x[1], reverse=True)
            if chart_type == "pie":
                # Keep pie readable without changing totals: top 7 + "Others".
                sorted_data = _top_n_with_others(sorted_data, top_n=7)
            else:
                sorted_data = sorted_data[:15]
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


def _top_n_with_others(items: list, top_n: int = 7) -> list:
    """
    Return top N items plus an "Others" bucket (sum of the remainder).
    Preserves overall totals while reducing pie clutter.
    """
    if len(items) <= top_n:
        return items
    head = items[:top_n]
    tail = items[top_n:]
    other_sum = round(sum(v for _, v in tail), 2)
    if other_sum == 0:
        return head
    return head + [("Others", other_sum)]