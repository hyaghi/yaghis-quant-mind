import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const newsApiKey = Deno.env.get('NEWS_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailySummary {
  date: string;
  topBullishEvents: Array<{
    title: string;
    ticker: string;
    sentiment: number;
    summary: string;
  }>;
  topBearishEvents: Array<{
    title: string;
    ticker: string;
    sentiment: number;
    summary: string;
  }>;
  topSector: {
    name: string;
    momentum: string;
    avgSentiment: number;
  };
  stockToWatch: {
    ticker: string;
    reason: string;
    sentiment: number;
  };
}

interface WatchlistAlert {
  ticker: string;
  type: 'buy' | 'sell' | 'hold';
  reason: string;
  confidence: number;
  triggers: string[];
}

interface PortfolioAlert {
  ticker: string;
  type: 'risk_warning' | 'rebalance' | 'opportunity';
  reason: string;
  suggestedAction: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, generateSummary = false, checkWatchlist = false, checkPortfolio = false } = await req.json();

    if (!newsApiKey || !openAIApiKey) {
      throw new Error('API keys not configured');
    }

    console.log('Processing daily summary and alerts for user:', userId);

    // Fetch news data (reusing existing logic)
    const searchQuery = 'AAPL OR TSLA OR NVDA OR SPY OR QQQ OR MSFT OR AMZN OR GOOGL OR META OR AI OR technology OR energy OR finance';
    
    const newsResponse = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=50&domains=finance.yahoo.com,marketwatch.com,cnbc.com,bloomberg.com,reuters.com,wsj.com,seekingalpha.com`,
      {
        headers: { 'X-API-Key': newsApiKey },
      }
    );

    if (!newsResponse.ok) {
      throw new Error(`NewsAPI error: ${newsResponse.status}`);
    }

    const newsData = await newsResponse.json();
    const articles = newsData.articles || [];

    // Filter articles from last 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentArticles = articles.filter(article => 
      new Date(article.publishedAt) >= dayAgo
    );

    console.log(`Processing ${recentArticles.length} recent articles`);

    let dailySummary: DailySummary | null = null;
    let watchlistAlerts: WatchlistAlert[] = [];
    let portfolioAlerts: PortfolioAlert[] = [];

    if (generateSummary) {
      // Generate daily summary using AI
      const summaryPrompt = `
Analyze these financial news headlines from the last 24 hours and create a daily summary:

Headlines: ${recentArticles.slice(0, 20).map(a => `"${a.title}"`).join('\n')}

Create a summary with:
1. Top 3 most bullish news events (company ticker, brief description, estimated sentiment score 0-1)
2. Top 3 most bearish news events (company ticker, brief description, estimated sentiment score -1-0)
3. Sector with most positive momentum (name and brief reason)
4. One stock to watch today (ticker and reason)

Respond in JSON format:
{
  "topBullishEvents": [
    {"title": "headline", "ticker": "AAPL", "sentiment": 0.8, "summary": "brief insight"}
  ],
  "topBearishEvents": [
    {"title": "headline", "ticker": "TSLA", "sentiment": -0.6, "summary": "brief insight"}
  ],
  "topSector": {"name": "AI", "momentum": "Strong positive momentum", "avgSentiment": 0.7},
  "stockToWatch": {"ticker": "NVDA", "reason": "Strong earnings momentum", "sentiment": 0.8}
}`;

      const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst creating daily market summaries. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        try {
          const summaryJson = JSON.parse(summaryData.choices[0].message.content);
          dailySummary = {
            date: new Date().toISOString().split('T')[0],
            ...summaryJson
          };
        } catch (error) {
          console.error('Failed to parse summary JSON:', error);
        }
      }
    }

    if (checkWatchlist && userId) {
      // Get user's watchlist
      const { data: watchlistData } = await supabase
        .from('user_watchlists')
        .select('*')
        .eq('user_id', userId);

      if (watchlistData && watchlistData.length > 0) {
        // Generate watchlist alerts
        for (const watchlistItem of watchlistData) {
          const relevantArticles = recentArticles.filter(article =>
            article.title.toLowerCase().includes(watchlistItem.symbol.toLowerCase()) ||
            article.description?.toLowerCase().includes(watchlistItem.symbol.toLowerCase())
          );

          if (relevantArticles.length > 0) {
            const alertPrompt = `
