import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ExternalLink, 
  RefreshCw, 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Target,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from '@/hooks/usePortfolio';

interface AnalyzedNews {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  tags: {
    tickers: string[];
    sectors: string[];
    riskKeywords: string[];
  };
  analysis: {
    companySector: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    summary: string;
    confidence: number;
  };
}

interface TradingSignal {
  type: 'long_entry' | 'risk_warning' | 'neutral';
  ticker?: string;
  sector?: string;
  reason: string;
  confidence: number;
  articleCount: number;
}

interface NewsResponse {
  success: boolean;
  news: AnalyzedNews[];
  signals: TradingSignal[];
  lastUpdated: string;
  error?: string;
}

interface SectorSummary {
  sector: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  recommendation: string;
  avgScore: number;
  articleCount: number;
}

export default function NewsSentimentDashboard() {
  const [news, setNews] = useState<AnalyzedNews[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { toast } = useToast();

  // Get user's portfolios and watchlist
  const { data: portfolios } = useUserPortfolios();
  const selectedPortfolioId = portfolios?.[0]?.id || null;
  const { data: holdings } = usePortfolioHoldings(selectedPortfolioId);
  const { data: watchlist } = useWatchlist();
  
  // News sentiment covers both portfolio and watchlist symbols
  const portfolioSymbols = holdings?.map(h => h.symbol) || [];
  const watchlistSymbols = watchlist?.map(w => w.symbol) || [];
  const allSymbols = [...new Set([...portfolioSymbols, ...watchlistSymbols])];
  
  // Use actual user symbols
  const symbols = allSymbols.length > 0 ? allSymbols : ['AAPL', 'TSLA', 'MSFT'];

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('analyze-financial-news', {
        body: {
          tickers: symbols,
          sectors: ['AI', 'technology', 'energy', 'finance', 'healthcare', 'automotive']
        }
      });

      if (error) {
        throw error;
      }

      const response = data as NewsResponse;
      
      if (response.success) {
        setNews(response.news);
        setSignals(response.signals || []);
        setLastUpdated(response.lastUpdated);
        toast({
          title: "News Updated",
          description: `Loaded ${response.news.length} analyzed headlines and ${response.signals?.length || 0} signals`,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch news');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Error",
        description: "Failed to load financial news",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    
    // Auto-refresh every hour
    const interval = setInterval(fetchNews, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-profit" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-loss" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'negative':
        return 'bg-loss/10 text-loss border-loss/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'long_entry':
        return <Target className="h-4 w-4 text-profit" />;
      case 'risk_warning':
        return <AlertTriangle className="h-4 w-4 text-loss" />;
      default:
        return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'long_entry':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'risk_warning':
        return 'bg-loss/10 text-loss border-loss/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  const generateSectorSummary = (): SectorSummary[] => {
    const sectorMap: Record<string, { scores: number[]; articles: AnalyzedNews[] }> = {};
    
    news.forEach(article => {
      article.tags.sectors.forEach(sector => {
        if (!sectorMap[sector]) {
          sectorMap[sector] = { scores: [], articles: [] };
        }
        sectorMap[sector].scores.push(article.analysis.sentimentScore);
        sectorMap[sector].articles.push(article);
      });
    });

    return Object.entries(sectorMap).map(([sector, data]) => {
      const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
      let recommendation: string;

      if (avgScore > 0.3) {
        sentiment = 'positive';
        recommendation = 'Bullish';
      } else if (avgScore < -0.3) {
        sentiment = 'negative';
        recommendation = 'Bearish';
      } else if (data.scores.some(s => s > 0.5) && data.scores.some(s => s < -0.5)) {
        sentiment = 'mixed';
        recommendation = 'Watchlist';
      } else {
        sentiment = 'neutral';
        recommendation = 'Caution';
      }

      return {
        sector,
        sentiment,
        recommendation,
        avgScore,
        articleCount: data.articles.length
      };
    }).sort((a, b) => b.articleCount - a.articleCount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1h ago';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1d ago';
    return `${diffInDays}d ago`;
  };

  const sectorSummary = generateSectorSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">News Sentiment Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered financial news analysis for your portfolio: {symbols.join(', ')}
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNews}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Trading Signals */}
      {signals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Active Trading Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {signals.map((signal, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      variant="outline" 
                      className={`flex items-center space-x-1 ${getSignalColor(signal.type)}`}
                    >
                      {getSignalIcon(signal.type)}
                      <span className="capitalize">{signal.type.replace('_', ' ')}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {signal.ticker || signal.sector}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{signal.reason}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Confidence: {(signal.confidence * 100).toFixed(0)}%</span>
                    <span>{signal.articleCount} articles</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sector Summary View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorSummary.map((sector, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{sector.sector}</h4>
                  {getSentimentIcon(sector.sentiment)}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sentiment:</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getSentimentColor(sector.sentiment)}`}
                    >
                      {sector.sentiment}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Recommendation:</span>
                    <span className="text-sm font-medium">{sector.recommendation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Score:</span>
                    <span className="text-sm">{sector.avgScore.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Articles:</span>
                    <span className="text-sm">{sector.articleCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Top News Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Newspaper className="h-5 w-5 mr-2" />
            Today&apos;s Top News
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Headline</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news.map((article, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.tags.tickers.slice(0, 2).map(ticker => (
                          <Badge key={ticker} variant="outline" className="text-xs">
                            {ticker}
                          </Badge>
                        ))}
                        {article.tags.tickers.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{article.tags.tickers.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="font-medium text-sm line-clamp-2 mb-1">
                          {article.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {article.source}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getSentimentIcon(article.analysis.sentiment)}
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {article.analysis.sentimentScore.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {article.analysis.sentiment}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-xs line-clamp-2">
                        {article.analysis.summary}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-sm font-medium">
                          {(article.analysis.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(article.publishedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(article.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {news.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No financial news available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}