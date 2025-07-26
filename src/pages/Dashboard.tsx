import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MetricCard from "@/components/MetricCard";
import SignalCard from "@/components/SignalCard";
import PortfolioChart from "@/components/PortfolioChart";
import FinancialNews from "@/components/FinancialNews";
import { usePortfolioMetrics, useMarketOverview, useAISignals } from "@/hooks/useMarketData";
import { useUserPortfolios } from "@/hooks/usePortfolio";
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Activity,
  RefreshCw,
  Bell,
  BarChart3,
  Loader2,
  FolderOpen
} from "lucide-react";

export default function Dashboard() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>("all");
  const { data: portfolios, isLoading: portfoliosLoading } = useUserPortfolios();
  const portfolioMetrics = usePortfolioMetrics();
  const marketOverview = useMarketOverview();
  const aiSignals = useAISignals(['AAPL', 'TSLA', 'SPY']);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getMetricCards = () => [
    {
      title: "Total Equity",
      value: formatCurrency(portfolioMetrics.totalEquity),
      change: formatPercent(portfolioMetrics.dailyPLPercent),
      changeType: portfolioMetrics.dailyPLPercent >= 0 ? "positive" as const : "negative" as const,
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: "Daily P/L",
      value: formatCurrency(portfolioMetrics.dailyPL),
      change: formatPercent(portfolioMetrics.dailyPLPercent),
      changeType: portfolioMetrics.dailyPL >= 0 ? "positive" as const : "negative" as const,
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: "Sharpe Ratio",
      value: portfolioMetrics.sharpeRatio.toFixed(2),
      change: "+0.12",
      changeType: "positive" as const,
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />
    },
    {
      title: "Max Drawdown",
      value: `${portfolioMetrics.maxDrawdown.toFixed(1)}%`,
      change: "-0.1%",
      changeType: "positive" as const,
      icon: <Shield className="h-4 w-4 text-muted-foreground" />
    }
  ];
  
  if (portfolioMetrics.isLoading || aiSignals.isLoading || marketOverview.isLoading || portfoliosLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metricCards = getMetricCards();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your quantitative trading overview
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Portfolio Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FolderOpen className="h-5 w-5 mr-2" />
            Portfolio Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <label htmlFor="portfolio-select" className="text-sm font-medium whitespace-nowrap">
              View Portfolio:
            </label>
            <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a portfolio" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg z-50">
                <SelectItem value="all">All Portfolios (Combined)</SelectItem>
                {portfolios?.map((portfolio) => (
                  <SelectItem key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPortfolio !== "all" && portfolios && (
              <div className="text-sm text-muted-foreground">
                {portfolios.find(p => p.id === selectedPortfolio)?.description || "No description"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Portfolio Performance Chart - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Portfolio Performance vs SPY (Real Data)
            {selectedPortfolio !== "all" && portfolios && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                - {portfolios.find(p => p.id === selectedPortfolio)?.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <PortfolioChart selectedPortfolioId={selectedPortfolio} />
          </div>
        </CardContent>
      </Card>

      {/* Secondary Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                AI Signals
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiSignals.data && aiSignals.data.length > 0 ? (
              aiSignals.data.map((signal, index) => (
                <SignalCard key={index} {...signal} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading AI signals...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial News */}
        <div className="lg:col-span-2">
          <FinancialNews />
        </div>
      </div>

      {/* Market Overview & Risk Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Summary (Real Data)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">S&P 500</span>
                <div className="text-right">
                  {marketOverview.data?.sp500 ? (
                    <>
                      <div className="font-medium">{marketOverview.data.sp500.price.toFixed(2)}</div>
                      <div className={`text-xs ${marketOverview.data.sp500.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatPercent(marketOverview.data.sp500.changePercent)}
                      </div>
                    </>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">NASDAQ</span>
                <div className="text-right">
                  {marketOverview.data?.nasdaq ? (
                    <>
                      <div className="font-medium">{marketOverview.data.nasdaq.price.toFixed(2)}</div>
                      <div className={`text-xs ${marketOverview.data.nasdaq.changePercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatPercent(marketOverview.data.nasdaq.changePercent)}
                      </div>
                    </>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">VIX</span>
                <div className="text-right">
                  {marketOverview.data?.vix ? (
                    <>
                      <div className="font-medium">{marketOverview.data.vix.price.toFixed(2)}</div>
                      <div className={`text-xs ${marketOverview.data.vix.changePercent >= 0 ? 'text-loss' : 'text-profit'}`}>
                        {formatPercent(marketOverview.data.vix.changePercent)}
                      </div>
                    </>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Portfolio Beta</span>
                <span className="font-medium">0.87</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">30-Day Volatility</span>
                <span className="font-medium">14.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Value at Risk (1%)</span>
                <span className="font-medium text-loss">-{formatCurrency(Math.abs(portfolioMetrics.totalEquity * 0.034))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cash Position</span>
                <span className="font-medium">12.4%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}