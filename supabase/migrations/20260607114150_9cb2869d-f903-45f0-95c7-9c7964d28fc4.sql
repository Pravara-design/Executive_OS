
-- DATASETS
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_filename TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  column_count INTEGER NOT NULL DEFAULT 0,
  schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO anon, authenticated;
GRANT ALL ON public.datasets TO service_role;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access datasets" ON public.datasets FOR ALL USING (true) WITH CHECK (true);

-- DATASET ROWS
CREATE TABLE public.dataset_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dataset_rows_dataset ON public.dataset_rows(dataset_id, row_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dataset_rows TO anon, authenticated;
GRANT ALL ON public.dataset_rows TO service_role;
ALTER TABLE public.dataset_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access dataset_rows" ON public.dataset_rows FOR ALL USING (true) WITH CHECK (true);

-- ANALYSIS SESSIONS
CREATE TABLE public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_sessions TO anon, authenticated;
GRANT ALL ON public.analysis_sessions TO service_role;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access analysis_sessions" ON public.analysis_sessions FOR ALL USING (true) WITH CHECK (true);

-- KPI SUMMARIES
CREATE TABLE public.kpi_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_summaries TO anon, authenticated;
GRANT ALL ON public.kpi_summaries TO service_role;
ALTER TABLE public.kpi_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access kpi_summaries" ON public.kpi_summaries FOR ALL USING (true) WITH CHECK (true);

-- FORECAST RESULTS
CREATE TABLE public.forecast_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  horizon INTEGER NOT NULL DEFAULT 6,
  series JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_results TO anon, authenticated;
GRANT ALL ON public.forecast_results TO service_role;
ALTER TABLE public.forecast_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access forecast_results" ON public.forecast_results FOR ALL USING (true) WITH CHECK (true);

-- CEO BRIEFS
CREATE TABLE public.ceo_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  forecast_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  health_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ceo_briefs TO anon, authenticated;
GRANT ALL ON public.ceo_briefs TO service_role;
ALTER TABLE public.ceo_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access ceo_briefs" ON public.ceo_briefs FOR ALL USING (true) WITH CHECK (true);

-- CONSULTANT REPORTS
CREATE TABLE public.consultant_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  impact_score INTEGER NOT NULL DEFAULT 0,
  roi_score INTEGER NOT NULL DEFAULT 0,
  risk_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_reports TO anon, authenticated;
GRANT ALL ON public.consultant_reports TO service_role;
ALTER TABLE public.consultant_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access consultant_reports" ON public.consultant_reports FOR ALL USING (true) WITH CHECK (true);

-- DECISION SIMULATIONS
CREATE TABLE public.decision_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Scenario',
  scenario JSONB NOT NULL DEFAULT '{}'::jsonb,
  revenue_impact NUMERIC NOT NULL DEFAULT 0,
  profit_impact NUMERIC NOT NULL DEFAULT 0,
  risk NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_simulations TO anon, authenticated;
GRANT ALL ON public.decision_simulations TO service_role;
ALTER TABLE public.decision_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access decision_simulations" ON public.decision_simulations FOR ALL USING (true) WITH CHECK (true);

-- BOARDROOM CONVERSATIONS
CREATE TABLE public.boardroom_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boardroom_conversations TO anon, authenticated;
GRANT ALL ON public.boardroom_conversations TO service_role;
ALTER TABLE public.boardroom_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access boardroom_conversations" ON public.boardroom_conversations FOR ALL USING (true) WITH CHECK (true);

-- ACTION PLANS
CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  horizon_days INTEGER NOT NULL DEFAULT 30,
  initiatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_plans TO anon, authenticated;
GRANT ALL ON public.action_plans TO service_role;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access action_plans" ON public.action_plans FOR ALL USING (true) WITH CHECK (true);

-- GENERATED REPORTS
CREATE TABLE public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'pdf',
  title TEXT NOT NULL,
  storage_path TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO anon, authenticated;
GRANT ALL ON public.generated_reports TO service_role;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access generated_reports" ON public.generated_reports FOR ALL USING (true) WITH CHECK (true);
