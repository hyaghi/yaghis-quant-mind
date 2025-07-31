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
    const { allocationWeights, scenarios, costModel, horizonDays } = await req.json();
    
    console.log('Running portfolio simulation');
    
    // Run simulation across all scenarios
    const results = await runPortfolioSimulation(allocationWeights, scenarios, costModel, horizonDays);
    
    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in portfolio simulation:', error);
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

async function runPortfolioSimulation(weights: Record<string, number>, scenarios: any[], costModel: any, horizonDays: number) {
  const results = {
    scenarioResults: [],
    summaryMetrics: {},
    aggregateStats: {}
  };
  
  const allReturns: number[] = [];
  const allDrawdowns: number[] = [];
  const allVolatilities: number[] = [];
  
  // Run simulation for each scenario
  for (const scenario of scenarios) {
    const scenarioResult = await simulateScenario(weights, scenario, costModel, horizonDays);
    results.scenarioResults.push(scenarioResult);
    
    allReturns.push(scenarioResult.totalReturn);
    allDrawdowns.push(scenarioResult.maxDrawdown);
    allVolatilities.push(scenarioResult.volatility);
  }
  
  // Calculate aggregate statistics
  results.aggregateStats = {
    meanReturn: calculateMean(allReturns),
    medianReturn: calculateMedian(allReturns),
    volatility: calculateMean(allVolatilities),
    sharpeRatio: calculateMean(allReturns) / calculateMean(allVolatilities),
    maxDrawdown: Math.max(...allDrawdowns),
    worstReturn: Math.min(...allReturns),
    bestReturn: Math.max(...allReturns),
    var95: calculateVaR(allReturns, 0.95),
    cvar95: calculateCVaR(allReturns, 0.95),
    passRate: calculatePassRate(allReturns, -0.1) // Pass rate for returns > -10%
  };
  
  // Calculate summary metrics
  results.summaryMetrics = {
    expectedReturn: results.aggregateStats.meanReturn,
    expectedVolatility: results.aggregateStats.volatility,
    sharpeRatio: results.aggregateStats.sharpeRatio,
    maxDrawdown: results.aggregateStats.maxDrawdown,
    cvar95: results.aggregateStats.cvar95,
    passRate: results.aggregateStats.passRate
  };
  
  return results;
}

async function simulateScenario(weights: Record<string, number>, scenario: any, costModel: any, horizonDays: number) {
  const assets = Object.keys(weights);
  const portfolioValues: number[] = [];
  const dailyReturns: number[] = [];
  
  let currentHoldings = { ...weights };
  let portfolioValue = 1.0; // Start with $1
  let cumulativeCosts = 0;
  
  portfolioValues.push(portfolioValue);
  
  // Simulate each day
  for (let day = 1; day < horizonDays; day++) {
    let dayReturn = 0;
    let rebalancingCosts = 0;
    
    // Calculate portfolio return for the day
    for (const asset of assets) {
      const assetPath = scenario.paths?.[asset] || [];
      if (assetPath.length > day) {
        const assetReturn = (assetPath[day] - assetPath[day - 1]) / assetPath[day - 1];
        dayReturn += currentHoldings[asset] * assetReturn;
      }
    }
    
    // Apply rebalancing if needed (simplified - rebalance every 20 days)
    if (day % 20 === 0) {
      const { costs, newHoldings } = applyRebalancing(currentHoldings, weights, portfolioValue, costModel);
      rebalancingCosts = costs;
      currentHoldings = newHoldings;
    }
    
    // Update portfolio value
    portfolioValue *= (1 + dayReturn);
    portfolioValue -= rebalancingCosts;
    cumulativeCosts += rebalancingCosts;
    
    portfolioValues.push(portfolioValue);
    dailyReturns.push(dayReturn - rebalancingCosts / portfolioValue);
  }
  
  // Calculate metrics for this scenario
  const totalReturn = (portfolioValues[portfolioValues.length - 1] - 1);
  const volatility = calculateVolatility(dailyReturns);
  const maxDrawdown = calculateMaxDrawdown(portfolioValues);
  const sharpeRatio = calculateMean(dailyReturns) / volatility * Math.sqrt(252);
  const sortino = calculateSortino(dailyReturns);
  const timeUnderWater = calculateTimeUnderWater(portfolioValues);
  
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    portfolioValues,
    dailyReturns,
    totalReturn,
    volatility: volatility * Math.sqrt(252), // Annualized
    maxDrawdown,
    sharpeRatio,
    sortino,
    timeUnderWater,
    totalCosts: cumulativeCosts,
    finalValue: portfolioValues[portfolioValues.length - 1]
  };
}

