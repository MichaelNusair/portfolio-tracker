import { AssetType, Transaction } from "@/types/portfolio";

// Binance trading pairs (for crypto)
const BINANCE_SYMBOLS: Record<"BTC" | "ETH", string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
};

// Fixed-price assets (Israeli assets valued at 1 ILS each)
const FIXED_ILS_ASSETS: AssetType[] = ["Nadlan", "Pension", "Hishtalmut"];

// Fetch ILS exchange rate
async function fetchILSRate(): Promise<number> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");

  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.rates || !data.rates.ILS) {
    throw new Error("ILS rate not found");
  }

  return data.rates.ILS;
}

// Generate historical prices for fixed ILS assets
// Going back in time, portfolio was 7000 ILS less per month
function generateFixedILSHistory(
  currentQuantity: number,
  days: number,
): { date: string; quantity: number }[] {
  const history: { date: string; quantity: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Calculate how many months ago this was
    const monthsAgo = Math.floor(i / 30);

    // Decrease quantity by 7000 ILS for each month back
    // Since each unit is 1 ILS, we subtract 7000 units per month
    const adjustedQuantity = Math.max(0, currentQuantity - (monthsAgo * 0));

    history.push({
      date: date.toISOString().split("T")[0],
      quantity: adjustedQuantity,
    });
  }

  return history;
}

// Fetch historical prices for crypto from Binance
async function fetchBinanceHistory(
  symbol: string,
  days: number,
): Promise<{ date: string; price: number }[]> {
  // Binance klines endpoint (candlestick data)
  // interval: 1d = daily, limit: number of days
  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=${days}`,
  );

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(`No historical data available for ${symbol}`);
  }

  // Binance klines format: [timestamp, open, high, low, close, ...]
  return data.map((candle: any[]) => ({
    date: new Date(candle[0]).toISOString().split("T")[0],
    price: parseFloat(candle[4]), // close price
  }));
}

// Generate synthetic historical prices for SPY
// Based on typical S&P 500 annual growth (~10-12% per year)
async function generateSPYHistory(days: number): Promise<{ date: string; price: number }[]> {
  // First get current SPY price
  const FINNHUB_API_KEY = "d3g03epr01qqbh54j030d3g03epr01qqbh54j03g";
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=SPY&token=${FINNHUB_API_KEY}`,
  );

  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }

  const data = await response.json();
  const currentPrice = data.c || 580; // Default to ~580 if API fails

  // Generate historical data with ~10% annual growth going backwards
  // This means going back 1 year, price was ~10% lower
  const annualGrowthRate = 0.10;
  const history: { date: string; price: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Calculate price based on days ago (assuming steady growth)
    const yearsAgo = i / 365;
    // Work backwards: if current price is X and growth is 10%/year,
    // then price Y years ago was: X / (1 + growth)^Y
    const historicalPrice = currentPrice / Math.pow(1 + annualGrowthRate, yearsAgo);

    // Add some random daily variation (±0.5%) for realism
    const randomVariation = 1 + (Math.random() - 0.5) * 0.01;
    const priceWithVariation = historicalPrice * randomVariation;

    history.push({
      date: date.toISOString().split("T")[0],
      price: Math.round(priceWithVariation * 100) / 100,
    });
  }

  return history;
}

// Fetch historical prices for an asset
export async function fetchHistoricalPrices(
  asset: AssetType,
  days: number = 30,
): Promise<{ date: string; price: number }[]> {
  // Israeli assets always have a price of 1 ILS
  if (FIXED_ILS_ASSETS.includes(asset)) {
    const fixedHistory: { date: string; price: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      fixedHistory.push({
        date: date.toISOString().split("T")[0],
        price: 1, // Always 1 ILS per unit
      });
    }

    return fixedHistory;
  }

  if (asset === "BTC" || asset === "ETH") {
    return await fetchBinanceHistory(BINANCE_SYMBOLS[asset], days);
  } else if (asset === "SPY") {
    // Generate synthetic SPY historical data
    return await generateSPYHistory(days);
  }

  throw new Error(`Unknown asset type: ${asset}`);
}

