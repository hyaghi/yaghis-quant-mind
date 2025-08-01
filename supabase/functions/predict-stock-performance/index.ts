import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Validate required environment variables
if (!openAIApiKey) {
  console.error('OPENAI_API_KEY is not configured');
}
if (!finnhubApiKey) {
  console.error('FINNHUB_API_KEY is not configured');
}
if (!supabaseUrl) {
  console.error('SUPABASE_URL is not configured');
}
if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface StockPrediction {
  symbol: string;
  currentPrice: number;
  predictedDirection: 'bullish' | 'bearish' | 'neutral';
  predictedPriceRange: {
    low: number;
    high: number;
    target: number;
  };
  timeframe: '1day' | '1week' | '1month' | '1year';
  confidence: number;
  reasoning: string;
  keyFactors: {
    newsImpact: number;
    technicalScore: number;
    volumePattern: number;
    marketSentiment: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
}

interface NewsAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  volume: number;
  keyTopics: string[];
}

interface TechnicalAnalysis {
  trend: 'upward' | 'downward' | 'sideways';
  support: number;
  resistance: number;
  rsi: number;
  volatility: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeframe = '1week' } = await req.json();

    if (!symbol) {
      throw new Error('Stock symbol is required');
    }

    // Check for missing API keys before proceeding
    if (!openAIApiKey || !finnhubApiKey) {
      throw new Error('Missing required API keys. Please configure OPENAI_API_KEY and FINNHUB_API_KEY in Supabase Edge Function secrets.');
    }

    console.log(`Generating prediction for ${symbol} with timeframe ${timeframe}`);

    // Fetch current stock data
    console.log('Fetching stock data...');
    const stockData = await fetchStockData(symbol);
    console.log('Stock data fetched successfully');
    
    // Fetch recent news and analyze sentiment
    console.log('Analyzing recent news...');
    const newsAnalysis = await analyzeRecentNews(symbol);
    console.log('News analysis completed');
    
    // Perform technical analysis on historical data
    console.log('Performing technical analysis...');
    const technicalAnalysis = await performTechnicalAnalysis(symbol);
    console.log('Technical analysis completed');
    
    // Generate AI prediction
    console.log('Generating AI prediction...');
    const prediction = await generateAIPrediction(
      symbol,
      stockData,
      newsAnalysis,
      technicalAnalysis,
      timeframe
    );
    console.log('AI prediction generated successfully');

    console.log('Storing prediction in database...');
    await storePrediction(prediction);
    console.log('Prediction stored successfully');

    return new Response(JSON.stringify({
      success: true,
      prediction,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in predict-stock-performance:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchStockData(symbol: string) {
  try {
    // Get current quote
    const quoteResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
    );
    const quote = await quoteResponse.json();

    // Get basic company info
    const profileResponse = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubApiKey}`
    );
    const profile = await profileResponse.json();

    return {
      currentPrice: quote.c,
      previousClose: quote.pc,
      change: quote.d,
      changePercent: quote.dp,
      high: quote.h,
      low: quote.l,
      volume: quote.v || 0,
      marketCap: profile.marketCapitalization,
      industry: profile.finnhubIndustry
    };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw new Error('Failed to fetch stock data');
  }
}

async function analyzeRecentNews(symbol: string): Promise<NewsAnalysis> {
  try {
    // Get news from last 7 days
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const newsResponse = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}&token=${finnhubApiKey}`
    );
    const news = await newsResponse.json();

    if (!news || news.length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        volume: 0,
        keyTopics: []
      };
    }

    // Analyze sentiment using OpenAI with retry logic
    const newsTexts = news.slice(0, 10).map((item: any) => 
      `${item.headline} ${item.summary || ''}`
    ).join('\n');

    const sentimentResponse = await makeOpenAIRequest({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a financial news analyst. Analyze the sentiment of news articles and return a JSON response with sentiment (positive/negative/neutral), score (-1 to 1), and key topics array.'
        },
        {
          role: 'user',
          content: `Analyze the sentiment of these recent news articles for ${symbol}:\n${newsTexts}`
        }
      ],
      temperature: 0.3
    });

    const sentimentData = sentimentResponse;
    const analysis = JSON.parse(sentimentData.choices[0].message.content);

    return {
      sentiment: analysis.sentiment,
      score: analysis.score,
      volume: news.length,
      keyTopics: analysis.keyTopics || []
    };
  } catch (error) {
    console.error('Error analyzing news:', error);
    // Return default values instead of throwing
    return {
      sentiment: 'neutral',
      score: 0,
      volume: 0,
      keyTopics: []
    };
  }
}

