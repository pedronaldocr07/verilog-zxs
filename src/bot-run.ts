import { run } from "./bot";
import { appendMonitorLogWithTimestamp } from "./monitor-logger";

run().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(err);
  appendMonitorLogWithTimestamp(`Fatal: ${msg}`);
  process.exit(1);
});
