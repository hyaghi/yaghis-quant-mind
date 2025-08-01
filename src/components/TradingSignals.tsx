import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAISignals } from '@/hooks/useMarketData';
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from '@/hooks/usePortfolio';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Target, Clock } from 'lucide-react';

export default function TradingSignals() {
  // Get user's portfolios and watchlist
  const { data: portfolios } = useUserPortfolios();
  const { data: watchlist } = useWatchlist();
  
  // Use the "Husam" portfolio specifically (from your data)
  // Or fallback to first portfolio if Husam not found
  const husamPortfolio = portfolios?.find(p => p.name === 'Husam');
  const selectedPortfolioId = husamPortfolio?.id || portfolios?.[0]?.id || null;
  const { data: holdings } = usePortfolioHoldings(selectedPortfolioId);
  
  // Combine portfolio and watchlist symbols for trading signals
  // (Makes sense to get signals for both what you own AND what you're watching)
  const portfolioSymbols = holdings?.map(h => h.symbol) || [];
  const watchlistSymbols = watchlist?.map(w => w.symbol) || [];
  const allSymbols = [...new Set([...portfolioSymbols, ...watchlistSymbols])];
  
  // Fallback to default symbols if user has no portfolio/watchlist
  const symbols = allSymbols.length > 0 ? allSymbols : ['SPY', 'QQQ', 'VTI'];
  
  const { data: signals, isLoading, error, refetch } = useAISignals(symbols);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">AI Trading Signals</h2>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-24 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h3 className="mt-2 text-sm font-semibold">Error loading signals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Unable to fetch trading signals. Please try again.
            </p>
            <Button onClick={() => refetch()} className="mt-4" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-green-600 bg-green-50 border-green-200';
      case 'SELL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY': return <TrendingUp className="h-4 w-4" />;
      case 'SELL': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Trading Signals</h2>
          <p className="text-muted-foreground">Real-time algorithmic trading recommendations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {signals?.map((signal) => (
          <Card key={signal.symbol} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{signal.symbol}</CardTitle>
                <Badge 
                  variant="outline" 
                  className={`${getSignalColor(signal.signal)} flex items-center gap-1`}
                >
                  {getSignalIcon(signal.signal)}
                  {signal.signal}
                </Badge>
              </div>
              <CardDescription>
                ${signal.price.toFixed(2)} 
                <span className={`ml-2 ${signal.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({signal.change >= 0 ? '+' : ''}{signal.change.toFixed(2)}%)
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Confidence
                  </span>
                  <span className="font-medium">{signal.confidence}%</span>
                </div>
                <Progress value={signal.confidence} className="h-2" />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="leading-relaxed">{signal.reason}</p>
              </div>
              
              <div className="text-xs text-muted-foreground border-t pt-3">
                Generated {signal.timestamp}
              </div>
            </CardContent>
            
            {/* Animated signal strength indicator */}
            <div 
              className={`absolute top-0 left-0 h-1 bg-gradient-to-r transition-all duration-1000 ${
                signal.signal === 'BUY' 
                  ? 'from-green-400 to-green-600' 
                  : signal.signal === 'SELL'
                  ? 'from-red-400 to-red-600'
                  : 'from-yellow-400 to-yellow-600'
              }`}
              style={{ width: `${signal.confidence}%` }}
            />
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Signal Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">
                {signals?.filter(s => s.signal === 'BUY').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Buy Signals</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-600">
                {signals?.filter(s => s.signal === 'SELL').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Sell Signals</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-yellow-600">
                {signals?.filter(s => s.signal === 'HOLD').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Hold Signals</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}