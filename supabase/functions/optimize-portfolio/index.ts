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
    const { objective, assets, constraints, priors, scenarioData } = await req.json();
    
    console.log('Running optimization with objective:', objective);
    
    // Run portfolio optimization
    const result = await optimizePortfolio(objective, assets, constraints, priors, scenarioData);
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in portfolio optimization:', error);
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

async function optimizePortfolio(objective: string, assets: string[], constraints: any, priors: any, scenarioData: any) {
  // Generate expected returns and covariance matrix
  const { expectedReturns, covarianceMatrix } = await estimateParameters(assets, scenarioData, priors);
  
  let weights: number[];
  let diagnostics: any = {};
  
  switch (objective) {
    case 'maxSharpe':
      weights = await maximizeSharpeRatio(expectedReturns, covarianceMatrix, constraints);
      break;
    case 'minVol':
      weights = await minimizeVolatility(covarianceMatrix, constraints);
      break;
    case 'maxReturn':
      weights = await maximizeReturn(expectedReturns, constraints);
      break;
    case 'minCVaR':
      weights = await minimizeCVaR(expectedReturns, covarianceMatrix, scenarioData, constraints);
      break;
    case 'riskParity':
      weights = await riskParity(covarianceMatrix, constraints);
      break;
    case 'blackLitterman':
      weights = await blackLittermanOptimization(expectedReturns, covarianceMatrix, priors, constraints);
      break;
    default:
      throw new Error(`Unknown objective: ${objective}`);
  }
  
  // Calculate portfolio diagnostics
  const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portfolioVol = calculatePortfolioVolatility(weights, covarianceMatrix);
  const sharpeRatio = portfolioReturn / portfolioVol;
  const maxWeight = Math.max(...weights);
  
  // Estimate turnover (simplified)
  const turnover = calculateTurnover(weights, priors?.currentWeights || new Array(assets.length).fill(0));
  
  return {
    weights: Object.fromEntries(assets.map((asset, i) => [asset, weights[i]])),
    diagnostics: {
      expectedReturn: portfolioReturn,
      expectedVol: portfolioVol,
      sharpeRatio,
      maxWeight,
      turnover,
      ...diagnostics
    }
  };
}

async function estimateParameters(assets: string[], scenarioData: any, priors: any) {
  // Generate sample returns from scenario data
  const returns = generateReturnsFromScenarios(assets, scenarioData);
  
  // Calculate expected returns (mean)
  const expectedReturns = returns.map(assetReturns => 
    assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length
  );
  
  // Calculate covariance matrix with Ledoit-Wolf shrinkage
  const sampleCov = calculateSampleCovariance(returns);
  const covarianceMatrix = applyShrinkage(sampleCov, returns, 'LedoitWolf');
  
  return { expectedReturns, covarianceMatrix };
}

function generateReturnsFromScenarios(assets: string[], scenarioData: any): number[][] {
  const returns: number[][] = assets.map(() => []);
  
  // Extract returns from scenario paths
  for (const scenario of scenarioData.scenarios || []) {
    if (scenario.paths) {
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const path = scenario.paths[asset] || [];
        
        // Calculate daily returns
        for (let t = 1; t < path.length; t++) {
          const dailyReturn = (path[t] - path[t-1]) / path[t-1];
          returns[i].push(dailyReturn);
        }
      }
    }
  }
  
  // If no scenario data, use mock returns
  if (returns[0].length === 0) {
    for (let i = 0; i < assets.length; i++) {
      returns[i] = generateMockReturns(assets[i], 252);
    }
  }
  
  return returns;
}

function generateMockReturns(asset: string, periods: number): number[] {
  const returns = [];
  const baseVol = getAssetVolatility(asset);
  const baseReturn = getAssetExpectedReturn(asset);
  
  for (let i = 0; i < periods; i++) {
    const randomShock = (Math.random() - 0.5) * 2;
    const dailyReturn = (baseReturn / 252) + (baseVol / Math.sqrt(252)) * randomShock;
    returns.push(dailyReturn);
  }
  
  return returns;
}

