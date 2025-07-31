import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenarioConfig, assetUniverse } = await req.json();
    
    console.log('Generating scenarios with config:', scenarioConfig);
    
    // Generate scenarios based on config
    const scenarios = await generateScenarios(scenarioConfig, assetUniverse);
    
    return new Response(
      JSON.stringify({ scenarios }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error generating scenarios:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});

async function generateScenarios(config: any, assets: string[]) {
  const scenarios = [];
  
  // Historical replay scenarios
  if (config.include.includes('historicalReplay') && config.historicalReplay) {
    for (const episode of config.historicalReplay) {
      scenarios.push(await generateHistoricalScenario(episode, assets, config.horizonDays));
    }
  }
  
  // Macro shock scenarios
  if (config.include.includes('macroShocks') && config.macroShocks) {
    for (const shock of config.macroShocks) {
      scenarios.push(await generateMacroShockScenario(shock, assets, config.horizonDays));
    }
  }
  
  // Monte Carlo scenarios
  if (config.include.includes('monteCarlo') && config.monteCarlo) {
    const mcScenarios = await generateMonteCarloScenarios(
      config.monteCarlo,
      assets,
      config.horizonDays,
      config.paths,
      config.seed
    );
    scenarios.push(...mcScenarios);
  }
  
  return scenarios;
}

async function generateHistoricalScenario(episode: string, assets: string[], horizonDays: number) {
  // Historical episode data - in production, this would come from a database
  const episodeData = getHistoricalEpisodeData(episode);
  
  const scenario = {
    id: `hist_${episode}_${Date.now()}`,
    name: `Historical: ${episodeData.name}`,
    type: 'historical',
    episode,
    paths: generateHistoricalPaths(episodeData, assets, horizonDays)
  };
  
  return scenario;
}

async function generateMacroShockScenario(shock: any, assets: string[], horizonDays: number) {
  const scenario = {
    id: `shock_${shock.name}_${Date.now()}`,
    name: `Shock: ${shock.name}`,
    type: 'macroShock',
    shock: shock.shock,
    paths: generateShockPaths(shock.shock, assets, horizonDays)
  };
  
  return scenario;
}

async function generateMonteCarloScenarios(config: any, assets: string[], horizonDays: number, numPaths: number, seed: number) {
  const scenarios = [];
  
  // Set random seed for reproducibility
  Math.random = seedRandom(seed);
  
  for (let i = 0; i < numPaths; i++) {
    // Sample regime based on probabilities
    const regime = sampleRegime(config.regimes);
    
    const scenario = {
      id: `mc_${regime.name}_${i}_${Date.now()}`,
      name: `Monte Carlo: ${regime.name} ${i + 1}`,
      type: 'monteCarlo',
      regime: regime.name,
      paths: generateStochasticPaths(regime, assets, horizonDays)
    };
    
    scenarios.push(scenario);
  }
  
  return scenarios;
}

function getHistoricalEpisodeData(episode: string) {
  const episodes = {
    'GFC2008': {
      name: '2008-2009 GFC',
      startDate: '2008-09-01',
      endDate: '2009-03-31',
      shocks: { equity: -0.45, bonds: 0.12, vol: 2.5 }
    },
    'COVID2020': {
      name: '2020 Q1 COVID',
      startDate: '2020-02-20',
      endDate: '2020-04-30',
      shocks: { equity: -0.35, bonds: 0.08, vol: 3.0 }
    },
    'Rates2022': {
      name: '2022 Rate Shock',
      startDate: '2022-01-01',
      endDate: '2022-12-31',
      shocks: { equity: -0.20, bonds: -0.15, vol: 1.8 }
    }
  };
  
  return episodes[episode] || episodes['GFC2008'];
}

function generateHistoricalPaths(episodeData: any, assets: string[], horizonDays: number) {
  const paths = {};
  
  for (const asset of assets) {
    const path = [];
    let price = 100; // Start at 100
    
    for (let day = 0; day < horizonDays; day++) {
      // Apply episode-specific shocks with some randomness
      const shock = getAssetShock(asset, episodeData.shocks);
      const dailyReturn = (shock / horizonDays) + (Math.random() - 0.5) * 0.02;
      price *= (1 + dailyReturn);
      path.push(price);
    }
    
    paths[asset] = path;
  }
  
  return paths;
}

function generateShockPaths(shock: any, assets: string[], horizonDays: number) {
  const paths = {};
  
  for (const asset of assets) {
    const path = [];
    let price = 100;
    
    for (let day = 0; day < horizonDays; day++) {
      let dailyReturn = 0;
      
      // Apply various types of shocks
      if (shock.ratesBps) {
        dailyReturn += getBondShock(asset, shock.ratesBps / 10000 / horizonDays);
      }
      if (shock.usdPct) {
        dailyReturn += getCurrencyShock(asset, shock.usdPct / 100 / horizonDays);
      }
      if (shock.equityRegion) {
        dailyReturn += getRegionShock(asset, shock.equityRegion, horizonDays);
      }
      
      // Add noise
      dailyReturn += (Math.random() - 0.5) * 0.01;
      
      price *= (1 + dailyReturn);
      path.push(price);
    }
    
    paths[asset] = path;
  }
  
  return paths;
}

function generateStochasticPaths(regime: any, assets: string[], horizonDays: number) {
  const paths = {};
  
  for (const asset of assets) {
    const path = [];
    let price = 100;
    
    // Base volatility for asset type
    const baseVol = getAssetVolatility(asset);
    const adjustedVol = baseVol * regime.volMult;
    
    for (let day = 0; day < horizonDays; day++) {
      // Generate random return using adjusted volatility
      const dailyReturn = generateRandomReturn(adjustedVol);
      price *= (1 + dailyReturn);
      path.push(price);
    }
    
    paths[asset] = path;
  }
  
  return paths;
}

function getAssetShock(asset: string, shocks: any): number {
  if (asset.includes('BOND') || asset === 'IEF') return shocks.bonds || 0;
  return shocks.equity || 0;
}

function getBondShock(asset: string, rateShock: number): number {
  if (asset.includes('BOND') || asset === 'IEF') {
    // Duration approximation
    const duration = 7; // Assume 7-year duration
    return -duration * rateShock;
  }
  return 0;
}

function getCurrencyShock(asset: string, usdShock: number): number {
  // Simplified: apply currency shock to international assets
  if (asset.includes('INTERNATIONAL') || asset.includes('EM')) {
    return usdShock;
  }
  return 0;
}

function getRegionShock(asset: string, regionShocks: any, horizonDays: number): number {
  for (const [region, shock] of Object.entries(regionShocks)) {
    if (asset.includes(region)) {
      return (shock as number) / horizonDays;
    }
  }
  return 0;
}

function getAssetVolatility(asset: string): number {
  // Base annualized volatilities
  const vols = {
    'default': 0.15,
    'AAPL': 0.25,
    'TSLA': 0.45,
    'IEF': 0.05,
    'GLD': 0.18,
    'SPY': 0.16
  };
  
  return (vols[asset] || vols.default) / Math.sqrt(252); // Convert to daily
}

function generateRandomReturn(volatility: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const randNormal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return randNormal * volatility;
}

function sampleRegime(regimes: any[]): any {
  const rand = Math.random();
  let cumProb = 0;
  
  for (const regime of regimes) {
    cumProb += regime.prob;
    if (rand <= cumProb) {
      return regime;
    }
  }
  
  return regimes[regimes.length - 1];
}

function seedRandom(seed: number) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}