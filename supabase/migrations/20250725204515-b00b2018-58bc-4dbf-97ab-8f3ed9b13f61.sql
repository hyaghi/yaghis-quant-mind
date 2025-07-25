-- Enable realtime for portfolio tables
ALTER TABLE public.user_portfolios REPLICA IDENTITY FULL;
ALTER TABLE public.portfolio_holdings REPLICA IDENTITY FULL; 
ALTER TABLE public.user_watchlists REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_portfolios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_holdings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_watchlists;