function getAssetVolatility(asset: string): number {
  const vols = {
    'AAPL': 0.25, 'MSFT': 0.22, 'GOOGL': 0.24, 'AMZN': 0.28,
    'IEF': 0.05, 'GLD': 0.18, 'SPY': 0.16, 'CASH': 0.001
  };
  return vols[asset] || 0.20;
}

function getAssetExpectedReturn(asset: string): number {
  const returns = {
    'AAPL': 0.12, 'MSFT': 0.11, 'GOOGL': 0.10, 'AMZN': 0.13,
    'IEF': 0.03, 'GLD': 0.05, 'SPY': 0.09, 'CASH': 0.02
  };
  return returns[asset] || 0.08;
}

async function maximizeSharpeRatio(expectedReturns: number[], covMatrix: number[][], constraints: any): Promise<number[]> {
  // Simplified mean-variance optimization
  // In production, use proper numerical optimization library
  
  const n = expectedReturns.length;
  const weights = new Array(n).fill(1 / n); // Start with equal weights
  
  // Simple gradient ascent
  const learningRate = 0.001;
  const iterations = 1000;
  
  for (let iter = 0; iter < iterations; iter++) {
    const currentSharpe = calculateSharpeRatio(weights, expectedReturns, covMatrix);
    const gradient = calculateSharpeGradient(weights, expectedReturns, covMatrix);
    
    // Update weights
    for (let i = 0; i < n; i++) {
      weights[i] += learningRate * gradient[i];
    }
    
    // Apply constraints
    applyConstraints(weights, constraints);
  }
  
  return weights;
}

async function minimizeVolatility(covMatrix: number[][], constraints: any): Promise<number[]> {
  const n = covMatrix.length;
  
  // For minimum variance, optimal weights are proportional to inverse covariance
  const invCov = invertMatrix(covMatrix);
  const ones = new Array(n).fill(1);
  const weights = matrixVectorMultiply(invCov, ones);
  
  // Normalize to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / sum);
  
  applyConstraints(normalizedWeights, constraints);
  return normalizedWeights;
}

async function maximizeReturn(expectedReturns: number[], constraints: any): Promise<number[]> {
  const n = expectedReturns.length;
  const weights = new Array(n).fill(0);
  
  // Find highest return asset within constraints
  const maxReturnIndex = expectedReturns.indexOf(Math.max(...expectedReturns));
  const maxWeight = constraints.maxWeightPerAsset || 1.0;
  
  weights[maxReturnIndex] = Math.min(maxWeight, 1.0);
  
  // Distribute remaining weight
  const remainingWeight = 1.0 - weights[maxReturnIndex];
  if (remainingWeight > 0) {
    const sortedIndices = expectedReturns
      .map((ret, idx) => ({ ret, idx }))
      .sort((a, b) => b.ret - a.ret)
      .map(item => item.idx);
    
    let allocated = weights[maxReturnIndex];
    for (const idx of sortedIndices) {
      if (idx === maxReturnIndex) continue;
      
      const canAllocate = Math.min(maxWeight, 1.0 - allocated);
      weights[idx] = canAllocate;
      allocated += canAllocate;
      
      if (allocated >= 1.0) break;
    }
  }
  
  return weights;
}

async function minimizeCVaR(expectedReturns: number[], covMatrix: number[][], scenarioData: any, constraints: any): Promise<number[]> {
  // Simplified CVaR optimization
  // Start with minimum variance and adjust
  const baseWeights = await minimizeVolatility(covMatrix, constraints);
  
  // Adjust based on tail risk from scenarios
  const adjustedWeights = [...baseWeights];
  
  // Reduce weights of assets with high tail risk
  for (let i = 0; i < adjustedWeights.length; i++) {
    const tailRisk = estimateAssetTailRisk(i, scenarioData);
    if (tailRisk > 0.2) { // High tail risk threshold
      adjustedWeights[i] *= 0.8; // Reduce weight
    }
  }
  
  // Renormalize
  const sum = adjustedWeights.reduce((a, b) => a + b, 0);
  return adjustedWeights.map(w => w / sum);
}

