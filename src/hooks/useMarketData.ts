import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  fetchQuote, 
  fetchMultipleQuotes, 
  getMarketOverview, 
  generateAISignals,
  generatePortfolioData,
  MarketQuote 
} from '@/services/marketData';

export function useMarketQuote(symbol: string) {
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => fetchQuote(symbol),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

export function useMultipleQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ['quotes', symbols],
    queryFn: () => fetchMultipleQuotes(symbols),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useMarketOverview() {
  return useQuery({
    queryKey: ['market-overview'],
    queryFn: getMarketOverview,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

export function useAISignals(symbols: string[] = ['AAPL', 'TSLA', 'SPY']) {
  return useQuery({
    queryKey: ['ai-signals', symbols],
    queryFn: () => generateAISignals(symbols),
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000,
  });
}

export function usePortfolioData() {
  const [portfolioData] = useState(() => generatePortfolioData());
  
  return {
    data: portfolioData,
    isLoading: false,
    error: null
  };
}

// Portfolio metrics hook (combines real market data with simulated portfolio)
export function usePortfolioMetrics() {
  const portfolioData = usePortfolioData();
  const spyQuote = useMarketQuote('SPY');
  
  const [metrics, setMetrics] = useState({
    totalEquity: 0,
    dailyPL: 0,
    dailyPLPercent: 0,
    sharpeRatio: 1.84,
    maxDrawdown: -3.2
  });

  useEffect(() => {
    if (portfolioData.data && portfolioData.data.length > 0) {
      const currentValue = portfolioData.data[portfolioData.data.length - 1].value;
      const previousValue = portfolioData.data[portfolioData.data.length - 2]?.value || currentValue;
      const dailyChange = currentValue - previousValue;
      const dailyChangePercent = (dailyChange / previousValue) * 100;

      setMetrics({
        totalEquity: currentValue,
        dailyPL: dailyChange,
        dailyPLPercent: dailyChangePercent,
        sharpeRatio: 1.84, // Would be calculated from real portfolio returns
        maxDrawdown: -3.2  // Would be calculated from historical drawdown
      });
    }
  }, [portfolioData.data]);

  return {
    ...metrics,
    isLoading: portfolioData.isLoading || spyQuote.isLoading,
    error: portfolioData.error || spyQuote.error
  };
}