Analyze these news articles for ${watchlistItem.symbol} and generate trading recommendations:

Articles: ${relevantArticles.slice(0, 3).map(a => `"${a.title}"`).join('\n')}

Price Alert Threshold: ${watchlistItem.price_alert || 'None set'}
Notes: ${watchlistItem.notes || 'None'}

Generate a trading recommendation (buy/sell/hold) with reasoning. Consider:
- Overall sentiment
- Price movement triggers
- Risk factors

Respond in JSON:
{
  "type": "buy|sell|hold",
  "reason": "brief explanation",
  "confidence": 0.8,
  "triggers": ["trigger1", "trigger2"]
}`;

            try {
              const alertResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openAIApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4.1-2025-04-14',
                  messages: [
                    { role: 'system', content: 'You are a trading advisor. Always respond with valid JSON.' },
                    { role: 'user', content: alertPrompt }
                  ],
                  temperature: 0.3,
                  max_tokens: 300,
                }),
              });

              if (alertResponse.ok) {
                const alertData = await alertResponse.json();
                const alert = JSON.parse(alertData.choices[0].message.content);
                watchlistAlerts.push({
                  ticker: watchlistItem.symbol,
                  ...alert
                });
              }
            } catch (error) {
              console.error(`Error generating alert for ${watchlistItem.symbol}:`, error);
            }
          }
        }
      }
    }

    if (checkPortfolio && userId) {
      // Get user's portfolio holdings
      const { data: portfolioData } = await supabase
        .from('user_portfolios')
        .select(`
          *,
          portfolio_holdings (*)
        `)
        .eq('user_id', userId);

      if (portfolioData && portfolioData.length > 0) {
        const holdings = portfolioData.flatMap(p => p.portfolio_holdings || []);
        
        for (const holding of holdings) {
          const relevantArticles = recentArticles.filter(article =>
            article.title.toLowerCase().includes(holding.symbol.toLowerCase()) ||
            article.description?.toLowerCase().includes(holding.symbol.toLowerCase())
          );

          if (relevantArticles.length > 0) {
            const portfolioAlertPrompt = `
Analyze these news articles for ${holding.symbol} in the context of portfolio risk management:

Articles: ${relevantArticles.slice(0, 3).map(a => `"${a.title}"`).join('\n')}

Current Position: ${holding.quantity} shares at $${holding.average_cost} average cost

Generate portfolio management recommendations. Consider:
- Risk warning if negative sentiment
- Rebalancing opportunities
- Position sizing adjustments

Respond in JSON:
{
  "type": "risk_warning|rebalance|opportunity",
  "reason": "brief explanation",
  "suggestedAction": "specific action to take",
  "confidence": 0.8
}`;

            try {
              const portfolioResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openAIApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4.1-2025-04-14',
                  messages: [
                    { role: 'system', content: 'You are a portfolio risk manager. Always respond with valid JSON.' },
                    { role: 'user', content: portfolioAlertPrompt }
                  ],
                  temperature: 0.3,
                  max_tokens: 300,
                }),
              });

              if (portfolioResponse.ok) {
                const portfolioData = await portfolioResponse.json();
                const alert = JSON.parse(portfolioData.choices[0].message.content);
                portfolioAlerts.push({
                  ticker: holding.symbol,
                  ...alert
                });
              }
            } catch (error) {
              console.error(`Error generating portfolio alert for ${holding.symbol}:`, error);
            }
          }
        }
      }
    }

    console.log(`Generated ${watchlistAlerts.length} watchlist alerts and ${portfolioAlerts.length} portfolio alerts`);

    return new Response(JSON.stringify({
      success: true,
      dailySummary,
      watchlistAlerts,
      portfolioAlerts,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in daily-summary function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});