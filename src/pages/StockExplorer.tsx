import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Eye, 
  HelpCircle, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  Search
} from 'lucide-react';

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

const SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive', 'Energy',
  'Utilities', 'Real Estate', 'Basic Materials'
];

const MARKETS = ['US', 'GCC', 'KSA', 'Emerging Markets', 'Europe', 'Asia'];
const TIME_HORIZONS = ['1month', '3months', '6months'];
const INVESTMENT_STYLES = ['Growth', 'Value', 'Momentum', 'Dividend'];
const RISK_LEVELS = ['Low', 'Medium', 'High'];

export default function StockExplorer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    sectors: [],
    markets: ['US'],
    timeHorizon: '3months',
    investmentStyle: 'Growth',
    riskLevel: 'Medium',
    excludePortfolio: true,
    excludeWatchlist: true,
    search: ''
  });

  const { data: recommendations, isLoading, error, refetch } = useQuery({
    queryKey: ['stock-explorer', filters],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-explorer', {
        body: { filters }
      });
      
      if (error) throw error;
      return data as StockRecommendation[];
    },
    enabled: !!user
  });

  const addToWatchlist = async (symbol: string) => {
    try {
      const { error } = await supabase
        .from('user_watchlists')
        .insert({
          user_id: user?.id,
          symbol: symbol
        });

      if (error) throw error;

      toast({
        title: "Added to Watchlist",
        description: `${symbol} has been added to your watchlist.`,
      });

      // Log the action
      await supabase.from('audit_events').insert({
        user_id: user?.id,
        event_type: 'stock_explorer_add_watchlist',
        payload_json: { symbol } as any
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add to watchlist",
        variant: "destructive"
      });
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getReturnIcon = (predictedReturn: number) => {
    if (predictedReturn > 0.1) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (predictedReturn < -0.05) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  useEffect(() => {
    // Log page view
    if (user) {
      supabase.from('audit_events').insert({
        user_id: user.id,
        event_type: 'stock_explorer_view',
        payload_json: filters as any
      });
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Discover high-potential stocks outside your portfolio and watchlist
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className={`lg:col-span-1 space-y-6 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div>
                <Label htmlFor="search">Search Symbol</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="e.g., AAPL, TSLA"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Time Horizon */}
              <div>
                <Label>Time Horizon</Label>
                <Select 
                  value={filters.timeHorizon} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, timeHorizon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Investment Style */}
              <div>
                <Label>Investment Style</Label>
                <Select 
                  value={filters.investmentStyle} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, investmentStyle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_STYLES.map(style => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Level */}
              <div>
                <Label>Risk Level</Label>
                <Select 
                  value={filters.riskLevel} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exclusions */}
              <div className="space-y-3">
                <Label>Exclusions</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="excludePortfolio"
                    checked={filters.excludePortfolio}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, excludePortfolio: checked as boolean }))
                    }
                  />
                  <Label htmlFor="excludePortfolio" className="text-sm">
                    Exclude portfolio stocks
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="excludeWatchlist"
                    checked={filters.excludeWatchlist}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, excludeWatchlist: checked as boolean }))
                    }
                  />
                  <Label htmlFor="excludeWatchlist" className="text-sm">
                    Exclude watchlist stocks
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Top Recommendations
                {recommendations && (
                  <Badge variant="secondary">
                    {recommendations.length} stocks found
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Failed to load recommendations</p>
                  <Button onClick={() => refetch()} className="mt-2">
                    Try Again
                  </Button>
                </div>
              ) : recommendations && recommendations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Return Est.</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recommendations.map((stock) => (
                      <TableRow key={stock.symbol}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {getReturnIcon(stock.predictedReturn)}
                              {stock.symbol}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {stock.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              stock.predictedReturn > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {stock.predictedReturn > 0 ? '+' : ''}{(stock.predictedReturn * 100).toFixed(1)}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({stock.timeframe})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getConfidenceColor(stock.confidence)}>
                            {stock.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskColor(stock.risk)}>
                            {stock.risk}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${
                            stock.sentiment === 'Positive' ? 'text-green-600' : 
                            stock.sentiment === 'Negative' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {stock.sentiment}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToWatchlist(stock.symbol)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Watch
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <HelpCircle className="h-4 w-4 mr-1" />
                                  Why?
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Why {stock.symbol}?</DialogTitle>
                                  <DialogDescription>
                                    AI analysis and key drivers for this recommendation
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Key Factors</h4>
                                    <ul className="space-y-1">
                                      {stock.reasons.map((reason, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                          {reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                      <p className="text-sm font-medium">Current Price</p>
                                      <p className="text-lg">${stock.currentPrice.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Confidence</p>
                                      <Badge className={getConfidenceColor(stock.confidence)}>
                                        {stock.confidence}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No recommendations found with current filters
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters or check back later
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}