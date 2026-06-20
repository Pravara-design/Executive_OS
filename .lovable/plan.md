## Rabbitt BI Copilot — Build Plan

A premium dark-mode executive decision intelligence platform with persistent storage (Lovable Cloud / Postgres), 8 fully built pages, reusable components, and a typed API service layer prepared for external FastAPI + multi-agent LLM endpoints (Gemini 2.5 Pro, Claude, GPT-4o). No auth in v1.

### Design System

Dark mode default. Palette mapped to semantic tokens in `src/styles.css` (oklch):

- `--background` Italian Roast `#280B0F`
- `--card` / elevated surfaces Tamarind `#361319`
- `--primary` Rubine `#6D3A3C` (accent/CTA)
- `--secondary` Boho `#7B694E`
- `--foreground` / muted-foreground Camel Coat `#C6B39A` family
- Soft shadows, generous spacing, thin borders, serif display + clean sans body
- Reusable: `KpiCard`, `SectionHeader`, `InsightCard`, `RiskBadge`, `ScoreRing`, `PremiumChart` (Recharts wrappers themed to palette)

### Navigation & Layout

Persistent collapsible sidebar (shadcn `Sidebar`) + topbar. Routes (TanStack file-based):

```text
src/routes/
  __root.tsx              # shell + QueryClientProvider + sidebar layout
  index.tsx               # Dashboard
  chat.tsx                # AI Chat
  ceo-brief.tsx           # CEO Brief
  consultant.tsx          # Consultant Report
  simulator.tsx           # Decision Simulator
  boardroom.tsx           # AI Boardroom
  action-plans.tsx        # Action Plans
  reports.tsx             # Reports
```

### Database (Lovable Cloud)

Tables (RLS enabled, public-access policies since no auth in v1; grants to `anon`+`authenticated`):

- `datasets` — id, name, source_filename, row_count, column_count, schema (jsonb), created_at
- `dataset_rows` — id, dataset_id, row_index, data (jsonb)  *(stores parsed CSV/XLSX rows)*
- `analysis_sessions` — id, dataset_id, title, created_at
- `kpi_summaries` — id, dataset_id, metrics (jsonb), created_at
- `forecast_results` — id, dataset_id, horizon, series (jsonb), created_at
- `ceo_briefs` — id, dataset_id, summary, risks (jsonb), opportunities (jsonb), priorities (jsonb), health_score, created_at
- `consultant_reports` — id, dataset_id, problems (jsonb), recommendations (jsonb), impact_score, roi_score, risk_score, created_at
- `decision_simulations` — id, dataset_id, scenario (jsonb), revenue_impact, profit_impact, risk, confidence, created_at
- `boardroom_conversations` — id, dataset_id, topic, messages (jsonb: role/agent/content), created_at
- `action_plans` — id, dataset_id, horizon_days (30/60/90), initiatives (jsonb), progress, created_at
- `generated_reports` — id, dataset_id, kind (pdf/pptx), title, storage_path, created_at

Storage bucket `reports` (public) for generated PDFs/PPTX.

### API Service Layer (typed, swap-ready)

`src/lib/api/` — typed services returning `Promise<T>`. Each has two implementations chosen by env flag `VITE_AI_BACKEND` (`local` default | `fastapi`):

- `datasets.ts` — upload, list, get, delete (Cloud)
- `analysis.ts` — `computeKpis(datasetId)`, `forecast(datasetId, horizon)` — local stats now, FastAPI later
- `ai.ts` — `chat`, `generateCeoBrief`, `generateConsultantReport`, `simulateDecision`, `runBoardroom`, `generateActionPlan` — local heuristic stubs returning realistic structured output now; one switch to call `${VITE_FASTAPI_URL}/...` later
- `reports.ts` — `exportPdf`, `exportPptx` — client-side generation via `jspdf` + `pptxgenjs`, persisted to Storage

Shared data models in `src/lib/api/types.ts` (Dataset, KpiMetric, Forecast, CeoBrief, ConsultantReport, Simulation, BoardroomMessage, ActionPlan, Report).

Server functions (`createServerFn`) wrap Cloud reads/writes; AI service stubs run client-side for v1 so they're trivially replaceable with `fetch(FASTAPI_URL)`.

### Page Details

1. **Dashboard** — Drag/drop CSV/XLSX upload (`papaparse`, `xlsx`), dataset switcher, KPI grid (Revenue, Profit, Growth %, Margin, Customers), trend line chart, anomaly callouts, mini forecast card. Computes locally on upload, persists summary.
2. **AI Chat** — Conversational analytics. Composer + message list keyed by selected dataset. Uses `ai.chat()` stub (returns templated answers referencing real dataset stats). Persists thread to `analysis_sessions` + `boardroom_conversations`-style message array.
3. **CEO Brief** — Executive summary card, Health Score ring, Risks/Opportunities columns, Priority Actions list, Forecast Highlights. "Regenerate" button calls `ai.generateCeoBrief()`.
4. **Consultant Report** — Problem cards, Recommendations table, Impact/ROI/Risk score rings, Priority Matrix (2×2 quadrant chart).
5. **Decision Simulator** — Scenario form (levers: price %, marketing spend, headcount, churn), runs `ai.simulateDecision()`, shows revenue/profit impact bars, risk gauge, confidence meter, saves runs.
6. **AI Boardroom** — Premium "table" UI with 5 seats (CFO/CMO/COO/CRO/CEO agents, each with avatar + accent). Topic input → orchestrated multi-turn discussion stub. Messages stream into seats; persisted.
7. **Action Plans** — Tabs 30/60/90 day. Initiative cards with owner, status, progress bar. Inline edit + checkbox completion. "Generate plan from latest brief" action.
8. **Reports** — List generated reports; "Generate PDF" / "Generate PPTX" buttons assemble Dashboard + CEO Brief + Consultant Report + Action Plans into branded exports, upload to Storage, link to download.

### Technical Notes

- TanStack Start + TanStack Query (`ensureQueryData` in loaders, `useSuspenseQuery` in components, `defaultPreloadStaleTime: 0` already set).
- Recharts themed with palette CSS vars; never raw colors in components.
- `papaparse` + `xlsx` + `jspdf` + `pptxgenjs` added via `bun add`.
- All AI service functions return the exact shape future FastAPI endpoints must return — documented in `types.ts` so backend devs can mirror.
- Empty states everywhere (no dataset selected → prompt to upload).
- Errors surfaced via `sonner` toasts; route `errorComponent` + `notFoundComponent` defined.

### Deliverable Checklist

- [ ] Lovable Cloud enabled + migration with all 11 tables + storage bucket
- [ ] Design tokens + sidebar shell + 8 routes
- [ ] Upload pipeline → KPI compute → persistence
- [ ] All 8 pages functional with realistic stub AI output
- [ ] Typed API layer with FastAPI swap point documented
- [ ] PDF + PPTX export working
