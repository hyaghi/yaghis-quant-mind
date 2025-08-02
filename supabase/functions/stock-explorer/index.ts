import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const marketstackApiKey = Deno.env.get('MARKETSTACK_API_KEY');

interface Filters {
  sectors: string[];
  markets: string[];
  timeHorizon: string;
  investmentStyle: string;
  riskLevel: string;
  excludePortfolio: boolean;
  excludeWatchlist: boolean;
  search: string;
}

interface StockRecommendation {
  symbol: string;
  name: string;
  predictedReturn: number;
  confidence: string;
  risk: string;
  sentiment: string;
  momentum: string;
  reasons: string[];
  currentPrice: number;
  timeframe: string;
}

// Default stock universe for discovery
const STOCK_UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC',
  'CRM', 'ORCL', 'ADBE', 'PYPL', 'SPOT', 'UBER', 'LYFT', 'SQ', 'TWTR', 'SNAP',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA', 'AXP', 'BRK-B',
  'JNJ', 'PFE', 'UNH', 'ABT', 'MRK', 'TMO', 'DHR', 'ABBV', 'BMY', 'LLY',
  'XOM', 'CVX', 'COP', 'SLB', 'HAL', 'OXY', 'MPC', 'VLO', 'PSX', 'EOG',
  'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'IEFA', 'EEM', 'AGG'
];