async function performTechnicalAnalysis(symbol: string): Promise<TechnicalAnalysis> {
  try {
    // Get historical data for technical analysis
    const toTimestamp = Math.floor(Date.now() / 1000);
    const fromTimestamp = toTimestamp - (30 * 24 * 60 * 60); // 30 days

    const candleResponse = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${finnhubApiKey}`
    );
    const candles = await candleResponse.json();

    if (candles.s !== 'ok' || !candles.c) {
      throw new Error('No historical data available');
    }

    const prices = candles.c;
    const volumes = candles.v;
    const highs = candles.h;
    const lows = candles.l;

    // Calculate technical indicators
    const sma20 = calculateSMA(prices, 20);
    const rsi = calculateRSI(prices, 14);
    const volatility = calculateVolatility(prices);
    
    // Determine trend
    const recentPrices = prices.slice(-5);
    const trend = recentPrices[4] > recentPrices[0] ? 'upward' : 
                  recentPrices[4] < recentPrices[0] ? 'downward' : 'sideways';

    // Calculate support and resistance
    const support = Math.min(...lows.slice(-20));
    const resistance = Math.max(...highs.slice(-20));

    return {
      trend,
      support,
      resistance,
      rsi: rsi[rsi.length - 1] || 50,
      volatility
    };
  } catch (error) {
    console.error('Error in technical analysis:', error);
    // Return default values instead of throwing
    return {
      trend: 'sideways',
      support: 0,
      resistance: 0,
      rsi: 50,
      volatility: 0.2
    };
  }
}

async function generateAIPrediction(
  symbol: string,
  stockData: any,
  newsAnalysis: NewsAnalysis,
  technicalAnalysis: TechnicalAnalysis,
  timeframe: string
): Promise<StockPrediction> {
  
  const prompt = `
As a professional stock analyst, provide a prediction for ${symbol} based on the following data:

Current Stock Data:
- Current Price: $${stockData.currentPrice}
- Previous Close: $${stockData.previousClose}
- Change: ${stockData.changePercent}%
- Industry: ${stockData.industry}

News Analysis:
- Sentiment: ${newsAnalysis.sentiment}
- Sentiment Score: ${newsAnalysis.score}
- News Volume: ${newsAnalysis.volume} articles
- Key Topics: ${newsAnalysis.keyTopics.join(', ')}

Technical Analysis:
- Trend: ${technicalAnalysis.trend}
- RSI: ${technicalAnalysis.rsi}
- Support: $${technicalAnalysis.support}
- Resistance: $${technicalAnalysis.resistance}
- Volatility: ${technicalAnalysis.volatility}

Provide a prediction for the ${timeframe === '1year' ? '1 year' : timeframe} timeframe in JSON format with:
{
  "direction": "bullish/bearish/neutral",
  "targetPrice": number,
  "lowPrice": number,
  "highPrice": number,
  "confidence": number (0-1),
  "reasoning": "detailed explanation",
  "newsImpact": number (0-1),
  "technicalScore": number (0-1),
  "volumePattern": number (0-1),
  "marketSentiment": number (0-1),
  "riskLevel": "low/medium/high"
}
`;

  try {
    console.log('Making OpenAI request...');
    const response = await makeOpenAIRequest({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a professional stock analyst with expertise in technical analysis, fundamental analysis, and market sentiment. Provide accurate, data-driven predictions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2
    });

    console.log('OpenAI response received');
    const data = response;
    console.log('Parsing AI response...');
    const aiPrediction = JSON.parse(data.choices[0].message.content);

    return {
      symbol,
      currentPrice: stockData.currentPrice,
      predictedDirection: aiPrediction.direction,
      predictedPriceRange: {
        low: aiPrediction.lowPrice,
        high: aiPrediction.highPrice,
        target: aiPrediction.targetPrice
      },
      timeframe: timeframe as any,
      confidence: aiPrediction.confidence,
      reasoning: aiPrediction.reasoning,
      keyFactors: {
        newsImpact: aiPrediction.newsImpact,
        technicalScore: aiPrediction.technicalScore,
        volumePattern: aiPrediction.volumePattern,
        marketSentiment: aiPrediction.marketSentiment
      },
      riskLevel: aiPrediction.riskLevel,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating AI prediction:', error);
    throw new Error('Failed to generate prediction');
  }
}

async function storePrediction(prediction: StockPrediction) {
  try {
    const { error } = await supabase
      .from('stock_predictions')
      .insert({
        symbol: prediction.symbol,
        current_price: prediction.currentPrice,
        predicted_direction: prediction.predictedDirection,
        predicted_price_range: prediction.predictedPriceRange,
        timeframe: prediction.timeframe,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        key_factors: prediction.keyFactors,
        risk_level: prediction.riskLevel,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing prediction:', error);
    }
  } catch (error) {
    console.error('Error storing prediction:', error);
  }
}

// Technical indicator calculations
function calculateSMA(prices: number[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateRSI(prices: number[], period: number): number[] {
  const rsi = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}

// Rate limiting and retry logic for OpenAI API
async function makeOpenAIRequest(requestBody: any, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429) {
        // Rate limit exceeded, wait before retrying
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limit exceeded, waiting ${waitTime}ms before retry ${attempt}/${retries}`);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error('Rate limit exceeded - max retries reached');
        }
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying for other errors too
      const waitTime = Math.pow(2, attempt) * 500;
      console.log(`Request failed, retrying in ${waitTime}ms. Attempt ${attempt}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

function calculateVolatility(prices: number[]): number {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}