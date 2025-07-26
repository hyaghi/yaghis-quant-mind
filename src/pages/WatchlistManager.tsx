import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Eye, 
  Plus, 
  Trash2, 
  Edit, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Bell,
  BellOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface WatchlistItem {
  id: string;
  symbol: string;
  notes: string;
  price_alert: number | null;
  created_at: string;
}

interface DailySummary {
  date: string;
  topBullishEvents: Array<{
    title: string;
    ticker: string;
    sentiment: number;
    summary: string;
  }>;
  topBearishEvents: Array<{
    title: string;
    ticker: string;
    sentiment: number;
    summary: string;
  }>;
  topSector: {
    name: string;
    momentum: string;
    avgSentiment: number;
  };
  stockToWatch: {
    ticker: string;
    reason: string;
    sentiment: number;
  };
}

interface WatchlistAlert {
  ticker: string;
  type: 'buy' | 'sell' | 'hold';
  reason: string;
  confidence: number;
  triggers: string[];
}

interface PortfolioAlert {
  ticker: string;
  type: 'risk_warning' | 'rebalance' | 'opportunity';
  reason: string;
  suggestedAction: string;
  confidence: number;
}

export default function WatchlistManager() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [watchlistAlerts, setWatchlistAlerts] = useState<WatchlistAlert[]>([]);
  const [portfolioAlerts, setPortfolioAlerts] = useState<PortfolioAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState<Record<string, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStock, setNewStock] = useState({
    symbol: '',
    notes: '',
    price_alert: ''
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWatchlist = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWatchlist(data || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to load watchlist",
        variant: "destructive",
      });
    }
  };

  const fetchDailySummary = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('daily-summary', {
        body: {
          userId: user.id,
          generateSummary: true,
          checkWatchlist: true,
          checkPortfolio: true
        }
      });

      if (error) throw error;

      if (data.success) {
        setDailySummary(data.dailySummary);
        setWatchlistAlerts(data.watchlistAlerts || []);
        setPortfolioAlerts(data.portfolioAlerts || []);
        
        toast({
          title: "Daily Summary Updated",
          description: `Generated ${data.watchlistAlerts?.length || 0} watchlist alerts and ${data.portfolioAlerts?.length || 0} portfolio alerts`,
        });
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      toast({
        title: "Error",
        description: "Failed to load daily summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToWatchlist = async () => {
    if (!user || !newStock.symbol) return;

    try {
      const { error } = await supabase
        .from('user_watchlists')
        .insert([{
          user_id: user.id,
          symbol: newStock.symbol.toUpperCase(),
          notes: newStock.notes,
          price_alert: newStock.price_alert ? parseFloat(newStock.price_alert) : null
        }]);

      if (error) throw error;

      setNewStock({ symbol: '', notes: '', price_alert: '' });
      setIsAddDialogOpen(false);
      fetchWatchlist();
      
      toast({
        title: "Stock Added",
        description: `${newStock.symbol.toUpperCase()} added to watchlist`,
      });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to add stock to watchlist",
        variant: "destructive",
      });
    }
  };

  const removeFromWatchlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_watchlists')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchWatchlist();
      toast({
        title: "Stock Removed",
        description: "Stock removed from watchlist",
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove stock from watchlist",
        variant: "destructive",
      });
    }
  };

  const toggleAlerts = (symbol: string, enabled: boolean) => {
    setAlertsEnabled(prev => ({
      ...prev,
      [symbol]: enabled
    }));
    
    toast({
      title: enabled ? "Alerts Enabled" : "Alerts Disabled",
      description: `Alerts for ${symbol} ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  useEffect(() => {
    if (user) {
      fetchWatchlist();
      fetchDailySummary();
    }
  }, [user]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="h-4 w-4 text-profit" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4 text-loss" />;
      case 'risk_warning':
        return <AlertTriangle className="h-4 w-4 text-loss" />;
      case 'opportunity':
        return <Target className="h-4 w-4 text-profit" />;
      default:
        return <Eye className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'buy':
      case 'opportunity':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'sell':
      case 'risk_warning':
        return 'bg-loss/10 text-loss border-loss/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watchlist Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage your watchlist and receive intelligent trading alerts
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button onClick={fetchDailySummary} disabled={isLoading}>
            Refresh Summary
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stock to Watchlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Stock Symbol</label>
                  <Input
                    placeholder="e.g., AAPL"
                    value={newStock.symbol}
                    onChange={(e) => setNewStock(prev => ({ ...prev, symbol: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price Alert (Optional)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 150.00"
                    value={newStock.price_alert}
                    onChange={(e) => setNewStock(prev => ({ ...prev, price_alert: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    placeholder="Add any notes about this stock..."
                    value={newStock.notes}
                    onChange={(e) => setNewStock(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <Button onClick={addToWatchlist} className="w-full">
                  Add to Watchlist
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Daily Summary */}
      {dailySummary && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Market Summary - {dailySummary.date}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-profit">Top Bullish Events</h4>
                {dailySummary.topBullishEvents.map((event, i) => (
                  <div key={i} className="text-sm p-2 bg-profit/10 rounded">
                    <Badge variant="outline" className="mb-1">{event.ticker}</Badge>
                    <p className="text-xs">{event.summary}</p>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-loss">Top Bearish Events</h4>
                {dailySummary.topBearishEvents.map((event, i) => (
                  <div key={i} className="text-sm p-2 bg-loss/10 rounded">
                    <Badge variant="outline" className="mb-1">{event.ticker}</Badge>
                    <p className="text-xs">{event.summary}</p>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Sector Momentum</h4>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="font-medium">{dailySummary.topSector.name}</p>
                  <p className="text-xs text-muted-foreground">{dailySummary.topSector.momentum}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Stock to Watch</h4>
                <div className="p-2 bg-muted/50 rounded">
                  <Badge variant="outline" className="mb-1">{dailySummary.stockToWatch.ticker}</Badge>
                  <p className="text-xs">{dailySummary.stockToWatch.reason}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {(watchlistAlerts.length > 0 || portfolioAlerts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {watchlistAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Watchlist Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {watchlistAlerts.map((alert, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{alert.ticker}</Badge>
                          <Badge 
                            variant="outline" 
                            className={`flex items-center space-x-1 ${getAlertColor(alert.type)}`}
                          >
                            {getAlertIcon(alert.type)}
                            <span className="capitalize">{alert.type}</span>
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(alert.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm mb-2">{alert.reason}</p>
                      {alert.triggers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {alert.triggers.map((trigger, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {trigger}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {portfolioAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Portfolio Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {portfolioAlerts.map((alert, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{alert.ticker}</Badge>
                          <Badge 
                            variant="outline" 
                            className={`flex items-center space-x-1 ${getAlertColor(alert.type)}`}
                          >
                            {getAlertIcon(alert.type)}
                            <span className="capitalize">{alert.type.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(alert.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm mb-2">{alert.reason}</p>
                      <p className="text-sm font-medium text-primary">{alert.suggestedAction}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Watchlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          {watchlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No stocks in your watchlist yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Price Alert</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Auto Alerts</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {item.symbol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.price_alert ? `$${item.price_alert}` : 'None'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground max-w-xs truncate">
                        {item.notes || 'No notes'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={alertsEnabled[item.symbol] || false}
                          onCheckedChange={(checked) => toggleAlerts(item.symbol, checked)}
                        />
                        {alertsEnabled[item.symbol] ? 
                          <Bell className="h-4 w-4 text-profit" /> : 
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromWatchlist(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}