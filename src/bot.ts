/**
 * Simple Kalshi trading bot: buy YES (up) or NO (down) on Bitcoin 15m price markets.
 * Places one order only, on the first open market in the KXBTC15M series.
 */
import {
  Configuration,
  MarketApi,
  OrdersApi,
  type Market,
} from "kalshi-typescript";
import {
  config,
  BTC_SERIES_TICKER,
  BOT_MAX_MARKETS,
  BOT_SIDE,
  BOT_PRICE_CENTS,
  BOT_CONTRACTS,
  BOT_DRY_RUN,
} from "./config";

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

/** Fetch open Bitcoin 15m up/down markets, up to BOT_MAX_MARKETS. */
export async function getBitcoinUpDownMarkets(): Promise<Market[]> {
  const conf = buildConfiguration();
  const marketApi = new MarketApi(conf);
  const all: Market[] = [];
  let cursor: string | undefined;
  let pageSize: number;
  do {
    const res = await marketApi.getMarkets(
      200,
      cursor,
      undefined,
      BTC_SERIES_TICKER,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "open",
      undefined,
      undefined
    );
    const markets = res.data.markets ?? [];
    pageSize = markets.length;
    all.push(...markets);
    cursor = res.data.cursor ?? undefined;
    if (!cursor || all.length >= BOT_MAX_MARKETS) break;
  } while (pageSize === 200);
  return all.slice(0, BOT_MAX_MARKETS);
}

/** Place a single limit buy order (yes or no) on a market. */
export async function placeOrder(
  ticker: string,
  side: "yes" | "no",
  count: number,
  priceCents: number
): Promise<{ orderId: string } | { error: string }> {
  if (BOT_DRY_RUN) {
    console.log(
      `[DRY RUN] Would place: ticker=${ticker} side=${side} count=${count} yes_price=${priceCents} (no_price for no)`
    );
    return { orderId: "dry-run" };
  }
  const conf = buildConfiguration();
  const ordersApi = new OrdersApi(conf);
  const price = Math.max(1, Math.min(99, priceCents));
  try {
    const res = await ordersApi.createOrder({
      ticker,
      side,
      action: "buy",
      count,
      type: "limit",
      time_in_force: "good_till_canceled",
      ...(side === "yes" ? { yes_price: price } : { no_price: price }),
    });
    const order = res.data.order;
    const orderId = order?.order_id ?? "unknown";
    console.log(`Order placed: ${orderId} ticker=${ticker} side=${side} count=${count} price=${price}c`);
    return { orderId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Order failed for ${ticker}:`, msg);
    return { error: msg };
  }
}

/** Run bot: fetch BTC up/down markets and place one order only (on the first open market). */
export async function run(): Promise<void> {
  console.log(
    `Bot config: series=${BTC_SERIES_TICKER} side=${BOT_SIDE} price=${BOT_PRICE_CENTS}c contracts=${BOT_CONTRACTS} dryRun=${BOT_DRY_RUN} (one order only)`
  );
  const markets = await getBitcoinUpDownMarkets();
  console.log(`Found ${markets.length} open Bitcoin up/down markets.`);
  if (markets.length === 0) {
    console.log("No open markets to trade. Exiting.");
    return;
  }
  const market = markets[0];
  const result = await placeOrder(
    market.ticker,
    BOT_SIDE,
    BOT_CONTRACTS,
    BOT_PRICE_CENTS
  );
  if ("error" in result) {
    console.error(`Order failed: ${result.error}`);
    process.exitCode = 1;
  }
}
