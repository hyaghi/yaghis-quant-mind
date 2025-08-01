import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  AlertTriangle,
  BarChart3,
  Newspaper,
  Activity,
  DollarSign,
  Clock,
  Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from "@/hooks/usePortfolio";

interface StockPrediction {
  symbol: string;
  currentPrice: number;
  predictedDirection: 'bullish' | 'bearish' | 'neutral';
  predictedPriceRange: {
    low: number;
    high: number;
    target: number;
  };
  timeframe: '1day' | '1week' | '1month';
  confidence: number;
  reasoning: string;
  keyFactors: {
    newsImpact: number;
    technicalScore: number;
    volumePattern: number;
    marketSentiment: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
}

export default function StockPrediction() {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("1week");
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<StockPrediction | null>(null);

  // Get user's portfolio symbols for quick selection
  const { data: portfolios } = useUserPortfolios();
  const { data: watchlist } = useWatchlist();
  
  // State to store all holdings from all portfolios
  const [allHoldings, setAllHoldings] = useState<any[]>([]);
  
  // Fetch holdings from all portfolios
  useEffect(() => {
    const fetchAllHoldings = async () => {
      if (!portfolios || portfolios.length === 0) return;
      
      try {
        const holdingsPromises = portfolios.map(async (portfolio) => {
          const { data: holdings } = await supabase
            .from('portfolio_holdings')
            .select('*')
            .eq('portfolio_id', portfolio.id);
          return holdings || [];
        });
        
        const allPortfolioHoldings = await Promise.all(holdingsPromises);
        const flattenedHoldings = allPortfolioHoldings.flat();
        setAllHoldings(flattenedHoldings);
      } catch (error) {
        console.error('Error fetching portfolio holdings:', error);
      }
    };
    
    fetchAllHoldings();
  }, [portfolios]);
  
  // Create unique list of symbols from all portfolio holdings and watchlist
  const userSymbols = [
    ...allHoldings.map(h => h.symbol),
    ...(watchlist?.map(w => w.symbol) || [])
  ].filter((symbol, index, arr) => arr.indexOf(symbol) === index);

  const handlePredict = async () => {
    if (!symbol.trim()) {
      toast({
        title: "Symbol Required",
        description: "Please enter a stock symbol",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('predict-stock-performance', {
        body: {
          symbol: symbol.toUpperCase(),
          timeframe
        }
      });

      if (error) throw error;

      if (data.success) {
        setPrediction(data.prediction);
        toast({
          title: "Prediction Generated",
          description: `AI analysis complete for ${symbol.toUpperCase()}`
        });
      } else {
        throw new Error(data.error || 'Prediction failed');
      }
    } catch (error) {
      console.error('Error generating prediction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate prediction",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return <TrendingUp className="h-5 w-5 text-profit" />;
      case 'bearish':
        return <TrendingDown className="h-5 w-5 text-loss" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'bearish':
        return 'bg-loss/10 text-loss border-loss/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'high':
        return 'bg-loss/10 text-loss border-loss/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Stock Prediction</h1>
          <p className="text-muted-foreground">
            Get AI-powered stock predictions based on news sentiment and technical analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Generate Prediction
          </CardTitle>
          <CardDescription>
            Enter a stock symbol to get AI-powered performance predictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="symbol">Stock Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL, TSLA, SPY"
                className="uppercase"
              />
            </div>
            <div>
              <Label htmlFor="timeframe">Prediction Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 Day</SelectItem>
                  <SelectItem value="1week">1 Week</SelectItem>
                  <SelectItem value="1month">1 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handlePredict} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Analyzing..." : "Generate Prediction"}
              </Button>
            </div>
          </div>

          {/* Quick Select from Portfolio */}
          {userSymbols.length > 0 && (
            <div>
              <Label>Quick Select from Your Holdings:</Label>
              <Select onValueChange={(value) => setSymbol(value)}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Select a stock from your portfolio or watchlist" />
                </SelectTrigger>
                <SelectContent>
                  {userSymbols.map((sym) => (
                    <SelectItem key={sym} value={sym}>
                      {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                Analyzing market data and news sentiment...
              </div>
              <Progress value={75} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prediction Results */}
      {prediction && (
        <div className="space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getDirectionIcon(prediction.predictedDirection)}
                  <span>{prediction.symbol} Prediction</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={getDirectionColor(prediction.predictedDirection)}
                >
                  {prediction.predictedDirection.toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>
                {prediction.timeframe} outlook • Last updated {new Date(prediction.lastUpdated).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Current Price
                  </div>
                  <div className="text-2xl font-bold">
                    {formatPrice(prediction.currentPrice)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Target Price
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {formatPrice(prediction.predictedPriceRange.target)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Brain className="h-4 w-4" />
                    Confidence
                  </div>
                  <div className="text-2xl font-bold">
                    {formatPercentage(prediction.confidence)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Level
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getRiskColor(prediction.riskLevel)}
                  >
                    {prediction.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Range */}
          <Card>
            <CardHeader>
              <CardTitle>Price Range Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Low</span>
                  <span className="font-semibold">{formatPrice(prediction.predictedPriceRange.low)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <span className="font-bold text-lg text-primary">{formatPrice(prediction.predictedPriceRange.target)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">High</span>
                  <span className="font-semibold">{formatPrice(prediction.predictedPriceRange.high)}</span>
                </div>
                <div className="mt-4">
                  <div className="bg-muted h-2 rounded-full relative">
                    <div 
                      className="bg-primary h-2 rounded-full absolute"
                      style={{
                        width: `${((prediction.predictedPriceRange.target - prediction.predictedPriceRange.low) / (prediction.predictedPriceRange.high - prediction.predictedPriceRange.low)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analysis Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4" />
                      <span className="text-sm">News Impact</span>
                    </div>
                    <span className="font-semibold">{formatPercentage(prediction.keyFactors.newsImpact)}</span>
                  </div>
                  <Progress value={prediction.keyFactors.newsImpact * 100} className="h-2" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm">Technical Score</span>
                    </div>
                    <span className="font-semibold">{formatPercentage(prediction.keyFactors.technicalScore)}</span>
                  </div>
                  <Progress value={prediction.keyFactors.technicalScore * 100} className="h-2" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">Volume Pattern</span>
                    </div>
                    <span className="font-semibold">{formatPercentage(prediction.keyFactors.volumePattern)}</span>
                  </div>
                  <Progress value={prediction.keyFactors.volumePattern * 100} className="h-2" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      <span className="text-sm">Market Sentiment</span>
                    </div>
                    <span className="font-semibold">{formatPercentage(prediction.keyFactors.marketSentiment)}</span>
                  </div>
                  <Progress value={prediction.keyFactors.marketSentiment * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Reasoning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Analysis & Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {prediction.reasoning}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}