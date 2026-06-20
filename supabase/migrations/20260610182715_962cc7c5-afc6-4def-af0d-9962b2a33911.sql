-- Restore public access for hackathon demo
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY['datasets','dataset_rows','kpi_summaries','forecast_results','ceo_briefs','consultant_reports','decision_simulations','action_plans','boardroom_conversations','analysis_sessions','generated_reports'];
DECLARE p record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "Public access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;