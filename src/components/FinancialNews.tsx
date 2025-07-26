import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AnalyzedNews {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  analysis: {
    companySector: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    summary: string;
  };
}

interface NewsResponse {
  success: boolean;
  news: AnalyzedNews[];
  lastUpdated: string;
  error?: string;
}

export default function FinancialNews() {
  const [news, setNews] = useState<AnalyzedNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { toast } = useToast();

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('analyze-financial-news', {
        body: {
          tickers: ['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ'],
          sectors: ['AI', 'technology', 'energy', 'finance']
        }
      });

      if (error) {
        throw error;
      }

      const response = data as NewsResponse;
      
      if (response.success) {
        setNews(response.news);
        setLastUpdated(response.lastUpdated);
        toast({
          title: "News Updated",
          description: `Loaded ${response.news.length} analyzed headlines`,
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
        return <TrendingUp className="h-3 w-3" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Newspaper className="h-5 w-5 mr-2" />
            AI-Analyzed Financial News
          </span>
          <div className="flex items-center space-x-2">
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && news.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {news.map((article, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                <div className="space-y-3">
                  {/* Header with source and timing */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{article.source}</span>
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                  </div>
                  
                  {/* Title */}
                  <h4 className="font-medium text-sm leading-tight line-clamp-2">
                    {article.title}
                  </h4>
                  
                  {/* AI Analysis */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {article.analysis.companySector}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs flex items-center space-x-1 ${getSentimentColor(article.analysis.sentiment)}`}
                      >
                        {getSentimentIcon(article.analysis.sentiment)}
                        <span className="capitalize">{article.analysis.sentiment}</span>
                        <span className="text-xs opacity-70">
                          ({article.analysis.sentimentScore.toFixed(1)})
                        </span>
                      </Badge>
                    </div>
                    
                    {/* AI Summary */}
                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                      {article.analysis.summary}
                    </p>
                  </div>
                  
                  {/* Footer with link */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs p-0 h-auto"
                      onClick={() => window.open(article.url, '_blank')}
                    >
                      Read full article
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {news.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No financial news available</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}