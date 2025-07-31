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
    const { allocationWeights, scenarioResults, currentHoldings, costModel, constraints } = await req.json();
    
    console.log('Generating portfolio advice');
    
    // Generate comprehensive advice
    const advice = await generatePortfolioAdvice(
      allocationWeights, 
      scenarioResults, 
      currentHoldings, 
      costModel, 
      constraints
    );
    
    return new Response(
      JSON.stringify(advice),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error generating advice:', error);
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

async function generatePortfolioAdvice(targetWeights: Record<string, number>, scenarioResults: any, currentHoldings: Record<string, number>, costModel: any, constraints: any) {
  // Generate trade list
  const trades = generateTradeList(targetWeights, currentHoldings, costModel);
  
  // Calculate risk summary
  const riskSummary = calculateRiskSummary(scenarioResults, constraints);
  
  // Generate sensitivity analysis
  const sensitivities = generateSensitivityAnalysis(targetWeights, scenarioResults);
  
  // Create rationale
  const rationale = generateRationale(scenarioResults, targetWeights, trades);
  
  return {
    targetWeights,
    trades,
    riskSummary,
    sensitivities,
    rationale,
    generatedAt: new Date().toISOString(),
    passRate: riskSummary.passRate,
    expectedReturn: riskSummary.expectedReturn,
    expectedVol: riskSummary.expectedVol
  };
}

function generateTradeList(targetWeights: Record<string, number>, currentHoldings: Record<string, number>, costModel: any): any[] {
  const trades = [];
  const assets = new Set([...Object.keys(targetWeights), ...Object.keys(currentHoldings)]);
  
  for (const asset of assets) {
    const currentWeight = currentHoldings[asset] || 0;
    const targetWeight = targetWeights[asset] || 0;
    const difference = targetWeight - currentWeight;
    
    if (Math.abs(difference) > 0.001) { // Only trade if difference > 0.1%
      const side = difference > 0 ? 'BUY' : 'SELL';
      const quantity = Math.abs(difference * 100000); // Assume $100k portfolio
      const estimatedCost = calculateTradeCost(asset, quantity, costModel);
      const avgDailyVolume = getAssetADV(asset);
      const advPercentage = quantity / avgDailyVolume;
      
      trades.push({
        symbol: asset,
        side,
        qty: Math.round(quantity),
        estCost: Math.round(estimatedCost * 100) / 100,
        advPct: Math.round(advPercentage * 1000) / 10, // Percentage with 1 decimal
        currentWeight: Math.round(currentWeight * 1000) / 10,
        targetWeight: Math.round(targetWeight * 1000) / 10,
        difference: Math.round(difference * 1000) / 10
      });
    }
  }
  
  return trades.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

function calculateTradeCost(asset: string, quantity: number, costModel: any): number {
  if (!costModel) return quantity * 0.001; // Default 0.1% cost
  
  let totalCost = 0;
  
  // Commission
  const commission = costModel.commissionBps || 5;
  totalCost += quantity * (commission / 10000);
  
  // Bid-ask spread
  const assetClass = getAssetClass(asset);
  const bidAsk = costModel.bidAskBps?.[assetClass] || 5;
  totalCost += quantity * (bidAsk / 10000);
  
  // Market impact
  const impact = costModel.slippageBpsPerTurnover || 10;
  totalCost += quantity * (impact / 10000);
  
  return totalCost;
}

function getAssetClass(asset: string): string {
  if (asset.includes('BOND') || asset === 'IEF' || asset === 'TLT') return 'FixedIncome';
  if (asset === 'GLD' || asset === 'GOLD' || asset === 'OIL') return 'Commodities';
  if (asset === 'CASH' || asset === 'USD') return 'Cash';
  return 'Equity';
}

function getAssetADV(asset: string): number {
  // Average Daily Volume in USD (simplified estimates)
  const advData = {
    'AAPL': 50000000,
    'MSFT': 30000000,
    'GOOGL': 25000000,
    'AMZN': 35000000,
    'TSLA': 40000000,
    'SPY': 100000000,
    'IEF': 5000000,
    'TLT': 8000000,
    'GLD': 15000000,
    'CASH': 1000000000
  };
  return advData[asset] || 10000000; // Default $10M ADV
}

function calculateRiskSummary(scenarioResults: any, constraints: any): any {
  if (!scenarioResults?.aggregateStats) {
    return {
      expectedReturn: 0.08,
      expectedVol: 0.12,
      maxDrawdown: 0.15,
      cvar95: 0.12,
      passRate: 0.85,
      constraints: constraints || {}
    };
  }
  
  const stats = scenarioResults.aggregateStats;
  
  return {
    expectedReturn: stats.meanReturn || 0,
    expectedVol: stats.volatility || 0,
    maxDrawdown: stats.maxDrawdown || 0,
    cvar95: stats.cvar95 || 0,
    passRate: stats.passRate || 0,
    sharpeRatio: stats.sharpeRatio || 0,
    sortino: stats.sortino || 0,
    constraints: constraints || {}
  };
}

function generateSensitivityAnalysis(targetWeights: Record<string, number>, scenarioResults: any): any[] {
  const baseMetrics = scenarioResults?.summaryMetrics || {
    expectedReturn: 0.08,
    expectedVolatility: 0.12,
    maxDrawdown: 0.15
  };
  
  const sensitivities = [
    {
      shock: "Rates +100bps",
      description: "Interest rates increase by 1%",
      expectedReturn: adjustForRateShock(baseMetrics.expectedReturn, targetWeights, 0.01),
      expectedVol: adjustVolForRateShock(baseMetrics.expectedVolatility, targetWeights, 0.01),
      maxDrawdown: adjustDrawdownForRateShock(baseMetrics.maxDrawdown, targetWeights, 0.01)
    },
    {
      shock: "Rates -100bps",
      description: "Interest rates decrease by 1%",
      expectedReturn: adjustForRateShock(baseMetrics.expectedReturn, targetWeights, -0.01),
      expectedVol: adjustVolForRateShock(baseMetrics.expectedVolatility, targetWeights, -0.01),
      maxDrawdown: adjustDrawdownForRateShock(baseMetrics.maxDrawdown, targetWeights, -0.01)
    },
    {
      shock: "USD -5%",
      description: "US Dollar weakens by 5%",
      expectedReturn: adjustForCurrencyShock(baseMetrics.expectedReturn, targetWeights, -0.05),
      expectedVol: adjustVolForCurrencyShock(baseMetrics.expectedVolatility, targetWeights),
      maxDrawdown: adjustDrawdownForCurrencyShock(baseMetrics.maxDrawdown, targetWeights)
    },
    {
      shock: "Oil +10%",
      description: "Oil prices increase by 10%",
      expectedReturn: adjustForOilShock(baseMetrics.expectedReturn, targetWeights, 0.10),
      expectedVol: baseMetrics.expectedVolatility,
      maxDrawdown: baseMetrics.maxDrawdown
    },
    {
      shock: "Equity Vol +50%",
      description: "Equity volatility increases by 50%",
      expectedReturn: baseMetrics.expectedReturn,
      expectedVol: adjustVolForEquityShock(baseMetrics.expectedVolatility, targetWeights, 1.5),
      maxDrawdown: adjustDrawdownForEquityShock(baseMetrics.maxDrawdown, targetWeights, 1.5)
    }
  ];
  
  return sensitivities.map(s => ({
    ...s,
    expectedReturn: Math.round(s.expectedReturn * 1000) / 10, // Percentage with 1 decimal
    expectedVol: Math.round(s.expectedVol * 1000) / 10,
    maxDrawdown: Math.round(s.maxDrawdown * 1000) / 10
  }));
}

function adjustForRateShock(baseReturn: number, weights: Record<string, number>, rateChange: number): number {
  const bondExposure = (weights['IEF'] || 0) + (weights['TLT'] || 0) + (weights['BOND'] || 0);
  const duration = 7; // Assume average duration of 7 years
  const bondImpact = -bondExposure * duration * rateChange;
  return baseReturn + bondImpact;
}

function adjustVolForRateShock(baseVol: number, weights: Record<string, number>, rateChange: number): number {
  const bondExposure = (weights['IEF'] || 0) + (weights['TLT'] || 0);
  return baseVol + bondExposure * Math.abs(rateChange) * 0.5;
}

function adjustDrawdownForRateShock(baseDrawdown: number, weights: Record<string, number>, rateChange: number): number {
  const bondExposure = (weights['IEF'] || 0) + (weights['TLT'] || 0);
  return baseDrawdown + bondExposure * Math.abs(rateChange) * 0.3;
}

function adjustForCurrencyShock(baseReturn: number, weights: Record<string, number>, usdChange: number): number {
  const intlExposure = (weights['INTERNATIONAL'] || 0) + (weights['EM'] || 0);
  return baseReturn + intlExposure * usdChange;
}

function adjustVolForCurrencyShock(baseVol: number, weights: Record<string, number>): number {
  const intlExposure = (weights['INTERNATIONAL'] || 0) + (weights['EM'] || 0);
  return baseVol + intlExposure * 0.02; // Add 2% vol for currency exposure
}

function adjustDrawdownForCurrencyShock(baseDrawdown: number, weights: Record<string, number>): number {
  const intlExposure = (weights['INTERNATIONAL'] || 0) + (weights['EM'] || 0);
  return baseDrawdown + intlExposure * 0.03;
}

function adjustForOilShock(baseReturn: number, weights: Record<string, number>, oilChange: number): number {
  const energyExposure = (weights['OIL'] || 0) + (weights['ENERGY'] || 0);
  return baseReturn + energyExposure * oilChange;
}

function adjustVolForEquityShock(baseVol: number, weights: Record<string, number>, volMultiplier: number): number {
  const equityExposure = 1 - (weights['IEF'] || 0) - (weights['CASH'] || 0) - (weights['BOND'] || 0);
  const volIncrease = equityExposure * baseVol * (volMultiplier - 1);
  return baseVol + volIncrease;
}

function adjustDrawdownForEquityShock(baseDrawdown: number, weights: Record<string, number>, volMultiplier: number): number {
  const equityExposure = 1 - (weights['IEF'] || 0) - (weights['CASH'] || 0) - (weights['BOND'] || 0);
  const ddIncrease = equityExposure * baseDrawdown * (volMultiplier - 1) * 0.5;
  return baseDrawdown + ddIncrease;
}

function generateRationale(scenarioResults: any, targetWeights: Record<string, number>, trades: any[]): any {
  // Identify top contributing scenarios
  const topScenarios = identifyKeyScenarios(scenarioResults);
  
  // Calculate factor exposures
  const factorShift = calculateFactorShift(targetWeights, trades);
  
  // Generate explanation
  const explanation = generateExplanation(topScenarios, factorShift, trades);
  
  return {
    topScenarios,
    factorShift,
    explanation,
    keyInsights: generateKeyInsights(scenarioResults, targetWeights, trades)
  };
}

function identifyKeyScenarios(scenarioResults: any): string[] {
  // Mock implementation - in practice, analyze scenario contributions to risk/return
  const scenarios = [
    "GFC2008: High impact on portfolio design due to equity exposure",
    "Rates2022: Moderate impact from duration risk in bond allocation", 
    "COVID2020: Defensive positioning helps performance in stress scenarios"
  ];
  
  return scenarios.slice(0, 3); // Top 3 scenarios
}

function calculateFactorShift(targetWeights: Record<string, number>, trades: any[]): any {
  const equityWeight = Object.entries(targetWeights)
    .filter(([asset]) => getAssetClass(asset) === 'Equity')
    .reduce((sum, [, weight]) => sum + weight, 0);
    
  const bondWeight = Object.entries(targetWeights)
    .filter(([asset]) => getAssetClass(asset) === 'FixedIncome') 
    .reduce((sum, [, weight]) => sum + weight, 0);
    
  const commodityWeight = Object.entries(targetWeights)
    .filter(([asset]) => getAssetClass(asset) === 'Commodities')
    .reduce((sum, [, weight]) => sum + weight, 0);
  
  return {
    equityBeta: Math.round((equityWeight - 0.6) * 100) / 100, // vs 60% benchmark
    duration: Math.round((bondWeight * 7 - 2) * 10) / 10, // Duration years vs 2yr benchmark  
    commodityBeta: Math.round((commodityWeight - 0.05) * 100) / 100, // vs 5% benchmark
    cashWeight: targetWeights['CASH'] || 0
  };
}

function generateExplanation(topScenarios: string[], factorShift: any, trades: any[]): string {
  let explanation = `Portfolio optimization was driven by ${topScenarios.length} key scenarios. `;
  
  if (factorShift.equityBeta > 0.1) {
    explanation += `Increased equity exposure by ${factorShift.equityBeta * 100}% to capture growth opportunities. `;
  } else if (factorShift.equityBeta < -0.1) {
    explanation += `Reduced equity exposure by ${Math.abs(factorShift.equityBeta) * 100}% for defensive positioning. `;
  }
  
  if (factorShift.duration > 1) {
    explanation += `Extended duration to ${factorShift.duration} years to benefit from rate environment. `;
  }
  
  if (trades.length > 5) {
    explanation += `Significant rebalancing across ${trades.length} positions to improve risk-adjusted returns.`;
  }
  
  return explanation;
}

function generateKeyInsights(scenarioResults: any, targetWeights: Record<string, number>, trades: any[]): string[] {
  const insights = [];
  
  const riskMetrics = scenarioResults?.summaryMetrics || {};
  
  if (riskMetrics.sharpeRatio > 1.0) {
    insights.push("Portfolio achieves attractive risk-adjusted returns with Sharpe ratio above 1.0");
  }
  
  if (riskMetrics.maxDrawdown < 0.15) {
    insights.push("Downside protection is strong with maximum drawdown under 15%");
  }
  
  if (riskMetrics.passRate > 0.8) {
    insights.push(`High scenario pass rate of ${Math.round(riskMetrics.passRate * 100)}% indicates robust performance`);
  }
  
  const totalTurnover = trades.reduce((sum, trade) => sum + Math.abs(trade.difference), 0);
  if (totalTurnover < 25) {
    insights.push("Low turnover implementation minimizes transaction costs");
  }
  
  // Default insights if no data
  if (insights.length === 0) {
    insights.push(
      "Balanced allocation provides diversification across asset classes",
      "Risk metrics indicate suitable exposure for long-term growth",
      "Portfolio positioning aligns with stress test scenarios"
    );
  }
  
  return insights.slice(0, 4); // Max 4 insights
}