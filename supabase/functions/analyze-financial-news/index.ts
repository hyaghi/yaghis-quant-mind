import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const marketstackApiKey = Deno.env.get('MARKETSTACK_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive company and sector mapping
const COMPANY_TICKERS = {
  'Apple': 'AAPL', 'apple': 'AAPL', 'AAPL': 'AAPL',
  'Tesla': 'TSLA', 'tesla': 'TSLA', 'TSLA': 'TSLA',
  'Microsoft': 'MSFT', 'microsoft': 'MSFT', 'MSFT': 'MSFT',
  'Amazon': 'AMZN', 'amazon': 'AMZN', 'AMZN': 'AMZN',
  'Alphabet': 'GOOGL', 'Google': 'GOOGL', 'google': 'GOOGL', 'GOOGL': 'GOOGL',
  'Meta': 'META', 'Facebook': 'META', 'meta': 'META', 'META': 'META',
  'NVIDIA': 'NVDA', 'nvidia': 'NVDA', 'NVDA': 'NVDA',
  'Netflix': 'NFLX', 'netflix': 'NFLX', 'NFLX': 'NFLX',
  'AMD': 'AMD', 'amd': 'AMD',
  'Intel': 'INTC', 'intel': 'INTC', 'INTC': 'INTC',
  'JPMorgan': 'JPM', 'Chase': 'JPM', 'JPM': 'JPM',
  'Goldman': 'GS', 'Goldman Sachs': 'GS', 'GS': 'GS',
  'Bank of America': 'BAC', 'BAC': 'BAC',
  'Berkshire': 'BRK.A', 'Berkshire Hathaway': 'BRK.A',
  'Johnson & Johnson': 'JNJ', 'JNJ': 'JNJ',
  'Walmart': 'WMT', 'walmart': 'WMT', 'WMT': 'WMT',
  'Visa': 'V', 'visa': 'V', 'V': 'V',
  'Mastercard': 'MA', 'MA': 'MA',
  'Disney': 'DIS', 'disney': 'DIS', 'DIS': 'DIS',
  'Boeing': 'BA', 'boeing': 'BA', 'BA': 'BA',
  'Coca-Cola': 'KO', 'Coke': 'KO', 'KO': 'KO',
  'McDonald': 'MCD', 'McDonalds': 'MCD', 'MCD': 'MCD',
  'SPY': 'SPY', 'S&P 500': 'SPY', 'SP500': 'SPY',
  'QQQ': 'QQQ', 'NASDAQ': 'QQQ', 'Nasdaq': 'QQQ'
};

const SECTOR_KEYWORDS = {
  'Technology': ['tech', 'technology', 'software', 'AI', 'artificial intelligence', 'cloud', 'semiconductor', 'chip'],
  'Energy': ['energy', 'oil', 'gas', 'renewable', 'solar', 'wind', 'battery', 'EV', 'electric vehicle'],
  'Finance': ['finance', 'bank', 'banking', 'fintech', 'payment', 'crypto', 'cryptocurrency', 'blockchain'],
  'Healthcare': ['healthcare', 'pharma', 'pharmaceutical', 'biotech', 'medical', 'drug'],
  'Consumer': ['retail', 'consumer', 'shopping', 'e-commerce', 'restaurant', 'food'],
  'Automotive': ['automotive', 'car', 'vehicle', 'auto', 'EV', 'electric vehicle'],
  'Real Estate': ['real estate', 'property', 'housing', 'REIT'],
  'Telecommunications': ['telecom', 'wireless', '5G', 'communication']
};

const RISK_KEYWORDS = ['layoff', 'layoffs', 'fraud', 'lawsuit', 'scandal', 'investigation', 'regulation', 'fine', 'penalty', 'bankruptcy', 'debt', 'loss', 'decline'];

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

interface AnalyzedNews {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  tags: {
    tickers: string[];
    sectors: string[];
    riskKeywords: string[];
  };
  analysis: {
    companySector: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    summary: string;
    confidence: number;
  };
}

interface TradingSignal {
  type: 'long_entry' | 'risk_warning' | 'neutral';
  ticker?: string;
  sector?: string;
  reason: string;
  confidence: number;
  articleCount: number;
}

function extractTickers(text: string): string[] {
  const tickers = new Set<string>();
  const words = text.toLowerCase().split(/\W+/);
  
  for (const word of words) {
    if (COMPANY_TICKERS[word]) {
      tickers.add(COMPANY_TICKERS[word]);
    }
  }
  
  // Also check for exact ticker matches in uppercase
  const upperWords = text.match(/\b[A-Z]{2,5}\b/g) || [];
  for (const word of upperWords) {
    if (COMPANY_TICKERS[word]) {
      tickers.add(word);
    }
  }
  
  return Array.from(tickers);
}

function extractSectors(text: string): string[] {
  const sectors = new Set<string>();
  const lowerText = text.toLowerCase();
  
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        sectors.add(sector);
        break;
      }
    }
  }
  
  return Array.from(sectors);
}

