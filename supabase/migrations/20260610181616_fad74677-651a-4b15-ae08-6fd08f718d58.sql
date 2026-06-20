
-- 1) Add user_id with default auth.uid() to all flagged tables
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.kpi_summaries ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.forecast_results ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.ceo_briefs ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.consultant_reports ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.decision_simulations ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.boardroom_conversations ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.analysis_sessions ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.generated_reports ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
-- dataset_rows is scoped via parent dataset

-- 2) Drop the permissive public policies
DROP POLICY IF EXISTS "Public access datasets" ON public.datasets;
DROP POLICY IF EXISTS "Public access dataset_rows" ON public.dataset_rows;
DROP POLICY IF EXISTS "Public access kpi_summaries" ON public.kpi_summaries;
DROP POLICY IF EXISTS "Public access forecast_results" ON public.forecast_results;
DROP POLICY IF EXISTS "Public access ceo_briefs" ON public.ceo_briefs;
DROP POLICY IF EXISTS "Public access consultant_reports" ON public.consultant_reports;
DROP POLICY IF EXISTS "Public access decision_simulations" ON public.decision_simulations;
DROP POLICY IF EXISTS "Public access action_plans" ON public.action_plans;
DROP POLICY IF EXISTS "Public access boardroom_conversations" ON public.boardroom_conversations;
DROP POLICY IF EXISTS "Public access analysis_sessions" ON public.analysis_sessions;
DROP POLICY IF EXISTS "Public access generated_reports" ON public.generated_reports;

-- 3) Revoke anon access; grant only to authenticated + service_role
REVOKE ALL ON public.datasets, public.dataset_rows, public.kpi_summaries, public.forecast_results,
  public.ceo_briefs, public.consultant_reports, public.decision_simulations, public.action_plans,
  public.boardroom_conversations, public.analysis_sessions, public.generated_reports FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.datasets, public.dataset_rows, public.kpi_summaries, public.forecast_results,
  public.ceo_briefs, public.consultant_reports, public.decision_simulations, public.action_plans,
  public.boardroom_conversations, public.analysis_sessions, public.generated_reports
TO authenticated;

GRANT ALL ON
  public.datasets, public.dataset_rows, public.kpi_summaries, public.forecast_results,
  public.ceo_briefs, public.consultant_reports, public.decision_simulations, public.action_plans,
  public.boardroom_conversations, public.analysis_sessions, public.generated_reports
TO service_role;

-- 4) Owner-scoped policies on tables with user_id
CREATE POLICY "Owners manage their datasets" ON public.datasets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their kpi_summaries" ON public.kpi_summaries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their forecast_results" ON public.forecast_results
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their ceo_briefs" ON public.ceo_briefs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their consultant_reports" ON public.consultant_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their decision_simulations" ON public.decision_simulations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their action_plans" ON public.action_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their boardroom_conversations" ON public.boardroom_conversations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their analysis_sessions" ON public.analysis_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners manage their generated_reports" ON public.generated_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) dataset_rows: scope via parent dataset ownership
CREATE POLICY "Owners manage their dataset_rows" ON public.dataset_rows
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_rows.dataset_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_rows.dataset_id AND d.user_id = auth.uid()));
