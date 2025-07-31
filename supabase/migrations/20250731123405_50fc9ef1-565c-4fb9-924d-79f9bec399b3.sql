-- First, let's add the admin users to user_roles table
-- We need to get the user IDs first, so we'll insert based on email from profiles

-- Insert admin roles for the specified users
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE p.email IN ('hyaghi@gmail.com', 'sammyaghi@gmail.com')
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id AND ur.role = 'admin'::app_role
);

-- Update RLS policies for user_portfolios to allow admin access
DROP POLICY IF EXISTS "Users can view their own portfolios" ON public.user_portfolios;
CREATE POLICY "Users can view their own portfolios or admins can view all" 
ON public.user_portfolios 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own portfolios" ON public.user_portfolios;
CREATE POLICY "Users can update their own portfolios or admins can update all" 
ON public.user_portfolios 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own portfolios" ON public.user_portfolios;
CREATE POLICY "Users can delete their own portfolios or admins can delete all" 
ON public.user_portfolios 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Update RLS policies for portfolio_holdings to allow admin access
DROP POLICY IF EXISTS "Users can view holdings in their portfolios" ON public.portfolio_holdings;
CREATE POLICY "Users can view holdings in their portfolios or admins can view all" 
ON public.portfolio_holdings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_portfolios 
    WHERE user_portfolios.id = portfolio_holdings.portfolio_id 
    AND user_portfolios.user_id = auth.uid()
  ) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can create holdings in their portfolios" ON public.portfolio_holdings;
CREATE POLICY "Users can create holdings in their portfolios or admins can create all" 
ON public.portfolio_holdings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_portfolios 
    WHERE user_portfolios.id = portfolio_holdings.portfolio_id 
    AND user_portfolios.user_id = auth.uid()
  ) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update holdings in their portfolios" ON public.portfolio_holdings;
CREATE POLICY "Users can update holdings in their portfolios or admins can update all" 
ON public.portfolio_holdings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_portfolios 
    WHERE user_portfolios.id = portfolio_holdings.portfolio_id 
    AND user_portfolios.user_id = auth.uid()
  ) OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can delete holdings in their portfolios" ON public.portfolio_holdings;
CREATE POLICY "Users can delete holdings in their portfolios or admins can delete all" 
ON public.portfolio_holdings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_portfolios 
    WHERE user_portfolios.id = portfolio_holdings.portfolio_id 
    AND user_portfolios.user_id = auth.uid()
  ) OR public.is_admin(auth.uid())
);