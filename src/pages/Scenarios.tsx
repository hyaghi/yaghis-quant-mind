import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Target, TrendingDown, Calendar, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from "@/hooks/usePortfolio";

interface ScenarioConfig {
  horizonDays: number;
  paths: number;
  seed: number;
  include: string[];
  historicalReplay?: string[];
  macroShocks?: Array<{
    name: string;
    shock: Record<string, any>;
  }>;
  monteCarlo?: {
    regimes: Array<{
      name: string;
      volMult: number;
      prob: number;
    }>;
  };
}

const historicalEpisodes = [
  { id: "GFC2008", name: "2008-2009 GFC", description: "Global Financial Crisis" },
  { id: "COVID2020", name: "2020 Q1 COVID", description: "Pandemic Market Crash" },
  { id: "Rates2022", name: "2022 Rate Shock", description: "Aggressive Fed Tightening" },
  { id: "Oil2014", name: "2014 Oil Crash", description: "Oil Price Collapse" },
  { id: "Taper2013", name: "2013 Taper Tantrum", description: "Bond Market Selloff" },
  { id: "Banks2023", name: "2023 Regional Banks", description: "Banking Sector Stress" }
];

const macroShockPresets = [
  { name: "RatesUp300", description: "Rates +300 bps", shock: { ratesBps: 300 } },
  { name: "RatesDown300", description: "Rates -300 bps", shock: { ratesBps: -300 } },
  { name: "USDDown10", description: "USD -10%", shock: { usdPct: -10 } },
  { name: "BrentUp25", description: "Brent +25%", shock: { oilPct: 25 } },
  { name: "GCCDown20", description: "GCC Equities -20%", shock: { equityRegion: { GCC: -0.2 } } },
  { name: "CreditUp150", description: "Credit Spreads +150 bps", shock: { creditBps: 150 } },
  { name: "TechDown30", description: "Tech -30%", shock: { sectorShock: { Tech: -0.3 } } }
];

