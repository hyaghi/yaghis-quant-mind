import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/MetricCard";
import SignalCard from "@/components/SignalCard";
import PortfolioChart from "@/components/PortfolioChart";
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Activity,
  RefreshCw,
  Bell,
  BarChart3
} from "lucide-react";

// Mock data for demonstration
const portfolioMetrics = [
  {
    title: "Total Equity",
    value: "$124,847",
    change: "+2.34%",
    changeType: "positive" as const,
    icon: <DollarSign className="h-4 w-4 text-muted-foreground" />
  },
  {
    title: "Daily P/L",
    value: "+$2,847",
    change: "+2.34%",
    changeType: "positive" as const,
    icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />
  },
  {
    title: "Sharpe Ratio",
    value: "1.84",
    change: "+0.12",
    changeType: "positive" as const,
    icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />
  },
  {
    title: "Max Drawdown",
    value: "-3.2%",
    change: "-0.1%",
    changeType: "positive" as const,
    icon: <Shield className="h-4 w-4 text-muted-foreground" />
  }
];

const activeSignals = [
  {
    symbol: "AAPL",
    signal: "BUY" as const,
    confidence: 87,
    price: 174.32,
    change: 2.45,
    reason: "Strong momentum with RSI indicating oversold conditions. Technical indicators suggest upward breakout.",
    timestamp: "2 min ago"
  },
  {
    symbol: "TSLA",
    signal: "SELL" as const,
    confidence: 92,
    price: 238.47,
    change: -1.83,
    reason: "Overbought conditions detected. MACD showing bearish divergence with high volatility warning.",
    timestamp: "5 min ago"
  },
  {
    symbol: "SPY",
    signal: "HOLD" as const,
    confidence: 74,
    price: 423.18,
    change: 0.67,
    reason: "Mixed signals from technical indicators. Market consolidation phase, waiting for clearer direction.",
    timestamp: "8 min ago"
  }
];

export default function Dashboard() {
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
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {portfolioMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Portfolio Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Portfolio Performance vs SPY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioChart />
          </CardContent>
        </Card>

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
            {activeSignals.map((signal, index) => (
              <SignalCard key={index} {...signal} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">S&P 500</span>
                <div className="text-right">
                  <div className="font-medium">4,231.8</div>
                  <div className="text-xs text-profit">+0.67%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">NASDAQ</span>
                <div className="text-right">
                  <div className="font-medium">13,181.4</div>
                  <div className="text-xs text-profit">+1.23%</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">VIX</span>
                <div className="text-right">
                  <div className="font-medium">18.42</div>
                  <div className="text-xs text-loss">-2.1%</div>
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
                <span className="font-medium text-loss">-$4,247</span>
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