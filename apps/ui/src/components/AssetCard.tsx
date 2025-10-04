import { Card } from "@/components/ui/card";
import { AssetHolding, ASSET_DISPLAY_NAMES } from "@/types/portfolio";
import {
  Bitcoin,
  Coins,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";

interface AssetCardProps {
  holding: AssetHolding;
}

const assetIcons: Record<string, any> = {
  BTC: Bitcoin,
  ETH: Coins,
  SPY: BarChart3, // More appropriate icon for S&P 500 index fund
};

export const AssetCard = ({ holding }: AssetCardProps) => {
  const Icon = assetIcons[holding.asset] || Coins;
  const isPositive = holding.change24h > 0;
  const displayName = ASSET_DISPLAY_NAMES[holding.asset];

  return (
    <Card className="p-5 bg-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{displayName}</h3>
            <p className="text-xs text-muted-foreground">
              {holding.quantity.toFixed(4)} units
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 text-xs ${isPositive ? "text-accent" : "text-destructive"}`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {isPositive ? "+" : ""}
            {holding.change24h.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Value</span>
          <span className="font-semibold text-foreground">
            ₪{holding.valueILS.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">Avg Price</span>
          <span className="text-xs text-muted-foreground">
            ₪{holding.avgPrice.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-muted-foreground">Current Price</span>
          <span className="text-xs text-muted-foreground">
            ₪{holding.currentPrice.toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  );
};
