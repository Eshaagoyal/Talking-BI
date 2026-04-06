"""Unit tests for dataset resolution (no database required)."""

import pytest

from agents.sql_agent import resolve_focus_tables


def _ex(**kwargs):
    return {k: {"row_count": n, "columns": []} for k, n in kwargs.items()}


def test_primary_prefers_global_superstore_over_larger_table():
    ex = _ex(global_superstore=100, other=9999)
    assert resolve_focus_tables(ex, "primary")[0] == ["global_superstore"]


def test_primary_prefers_sales_when_no_global_superstore():
    ex = _ex(sales=5, big=500)
    assert resolve_focus_tables(ex, "primary")[0] == ["sales"]


def test_primary_largest_when_no_gs_or_sales():
    ex = _ex(a=5, b=20)
    assert resolve_focus_tables(ex, "primary")[0] == ["b"]


def test_explicit_table_name():
    ex = _ex(global_superstore=100, my_upload=10)
    assert resolve_focus_tables(ex, "my_upload")[0] == ["my_upload"]


def test_unknown_table_raises():
    ex = _ex(t=1)
    with pytest.raises(ValueError, match="Unknown dataset"):
        resolve_focus_tables(ex, "missing_table")


def test_empty_exploration_raises_for_primary():
    with pytest.raises(ValueError, match="No usable tables"):
        resolve_focus_tables({}, "primary")
