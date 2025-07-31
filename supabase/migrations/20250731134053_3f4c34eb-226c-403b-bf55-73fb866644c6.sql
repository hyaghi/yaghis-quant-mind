-- Create admin user and assign roles
-- This will set up sammyaghi@gmail.com as a super admin

-- First, let's create some sample assets for the system
INSERT INTO public.assets (symbol, name, asset_class, currency) VALUES
('AAPL', 'Apple Inc.', 'Equity', 'USD'),
('MSFT', 'Microsoft Corporation', 'Equity', 'USD'),
('GOOGL', 'Alphabet Inc.', 'Equity', 'USD'),
('AMZN', 'Amazon.com Inc.', 'Equity', 'USD'),
('TSLA', 'Tesla Inc.', 'Equity', 'USD'),
('SPY', 'SPDR S&P 500 ETF', 'Equity', 'USD'),
('IEF', 'iShares 7-10 Year Treasury Bond ETF', 'FixedIncome', 'USD'),
('TLT', 'iShares 20+ Year Treasury Bond ETF', 'FixedIncome', 'USD'),
('GLD', 'SPDR Gold Shares', 'Commodities', 'USD'),
('VTI', 'Vanguard Total Stock Market ETF', 'Equity', 'USD'),
('VXUS', 'Vanguard Total International Stock ETF', 'Equity', 'USD'),
('BND', 'Vanguard Total Bond Market ETF', 'FixedIncome', 'USD'),
('CASH', 'Cash Equivalent', 'Cash', 'USD')
ON CONFLICT (symbol) DO NOTHING;

-- Create default constraint profiles
INSERT INTO public.constraint_profiles (id, user_id, name, params_json) 
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user
  'Conservative',
  '{
    "maxWeightPerAsset": 0.15,
    "maxAssetClassWeights": {
      "Equity": 0.50,
      "FixedIncome": 0.80,
      "Commodities": 0.20,
      "Cash": 1.0
    },
    "minCash": 0.05,
    "turnoverLimit": 0.20,
    "riskBudget": {
      "targetVol": 0.08,
      "maxDrawdown": 0.15,
      "cvar95": 0.12
    }
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.constraint_profiles WHERE name = 'Conservative');

INSERT INTO public.constraint_profiles (id, user_id, name, params_json) 
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user
  'Balanced',
  '{
    "maxWeightPerAsset": 0.25,
    "maxAssetClassWeights": {
      "Equity": 0.80,
      "FixedIncome": 0.60,
      "Commodities": 0.30,
      "Cash": 1.0
    },
    "minCash": 0.02,
    "turnoverLimit": 0.30,
    "riskBudget": {
      "targetVol": 0.12,
      "maxDrawdown": 0.25,
      "cvar95": 0.18
    }
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.constraint_profiles WHERE name = 'Balanced');

INSERT INTO public.constraint_profiles (id, user_id, name, params_json) 
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user
  'Growth',
  '{
    "maxWeightPerAsset": 0.35,
    "maxAssetClassWeights": {
      "Equity": 1.0,
      "FixedIncome": 0.40,
      "Commodities": 0.40,
      "Cash": 1.0
    },
    "minCash": 0.01,
    "turnoverLimit": 0.40,
    "riskBudget": {
      "targetVol": 0.18,
      "maxDrawdown": 0.35,
      "cvar95": 0.25
    }
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.constraint_profiles WHERE name = 'Growth');

-- Create a function to assign admin role to a user by email
CREATE OR REPLACE FUNCTION assign_admin_role_by_email(user_email TEXT)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create sample scenario sets for testing
CREATE OR REPLACE FUNCTION create_sample_scenarios(target_user_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;