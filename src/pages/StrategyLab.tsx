import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import MetricCard from "@/components/MetricCard";
import { 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Zap,
  Play,
  Download,
  Settings
} from "lucide-react";
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from "@/hooks/usePortfolio";

const strategyTemplates = [
  {
    name: "Momentum Cross",
    description: "Moving average crossover strategy",
    category: "Momentum",
    returns: "+18.7%",
    sharpe: "1.42",
    drawdown: "-5.2%"
  },
  {
    name: "Mean Reversion",
    description: "Bollinger Bands mean reversion",
    category: "Mean Reversion", 
    returns: "+12.3%",
    sharpe: "0.97",
    drawdown: "-3.8%"
  },
  {
    name: "Pairs Trading",
    description: "Cointegration-based pairs strategy",
    category: "Arbitrage",
    returns: "+9.8%",
    sharpe: "1.23",
    drawdown: "-2.1%"
  }
];

export default function StrategyLab() {
  const [selectedStrategy, setSelectedStrategy] = useState("momentum");
  const [backtestResults, setBacktestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Get user's portfolios and watchlist for strategy testing
  const { data: portfolios } = useUserPortfolios();
  const { data: watchlist } = useWatchlist();
  const husamPortfolio = portfolios?.find(p => p.name === 'Husam');
  const selectedPortfolioId = husamPortfolio?.id || portfolios?.[0]?.id || null;
  const { data: holdings } = usePortfolioHoldings(selectedPortfolioId);
  
  // Strategy Lab can test strategies on both portfolio and watchlist
  // (You might want to test strategies on what you own AND what you're considering)
  const portfolioSymbols = holdings?.map(h => h.symbol) || [];
  const watchlistSymbols = watchlist?.map(w => w.symbol) || [];
  const allSymbols = [...new Set([...portfolioSymbols, ...watchlistSymbols])];
  
  // Assets for strategy testing
  const strategyAssets = allSymbols.length > 0 ? allSymbols : ['SPY', 'QQQ', 'VTI'];

  const runBacktest = async () => {
    setIsRunning(true);
    // Simulate backtest running
    await new Promise(resolve => setTimeout(resolve, 3000));
    setBacktestResults({
      totalReturn: "+24.8%",
      sharpe: "1.67",
      maxDrawdown: "-4.2%",
      winRate: "67.3%",
      trades: 156,
      avgHoldingPeriod: "3.2 days"
    });
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Strategy Lab</h1>
          <p className="text-muted-foreground mt-1">
            Backtest and optimize your trading strategies
          </p>
        </div>
      </div>

      <Tabs defaultValue="backtest" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="optimizer">Optimizer</TabsTrigger>
        </TabsList>

        <TabsContent value="backtest" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Strategy Configuration */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Strategy Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="strategy-type">Strategy Type</Label>
                  <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="momentum">Momentum Cross</SelectItem>
                      <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
                      <SelectItem value="pairs">Pairs Trading</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input id="symbol" placeholder="SPY" defaultValue="SPY" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input id="start-date" type="date" defaultValue="2023-01-01" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input id="end-date" type="date" defaultValue="2024-05-15" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capital">Initial Capital</Label>
                  <Input id="capital" placeholder="$100,000" defaultValue="100000" />
                </div>

                {selectedStrategy === "momentum" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="fast-ma">Fast MA</Label>
                        <Input id="fast-ma" placeholder="10" defaultValue="10" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slow-ma">Slow MA</Label>
                        <Input id="slow-ma" placeholder="30" defaultValue="30" />
                      </div>
                    </div>
                  </>
                )}

                <Button 
                  onClick={runBacktest} 
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Backtest
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="lg:col-span-2 space-y-6">
              {backtestResults && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricCard
                      title="Total Return"
                      value={backtestResults.totalReturn}
                      changeType="positive"
                      icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    />
                    <MetricCard
                      title="Sharpe Ratio"
                      value={backtestResults.sharpe}
                      changeType="positive"
                      icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                    />
                    <MetricCard
                      title="Max Drawdown"
                      value={backtestResults.maxDrawdown}
                      changeType="negative"
                      icon={<Shield className="h-4 w-4 text-muted-foreground" />}
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Backtest Results
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-sm text-muted-foreground">Win Rate</div>
                          <div className="text-lg font-semibold">{backtestResults.winRate}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Trades</div>
                          <div className="text-lg font-semibold">{backtestResults.trades}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Avg Holding Period</div>
                          <div className="text-lg font-semibold">{backtestResults.avgHoldingPeriod}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {!backtestResults && (
                <Card className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run a backtest to see results</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategyTemplates.map((template, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Returns</span>
                      <span className="text-sm font-medium text-profit">{template.returns}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sharpe</span>
                      <span className="text-sm font-medium">{template.sharpe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Max DD</span>
                      <span className="text-sm font-medium text-loss">{template.drawdown}</span>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimizer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parameter Optimization</CardTitle>
              <p className="text-sm text-muted-foreground">
                Automatically find the best parameters for your strategy
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Parameter optimization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}