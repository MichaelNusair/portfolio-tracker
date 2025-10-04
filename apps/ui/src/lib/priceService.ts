import { AssetType } from "@/types/portfolio";

interface PriceData {
  ils: number;
  change24h: number;
  usd: number;
}

// Cache for API responses to avoid rate limits
const priceCache = new Map<string, { data: PriceData; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

// Finnhub API key (free tier: 60 calls/minute) - only for SPY
const FINNHUB_API_KEY = "d3g03epr01qqbh54j030d3g03epr01qqbh54j03g";

// Binance trading pairs (unlimited, free, no API key) - for crypto
const BINANCE_SYMBOLS: Record<"BTC" | "ETH", string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
};

// Fixed-price assets (Israeli assets valued at 1 ILS each)
const FIXED_ILS_ASSETS: AssetType[] = ["Nadlan", "Pension", "Hishtalmut"];

// Fetch ILS/USD exchange rate from a free API
async function fetchILSRate(): Promise<number> {
  const cacheKey = "ils_rate";
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data.usd; // Storing the rate in the usd field
  }

  // Using open.er-api.com - free, no API key required
  const response = await fetch("https://open.er-api.com/v6/latest/USD");

  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.rates || !data.rates.ILS) {
    throw new Error("ILS rate not found in exchange rate API response");
  }

  const ilsRate = data.rates.ILS;

  // Cache the rate
  priceCache.set(cacheKey, {
    data: { usd: ilsRate, ils: 0, change24h: 0 },
    timestamp: Date.now(),
  });

  return ilsRate;
}

// Fetch crypto price from Binance (BTC, ETH)
async function fetchBinancePrice(
  symbol: string,
): Promise<{ price: number; change: number }> {
  const response = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
  );

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.lastPrice) {
    throw new Error(`No price data available for ${symbol}`);
  }

  return {
    price: parseFloat(data.lastPrice),
    change: parseFloat(data.priceChangePercent) || 0,
  };
}

// Fetch stock price from Finnhub (SPY)
async function fetchFinnhubQuote(
  symbol: string,
): Promise<{ price: number; change: number }> {
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
  );

  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.c || data.c === 0) {
    throw new Error(`No price data available for ${symbol}`);
  }

  // c = current price, dp = change percentage
  return {
    price: data.c,
    change: data.dp || 0,
  };
}

// Batch fetch all prices at once
export const getAllPrices = async (
  assets: AssetType[],
): Promise<Map<AssetType, PriceData>> => {
  console.log(`🔄 Fetching prices for:`, assets);

  // Build result map
  const resultMap = new Map<AssetType, PriceData>();

  // Separate fixed-price assets from API-fetched assets
  const fixedAssets = assets.filter((asset) => FIXED_ILS_ASSETS.includes(asset));
  const apiAssets = assets.filter((asset) => !FIXED_ILS_ASSETS.includes(asset));

  // Add fixed-price assets immediately
  fixedAssets.forEach((asset) => {
    resultMap.set(asset, {
      ils: 1,
      change24h: 0,
      usd: 1, // Not accurate, but these are ILS-denominated
    });
  });

  // Fetch ILS rate once for API assets
  if (apiAssets.length > 0) {
    const ilsRate = await fetchILSRate();

    // Fetch all quotes in parallel
    const quotePromises = apiAssets.map(async (asset) => {
      let quote: { price: number; change: number };

      if (asset === "BTC" || asset === "ETH") {
        // Use Binance for crypto
        quote = await fetchBinancePrice(BINANCE_SYMBOLS[asset]);
      } else {
        // Use Finnhub for stocks (SPY)
        quote = await fetchFinnhubQuote(asset);
      }

      return { asset, quote };
    });

    const results = await Promise.all(quotePromises);

    results.forEach(({ asset, quote }) => {
      resultMap.set(asset, {
        ils: Math.round(quote.price * ilsRate),
        change24h: Math.round(quote.change * 100) / 100,
        usd: quote.price,
      });
    });
  }

  console.log(`✅ Fetched prices for ${resultMap.size} assets`);

  return resultMap;
};

export const getCurrentPrice = async (asset: AssetType): Promise<number> => {
  // Return fixed price for Israeli assets
  if (FIXED_ILS_ASSETS.includes(asset)) {
    return 1;
  }

  let quote: { price: number; change: number };

  if (asset === "BTC" || asset === "ETH") {
    quote = await fetchBinancePrice(BINANCE_SYMBOLS[asset]);
  } else {
    quote = await fetchFinnhubQuote(asset);
  }

  const ilsRate = await fetchILSRate();
  return Math.round(quote.price * ilsRate);
};

export const get24hChange = async (asset: AssetType): Promise<number> => {
  // Return 0 change for Israeli assets
  if (FIXED_ILS_ASSETS.includes(asset)) {
    return 0;
  }

  let quote: { price: number; change: number };

  if (asset === "BTC" || asset === "ETH") {
    quote = await fetchBinancePrice(BINANCE_SYMBOLS[asset]);
  } else {
    quote = await fetchFinnhubQuote(asset);
  }

  return Math.round(quote.change * 100) / 100;
};
