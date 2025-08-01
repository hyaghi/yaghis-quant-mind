-- Create stock predictions table for storing AI predictions
CREATE TABLE public.stock_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  current_price DECIMAL(10,2) NOT NULL,
  predicted_direction TEXT NOT NULL CHECK (predicted_direction IN ('bullish', 'bearish', 'neutral')),
  predicted_price_range JSONB NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1day', '1week', '1month')),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT NOT NULL,
  key_factors JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.stock_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (predictions can be viewed by all users)
CREATE POLICY "Stock predictions are viewable by everyone" 
ON public.stock_predictions 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_stock_predictions_symbol ON public.stock_predictions(symbol);
CREATE INDEX idx_stock_predictions_created_at ON public.stock_predictions(created_at);
CREATE INDEX idx_stock_predictions_timeframe ON public.stock_predictions(timeframe);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_stock_predictions_updated_at
BEFORE UPDATE ON public.stock_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();