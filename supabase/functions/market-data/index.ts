import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols)) {
      throw new Error('Symbols array is required');
    }

    console.log('Fetching market data for:', symbols);

    // Use Yahoo Finance API through server-side request
    const symbolsString = symbols.join(',');
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsString}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error('Yahoo Finance API error:', response.status, response.statusText);
      
      // Fallback to mock data if Yahoo Finance fails
      const mockData = symbols.map(symbol => ({
        symbol,
        regularMarketPrice: Math.random() * 200 + 100, // Random price between 100-300
        regularMarketChange: (Math.random() - 0.5) * 10, // Random change between -5 to +5
        regularMarketChangePercent: (Math.random() - 0.5) * 5, // Random % change between -2.5% to +2.5%
        regularMarketTime: Date.now() / 1000,
        shortName: symbol === 'SPY' ? 'SPDR S&P 500 ETF' : 
                   symbol === '^GSPC' ? 'S&P 500' :
                   symbol === '^IXIC' ? 'NASDAQ Composite' :
                   symbol === '^VIX' ? 'CBOE Volatility Index' : symbol
      }));

      return new Response(JSON.stringify({
        success: true,
        data: mockData,
        source: 'mock',
        message: 'Using mock data due to API limitations'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    if (!data.quoteResponse || !data.quoteResponse.result) {
      throw new Error('Invalid response format from Yahoo Finance');
    }

    const quotes = data.quoteResponse.result.map(quote => ({
      symbol: quote.symbol,
      regularMarketPrice: quote.regularMarketPrice || 0,
      regularMarketChange: quote.regularMarketChange || 0,
      regularMarketChangePercent: quote.regularMarketChangePercent || 0,
      regularMarketTime: quote.regularMarketTime || Date.now() / 1000,
      shortName: quote.shortName || quote.symbol
    }));

    console.log(`Successfully fetched ${quotes.length} quotes`);

    return new Response(JSON.stringify({
      success: true,
      data: quotes,
      source: 'yahoo',
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in market-data function:', error);
    
    // Always return some data, even if it's mock data
    const { symbols = ['SPY', '^GSPC', '^IXIC', '^VIX'] } = await req.json().catch(() => ({}));
    
    const fallbackData = symbols.map(symbol => ({
      symbol,
      regularMarketPrice: Math.random() * 200 + 100,
      regularMarketChange: (Math.random() - 0.5) * 10,
      regularMarketChangePercent: (Math.random() - 0.5) * 5,
      regularMarketTime: Date.now() / 1000,
      shortName: symbol === 'SPY' ? 'SPDR S&P 500 ETF' : 
                 symbol === '^GSPC' ? 'S&P 500' :
                 symbol === '^IXIC' ? 'NASDAQ Composite' :
                 symbol === '^VIX' ? 'CBOE Volatility Index' : symbol
    }));

    return new Response(JSON.stringify({
      success: true,
      data: fallbackData,
      source: 'fallback',
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});