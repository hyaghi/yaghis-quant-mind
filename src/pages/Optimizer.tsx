import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, TrendingUp, Shield, BarChart3, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOptimizePortfolio } from "@/hooks/useOptimization";
import { useScenarioSets } from "@/hooks/useScenarios";
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from '@/hooks/usePortfolio';

interface OptimizerConfig {
  objective: string;
  alternatives: string[];
  shrinkage: string;
  kellyCap: number;
  constraintsRef?: string;
  blackLitterman?: {
    tau: number;
    views: any[];
  };
}

interface OptimizationResult {
  allocationId: string;
  weights: Record<string, number>;
  diagnostics: {
    expectedReturn: number;
    expectedVol: number;
    sharpeRatio: number;
    maxWeight: number;
    turnover: number;
  };
}

const objectives = [
  { value: "maxSharpe", label: "Maximum Sharpe Ratio", description: "Optimize risk-adjusted returns" },
  { value: "minVol", label: "Minimum Volatility", description: "Minimize portfolio variance" },
  { value: "maxReturn", label: "Maximum Return", description: "Maximize expected returns" },
  { value: "minCVaR", label: "Minimum CVaR", description: "Minimize conditional value at risk" },
  { value: "riskParity", label: "Risk Parity", description: "Equal risk contribution" },
  { value: "blackLitterman", label: "Black-Litterman", description: "Bayesian optimization with views" }
];

const shrinkageOptions = [
  { value: "LedoitWolf", label: "Ledoit-Wolf", description: "Shrinks towards single-index model" },
  { value: "ConstantCorr", label: "Constant Correlation", description: "Shrinks correlations to average" },
  { value: "None", label: "No Shrinkage", description: "Use sample covariance matrix" }
];

const constraintProfiles = [
  { id: "conservative", name: "Conservative", description: "Max 15% per asset, 60% equity" },
  { id: "balanced", name: "Balanced", description: "Max 25% per asset, 80% equity" },
  { id: "growth", name: "Growth", description: "Max 35% per asset, 100% equity" },
  { id: "custom", name: "Custom", description: "User-defined constraints" }
];

export default function Optimizer() {
  const { toast } = useToast();
  const optimizePortfolio = useOptimizePortfolio();
  const { data: scenarioSets } = useScenarioSets();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OptimizationResult[]>([]);

  // Get user's portfolios and watchlist
  const { data: portfolios } = useUserPortfolios();
  // Use the "Husam" portfolio specifically (from your data)
  const husamPortfolio = portfolios?.find(p => p.name === 'Husam');
  const selectedPortfolioId = husamPortfolio?.id || portfolios?.[0]?.id || null;
  const { data: holdings } = usePortfolioHoldings(selectedPortfolioId);
  const { data: watchlist } = useWatchlist();
  
  // Portfolio Optimizer should focus on ACTUAL holdings, not watchlist
  // (You optimize what you own, not what you're just watching)
  const portfolioSymbols = holdings?.map(h => h.symbol) || [];
  const watchlistSymbols = watchlist?.map(w => w.symbol) || []; // Available for reference
  
  // Primary assets for optimization (your actual holdings)
  const selectedAssets = portfolioSymbols.length > 0 ? portfolioSymbols : ['SPY', 'QQQ', 'VTI', 'IEF', 'GLD'];
  
  const [config, setConfig] = useState<OptimizerConfig>({
    objective: "maxSharpe",
    alternatives: ["minVol", "riskParity"],
    shrinkage: "LedoitWolf",
    kellyCap: 0.25,
    constraintsRef: "balanced"
  });


  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setProgress(0);
    setResults([]);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await optimizePortfolio.mutateAsync({
        config,
        assets: selectedAssets,
        scenarioSetId: selectedScenarioId || undefined,
        constraintsProfile: constraintProfiles.find(p => p.id === config.constraintsRef)
      });

      clearInterval(progressInterval);
      setProgress(100);

      // Convert result to UI format
      const mockResult: OptimizationResult = {
        allocationId: result.allocation.id,
        weights: result.allocation.weights_json as Record<string, number>,
        diagnostics: result.diagnostics
      };

      setResults([mockResult]);
    } catch (error) {
      // Error already handled by the mutation
    } finally {
      setIsOptimizing(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Optimizer</h1>
          <p className="text-muted-foreground">
            Generate optimal allocations using advanced portfolio theory
          </p>
        </div>
        <Button 
          onClick={handleOptimize} 
          disabled={isOptimizing || optimizePortfolio.isPending}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          {isOptimizing || optimizePortfolio.isPending ? "Optimizing..." : "Run Optimization"}
        </Button>
      </div>

      {isOptimizing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Optimization Progress</Label>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {/* Objective Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Optimization Objective
              </CardTitle>
              <CardDescription>
                Choose the primary objective for portfolio optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {objectives.map((obj) => (
                  <div
                    key={obj.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      config.objective === obj.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setConfig({ ...config, objective: obj.value })}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{obj.label}</h4>
                        {config.objective === obj.value && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{obj.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Configure covariance estimation and risk controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="shrinkage">Covariance Shrinkage</Label>
                  <Select 
                    value={config.shrinkage} 
                    onValueChange={(value) => setConfig({ ...config, shrinkage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shrinkageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kellyCap">Kelly Fraction Cap</Label>
                  <Input
                    id="kellyCap"
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={config.kellyCap}
                    onChange={(e) => setConfig({ ...config, kellyCap: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="constraints">Constraint Profile</Label>
                  <Select 
                    value={config.constraintsRef} 
                    onValueChange={(value) => setConfig({ ...config, constraintsRef: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {constraintProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Black-Litterman Settings */}
          {config.objective === "blackLitterman" && (
            <Card>
              <CardHeader>
                <CardTitle>Black-Litterman Parameters</CardTitle>
                <CardDescription>
                  Configure Bayesian optimization with market views
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tau">Tau (Uncertainty Scaling)</Label>
                    <Input
                      id="tau"
                      type="number"
                      step="0.01"
                      value={config.blackLitterman?.tau || 0.05}
                      onChange={(e) => setConfig({ 
                        ...config, 
                        blackLitterman: { 
                          ...config.blackLitterman!, 
                          tau: parseFloat(e.target.value) 
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {results.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No optimization results yet. Configure your settings and run the optimizer.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <Card key={result.allocationId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Optimal Allocation {index + 1}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Sharpe: {result.diagnostics.sharpeRatio.toFixed(2)}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Use This Allocation
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Asset Weights */}
                      <div>
                        <h4 className="font-medium mb-3">Asset Allocation</h4>
                        <div className="space-y-2">
                          {Object.entries(result.weights)
                            .sort(([,a], [,b]) => b - a)
                            .map(([asset, weight]) => (
                            <div key={asset} className="flex items-center justify-between">
                              <span className="text-sm">{asset}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-secondary rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full" 
                                    style={{ width: `${weight * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium w-12 text-right">
                                  {(weight * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div>
                        <h4 className="font-medium mb-3">Expected Performance</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {(result.diagnostics.expectedReturn * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Expected Return</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {(result.diagnostics.expectedVol * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Expected Vol</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold text-purple-600">
                              {result.diagnostics.sharpeRatio.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-lg font-bold text-orange-600">
                              {(result.diagnostics.turnover * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Turnover</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Optimization Diagnostics
              </CardTitle>
              <CardDescription>
                Detailed analysis of the optimization process and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Optimization diagnostics will appear here after running the optimizer.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}