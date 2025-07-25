import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalCardProps {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  price: number;
  change: number;
  reason: string;
  timestamp: string;
}

export default function SignalCard({
  symbol,
  signal,
  confidence,
  price,
  change,
  reason,
  timestamp
}: SignalCardProps) {
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "BUY":
        return "bg-buy-signal text-primary-foreground";
      case "SELL":
        return "bg-sell-signal text-primary-foreground";
      default:
        return "bg-hold-signal text-primary-foreground";
    }
  };

  const getChangeIcon = () => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-profit" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-loss" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatChange = (change: number) => {
    const prefix = change > 0 ? "+" : "";
    return `${prefix}${change.toFixed(2)}%`;
  };

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{symbol}</CardTitle>
          <Badge className={getSignalColor(signal)}>
            {signal}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>${price.toFixed(2)}</span>
          <div className="flex items-center">
            {getChangeIcon()}
            <span className={cn("ml-1", change > 0 ? "text-profit" : change < 0 ? "text-loss" : "text-muted-foreground")}>
              {formatChange(change)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <span className="text-sm font-medium">{confidence}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-3">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <div className="flex items-start space-x-2">
          <Bot className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {reason}
          </p>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-right">
          {timestamp}
        </div>
      </CardContent>
    </Card>
  );
}