async function riskParity(covMatrix: number[][], constraints: any): Promise<number[]> {
  const n = covMatrix.length;
  let weights = new Array(n).fill(1 / n); // Start with equal weights
  
  // Iterative algorithm to achieve equal risk contributions
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const riskContributions = calculateRiskContributions(weights, covMatrix);
    const targetContribution = 1 / n;
    
    let maxDiff = 0;
    const newWeights = [...weights];
    
    for (let i = 0; i < n; i++) {
      const diff = riskContributions[i] - targetContribution;
      maxDiff = Math.max(maxDiff, Math.abs(diff));
      
      // Adjust weight to move towards target contribution
      newWeights[i] *= (1 - 0.1 * diff);
    }
    
    // Normalize weights
    const sum = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map(w => Math.max(0, w / sum));
    
    if (maxDiff < tolerance) break;
  }
  
  applyConstraints(weights, constraints);
  return weights;
}

async function blackLittermanOptimization(marketReturns: number[], covMatrix: number[][], priors: any, constraints: any): Promise<number[]> {
  const tau = priors.blackLitterman?.tau || 0.05;
  const views = priors.blackLitterman?.views || [];
  
  // Start with market cap weights (simplified as equal weights)
  const marketWeights = new Array(marketReturns.length).fill(1 / marketReturns.length);
  
  // Implied equilibrium returns
  const riskAversion = 3.0; // Typical value
  const impliedReturns = matrixVectorMultiply(covMatrix, marketWeights.map(w => w * riskAversion));
  
  if (views.length === 0) {
    // No views, return market weights
    return marketWeights;
  }
  
  // Apply Black-Litterman with views (simplified implementation)
  const adjustedReturns = [...impliedReturns];
  
  // Adjust returns based on views
  for (const view of views) {
    if (view.asset && view.expectedReturn) {
      const assetIndex = view.asset;
      const confidence = view.confidence || 0.5;
      adjustedReturns[assetIndex] = 
        (1 - confidence) * impliedReturns[assetIndex] + 
        confidence * view.expectedReturn;
    }
  }
  
  // Optimize with adjusted returns
  return await maximizeSharpeRatio(adjustedReturns, covMatrix, constraints);
}

// Helper functions
function calculateSampleCovariance(returns: number[][]): number[][] {
  const n = returns.length;
  const periods = returns[0].length;
  const means = returns.map(assetReturns => 
    assetReturns.reduce((sum, ret) => sum + ret, 0) / periods
  );
  
  const covMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    covMatrix[i] = [];
    for (let j = 0; j < n; j++) {
      let covariance = 0;
      for (let t = 0; t < periods; t++) {
        covariance += (returns[i][t] - means[i]) * (returns[j][t] - means[j]);
      }
      covMatrix[i][j] = covariance / (periods - 1);
    }
  }
  
  return covMatrix;
}

function applyShrinkage(sampleCov: number[][], returns: number[][], method: string): number[][] {
  if (method !== 'LedoitWolf') return sampleCov;
  
  const n = sampleCov.length;
  const shrinkageTarget = calculateShrinkageTarget(sampleCov);
  const shrinkageIntensity = 0.2; // Simplified
  
  const shrunkCov: number[][] = [];
  for (let i = 0; i < n; i++) {
    shrunkCov[i] = [];
    for (let j = 0; j < n; j++) {
      shrunkCov[i][j] = (1 - shrinkageIntensity) * sampleCov[i][j] + 
                       shrinkageIntensity * shrinkageTarget[i][j];
    }
  }
  
  return shrunkCov;
}

