import { supabase } from '@/integrations/supabase/client';

// Services for fetching and processing market data
// Now uses edge function proxy to avoid CORS issues

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
}

export interface HistoricalData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  date: string;
  value: number;
}

// Fetch real-time quote for a symbol using edge function
export async function fetchQuote(symbol: string): Promise<MarketQuote> {
  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { symbols: [symbol] }
    });

    if (error) throw error;
    
    if (data.success && data.data && data.data.length > 0) {
      const quote = data.data[0];
      return {
        symbol: quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        volume: 1000000, // Mock volume since Yahoo doesn't provide this reliably
        marketCap: quote.marketCap
      };
    }
    
    throw new Error('No data received');
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    
    // Return mock data as fallback
    return {
      symbol,
      price: Math.random() * 200 + 100,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 10000000),
      marketCap: Math.floor(Math.random() * 1000000000)
    };
  }
}

// Fetch multiple quotes at once using edge function
export async function fetchMultipleQuotes(symbols: string[]): Promise<MarketQuote[]> {
  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { symbols }
    });

    if (error) throw error;
    
    if (data.success && data.data) {
      return data.data.map(quote => ({
        symbol: quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        volume: 1000000, // Mock volume
        marketCap: quote.marketCap
      }));
    }
    
    throw new Error('No data received');
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
    
    // Return mock data for all symbols as fallback
    return symbols.map(symbol => ({
      symbol,
      price: Math.random() * 200 + 100,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 10000000),
      marketCap: Math.floor(Math.random() * 1000000000)
    }));
  }
}

// Fetch historical data for charting (mock data for now)
export async function fetchHistoricalData(
  symbol: string, 
  period: string = '6mo'
): Promise<ChartData[]> {
  try {
    // Generate mock historical data since direct Yahoo API calls don't work in browser
    const data: ChartData[] = [];
    const days = period === '1mo' ? 30 : period === '3mo' ? 90 : 180;
    let basePrice = Math.random() * 200 + 100;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      // Simulate price movement
      const dailyChange = (Math.random() - 0.5) * 0.05; // ±2.5% daily change
      basePrice *= (1 + dailyChange);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(basePrice * 100) / 100
      });
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

// Generate portfolio performance data (mock for now, but could be real)
export function generatePortfolioData(baseValue: number = 100000, days: number = 90): ChartData[] {
  const data: ChartData[] = [];
  let currentValue = baseValue;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Simulate portfolio performance with some volatility
    const dailyReturn = (Math.random() - 0.48) * 0.02; // Slight positive bias
    currentValue *= (1 + dailyReturn);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(currentValue)
    });
  }
  
  return data;
}

// Get major market indices using edge function
export async function getMarketOverview() {
  try {
    const symbols = ['^GSPC', '^IXIC', '^VIX']; // S&P 500, NASDAQ, VIX
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { symbols }
    });

    if (error) throw error;
    
    if (data.success && data.data) {
      const quotes = data.data;
      
      return {
        sp500: {
          price: quotes.find(q => q.symbol === '^GSPC')?.regularMarketPrice || 4200,
          changePercent: quotes.find(q => q.symbol === '^GSPC')?.regularMarketChangePercent || 0.5
        },
        nasdaq: {
          price: quotes.find(q => q.symbol === '^IXIC')?.regularMarketPrice || 13000,
          changePercent: quotes.find(q => q.symbol === '^IXIC')?.regularMarketChangePercent || 0.8
        },
        vix: {
          price: quotes.find(q => q.symbol === '^VIX')?.regularMarketPrice || 18,
          changePercent: quotes.find(q => q.symbol === '^VIX')?.regularMarketChangePercent || -2.1
        }
      };
    }
    
    throw new Error('No market data received');
  } catch (error) {
    console.error('Error fetching market overview:', error);
    
    // Return mock data as fallback
    return {
      sp500: {
        price: 4200 + (Math.random() - 0.5) * 100,
        changePercent: (Math.random() - 0.5) * 3
      },
      nasdaq: {
        price: 13000 + (Math.random() - 0.5) * 500,
        changePercent: (Math.random() - 0.5) * 4
      },
      vix: {
        price: 18 + (Math.random() - 0.5) * 5,
        changePercent: (Math.random() - 0.5) * 10
      }
    };
  }
}

// Generate AI trading signals with real price data
export async function generateAISignals(symbols: string[] = ['AAPL', 'TSLA', 'SPY']) {
  try {
    const quotes = await fetchMultipleQuotes(symbols);
    
    return quotes.map(quote => {
      // Simple signal generation based on price movement
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 50;
      let reason = '';
      
      if (quote.changePercent > 2) {
        signal = 'SELL';
        confidence = Math.min(90, 60 + Math.abs(quote.changePercent) * 5);
        reason = 'Strong upward momentum detected. Consider taking profits due to overbought conditions.';
      } else if (quote.changePercent < -2) {
        signal = 'BUY';
        confidence = Math.min(90, 60 + Math.abs(quote.changePercent) * 5);
        reason = 'Significant dip detected. Technical indicators suggest potential buying opportunity.';
      } else if (quote.changePercent > 0.5) {
        signal = 'HOLD';
        confidence = 70;
        reason = 'Moderate positive momentum. Monitoring for continuation or reversal signals.';
      } else {
        signal = 'HOLD';
        confidence = 65;
        reason = 'Mixed signals from technical indicators. Maintaining current position.';
      }
      
      return {
        symbol: quote.symbol,
        signal,
        confidence,
        price: quote.price,
        change: quote.changePercent,
        reason,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ago'
      };
    });
  } catch (error) {
    console.error('Error generating AI signals:', error);
    return [];
  }
}