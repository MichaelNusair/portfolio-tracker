import { AssetType, Transaction } from '@/types/portfolio';

const BINANCE_SYMBOLS: Record<'BTC' | 'ETH', string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
};

const FIXED_ILS_ASSETS: AssetType[] = ['Nadlan', 'Pension', 'Hishtalmut'];

async function fetchILSRate(): Promise<number> {
  const response = await fetch('https://open.er-api.com/v6/latest/USD');

  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.rates || !data.rates.ILS) {
    throw new Error('ILS rate not found');
  }

  return data.rates.ILS;
}

async function fetchBinanceHistory(
  symbol: string,
  days: number
): Promise<{ date: string; price: number }[]> {
  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=${days}`
  );

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(`No historical data available for ${symbol}`);
  }

  return data.map((candle: unknown[]) => ({
    date: new Date(candle[0] as string).toISOString().split('T')[0],
    price: parseFloat(candle[4] as string),
  }));
}

async function generateSPYHistory(
  days: number
): Promise<{ date: string; price: number }[]> {
  const FINNHUB_API_KEY = 'd3g03epr01qqbh54j030d3g03epr01qqbh54j03g';
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=SPY&token=${FINNHUB_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }

  const data = await response.json();
  const currentPrice = data.c || 580;

  const annualGrowthRate = 0.1;
  const history: { date: string; price: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const yearsAgo = i / 365;

    const historicalPrice =
      currentPrice / Math.pow(1 + annualGrowthRate, yearsAgo);

    const randomVariation = 1 + (Math.random() - 0.5) * 0.01;
    const priceWithVariation = historicalPrice * randomVariation;

    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(priceWithVariation * 100) / 100,
    });
  }

  return history;
}

export async function fetchHistoricalPrices(
  asset: AssetType,
  days = 30
): Promise<{ date: string; price: number }[]> {
  if (FIXED_ILS_ASSETS.includes(asset)) {
    const fixedHistory: { date: string; price: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      fixedHistory.push({
        date: date.toISOString().split('T')[0],
        price: 1,
      });
    }

    return fixedHistory;
  }

  if (asset === 'BTC' || asset === 'ETH') {
    return await fetchBinanceHistory(BINANCE_SYMBOLS[asset], days);
  } else if (asset === 'SPY') {
    return await generateSPYHistory(days);
  }

  throw new Error(`Unknown asset type: ${asset}`);
}

export async function calculateHistoricalValueFromTransactions(
  transactions: Transaction[]
): Promise<{ date: string; totalILS: number }[]> {
  console.log(
    '📊 Calculating historical value from transactions:',
    transactions.length
  );

  if (transactions.length === 0) {
    console.log('⚠️ No transactions provided');
    return [];
  }

  const today = new Date();
  const earliestDate = new Date(
    Math.min(
      ...transactions.map((t) =>
        new Date(t.date === '0' ? today : t.date).getTime()
      )
    )
  );

  const daysDiff = Math.ceil(
    (today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const days = Math.max(30, Math.min(daysDiff + 1, 365));

  console.log(
    `📅 Date range: ${earliestDate.toISOString().split('T')[0]} to ${
      today.toISOString().split('T')[0]
    } (${days} days)`
  );

  const assets = [...new Set(transactions.map((t) => t.asset as AssetType))];

  const pricePromises = assets.map(async (asset) => {
    const prices = await fetchHistoricalPrices(asset, days);
    return { asset, prices };
  });

  const allPriceData = await Promise.all(pricePromises);
  const priceMap = new Map(allPriceData.map((d) => [d.asset, d.prices]));

  const ilsRate = await fetchILSRate();
  console.log(`💱 ILS rate: ${ilsRate}`);

  const allDates = allPriceData[0].prices.map((p) => p.date).sort();

  const portfolioHistory = allDates.map((dateStr) => {
    const date = new Date(dateStr);
    let totalValueUSD = 0;
    let totalValueILS = 0;

    const holdingsAtDate = new Map<AssetType, number>();

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date === '0' ? today : tx.date);

      if (txDate <= date) {
        const currentQty = holdingsAtDate.get(tx.asset as AssetType) || 0;
        if (tx.type === 'buy') {
          holdingsAtDate.set(tx.asset as AssetType, currentQty + tx.quantity);
        } else if (tx.type === 'sell') {
          holdingsAtDate.set(tx.asset as AssetType, currentQty - tx.quantity);
        }
      }
    });

    holdingsAtDate.forEach((quantity, asset) => {
      const prices = priceMap.get(asset);
      const priceData = prices?.find((p) => p.date === dateStr);

      if (priceData && quantity > 0) {
        if (FIXED_ILS_ASSETS.includes(asset)) {
          totalValueILS += quantity * priceData.price;
        } else {
          totalValueUSD += quantity * priceData.price;
        }
      }
    });

    const finalTotalILS = totalValueILS + totalValueUSD * ilsRate;

    const dateObj = new Date(dateStr);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return {
      date: formattedDate,
      totalILS: Math.round(finalTotalILS),
    };
  });

  console.log(`✅ Generated ${portfolioHistory.length} data points for chart`);
  console.log(
    'Sample data:',
    portfolioHistory.slice(0, 3),
    '...',
    portfolioHistory.slice(-3)
  );

  return portfolioHistory;
}

export async function calculateHistoricalValue(
  holdings: { asset: AssetType; quantity: number }[]
): Promise<{ date: string; totalILS: number }[]> {
  console.warn(
    '⚠️ calculateHistoricalValue is deprecated, use calculateHistoricalValueFromTransactions instead'
  );
  return [];
}
