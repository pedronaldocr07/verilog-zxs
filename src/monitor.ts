/**
 * Real-time monitor for best ask of YES (up) and NO (down) tokens on a Kalshi market.
 * Ask-only; use this to watch prices and decide which side to buy for profit.
 */
import { Configuration, MarketApi } from "kalshi-typescript";
import { config } from "./config";
import { getBitcoinUpDownMarkets } from "./bot";

/** Ask prices in cents (1–99). Up = YES token, Down = NO token. */
export interface MarketPrices {
  ticker: string;
  /** Best ask for YES (up) token, cents */
  upAskCents: number;
  /** Best ask for NO (down) token, cents */
  downAskCents: number;
  /** Last trade price, cents */
  lastPriceCents: number;
  /** When this snapshot was fetched */
  fetchedAt: Date;
}

function buildConfiguration(): Configuration {
  return new Configuration({
    apiKey: config.apiKey,
    basePath: config.basePath,
    ...(config.privateKeyPath
      ? { privateKeyPath: config.privateKeyPath }
      : config.privateKeyPem
        ? { privateKeyPem: config.privateKeyPem }
        : {}),
  });
}

/** Parse Kalshi dollar string (e.g. "0.5600") to cents. */
function dollarsToCents(dollars: string | undefined): number {
  if (dollars == null || dollars === "") return 0;
  const n = parseFloat(dollars);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Fetch current best ask for both up (YES) and down (NO) tokens for a market.
 */
export async function getMarketPrices(ticker: string): Promise<MarketPrices | null> {
  const conf = buildConfiguration();
  const marketApi = new MarketApi(conf);
  try {
    const res = await marketApi.getMarket(ticker);
    const m = res.data.market;
    if (!m) return null;
    return {
      ticker: m.ticker,
      upAskCents: m.yes_ask ?? dollarsToCents(m.yes_ask_dollars),
      downAskCents: m.no_ask ?? dollarsToCents(m.no_ask_dollars),
      lastPriceCents: m.last_price ?? dollarsToCents(m.last_price_dollars),
      fetchedAt: new Date(),
    };
  } catch {
    return null;
  }
}

/** Default poll interval (ms) for real-time monitor. */
const DEFAULT_POLL_MS = 2000;

/** Current 15m slot key: YYYY-MM-DD_HH-MM (MM = 00, 15, 30, 45). New market opens at each slot. */
function current15mSlot(): string {
  const d = new Date();
  const y = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = Math.floor(d.getMinutes() / 15) * 15;
  const minStr = String(min).padStart(2, "0");
  return `${y}-${month}-${day}_${h}-${minStr}`;
}

/**
 * Run a real-time price monitor: poll a market every intervalMs and call onPrices each time.
 * The next poll is scheduled intervalMs after the current poll completes (including getMarketPrices).
 * So effective time between updates = intervalMs + API latency (REST getMarket often ~1–2s).
 * When no ticker is provided, refreshes to the new "first open" market at each 15m boundary (0, 15, 30, 45).
 * Returns a stop function.
 */
export async function startPriceMonitor(
  options: {
    /** Market ticker to monitor. If not set, uses first open KXBTC15M market and refreshes at 15m boundaries. */
    ticker?: string;
    /** Poll interval in ms. Default 2000. */
    intervalMs?: number;
    /** Called on each price update. */
    onPrices: (prices: MarketPrices) => void;
    /** Called on error (e.g. fetch failed). */
    onError?: (err: unknown) => void;
  }
): Promise<() => void> {
  let ticker = options.ticker;
  let lastSlot = current15mSlot();
  if (!ticker) {
    const markets = await getBitcoinUpDownMarkets();
    if (markets.length === 0) {
      throw new Error("No open Bitcoin up/down markets found.");
    }
    ticker = markets[0].ticker;
  }
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_MS;
  const useAutoRefresh = !options.ticker;
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    if (useAutoRefresh) {
      const slot = current15mSlot();
      if (slot !== lastSlot) {
        lastSlot = slot;
        const markets = await getBitcoinUpDownMarkets();
        if (markets.length > 0) ticker = markets[0].ticker;
      }
    }
    if (stopped || !ticker) {
      if (!stopped) setTimeout(poll, intervalMs);
      return;
    }
    const prices = await getMarketPrices(ticker);
    if (stopped) return;
    if (prices) {
      try {
        options.onPrices(prices);
      } catch (e) {
        options.onError?.(e);
      }
    } else {
      options.onError?.(new Error(`Failed to fetch prices for ${ticker}`));
    }
    if (!stopped) setTimeout(poll, intervalMs);
  };
  setTimeout(poll, 0);
  return () => {
    stopped = true;
  };
}

/** Format ask prices for console. */
export function formatPricesLine(p: MarketPrices): string {
  const upAsk = (p.upAskCents / 100).toFixed(2);
  const downAsk = (p.downAskCents / 100).toFixed(2);
  const last = (p.lastPriceCents / 100).toFixed(2);
  return `UP ask=${upAsk}  |  DOWN ask=${downAsk}  |  last=${last}  @ ${p.fetchedAt.toISOString()}`;
}
