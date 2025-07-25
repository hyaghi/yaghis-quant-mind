import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { fetchHistoricalData, generatePortfolioData } from '@/services/marketData';
import { Loader2 } from 'lucide-react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
        <p className="text-sm font-medium mb-2">{new Date(label).toLocaleDateString()}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name === 'portfolio' ? 'Portfolio' : 'SPY'}: ${entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PortfolioChart() {
  // Fetch real SPY data
  const { data: spyData, isLoading: spyLoading } = useQuery({
    queryKey: ['spy-historical'],
    queryFn: () => fetchHistoricalData('SPY', '6mo'),
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 180000, // 3 minutes
  });

  // Generate portfolio data (normalized to SPY timeframe)
  const portfolioData = generatePortfolioData(100000, 90);

  // Combine portfolio and SPY data
  const chartData = React.useMemo(() => {
    if (!spyData || spyData.length === 0) return [];

    // Normalize SPY data to start at $100,000 for comparison
    const spyStartValue = spyData[0]?.value || 1;
    const baseValue = 100000;

    const combinedData = spyData.map((spyPoint, index) => {
      const portfolioPoint = portfolioData[index];
      const normalizedSpyValue = (spyPoint.value / spyStartValue) * baseValue;

      return {
        date: spyPoint.date,
        portfolio: portfolioPoint?.value || baseValue,
        spy: Math.round(normalizedSpyValue)
      };
    });

    return combinedData.slice(-90); // Last 90 days
  }, [spyData, portfolioData]);

  if (spyLoading || chartData.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="spy"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}