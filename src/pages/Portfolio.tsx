import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserPortfolios, usePortfolioHoldings, useWatchlist, useCreatePortfolio, useAddToWatchlist, useAddHolding } from '@/hooks/usePortfolio';
import { useMultipleQuotes } from '@/hooks/useMarketData';
import { PlusCircle, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Portfolio() {
  const { data: portfolios, isLoading: portfoliosLoading } = useUserPortfolios();
  const { data: watchlist, isLoading: watchlistLoading } = useWatchlist();
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const { data: holdings } = usePortfolioHoldings(selectedPortfolio);
  
  // Get quotes for watchlist symbols
  const watchlistSymbols = watchlist?.map(item => item.symbol) || [];
  const { data: watchlistQuotes } = useMultipleQuotes(watchlistSymbols);
  
  // Get quotes for portfolio holdings
  const holdingsSymbols = holdings?.map(holding => holding.symbol) || [];
  const { data: holdingsQuotes } = useMultipleQuotes(holdingsSymbols);
  
  const createPortfolio = useCreatePortfolio();
  const addToWatchlist = useAddToWatchlist();
  const addHolding = useAddHolding();
  const { toast } = useToast();
  
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const [newWatchlistSymbol, setNewWatchlistSymbol] = useState('');
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    quantity: '',
    averageCost: ''
  });

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) {
      toast({
        title: "Portfolio name required",
        description: "Please enter a name for your portfolio.",
        variant: "destructive",
      });
      return;
    }
    
    await createPortfolio.mutateAsync({
      name: newPortfolioName,
      description: newPortfolioDescription || undefined
    });
    
    setNewPortfolioName('');
    setNewPortfolioDescription('');
  };

  const handleAddToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistSymbol.trim()) {
      toast({
        title: "Symbol required",
        description: "Please enter a stock symbol.",
        variant: "destructive",
      });
      return;
    }
    
    await addToWatchlist.mutateAsync({
      symbol: newWatchlistSymbol.toUpperCase()
    });
    
    setNewWatchlistSymbol('');
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortfolio || !newHolding.symbol.trim() || !newHolding.quantity || !newHolding.averageCost) {
      toast({
        title: "All fields required",
        description: "Please fill in all holding details.",
        variant: "destructive",
      });
      return;
    }
    
    await addHolding.mutateAsync({
      portfolio_id: selectedPortfolio,
      symbol: newHolding.symbol.toUpperCase(),
      quantity: parseFloat(newHolding.quantity),
      average_cost: parseFloat(newHolding.averageCost)
    });
    
    setNewHolding({ symbol: '', quantity: '', averageCost: '' });
  };

  if (portfoliosLoading || watchlistLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Management</h1>
          <p className="text-muted-foreground">Track your investments and watchlist</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Set up a new portfolio to track your investments.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePortfolio} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portfolio-name">Portfolio Name</Label>
                <Input
                  id="portfolio-name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="e.g., Growth Portfolio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio-description">Description (Optional)</Label>
                <Input
                  id="portfolio-description"
                  value={newPortfolioDescription}
                  onChange={(e) => setNewPortfolioDescription(e.target.value)}
                  placeholder="Portfolio description..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={createPortfolio.isPending}>
                {createPortfolio.isPending ? "Creating..." : "Create Portfolio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="portfolios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolios" className="space-y-4">
          {portfolios && portfolios.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {portfolios.map((portfolio) => (
                <Card 
                  key={portfolio.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedPortfolio === portfolio.id ? 'border-primary' : ''
                  }`}
                  onClick={() => setSelectedPortfolio(portfolio.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {portfolio.name}
                      {selectedPortfolio === portfolio.id && (
                        <Badge variant="secondary">Selected</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{portfolio.description || 'No description'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Initial Value: ${portfolio.initial_value.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(portfolio.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No portfolios yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first portfolio to start tracking investments.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPortfolio && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Portfolio Holdings</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Holding
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Holding</DialogTitle>
                        <DialogDescription>
                          Add a stock position to your portfolio.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddHolding} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="holding-symbol">Symbol</Label>
                          <Input
                            id="holding-symbol"
                            value={newHolding.symbol}
                            onChange={(e) => setNewHolding(prev => ({ ...prev, symbol: e.target.value }))}
                            placeholder="e.g., AAPL"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="holding-quantity">Quantity</Label>
                          <Input
                            id="holding-quantity"
                            type="number"
                            step="0.000001"
                            value={newHolding.quantity}
                            onChange={(e) => setNewHolding(prev => ({ ...prev, quantity: e.target.value }))}
                            placeholder="Number of shares"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="holding-cost">Average Cost</Label>
                          <Input
                            id="holding-cost"
                            type="number"
                            step="0.01"
                            value={newHolding.averageCost}
                            onChange={(e) => setNewHolding(prev => ({ ...prev, averageCost: e.target.value }))}
                            placeholder="Cost per share"
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={addHolding.isPending}>
                          {addHolding.isPending ? "Adding..." : "Add Holding"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {holdings && holdings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Avg Cost</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdings.map((holding) => {
                        const quote = holdingsQuotes?.find(q => q.symbol === holding.symbol);
                        const currentValue = quote ? quote.price * holding.quantity : 0;
                        const totalCost = holding.average_cost * holding.quantity;
                        const pnl = currentValue - totalCost;
                        const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                        
                        return (
                          <TableRow key={holding.id}>
                            <TableCell className="font-medium">{holding.symbol}</TableCell>
                            <TableCell>{holding.quantity}</TableCell>
                            <TableCell>${holding.average_cost.toFixed(2)}</TableCell>
                            <TableCell>${quote?.price.toFixed(2) || '—'}</TableCell>
                            <TableCell>
                              <div className={`flex items-center ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pnl >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                ${pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No holdings in this portfolio yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stock Watchlist</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Add Symbol
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Watchlist</DialogTitle>
                      <DialogDescription>
                        Add a stock symbol to your watchlist for monitoring.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddToWatchlist} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="watchlist-symbol">Stock Symbol</Label>
                        <Input
                          id="watchlist-symbol"
                          value={newWatchlistSymbol}
                          onChange={(e) => setNewWatchlistSymbol(e.target.value)}
                          placeholder="e.g., AAPL, TSLA, SPY"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={addToWatchlist.isPending}>
                        {addToWatchlist.isPending ? "Adding..." : "Add to Watchlist"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {watchlistQuotes && watchlistQuotes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Change %</TableHead>
                      <TableHead>Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchlistQuotes.map((quote) => (
                      <TableRow key={quote.symbol}>
                        <TableCell className="font-medium">{quote.symbol}</TableCell>
                        <TableCell>${quote.price.toFixed(2)}</TableCell>
                        <TableCell className={quote.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}
                        </TableCell>
                        <TableCell className={quote.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                          <div className="flex items-center">
                            {quote.changePercent >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                          </div>
                        </TableCell>
                        <TableCell>{quote.volume?.toLocaleString() || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Eye className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No symbols in watchlist</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add stocks to monitor their real-time prices and performance.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}