function extractRiskKeywords(text: string): string[] {
  const risks = new Set<string>();
  const lowerText = text.toLowerCase();
  
  for (const keyword of RISK_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      risks.add(keyword);
    }
  }
  
  return Array.from(risks);
}

function generateTradingSignals(articles: AnalyzedNews[]): TradingSignal[] {
  const signals: TradingSignal[] = [];
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Filter recent articles (24h)
  const recentArticles = articles.filter(
    article => new Date(article.publishedAt) >= dayAgo
  );
  
  // Group by tickers
  const tickerGroups: Record<string, AnalyzedNews[]> = {};
  for (const article of recentArticles) {
    for (const ticker of article.tags.tickers) {
      if (!tickerGroups[ticker]) tickerGroups[ticker] = [];
      tickerGroups[ticker].push(article);
    }
  }
  
  // Generate signals for tickers
  for (const [ticker, tickerArticles] of Object.entries(tickerGroups)) {
    if (tickerArticles.length >= 3) {
      const avgSentiment = tickerArticles.reduce((sum, article) => 
        sum + article.analysis.sentimentScore, 0) / tickerArticles.length;
      
      if (avgSentiment > 0.8) {
        signals.push({
          type: 'long_entry',
          ticker,
          reason: `Strong positive sentiment (${avgSentiment.toFixed(2)}) across ${tickerArticles.length} recent headlines`,
          confidence: Math.min(0.95, avgSentiment),
          articleCount: tickerArticles.length
        });
      }
    }
    
    // Check for risk warnings
    for (const article of tickerArticles) {
      if (article.analysis.sentimentScore < 0.3 && article.tags.riskKeywords.length > 0) {
        signals.push({
          type: 'risk_warning',
          ticker,
          reason: `Negative sentiment (${article.analysis.sentimentScore.toFixed(2)}) with risk factors: ${article.tags.riskKeywords.join(', ')}`,
          confidence: Math.abs(article.analysis.sentimentScore),
          articleCount: 1
        });
      }
    }
  }
  
  // Group by sectors for sector-level signals
  const sectorGroups: Record<string, AnalyzedNews[]> = {};
  for (const article of recentArticles) {
    for (const sector of article.tags.sectors) {
      if (!sectorGroups[sector]) sectorGroups[sector] = [];
      sectorGroups[sector].push(article);
    }
  }
  
  return signals;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers = ['AAPL', 'TSLA', 'SPY', 'QQQ'], sectors = ['AI', 'energy', 'tech'] } = await req.json();

    console.log('Environment check:');
    console.log('FINNHUB_API_KEY available:', !!Deno.env.get('FINNHUB_API_KEY'));
    console.log('OPENAI_API_KEY available:', !!openAIApiKey);
    console.log('FINNHUB_API_KEY length:', Deno.env.get('FINNHUB_API_KEY') ? Deno.env.get('FINNHUB_API_KEY')!.length : 0);
    console.log('OPENAI_API_KEY length:', openAIApiKey ? openAIApiKey.length : 0);

    const finnhubApiKey = Deno.env.get('FINNHUB_API_KEY');
    if (!finnhubApiKey) {
      throw new Error('FINNHUB_API_KEY not configured - please add it in Supabase Edge Function Secrets');
    }

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured - please add it in Supabase Edge Function Secrets');
    }

    console.log('Fetching financial news from Finnhub for:', { tickers, sectors });

    // Fetch news from multiple sources using Finnhub
    const allArticles = [];
    
    // 1. Get general market news
    const marketNewsResponse = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${finnhubApiKey}`,
      {
        headers: {
          'X-Finnhub-Token': finnhubApiKey,
        }
      }
    );

    if (marketNewsResponse.ok) {
      const marketNews = await marketNewsResponse.json();
      if (Array.isArray(marketNews)) {
        // Filter last 48 hours and add to articles
        const twoDaysAgo = Date.now() / 1000 - (2 * 24 * 60 * 60);
        const recentMarketNews = marketNews
          .filter(article => article.datetime > twoDaysAgo)
          .slice(0, 10)
          .map(article => ({
            title: article.headline,
            description: article.summary || '',
            url: article.url,
            publishedAt: new Date(article.datetime * 1000).toISOString(),
            source: { name: article.source }
          }));
        allArticles.push(...recentMarketNews);
      }
    }

    // 2. Get company-specific news for major tickers
    const today = new Date();
    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fromDate = threeDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    for (const ticker of tickers.slice(0, 5)) { // Limit to avoid rate limits
      try {
        const companyNewsResponse = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}&token=${finnhubApiKey}`,
          {
            headers: {
              'X-Finnhub-Token': finnhubApiKey,
            }
          }
        );

        if (companyNewsResponse.ok) {
          const companyNews = await companyNewsResponse.json();
          if (Array.isArray(companyNews)) {
            const recentCompanyNews = companyNews
              .slice(0, 3) // Limit per company
              .map(article => ({
                title: article.headline,
                description: article.summary || '',
                url: article.url,
                publishedAt: new Date(article.datetime * 1000).toISOString(),
                source: { name: article.source }
              }));
            allArticles.push(...recentCompanyNews);
          }
        }
        
        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching news for ${ticker}:`, error);
      }
    }

    console.log(`Fetched ${allArticles.length} articles from Finnhub, analyzing with AI...`);

    const articles: NewsArticle[] = allArticles;

    // Analyze each article with OpenAI
    const analyzedNews: AnalyzedNews[] = await Promise.all(
      articles.slice(0, 15).map(async (article) => {
        try {
          const fullText = `${article.title} ${article.description || ''}`;
          
          // Extract tags
          const tickers = extractTickers(fullText);
          const sectors = extractSectors(fullText);
          const riskKeywords = extractRiskKeywords(fullText);
          
          const analysisPrompt = `
