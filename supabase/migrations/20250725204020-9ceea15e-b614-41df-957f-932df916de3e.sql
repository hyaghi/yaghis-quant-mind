-- Create user portfolios table
CREATE TABLE public.user_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  description TEXT,
  initial_value DECIMAL(15,2) DEFAULT 100000.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio holdings table  
CREATE TABLE public.portfolio_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.user_portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
  average_cost DECIMAL(15,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, symbol)
);

-- Create user watchlists table
CREATE TABLE public.user_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  notes TEXT,
  price_alert DECIMAL(15,6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Enable RLS
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_portfolios
CREATE POLICY "Users can view their own portfolios" 
ON public.user_portfolios 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios" 
ON public.user_portfolios 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" 
ON public.user_portfolios 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios" 
ON public.user_portfolios 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for portfolio_holdings
CREATE POLICY "Users can view holdings in their portfolios" 
ON public.portfolio_holdings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_portfolios 
    WHERE id = portfolio_holdings.portfolio_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create holdings in their portfolios" 
ON public.portfolio_holdings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_portfolios 
    WHERE id = portfolio_holdings.portfolio_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update holdings in their portfolios" 
ON public.portfolio_holdings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_portfolios 
    WHERE id = portfolio_holdings.portfolio_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete holdings in their portfolios" 
ON public.portfolio_holdings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_portfolios 
    WHERE id = portfolio_holdings.portfolio_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for user_watchlists
CREATE POLICY "Users can view their own watchlist" 
ON public.user_watchlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watchlist items" 
ON public.user_watchlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist items" 
ON public.user_watchlists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items" 
ON public.user_watchlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_portfolios_updated_at
BEFORE UPDATE ON public.user_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_holdings_updated_at
BEFORE UPDATE ON public.portfolio_holdings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();