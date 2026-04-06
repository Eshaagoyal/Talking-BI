# Talking BI

Natural-language dashboards on your own Postgres (e.g. Supabase): pick a **dataset** (table), enter **KPIs** and a **question**, get SQL-backed charts. Optional **CSV / Excel** upload creates a table in the same database with the name you choose.

## Architecture

- **Backend** (FastAPI): `GET /datasets` lists public tables; `POST /upload-csv` loads CSV or `.xlsx`; `POST /generate-dashboards` runs schema exploration, Gemini NL→SQL (scoped to the **selected table only**), chart prep, and insights.
- **Frontend** (Vite + React): dataset picker, upload flow, dashboard preview, optional chat. Saved dashboards persist in **localStorage**.

## Prerequisites

- Python 3.11+
- Node 18+
- A Postgres URL (Supabase project database)
- A [Google AI API key](https://ai.google.dev/) for Gemini

## Backend setup

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and set `SUPABASE_DB_URL` and `GEMINI_API_KEY`.

Run the API:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `GET http://127.0.0.1:8000/health`

### Environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_DB_URL` | Postgres connection string |
| `GEMINI_API_KEY` | Gemini API key |
| `CORS_ORIGINS` | `*` (dev) or comma-separated frontend URLs (production) |

## Frontend setup

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env` when the API is not on the same machine:

```env
VITE_API_BASE_URL=https://your-backend-host
```

Local dev (API on same PC, default URL):

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Serve the `frontend/dist` static files from any host; point `VITE_API_BASE_URL` at your deployed API and set `CORS_ORIGINS` on the backend to that frontend origin.

## Dataset behavior

- **Exact table**: Choosing a table in the UI sends that name as `dataset_key`. SQL generation is instructed to use **only** that table.
- **Default**: `dataset_key: "primary"` resolves to `global_superstore` if present, else `sales`, else the largest eligible public table.
- **Upload**: File is stored as a new table named exactly as you enter (letters, numbers, underscore; must start with letter or `_`). Re-uploading **replaces** that table.

## Tests

```bash
cd backend
python -m pytest tests/ -q
```

## API quick reference

- `GET /datasets` — `{ "datasets": [ { "name", "row_count" } ] }`
- `POST /upload-csv?table_name=my_table` — multipart field `file` (CSV or `.xlsx`)
- `POST /generate-dashboards` — JSON body: `query`, `kpis` (non-empty), `dataset_key`, optional chart/theme fields