export default function Scenarios() {
  const { toast } = useToast();
  
  // Get user's portfolio data for scenario testing
  const { data: portfolios } = useUserPortfolios();
  const selectedPortfolioId = portfolios?.[0]?.id || null;
  const { data: holdings } = usePortfolioHoldings(selectedPortfolioId);
  const { data: watchlist } = useWatchlist();
  
  // Get symbols for scenario testing
  const portfolioSymbols = holdings?.map(h => h.symbol) || [];
  const watchlistSymbols = watchlist?.map(w => w.symbol) || [];
  const userSymbols = [...new Set([...portfolioSymbols, ...watchlistSymbols])];
  const [scenarioName, setScenarioName] = useState("");
  const [config, setConfig] = useState<ScenarioConfig>({
    horizonDays: 252,
    paths: 1000,
    seed: 42,
    include: ["historicalReplay", "macroShocks", "monteCarlo"],
    historicalReplay: ["GFC2008", "COVID2020"],
    macroShocks: [
      { name: "RatesUp300", shock: { ratesBps: 300 } },
      { name: "USDDown10", shock: { usdPct: -10 } }
    ],
    monteCarlo: {
      regimes: [
        { name: "Calm", volMult: 0.7, prob: 0.6 },
        { name: "Normal", volMult: 1.0, prob: 0.3 },
        { name: "Stress", volMult: 1.8, prob: 0.1 }
      ]
    }
  });

  const [savedScenarios, setSavedScenarios] = useState([
    {
      id: "1",
      name: "Conservative Stress Test",
      description: "Focuses on historical episodes with moderate Monte Carlo stress",
      created: "2024-01-15"
    },
    {
      id: "2", 
      name: "Full Market Crisis",
      description: "Combines all crisis scenarios with high volatility regimes",
      created: "2024-01-10"
    }
  ]);

  const handleSaveScenario = () => {
    if (!scenarioName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the scenario set",
        variant: "destructive"
      });
      return;
    }

    // TODO: Save to database
    const newScenario = {
      id: Date.now().toString(),
      name: scenarioName,
      description: `${config.paths} paths over ${config.horizonDays} days`,
      created: new Date().toISOString().split('T')[0]
    };

    setSavedScenarios([newScenario, ...savedScenarios]);
    toast({
      title: "Scenario Saved",
      description: `"${scenarioName}" has been saved successfully`
    });
    setScenarioName("");
  };

  const toggleHistoricalEpisode = (episodeId: string) => {
    const current = config.historicalReplay || [];
    const updated = current.includes(episodeId)
      ? current.filter(id => id !== episodeId)
      : [...current, episodeId];
    
    setConfig({ ...config, historicalReplay: updated });
  };

  const toggleMacroShock = (shock: any) => {
    const current = config.macroShocks || [];
    const exists = current.find(s => s.name === shock.name);
    const updated = exists
      ? current.filter(s => s.name !== shock.name)
      : [...current, shock];
    
    setConfig({ ...config, macroShocks: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scenario Engine</h1>
          <p className="text-muted-foreground">
            Build stress test scenarios for your portfolio: {userSymbols.length > 0 ? userSymbols.join(', ') : 'No portfolio assets found'}
          </p>
        </div>
        <Button onClick={handleSaveScenario} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Save Scenario
        </Button>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">Scenario Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Basic Configuration
              </CardTitle>
              <CardDescription>
                Set the fundamental parameters for your scenario testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="scenarioName">Scenario Name</Label>
                  <Input
                    id="scenarioName"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="e.g., Q1 2024 Stress Test"
                  />
                </div>
                <div>
                  <Label htmlFor="horizonDays">Horizon (Days)</Label>
                  <Input
                    id="horizonDays"
                    type="number"
                    value={config.horizonDays}
                    onChange={(e) => setConfig({ ...config, horizonDays: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="paths">Monte Carlo Paths</Label>
                  <Input
                    id="paths"
                    type="number"
                    value={config.paths}
                    onChange={(e) => setConfig({ ...config, paths: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="seed">Random Seed</Label>
                  <Input
                    id="seed"
                    type="number"
                    value={config.seed}
                    onChange={(e) => setConfig({ ...config, seed: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historical Episodes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historical Episodes
              </CardTitle>
              <CardDescription>
                Select historical market episodes to replay in your scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historicalEpisodes.map((episode) => (
                  <div
                    key={episode.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      config.historicalReplay?.includes(episode.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleHistoricalEpisode(episode.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{episode.name}</h4>
                        <p className="text-sm text-muted-foreground">{episode.description}</p>
                      </div>
                      {config.historicalReplay?.includes(episode.id) && (
                        <Badge variant="default" className="ml-2">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Macro Shocks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Macro Shocks
              </CardTitle>
              <CardDescription>
                Define specific macroeconomic stress scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {macroShockPresets.map((shock) => (
                  <div
                    key={shock.name}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      config.macroShocks?.find(s => s.name === shock.name)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleMacroShock(shock)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{shock.description}</h4>
                        <p className="text-sm text-muted-foreground">
                          {JSON.stringify(shock.shock)}
                        </p>
                      </div>
                      {config.macroShocks?.find(s => s.name === shock.name) && (
                        <Badge variant="default" className="ml-2">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monte Carlo Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Monte Carlo Settings
              </CardTitle>
              <CardDescription>
                Configure regime-switching volatility for stochastic scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config.monteCarlo?.regimes.map((regime, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label>Regime Name</Label>
                      <Input value={regime.name} readOnly />
                    </div>
                    <div>
                      <Label>Volatility Multiplier</Label>
                      <Input 
                        type="number" 
                        step="0.1"
                        value={regime.volMult}
                        onChange={(e) => {
                          const updated = [...(config.monteCarlo?.regimes || [])];
                          updated[index] = { ...regime, volMult: parseFloat(e.target.value) };
                          setConfig({ 
                            ...config, 
                            monteCarlo: { ...config.monteCarlo!, regimes: updated }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Probability</Label>
                      <Input 
                        type="number" 
                        step="0.1"
                        min="0"
                        max="1"
                        value={regime.prob}
                        onChange={(e) => {
                          const updated = [...(config.monteCarlo?.regimes || [])];
                          updated[index] = { ...regime, prob: parseFloat(e.target.value) };
                          setConfig({ 
                            ...config, 
                            monteCarlo: { ...config.monteCarlo!, regimes: updated }
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedScenarios.map((scenario) => (
              <Card key={scenario.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{scenario.name}</CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Created {scenario.created}</Badge>
                    <Button variant="outline" size="sm">
                      Load
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}