function applyRebalancing(currentHoldings: Record<string, number>, targetWeights: Record<string, number>, portfolioValue: number, costModel: any) {
  const assets = Object.keys(targetWeights);
  let totalCosts = 0;
  const newHoldings = { ...currentHoldings };
  
  // Calculate current weights
  const currentWeights: Record<string, number> = {};
  for (const asset of assets) {
    currentWeights[asset] = currentHoldings[asset] || 0;
  }
  
  // Calculate trades needed
  for (const asset of assets) {
    const currentWeight = currentWeights[asset] || 0;
    const targetWeight = targetWeights[asset] || 0;
    const tradeDiff = Math.abs(targetWeight - currentWeight);
    
    if (tradeDiff > 0.001) { // Only trade if difference > 0.1%
      // Calculate trading costs
      const assetCosts = calculateTradingCosts(asset, tradeDiff, portfolioValue, costModel);
      totalCosts += assetCosts;
      
      // Update holdings to target
      newHoldings[asset] = targetWeight;
    }
  }
  
  return { costs: totalCosts, newHoldings };
}

function calculateTradingCosts(asset: string, tradeFraction: number, portfolioValue: number, costModel: any): number {
  if (!costModel) return 0;
  
  const tradeValue = tradeFraction * portfolioValue;
  let totalCosts = 0;
  
  // Commission costs
  const commissionBps = costModel.commissionBps || 5;
  totalCosts += tradeValue * (commissionBps / 10000);
  
  // Bid-ask spread
  const assetClass = getAssetClass(asset);
  const bidAskBps = costModel.bidAskBps?.[assetClass] || 5;
  totalCosts += tradeValue * (bidAskBps / 10000);
  
  // Market impact (slippage)
  const slippageBps = costModel.slippageBpsPerTurnover || 10;
  totalCosts += tradeValue * (slippageBps / 10000) * tradeFraction;
  
  return totalCosts;
}

function getAssetClass(asset: string): string {
  if (asset.includes('BOND') || asset === 'IEF') return 'FixedIncome';
  if (asset === 'GLD' || asset.includes('GOLD')) return 'Commodities';
  if (asset === 'CASH') return 'Cash';
  return 'Equity';
}

// Statistical helper functions
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;
  const mean = calculateMean(returns);
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

function calculateMaxDrawdown(values: number[]): number {
  let maxDrawdown = 0;
  let peak = values[0];
  
  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  
  return maxDrawdown;
}

function calculateSortino(returns: number[]): number {
  const mean = calculateMean(returns);
  const downside = returns.filter(ret => ret < 0);
  
  if (downside.length === 0) return Infinity;
  
  const downsideDeviation = Math.sqrt(
    downside.reduce((sum, ret) => sum + ret * ret, 0) / downside.length
  );
  
  return downsideDeviation > 0 ? mean / downsideDeviation * Math.sqrt(252) : 0;
}

function calculateTimeUnderWater(values: number[]): number {
  let underWaterDays = 0;
  let peak = values[0];
  
  for (const value of values) {
    if (value >= peak) {
      peak = value;
    } else {
      underWaterDays++;
    }
  }
  
  return underWaterDays / values.length;
}

function calculateVaR(returns: number[], confidence: number): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return sorted[index] || 0;
}

function calculateCVaR(returns: number[], confidence: number): number {
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.floor((1 - confidence) * sorted.length);
  const tailReturns = sorted.slice(0, cutoff);
  return calculateMean(tailReturns);
}

function calculatePassRate(returns: number[], threshold: number): number {
  const passing = returns.filter(ret => ret > threshold).length;
  return passing / returns.length;
}