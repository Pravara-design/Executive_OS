
CREATE TABLE public.executive_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.boardroom_conversations(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  decision TEXT NOT NULL,
  consensus_score INTEGER NOT NULL DEFAULT 0,
  confidence_score INTEGER NOT NULL DEFAULT 0,
  revenue_impact TEXT,
  profit_impact TEXT,
  risk_level TEXT NOT NULL DEFAULT 'Medium',
  owner TEXT,
  timeline TEXT,
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Not Started',
  progress INTEGER NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_decisions TO anon, authenticated;
GRANT ALL ON public.executive_decisions TO service_role;

ALTER TABLE public.executive_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON public.executive_decisions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_executive_decisions_dataset ON public.executive_decisions(dataset_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_executive_decisions_updated_at
  BEFORE UPDATE ON public.executive_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
