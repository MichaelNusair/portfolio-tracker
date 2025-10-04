import { TrendingUp, Wallet } from "lucide-react";

export const PortfolioHeader = () => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
          <Wallet className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Portfolio Tracker
          </h1>
          <p className="text-muted-foreground text-sm">
            Track your crypto & stock investments
          </p>
        </div>
      </div>
    </div>
  );
};
