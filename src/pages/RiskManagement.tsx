import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePortfolioMetrics } from '@/hooks/useMarketData';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Activity, Target } from 'lucide-react';
import TradingSignals from '@/components/TradingSignals';

export default function RiskManagement() {
  const { 
    totalEquity, 
    dailyPL, 
    dailyPLPercent, 
    sharpeRatio, 
    maxDrawdown,
    isLoading 
  } = usePortfolioMetrics();

  // Mock risk metrics - in a real app, these would be calculated from historical data
  const riskMetrics = {
    volatility: 14.2,
    beta: 1.18,
    varDaily: -2.1,
    var95: -8.7,
    expectedShortfall: -12.3,
    concentrationRisk: 32,
    correlationRisk: 0.76
  };

  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');

  const getRiskLevel = (value: number, thresholds: [number, number]) => {
    if (Math.abs(value) < thresholds[0]) return { level: 'Low', color: 'text-green-600 bg-green-50' };
    if (Math.abs(value) < thresholds[1]) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    return { level: 'High', color: 'text-red-600 bg-red-50' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Risk Management</h1>
        <p className="text-muted-foreground">Monitor portfolio risk and trading signals</p>
      </div>

      <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="1D">1 Day</TabsTrigger>
          <TabsTrigger value="1W">1 Week</TabsTrigger>
          <TabsTrigger value="1M">1 Month</TabsTrigger>
          <TabsTrigger value="3M">3 Months</TabsTrigger>
          <TabsTrigger value="1Y">1 Year</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTimeframe} className="space-y-6">
          {/* Risk Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalEquity.toLocaleString()}</div>
                <p className={`text-xs ${dailyPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dailyPL >= 0 ? '+' : ''}${dailyPL.toFixed(0)} ({dailyPLPercent.toFixed(2)}%) today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sharpeRatio}</div>
                <p className="text-xs text-muted-foreground">
                  Risk-adjusted returns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{maxDrawdown}%</div>
                <p className="text-xs text-muted-foreground">
                  Largest peak-to-trough decline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">VaR (95%)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{riskMetrics.var95}%</div>
                <p className="text-xs text-muted-foreground">
                  Value at Risk (95% confidence)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Risk Metrics */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Metrics
                </CardTitle>
                <CardDescription>
                  Quantitative risk assessment for {selectedTimeframe}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Volatility (Annualized)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{riskMetrics.volatility}%</span>
                      <Badge className={getRiskLevel(riskMetrics.volatility, [15, 25]).color}>
                        {getRiskLevel(riskMetrics.volatility, [15, 25]).level}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min((riskMetrics.volatility / 30) * 100, 100)} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Beta (vs S&P 500)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{riskMetrics.beta}</span>
                      <Badge className={getRiskLevel(Math.abs(riskMetrics.beta - 1), [0.2, 0.5]).color}>
                        {getRiskLevel(Math.abs(riskMetrics.beta - 1), [0.2, 0.5]).level}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min((riskMetrics.beta / 2) * 100, 100)} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Daily VaR (95%)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{riskMetrics.varDaily}%</span>
                      <Badge className={getRiskLevel(Math.abs(riskMetrics.varDaily), [2, 4]).color}>
                        {getRiskLevel(Math.abs(riskMetrics.varDaily), [2, 4]).level}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min((Math.abs(riskMetrics.varDaily) / 5) * 100, 100)} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Expected Shortfall</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{riskMetrics.expectedShortfall}%</span>
                      <Badge className={getRiskLevel(Math.abs(riskMetrics.expectedShortfall), [10, 15]).color}>
                        {getRiskLevel(Math.abs(riskMetrics.expectedShortfall), [10, 15]).level}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min((Math.abs(riskMetrics.expectedShortfall) / 20) * 100, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Portfolio Composition Risk
                </CardTitle>
                <CardDescription>
                  Concentration and correlation analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Concentration Risk</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{riskMetrics.concentrationRisk}%</span>
                      <Badge className={getRiskLevel(riskMetrics.concentrationRisk, [25, 40]).color}>
                        {getRiskLevel(riskMetrics.concentrationRisk, [25, 40]).level}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min((riskMetrics.concentrationRisk / 50) * 100, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Percentage of portfolio in top 3 positions
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Correlation</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{riskMetrics.correlationRisk}</span>
                      <Badge className={getRiskLevel(riskMetrics.correlationRisk, [0.6, 0.8]).color}>
                        {getRiskLevel(riskMetrics.correlationRisk, [0.6, 0.8]).level}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={riskMetrics.correlationRisk * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    High correlation increases portfolio risk
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Risk Recommendations</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Consider reducing concentration in top holdings</li>
                    <li>• Add uncorrelated assets to improve diversification</li>
                    <li>• Monitor position sizes relative to volatility</li>
                    <li>• Review stop-loss levels for high-risk positions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trading Signals Section */}
          <TradingSignals />
        </TabsContent>
      </Tabs>
    </div>
  );
}