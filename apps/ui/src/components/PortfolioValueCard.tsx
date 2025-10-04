import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PortfolioValueCardProps {
  title: string;
  value: number;
  change?: number;
  icon?: React.ReactNode;
}

export const PortfolioValueCard = ({
  title,
  value,
  change,
  icon,
}: PortfolioValueCardProps) => {
  const isPositive = change && change > 0;

  return (
    <Card className="p-6 bg-gradient-card border-border/50 shadow-card backdrop-blur-sm hover:shadow-glow transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        {icon}
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-foreground">
          ₪
          {value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h2>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm ${isPositive ? "text-accent" : "text-destructive"}`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-medium">
              {isPositive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
            <span className="text-muted-foreground">24h</span>
          </div>
        )}
      </div>
    </Card>
  );
};
