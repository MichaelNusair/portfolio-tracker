import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PortfolioHeader } from "@/components/PortfolioHeader";
import { PortfolioValueCard } from "@/components/PortfolioValueCard";
import { AssetCard } from "@/components/AssetCard";
import { PortfolioChart } from "@/components/PortfolioChart";
import { getTransactions } from "@/lib/portfolioStorage";
import { getAllPrices } from "@/lib/priceService";
import { calculateHistoricalValueFromTransactions } from "@/lib/historicalPriceService";
import { AssetHolding, AssetType, PortfolioValue } from "@/types/portfolio";
import { Settings, DollarSign, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<AssetHolding[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioValue[]>(
    [],
  );
  const [totalILS, setTotalILS] = useState(0);

  // Fetch all current prices for holdings (using batch request)
  const {
    data: priceMap,
    isLoading: pricesLoading,
    error: pricesError,
  } = useQuery({
    queryKey: ["current-prices"],
    queryFn: async () => {
      const transactions = getTransactions();
      const assets = [...new Set(transactions.map((t) => t.asset))];
      return await getAllPrices(assets);
    },
    refetchInterval: 60000, // Refetch every minute
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Fetch historical portfolio data based on actual transactions
  const { data: historicalData, isLoading: historyLoading } = useQuery({
    queryKey: ["portfolio-history"],
    queryFn: async () => {
      const transactions = getTransactions();
      return await calculateHistoricalValueFromTransactions(transactions);
    },
    refetchInterval: 300000, // Refetch every 5 minutes
    retry: 2,
  });

  useEffect(() => {
    calculateHoldings();
  }, [priceMap]);

  useEffect(() => {
    console.log("📊 Historical data updated:", historicalData);
    if (historicalData && historicalData.length > 0) {
      setPortfolioHistory(historicalData);
      console.log(
        "✅ Portfolio history set with",
        historicalData.length,
        "data points",
      );
    }
  }, [historicalData]);

  const calculateHoldings = () => {
    const transactions = getTransactions();
    const assetMap = new Map<
      AssetType,
      { quantity: number; totalCost: number }
    >();

    // Calculate holdings from transactions
    transactions.forEach((tx) => {
      const existing = assetMap.get(tx.asset) || { quantity: 0, totalCost: 0 };
      if (tx.type === "buy") {
        assetMap.set(tx.asset, {
          quantity: existing.quantity + tx.quantity,
          totalCost: existing.totalCost + tx.totalILS,
        });
      } else {
        assetMap.set(tx.asset, {
          quantity: existing.quantity - tx.quantity,
          totalCost: existing.totalCost - tx.totalILS,
        });
      }
    });

    // Create holdings with current prices
    const holdingsArray: AssetHolding[] = [];
    let portfolioILS = 0;

    assetMap.forEach((value, asset) => {
      if (value.quantity > 0) {
        // Find price data for this asset from the map
        const priceData = priceMap?.get(asset);

        if (priceData) {
          const valueILS = value.quantity * priceData.ils;
          const avgPrice = value.totalCost / value.quantity;

          holdingsArray.push({
            asset,
            quantity: value.quantity,
            avgPrice,
            currentPrice: priceData.ils,
            valueILS,
            change24h: priceData.change24h,
          });

          portfolioILS += valueILS;
        }
      }
    });

    setHoldings(holdingsArray);
    setTotalILS(portfolioILS);
  };

  const avgChange =
    holdings.length > 0
      ? holdings.reduce((sum, h) => sum + h.change24h, 0) / holdings.length
      : 0;

  if (pricesLoading || historyLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {pricesLoading
              ? "Loading real-time price data..."
              : "Loading historical data..."}
          </p>
        </div>
      </div>
    );
  }

  if (pricesError) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h2 className="text-xl font-bold text-destructive mb-2">
              Failed to Load Price Data
            </h2>
            <p className="text-muted-foreground mb-4">
              {pricesError instanceof Error
                ? pricesError.message
                : "Unable to fetch current prices from APIs"}
            </p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Possible causes:</p>
              <ul className="list-disc list-inside text-left">
                <li>API rate limits exceeded</li>
                <li>Network connectivity issues</li>
                <li>API services temporarily unavailable</li>
              </ul>
            </div>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90"
          >
            Retry
          </Button>
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            className="ml-2"
          >
            Go to Admin Panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <PortfolioHeader />

        <div className="flex justify-end">
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            className="border-border/50 hover:bg-secondary/50 gap-2"
          >
            <Settings className="w-4 h-4" />
            Admin Panel
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <PortfolioValueCard
            title="Total Portfolio Value"
            value={totalILS}
            change={avgChange}
            icon={<Coins className="w-5 h-5 text-primary" />}
          />
        </div>

        <PortfolioChart data={portfolioHistory} />

        <div>
          <h3 className="text-xl font-bold mb-4 text-foreground">
            Your Holdings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {holdings.length > 0 ? (
              holdings.map((holding) => (
                <AssetCard key={holding.asset} holding={holding} />
              ))
            ) : (
              <p className="text-muted-foreground col-span-full text-center py-8">
                No holdings yet. Add transactions in the Admin Panel to get
                started.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
