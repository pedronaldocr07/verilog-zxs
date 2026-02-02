/**
 * Run real-time price monitor for Bitcoin up/down market.
 * Logs best ask for UP (YES) and DOWN (NO) tokens to console and to logs/monitor_{YYYY-MM-DD}_{HH}-{00|15|30|45}.log per market slot.
 */
import {
  startPriceMonitor,
  formatPricesLine,
} from "./monitor";
import { appendMonitorLog } from "./monitor-logger";

async function main(): Promise<void> {
  const intervalMs = parseInt(
    process.env.KALSHI_MONITOR_INTERVAL_MS ?? "50",
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
      const line = `[${p.ticker}] ${formatPricesLine(p)}`;
      console.log(line);
      appendMonitorLog(line, p.fetchedAt);
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
