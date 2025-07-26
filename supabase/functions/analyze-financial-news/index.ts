import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const newsApiKey = Deno.env.get('NEWS_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  analysis: {
    companySector: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number;
    summary: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers = ['AAPL', 'TSLA', 'SPY', 'QQQ'], sectors = ['AI', 'energy', 'tech'] } = await req.json();

    if (!newsApiKey) {
      throw new Error('NEWS_API_KEY not configured');
    }

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('Fetching financial news for:', { tickers, sectors });

    // Build search query combining tickers and sectors
    const searchQuery = [...tickers, ...sectors].join(' OR ');
    
    // Fetch news from NewsAPI
    const newsResponse = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=20&domains=finance.yahoo.com,marketwatch.com,cnbc.com,bloomberg.com,reuters.com,wsj.com`,
      {
        headers: {
          'X-API-Key': newsApiKey,
        },
      }
    );

    if (!newsResponse.ok) {
      throw new Error(`NewsAPI error: ${newsResponse.status}`);
    }

    const newsData = await newsResponse.json();
    const articles: NewsArticle[] = newsData.articles || [];

    console.log(`Fetched ${articles.length} articles, analyzing with AI...`);

    // Analyze each article with OpenAI
    const analyzedNews: AnalyzedNews[] = await Promise.all(
      articles.slice(0, 10).map(async (article) => {
        try {
          const analysisPrompt = `
Analyze this financial news headline and description for trading insights:

Title: "${article.title}"
Description: "${article.description || 'N/A'}"

Extract:
1. Company/Sector: Which company or sector is primarily mentioned? (e.g., "Apple", "Tech", "Energy", "AI")
2. Sentiment: positive, negative, or neutral
3. Sentiment Score: -1.0 to 1.0 (negative to positive)
4. Summary: One sentence insight for traders (e.g., "Apple earnings beat expectations. Market sentiment: Positive.")

Respond in JSON format:
{
  "companySector": "company or sector name",
  "sentiment": "positive|negative|neutral",
  "sentimentScore": 0.5,
  "summary": "brief trading insight"
}`;

          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  content: 'You are a financial analyst that extracts key trading insights from news. Always respond with valid JSON.'
                },
                {
                  role: 'user',
                  content: analysisPrompt
                }
              ],
              temperature: 0.3,
              max_tokens: 200,
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
            // Fallback analysis
            analysis = {
              companySector: 'Market',
              sentiment: 'neutral',
              sentimentScore: 0,
              summary: article.title.substring(0, 100) + '...'
            };
          }

          return {
            title: article.title,
            description: article.description || '',
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source.name,
            analysis
          };
        } catch (error) {
          console.error('Error analyzing article:', error);
          // Return article with basic analysis on error
          return {
            title: article.title,
            description: article.description || '',
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source.name,
            analysis: {
              companySector: 'Market',
              sentiment: 'neutral' as const,
              sentimentScore: 0,
              summary: 'Analysis unavailable for this headline.'
            }
          };
        }
      })
    );

    console.log(`Successfully analyzed ${analyzedNews.length} articles`);

    return new Response(JSON.stringify({ 
      success: true, 
      news: analyzedNews,
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