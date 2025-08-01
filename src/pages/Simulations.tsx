import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Play, 
  Pause, 
  Square, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Clock,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from "@/hooks/usePortfolio";

interface SimulationRun {
  id: string;
  name: string;
  allocationName: string;
  scenarioName: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startedAt?: string;
  finishedAt?: string;
  results?: {
    paths: number;
    scenarios: number;
    avgReturn: number;
    avgVol: number;
    sharpeRatio: number;
    maxDrawdown: number;
    passRate: number;
  };
}

const mockSimulations: SimulationRun[] = [
  {
    id: "sim-1",
    name: "Conservative Portfolio Stress Test",
    allocationName: "Conservative Balanced",
    scenarioName: "Q1 2024 Stress Test",
    status: "completed",
    progress: 100,
    startedAt: "2024-01-15T10:00:00Z",
    finishedAt: "2024-01-15T10:03:00Z",
    results: {
      paths: 1000,
      scenarios: 12,
      avgReturn: 0.074,
      avgVol: 0.089,
      sharpeRatio: 0.83,
      maxDrawdown: 0.156,
      passRate: 0.89
    }
  },
  {
    id: "sim-2", 
    name: "Growth Portfolio Crisis Test",
    allocationName: "Aggressive Growth",
    scenarioName: "Full Market Crisis",
    status: "running",
    progress: 67,
    startedAt: "2024-01-15T11:00:00Z"
  },
  {
    id: "sim-3",
    name: "Risk Parity Validation",
    allocationName: "Equal Risk Contribution",
    scenarioName: "Historical Episodes Only",
    status: "pending",
    progress: 0
  }
];

export default function Simulations() {
  const { toast } = useToast();
  const [simulations, setSimulations] = useState<SimulationRun[]>(mockSimulations);
  const [selectedSim, setSelectedSim] = useState<string | null>(null);
  const [runningIntervals, setRunningIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Get user's portfolios and watchlist for simulation assets
  const { data: portfolios } = useUserPortfolios();
  const { data: watchlist } = useWatchlist();
  const husamPortfolio = portfolios?.find(p => p.name === 'Husam');
  const selectedPortfolioId = husamPortfolio?.id || portfolios?.[0]?.id || null;
  const { data: holdings } = usePortfolioHoldings(selectedPortfolioId);
  
  // Combine portfolio and watchlist symbols for simulations
  const portfolioSymbols = holdings?.map(h => h.symbol) || [];
  const watchlistSymbols = watchlist?.map(w => w.symbol) || [];
  const userAssets = [...new Set([...portfolioSymbols, ...watchlistSymbols])];
  const simulationAssets = userAssets.length > 0 ? userAssets : ['SPY', 'QQQ', 'VTI'];

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      runningIntervals.forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, [runningIntervals]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "running": return "bg-blue-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "default" as const;
      case "running": return "secondary" as const;
      case "failed": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  const handleStartSimulation = (id: string) => {
    // Clear any existing interval for this simulation
    const existingInterval = runningIntervals.get(id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    setSimulations(prev => prev.map(sim => 
      sim.id === id 
        ? { ...sim, status: "running" as const, startedAt: new Date().toISOString(), progress: 0 }
        : sim
    ));

    // Simulate progress with proper cleanup
    const interval = setInterval(() => {
      setSimulations(prev => {
        return prev.map(sim => {
          if (sim.id === id && sim.status === "running") {
            const newProgress = Math.min(sim.progress + Math.random() * 10, 100);
            
            if (newProgress >= 100) {
              // Clear interval and clean up
              setRunningIntervals(prevIntervals => {
                const newIntervals = new Map(prevIntervals);
                const intervalToClose = newIntervals.get(id);
                if (intervalToClose) {
                  clearInterval(intervalToClose);
                  newIntervals.delete(id);
                }
                return newIntervals;
              });
              
              return {
                ...sim,
                status: "completed" as const,
                progress: 100,
                finishedAt: new Date().toISOString(),
                results: {
                  paths: 1000,
                  scenarios: 12,
                  avgReturn: 0.065 + Math.random() * 0.04,
                  avgVol: 0.08 + Math.random() * 0.06,
                  sharpeRatio: 0.6 + Math.random() * 0.4,
                  maxDrawdown: 0.1 + Math.random() * 0.15,
                  passRate: 0.7 + Math.random() * 0.3
                }
              };
            }
            return { ...sim, progress: newProgress };
          }
          return sim;
        });
      });
    }, 1000);

    // Store the interval reference
    setRunningIntervals(prev => new Map(prev.set(id, interval)));

    toast({
      title: "Simulation Started",
      description: "Your portfolio simulation is now running."
    });
  };

  const handleStopSimulation = (id: string) => {
    // Clear the interval
    const interval = runningIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      setRunningIntervals(prev => {
        const newIntervals = new Map(prev);
        newIntervals.delete(id);
        return newIntervals;
      });
    }

    setSimulations(prev => prev.map(sim => 
      sim.id === id && sim.status === "running"
        ? { ...sim, status: "pending" as const, progress: 0 }
        : sim
    ));

    toast({
      title: "Simulation Stopped",
      description: "The simulation has been cancelled."
    });
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return "-";
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diff = endTime.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Simulations</h1>
          <p className="text-muted-foreground">
            Run and monitor portfolio stress testing simulations
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          New Simulation
        </Button>
      </div>

      <Tabs defaultValue="running" className="space-y-6">
        <TabsList>
          <TabsTrigger value="running">Running & Queued</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="results">Detailed Results</TabsTrigger>
        </TabsList>

        <TabsContent value="running" className="space-y-4">
          {simulations.filter(sim => sim.status !== "completed").map((simulation) => (
            <Card key={simulation.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      {simulation.name}
                    </CardTitle>
                    <CardDescription>
                      {simulation.allocationName} → {simulation.scenarioName}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(simulation.status)}>
                      {simulation.status.charAt(0).toUpperCase() + simulation.status.slice(1)}
                    </Badge>
                    {simulation.status === "pending" && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStartSimulation(simulation.id)}
                        className="flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Start
                      </Button>
                    )}
                    {simulation.status === "running" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStopSimulation(simulation.id)}
                        className="flex items-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {simulation.status === "running" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className="text-sm font-medium">{simulation.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={simulation.progress} className="w-full" />
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Runtime: {formatDuration(simulation.startedAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        Status: Simulating scenarios
                      </div>
                    </div>
                  </div>
                )}
                {simulation.status === "pending" && (
                  <div className="text-sm text-muted-foreground">
                    Waiting to start...
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {simulations.filter(sim => sim.status === "completed").map((simulation) => (
            <Card key={simulation.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      {simulation.name}
                    </CardTitle>
                    <CardDescription>
                      Completed in {formatDuration(simulation.startedAt, simulation.finishedAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    Completed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {simulation.results && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {(simulation.results.avgReturn * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Return</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {(simulation.results.avgVol * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Vol</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {simulation.results.sharpeRatio.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {(simulation.results.passRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Pass Rate</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {selectedSim ? (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Simulation Results</CardTitle>
                <CardDescription>
                  Comprehensive analysis of simulation outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Detailed results visualization would appear here.</p>
                  <p className="text-sm">Including equity curves, drawdown charts, and scenario attribution.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <BarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a completed simulation to view detailed results.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}