Analyze this financial news headline and description for trading insights:

Title: "${article.title}"
Description: "${article.description || 'N/A'}"

Extract:
1. Company/Sector: Which company or sector is primarily mentioned?
2. Sentiment: positive, negative, or neutral
3. Sentiment Score: -1.0 to 1.0 (negative to positive)
4. Summary: One sentence insight for traders
5. Confidence: 0.0 to 1.0 (how confident are you in this analysis)

Respond in JSON format:
{
  "companySector": "company or sector name",
  "sentiment": "positive|negative|neutral",
  "sentimentScore": 0.5,
  "summary": "brief trading insight",
  "confidence": 0.8
}`;

          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a financial analyst that extracts key trading insights from news. Always respond with valid JSON.'
                },
                {
                  role: 'user',
                  content: analysisPrompt
                }
              ],
              temperature: 0.3,
              max_tokens: 250,
            }),
          });

          if (!aiResponse.ok) {
            throw new Error(`OpenAI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          const analysisText = aiData.choices[0].message.content;
          
          // Parse JSON response
          let analysis;
          try {
            analysis = JSON.parse(analysisText);
          } catch (parseError) {
            console.error('Failed to parse AI response:', analysisText);
            analysis = {
              companySector: sectors[0] || tickers[0] || 'Market',
              sentiment: 'neutral',
              sentimentScore: 0,
              summary: article.title.substring(0, 100) + '...',
              confidence: 0.5
            };
          }

          return {
            title: article.title,
            description: article.description || '',
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source.name,
            tags: {
              tickers,
              sectors,
              riskKeywords
            },
            analysis
          };
        } catch (error) {
          console.error('Error analyzing article:', error);
          return {
            title: article.title,
            description: article.description || '',
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source.name,
            tags: {
              tickers: [],
              sectors: [],
              riskKeywords: []
            },
            analysis: {
              companySector: 'Market',
              sentiment: 'neutral' as const,
              sentimentScore: 0,
              summary: 'Analysis unavailable for this headline.',
              confidence: 0.5
            }
          };
        }
      })
    );

    // Generate trading signals
    const tradingSignals = generateTradingSignals(analyzedNews);

    console.log(`Successfully analyzed ${analyzedNews.length} articles and generated ${tradingSignals.length} signals`);

    return new Response(JSON.stringify({ 
      success: true, 
      news: analyzedNews,
      signals: tradingSignals,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-financial-news function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});