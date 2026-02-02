/**
 * Run real-time price monitor for Bitcoin up/down market.
 * Logs best bid/ask for UP (YES) and DOWN (NO) tokens so you can decide which to buy.
 */
import {
  startPriceMonitor,
  formatPricesLine,
} from "./monitor";

async function main(): Promise<void> {
  const intervalMs = parseInt(
    process.env.KALSHI_MONITOR_INTERVAL_MS ?? "2000",
    10
  );
  const ticker = process.env.KALSHI_MONITOR_TICKER; // optional

  console.log(
    `Starting price monitor (interval=${intervalMs}ms${ticker ? ` ticker=${ticker}` : ", first open BTC up/down market"})...`
  );

  const stop = await startPriceMonitor({
    ticker: ticker || undefined,
    intervalMs,
    onPrices: (p) => {
      console.log(`[${p.ticker}] ${formatPricesLine(p)}`);
    },
    onError: (err) => {
      console.error("Monitor error:", err);
    },
  });

  process.on("SIGINT", () => {
    console.log("\nStopping monitor...");
    stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