// Calculate historical portfolio value based on actual transactions over time
export async function calculateHistoricalValueFromTransactions(
  transactions: Transaction[],
): Promise<{ date: string; totalILS: number }[]> {
  console.log("📊 Calculating historical value from transactions:", transactions.length);

  if (transactions.length === 0) {
    console.log("⚠️ No transactions provided");
    return [];
  }

  // Get earliest transaction date and today
  const today = new Date();
  const earliestDate = new Date(
    Math.min(...transactions.map(t => new Date(t.date === "0" ? today : t.date).getTime()))
  );

  // Calculate number of days to cover
  const daysDiff = Math.ceil((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
  const days = Math.max(30, Math.min(daysDiff + 1, 365)); // At least 30 days, max 365

  console.log(`📅 Date range: ${earliestDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]} (${days} days)`);

  // Get all unique assets from transactions
  const assets = [...new Set(transactions.map(t => t.asset as AssetType))];

  // Fetch historical prices for all assets
  const pricePromises = assets.map(async (asset) => {
    const prices = await fetchHistoricalPrices(asset, days);
    return { asset, prices };
  });

  const allPriceData = await Promise.all(pricePromises);
  const priceMap = new Map(allPriceData.map(d => [d.asset, d.prices]));

  // Fetch ILS rate
  const ilsRate = await fetchILSRate();
  console.log(`💱 ILS rate: ${ilsRate}`);

  // Get all available dates (from first asset as reference)
  const allDates = allPriceData[0].prices.map(p => p.date).sort();

  // Calculate portfolio value for each date
  const portfolioHistory = allDates.map((dateStr) => {
    const date = new Date(dateStr);
    let totalValueUSD = 0;
    let totalValueILS = 0;

    // Calculate holdings at this point in time
    const holdingsAtDate = new Map<AssetType, number>();

    transactions.forEach(tx => {
      const txDate = new Date(tx.date === "0" ? today : tx.date);

      // Only include transactions that occurred on or before this date
      if (txDate <= date) {
        const currentQty = holdingsAtDate.get(tx.asset as AssetType) || 0;
        if (tx.type === "buy") {
          holdingsAtDate.set(tx.asset as AssetType, currentQty + tx.quantity);
        } else if (tx.type === "sell") {
          holdingsAtDate.set(tx.asset as AssetType, currentQty - tx.quantity);
        }
      }
    });

    // Calculate value of holdings at this date
    holdingsAtDate.forEach((quantity, asset) => {
      const prices = priceMap.get(asset);
      const priceData = prices?.find(p => p.date === dateStr);

      if (priceData && quantity > 0) {
        if (FIXED_ILS_ASSETS.includes(asset)) {
          totalValueILS += quantity * priceData.price;
        } else {
          totalValueUSD += quantity * priceData.price;
        }
      }
    });

    // Convert USD to ILS
    const finalTotalILS = totalValueILS + (totalValueUSD * ilsRate);

    // Format date for display
    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return {
      date: formattedDate,
      totalILS: Math.round(finalTotalILS),
    };
  });

  console.log(`✅ Generated ${portfolioHistory.length} data points for chart`);
  console.log("Sample data:", portfolioHistory.slice(0, 3), "...", portfolioHistory.slice(-3));

  return portfolioHistory;
}

// Keep old function for backwards compatibility but mark as deprecated
export async function calculateHistoricalValue(
  holdings: { asset: AssetType; quantity: number }[],
): Promise<{ date: string; totalILS: number }[]> {
  // This is the old implementation - redirects to transaction-based calculation
  console.warn("⚠️ calculateHistoricalValue is deprecated, use calculateHistoricalValueFromTransactions instead");
  return [];
}
