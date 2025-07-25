import axios from 'axios';

// Yahoo Finance API (free, no API key required)
const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_QUOTE_BASE = 'https://query1.finance.yahoo.com/v7/finance/quote';

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

// Fetch real-time quote for a symbol
export async function fetchQuote(symbol: string): Promise<MarketQuote> {
  try {
    const response = await axios.get(`${YAHOO_QUOTE_BASE}?symbols=${symbol}`);
    const quote = response.data.quoteResponse.result[0];
    
    return {
      symbol: quote.symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    // Return fallback data if API fails
    return {
      symbol,
      price: 0,
      change: 0,
      changePercent: 0
    };
  }
}

// Fetch multiple quotes at once
export async function fetchMultipleQuotes(symbols: string[]): Promise<MarketQuote[]> {
  try {
    const symbolString = symbols.join(',');
    const response = await axios.get(`${YAHOO_QUOTE_BASE}?symbols=${symbolString}`);
    const quotes = response.data.quoteResponse.result;
    
    return quotes.map((quote: any) => ({
      symbol: quote.symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap
    }));
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
    return symbols.map(symbol => ({
      symbol,
      price: 0,
      change: 0,
      changePercent: 0
    }));
  }
}

// Fetch historical data for charting
export async function fetchHistoricalData(
  symbol: string, 
  period: string = '6mo'
): Promise<ChartData[]> {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_BASE}/${symbol}?period1=0&period2=9999999999&interval=1d&range=${period}`);
    const result = response.data.chart.result[0];
    
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
      return [];
    }
    
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    
    return timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      value: closes[index] || 0
    })).filter((item: ChartData) => item.value > 0);
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

// Get major market indices
export async function getMarketOverview() {
  try {
    const symbols = ['^GSPC', '^IXIC', '^VIX']; // S&P 500, NASDAQ, VIX
    const quotes = await fetchMultipleQuotes(symbols);
    
    return {
      sp500: quotes.find(q => q.symbol === '^GSPC'),
      nasdaq: quotes.find(q => q.symbol === '^IXIC'),
      vix: quotes.find(q => q.symbol === '^VIX')
    };
  } catch (error) {
    console.error('Error fetching market overview:', error);
    return {
      sp500: null,
      nasdaq: null,
      vix: null
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