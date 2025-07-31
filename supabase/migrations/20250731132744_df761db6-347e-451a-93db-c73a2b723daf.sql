-- Phase 1: Core portfolio optimization tables

-- Assets table for tradeable instruments
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Assets are viewable by everyone (public data)
CREATE POLICY "Assets are viewable by everyone" 
ON public.assets 
FOR SELECT 
USING (true);

-- Only admins can insert/update/delete assets
CREATE POLICY "Admins can manage assets" 
ON public.assets 
FOR ALL 
USING (is_admin(auth.uid()));

-- Historical prices for assets
CREATE TABLE public.asset_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  close NUMERIC NOT NULL,
  adjusted_close NUMERIC NOT NULL,
  volume BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(asset_id, date)
);

-- Enable RLS on asset_prices
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

-- Prices are viewable by everyone
CREATE POLICY "Asset prices are viewable by everyone" 
ON public.asset_prices 
FOR SELECT 
USING (true);

-- Only admins can manage prices
CREATE POLICY "Admins can manage asset prices" 
ON public.asset_prices 
FOR ALL 
USING (is_admin(auth.uid()));

-- User positions in their portfolios
CREATE TABLE public.user_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  cost_basis NUMERIC NOT NULL DEFAULT 0,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_positions
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;

-- Users can view their own positions
CREATE POLICY "Users can view their own positions" 
ON public.user_positions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own positions
CREATE POLICY "Users can create their own positions" 
ON public.user_positions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own positions
CREATE POLICY "Users can update their own positions" 
ON public.user_positions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own positions
CREATE POLICY "Users can delete their own positions" 
ON public.user_positions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Constraint profiles for risk management
CREATE TABLE public.constraint_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  params_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on constraint_profiles
ALTER TABLE public.constraint_profiles ENABLE ROW LEVEL SECURITY;

-- Users can manage their own constraint profiles
CREATE POLICY "Users can view their own constraint profiles" 
ON public.constraint_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own constraint profiles" 
ON public.constraint_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own constraint profiles" 
ON public.constraint_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own constraint profiles" 
ON public.constraint_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Scenario sets for testing portfolios
CREATE TABLE public.scenario_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on scenario_sets
ALTER TABLE public.scenario_sets ENABLE ROW LEVEL SECURITY;

-- Users can manage their own scenario sets
CREATE POLICY "Users can view their own scenario sets" 
ON public.scenario_sets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenario sets" 
ON public.scenario_sets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenario sets" 
ON public.scenario_sets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenario sets" 
ON public.scenario_sets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Candidate allocations for testing
CREATE TABLE public.candidate_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  weights_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on candidate_allocations
ALTER TABLE public.candidate_allocations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own candidate allocations
CREATE POLICY "Users can view their own candidate allocations" 
ON public.candidate_allocations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own candidate allocations" 
ON public.candidate_allocations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own candidate allocations" 
ON public.candidate_allocations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own candidate allocations" 
ON public.candidate_allocations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Simulation runs to track optimization jobs
CREATE TABLE public.simulation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  allocation_id UUID NOT NULL REFERENCES public.candidate_allocations(id) ON DELETE CASCADE,
  scenario_set_id UUID NOT NULL REFERENCES public.scenario_sets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_pct INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  meta_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on simulation_runs
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- Users can manage their own simulation runs
CREATE POLICY "Users can view their own simulation runs" 
ON public.simulation_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulation runs" 
ON public.simulation_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulation runs" 
ON public.simulation_runs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Audit events for governance
CREATE TABLE public.audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_events
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit events
CREATE POLICY "Users can view their own audit events" 
ON public.audit_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create audit events
CREATE POLICY "Users can create audit events" 
ON public.audit_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all audit events
CREATE POLICY "Admins can view all audit events" 
ON public.audit_events 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_asset_prices_asset_date ON public.asset_prices(asset_id, date);
CREATE INDEX idx_user_positions_user_id ON public.user_positions(user_id);
CREATE INDEX idx_simulation_runs_user_status ON public.simulation_runs(user_id, status);
CREATE INDEX idx_audit_events_user_type ON public.audit_events(user_id, event_type);

-- Add updated_at triggers
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_positions_updated_at
BEFORE UPDATE ON public.user_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_constraint_profiles_updated_at
BEFORE UPDATE ON public.constraint_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scenario_sets_updated_at
BEFORE UPDATE ON public.scenario_sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();