function calculateShrinkageTarget(sampleCov: number[][]): number[][] {
  const n = sampleCov.length;
  const avgVar = sampleCov.reduce((sum, row, i) => sum + row[i], 0) / n;
  const avgCovar = 0; // Single-index model target
  
  const target: number[][] = [];
  for (let i = 0; i < n; i++) {
    target[i] = [];
    for (let j = 0; j < n; j++) {
      target[i][j] = i === j ? avgVar : avgCovar;
    }
  }
  
  return target;
}

function calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
  return weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);
}

function calculatePortfolioVolatility(weights: number[], covMatrix: number[][]): number {
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

function calculateSharpeRatio(weights: number[], expectedReturns: number[], covMatrix: number[][]): number {
  const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portfolioVol = calculatePortfolioVolatility(weights, covMatrix);
  return portfolioVol > 0 ? portfolioReturn / portfolioVol : 0;
}

function calculateSharpeGradient(weights: number[], expectedReturns: number[], covMatrix: number[][]): number[] {
  const epsilon = 1e-8;
  const gradient = new Array(weights.length);
  const baseSharpe = calculateSharpeRatio(weights, expectedReturns, covMatrix);
  
  for (let i = 0; i < weights.length; i++) {
    const perturbedWeights = [...weights];
    perturbedWeights[i] += epsilon;
    const perturbedSharpe = calculateSharpeRatio(perturbedWeights, expectedReturns, covMatrix);
    gradient[i] = (perturbedSharpe - baseSharpe) / epsilon;
  }
  
  return gradient;
}

function calculateRiskContributions(weights: number[], covMatrix: number[][]): number[] {
  const portfolioVol = calculatePortfolioVolatility(weights, covMatrix);
  const contributions = new Array(weights.length);
  
  for (let i = 0; i < weights.length; i++) {
    let marginalContribution = 0;
    for (let j = 0; j < weights.length; j++) {
      marginalContribution += weights[j] * covMatrix[i][j];
    }
    contributions[i] = weights[i] * marginalContribution / (portfolioVol * portfolioVol);
  }
  
  return contributions;
}

function calculateTurnover(newWeights: number[], currentWeights: number[]): number {
  let turnover = 0;
  for (let i = 0; i < newWeights.length; i++) {
    turnover += Math.abs(newWeights[i] - currentWeights[i]);
  }
  return turnover / 2; // Divide by 2 for one-way turnover
}

function estimateAssetTailRisk(assetIndex: number, scenarioData: any): number {
  // Simplified tail risk estimation
  return 0.1 + Math.random() * 0.2; // Mock implementation
}

function applyConstraints(weights: number[], constraints: any): void {
  if (!constraints) return;
  
  // Apply maximum weight constraint
  const maxWeight = constraints.maxWeightPerAsset || 1.0;
  for (let i = 0; i < weights.length; i++) {
    weights[i] = Math.min(weights[i], maxWeight);
    weights[i] = Math.max(weights[i], 0); // No negative weights
  }
  
  // Renormalize to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < weights.length; i++) {
      weights[i] /= sum;
    }
  }
}

function invertMatrix(matrix: number[][]): number[][] {
  // Simplified matrix inversion (for small matrices)
  const n = matrix.length;
  if (n === 2) {
    const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    return [
      [matrix[1][1] / det, -matrix[0][1] / det],
      [-matrix[1][0] / det, matrix[0][0] / det]
    ];
  }
  
  // For larger matrices, use identity as approximation
  const identity: number[][] = [];
  for (let i = 0; i < n; i++) {
    identity[i] = new Array(n).fill(0);
    identity[i][i] = 1;
  }
  return identity;
}

function matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
  const result = new Array(matrix.length);
  for (let i = 0; i < matrix.length; i++) {
    result[i] = 0;
    for (let j = 0; j < vector.length; j++) {
      result[i] += matrix[i][j] * vector[j];
    }
  }
  return result;
}