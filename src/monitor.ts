/**
 * Real-time monitor for best bid/ask of YES (up) and NO (down) tokens on a Kalshi market.
 * Use this to watch prices and decide which side to buy for profit.
 */
import { Configuration, MarketApi } from "kalshi-typescript";
import { config } from "./config";
import { getBitcoinUpDownMarkets } from "./bot";

/** Best bid/ask in cents (1–99). Up = YES token, Down = NO token. */
export interface MarketPrices {
  ticker: string;
  /** Best bid for YES (up) token, cents */
  upBidCents: number;
  /** Best ask for YES (up) token, cents */
  upAskCents: number;
  /** Best bid for NO (down) token, cents */
  downBidCents: number;
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
 * Fetch current best bid/ask for both up (YES) and down (NO) tokens for a market.
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
      upBidCents: m.yes_bid ?? dollarsToCents(m.yes_bid_dollars),
      upAskCents: m.yes_ask ?? dollarsToCents(m.yes_ask_dollars),
      downBidCents: m.no_bid ?? dollarsToCents(m.no_bid_dollars),
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

/**
 * Run a real-time price monitor: poll a market every intervalMs and call onPrices each time.
 * Returns a stop function. Uses the first open Bitcoin up/down market if ticker is not provided.
 */
export async function startPriceMonitor(
  options: {
    /** Market ticker to monitor. If not set, uses first open KXBTC15M market. */
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
  if (!ticker) {
    const markets = await getBitcoinUpDownMarkets();
    if (markets.length === 0) {
      throw new Error("No open Bitcoin up/down markets found.");
    }
    ticker = markets[0].ticker;
  }
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_MS;
  let stopped = false;
  const poll = async () => {
    if (stopped) return;
    const prices = await getMarketPrices(ticker!);
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

/** Format prices for console: up/down best bid and ask. */
export function formatPricesLine(p: MarketPrices): string {
  const upBid = (p.upBidCents / 100).toFixed(2);
  const upAsk = (p.upAskCents / 100).toFixed(2);
  const downBid = (p.downBidCents / 100).toFixed(2);
  const downAsk = (p.downAskCents / 100).toFixed(2);
  const last = (p.lastPriceCents / 100).toFixed(2);
  return `UP   bid=${upBid} ask=${upAsk}  |  DOWN bid=${downBid} ask=${downAsk}  |  last=${last}  @ ${p.fetchedAt.toISOString()}`;
}