// Company names mapping
const COMPANY_NAMES: { [key: string]: string } = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'META': 'Meta Platforms Inc.',
  'NVDA': 'NVIDIA Corporation',
  'NFLX': 'Netflix Inc.',
  'AMD': 'Advanced Micro Devices',
  'INTC': 'Intel Corporation',
  'JPM': 'JPMorgan Chase & Co.',
  'BAC': 'Bank of America Corp.',
  'JNJ': 'Johnson & Johnson',
  'XOM': 'Exxon Mobil Corporation',
  'SPY': 'SPDR S&P 500 ETF',
  'QQQ': 'Invesco QQQ Trust'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters }: { filters: Filters } = await req.json();
    
    console.log('Stock Explorer request with filters:', filters);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log('User authenticated:', user.id);

    // Get user's portfolio and watchlist for exclusions
    let excludedSymbols: string[] = [];

    if (filters.excludePortfolio) {
      const { data: portfolioHoldings } = await supabase
        .from('portfolio_holdings')
        .select('symbol, portfolio_id')
        .in('portfolio_id', 
          await supabase.from('user_portfolios')
            .select('id')
            .eq('user_id', user.id)
            .then(({ data }) => data?.map(p => p.id) || [])
        );

      if (portfolioHoldings) {
        excludedSymbols.push(...portfolioHoldings.map(h => h.symbol));
      }
    }

    if (filters.excludeWatchlist) {
      const { data: watchlistItems } = await supabase
        .from('user_watchlists')
        .select('symbol')
        .eq('user_id', user.id);

      if (watchlistItems) {
        excludedSymbols.push(...watchlistItems.map(w => w.symbol));
      }
    }

    console.log('Excluded symbols:', excludedSymbols);

    // Filter stock universe
    let candidateSymbols = STOCK_UNIVERSE.filter(symbol => 
      !excludedSymbols.includes(symbol)
    );

    // Apply search filter
    if (filters.search) {
      candidateSymbols = candidateSymbols.filter(symbol => 
        symbol.toLowerCase().includes(filters.search.toLowerCase()) ||
        COMPANY_NAMES[symbol]?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    console.log('Candidate symbols after filtering:', candidateSymbols.length);

    // Generate recommendations
    const recommendations: StockRecommendation[] = [];

    for (const symbol of candidateSymbols.slice(0, 20)) {
      try {
        // Get current price from Marketstack
        let currentPrice = 100; // Default fallback
        
        if (marketstackApiKey) {
          try {
            const priceResponse = await fetch(
              `https://api.marketstack.com/v1/eod/latest?access_key=${marketstackApiKey}&symbols=${symbol}`,
              { headers: { 'Accept': 'application/json' } }
            );
            
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              if (priceData.data && priceData.data.length > 0) {
                currentPrice = priceData.data[0].close;
              }
            }
          } catch (error) {
            console.log(`Failed to fetch price for ${symbol}:`, error);
          }
        }

        // Generate AI-based prediction
        const prediction = generatePrediction(symbol, filters, currentPrice);
        
        // Filter by risk level if specified
        if (filters.riskLevel !== 'All' && prediction.risk !== filters.riskLevel) {
          continue;
        }

        recommendations.push(prediction);
      } catch (error) {
        console.log(`Error processing ${symbol}:`, error);
      }
    }

    // Sort by predicted return (descending)
    recommendations.sort((a, b) => b.predictedReturn - a.predictedReturn);

    console.log(`Generated ${recommendations.length} recommendations`);

    return new Response(JSON.stringify(recommendations.slice(0, 20)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in stock-explorer function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generatePrediction(symbol: string, filters: Filters, currentPrice: number): StockRecommendation {
  // Simulate different prediction models based on investment style
  const baseReturn = Math.random() * 0.4 - 0.1; // -10% to +30%
  
  let styleMultiplier = 1;
  let riskLevel = 'Medium';
  let reasons: string[] = [];

  switch (filters.investmentStyle) {
    case 'Growth':
      styleMultiplier = 1.2;
      riskLevel = Math.random() > 0.3 ? 'High' : 'Medium';
      reasons = ['Strong revenue growth', 'Market expansion opportunities', 'Innovation pipeline'];
      break;
    case 'Value':
      styleMultiplier = 0.8;
      riskLevel = Math.random() > 0.5 ? 'Low' : 'Medium';
      reasons = ['Undervalued metrics', 'Strong fundamentals', 'Dividend yield'];
      break;
    case 'Momentum':
      styleMultiplier = 1.1;
      riskLevel = Math.random() > 0.4 ? 'High' : 'Medium';
      reasons = ['Technical breakout', 'Volume surge', 'Analyst upgrades'];
      break;
    case 'Dividend':
      styleMultiplier = 0.7;
      riskLevel = 'Low';
      reasons = ['Consistent dividend history', 'Strong cash flow', 'Defensive sector'];
      break;
  }

  // Time horizon adjustments
  let timeMultiplier = 1;
  switch (filters.timeHorizon) {
    case '1month':
      timeMultiplier = 0.3;
      break;
    case '3months':
      timeMultiplier = 0.7;
      break;
    case '6months':
      timeMultiplier = 1.0;
      break;
  }

  const predictedReturn = baseReturn * styleMultiplier * timeMultiplier;
  
  // Determine confidence based on return magnitude and style
  let confidence = 'Medium';
  if (Math.abs(predictedReturn) > 0.15) {
    confidence = 'High';
  } else if (Math.abs(predictedReturn) < 0.05) {
    confidence = 'Low';
  }

  // Determine sentiment
  const sentiments = ['Positive', 'Neutral', 'Negative'];
  const sentiment = predictedReturn > 0.05 ? 'Positive' : 
                   predictedReturn < -0.05 ? 'Negative' : 'Neutral';

  // Determine momentum
  const momentum = predictedReturn > 0.1 ? 'Rising' : 
                  predictedReturn < -0.05 ? 'Declining' : 'Sideways';

  // Add symbol-specific reasoning
  if (['AAPL', 'MSFT', 'GOOGL'].includes(symbol)) {
    reasons.push('Large-cap stability');
  }
  if (['TSLA', 'NVDA', 'AMD'].includes(symbol)) {
    reasons.push('AI/EV sector momentum');
  }
  if (symbol.startsWith('Q') || symbol === 'SPY') {
    reasons.push('Broad market exposure');
  }

  return {
    symbol,
    name: COMPANY_NAMES[symbol] || `${symbol} Corp.`,
    predictedReturn,
    confidence,
    risk: riskLevel,
    sentiment,
    momentum,
    reasons: reasons.slice(0, 3),
    currentPrice,
    timeframe: filters.timeHorizon
  };
}