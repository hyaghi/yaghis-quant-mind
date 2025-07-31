-- Fix security warnings and create advice table

-- Fix function search path issues
DROP FUNCTION IF EXISTS assign_admin_role_by_email(TEXT);
DROP FUNCTION IF EXISTS create_sample_scenarios(UUID);

-- Create the assign admin function with proper search path
CREATE OR REPLACE FUNCTION assign_admin_role_by_email(user_email TEXT)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find user by email in profiles table
    SELECT user_id INTO target_user_id 
    FROM public.profiles 
    WHERE email = user_email;
    
    -- If user found, assign admin role
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin role assigned to user: %', user_email;
    ELSE
        RAISE NOTICE 'User not found with email: %', user_email;
    END IF;
END;
$$;

-- Create the sample scenarios function with proper search path
CREATE OR REPLACE FUNCTION create_sample_scenarios(target_user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Create sample scenario sets
    INSERT INTO public.scenario_sets (user_id, name, config_json) VALUES
    (target_user_id, 'Crisis Stress Test', '{
      "horizonDays": 252,
      "paths": 1000,
      "seed": 42,
      "include": ["historicalReplay", "macroShocks"],
      "historicalReplay": ["GFC2008", "COVID2020", "Rates2022"],
      "macroShocks": [
        {"name": "RatesUp300", "shock": {"ratesBps": 300}},
        {"name": "USDDown10", "shock": {"usdPct": -10}},
        {"name": "GCCDown20", "shock": {"equityRegion": {"GCC": -0.2}}}
      ]
    }'::jsonb),
    (target_user_id, 'Balanced Scenarios', '{
      "horizonDays": 126,
      "paths": 500,
      "seed": 123,
      "include": ["historicalReplay", "monteCarlo"],
      "historicalReplay": ["Rates2022", "Oil2014"],
      "monteCarlo": {
        "regimes": [
          {"name": "Calm", "volMult": 0.7, "prob": 0.6},
          {"name": "Normal", "volMult": 1.0, "prob": 0.3},
          {"name": "Stress", "volMult": 1.8, "prob": 0.1}
        ]
      }
    }'::jsonb),
    (target_user_id, 'Conservative Test', '{
      "horizonDays": 63,
      "paths": 250,
      "seed": 456,
      "include": ["monteCarlo"],
      "monteCarlo": {
        "regimes": [
          {"name": "Low Vol", "volMult": 0.5, "prob": 0.8},
          {"name": "Normal", "volMult": 1.0, "prob": 0.2}
        ]
      }
    }'::jsonb);
    
    -- Create sample allocations
    INSERT INTO public.candidate_allocations (user_id, name, weights_json) VALUES
    (target_user_id, 'Conservative Balanced', '{
      "AAPL": 0.08, "MSFT": 0.07, "GOOGL": 0.05, 
      "IEF": 0.30, "BND": 0.20, "GLD": 0.15, "CASH": 0.15
    }'::jsonb),
    (target_user_id, 'Growth Portfolio', '{
      "AAPL": 0.15, "MSFT": 0.12, "GOOGL": 0.10, "AMZN": 0.08, "TSLA": 0.05,
      "SPY": 0.20, "VTI": 0.10, "IEF": 0.15, "GLD": 0.05
    }'::jsonb),
    (target_user_id, 'Risk Parity', '{
      "SPY": 0.25, "VTI": 0.15, "VXUS": 0.15,
      "IEF": 0.25, "TLT": 0.10, "GLD": 0.10
    }'::jsonb);
END;
$$;

-- Create portfolio advice table
CREATE TABLE public.portfolio_advice (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  allocation_id UUID NOT NULL REFERENCES public.candidate_allocations(id) ON DELETE CASCADE,
  scenario_set_id UUID REFERENCES public.scenario_sets(id) ON DELETE SET NULL,
  target_weights_json JSONB NOT NULL DEFAULT '{}',
  trades_json JSONB NOT NULL DEFAULT '[]',
  rationale_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on portfolio_advice
ALTER TABLE public.portfolio_advice ENABLE ROW LEVEL SECURITY;

-- Users can view their own advice
CREATE POLICY "Users can view their own advice" 
ON public.portfolio_advice 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own advice
CREATE POLICY "Users can create their own advice" 
ON public.portfolio_advice 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own advice
CREATE POLICY "Users can update their own advice" 
ON public.portfolio_advice 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own advice
CREATE POLICY "Users can delete their own advice" 
ON public.portfolio_advice 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_portfolio_advice_updated_at
BEFORE UPDATE ON public.portfolio_advice
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_portfolio_advice_user_id ON public.portfolio_advice(user_id);
CREATE INDEX idx_portfolio_advice_allocation_id ON public.portfolio_advice(allocation_id);