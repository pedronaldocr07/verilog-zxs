import "dotenv/config";

const BASE_PATHS = {
  prod: "https://api.elections.kalshi.com/trade-api/v2",
  demo: "https://demo-api.kalshi.co/trade-api/v2",
} as const;

const PEM_HEADER = "-----BEGIN RSA PRIVATE KEY-----";
const PEM_FOOTER = "-----END RSA PRIVATE KEY-----";

/**
 * Normalize private key so Node crypto accepts it.
 * Rebuilds PEM with strict 64-char base64 lines so Node/OpenSSL decoder accepts it.
 */
function normalizePrivateKeyPem(value: string): string {
  const trimmed = value.trim();
  // Extract base64: remove header/footer and all whitespace
  let base64 = trimmed
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, "")
    .replace(/-----END RSA PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!base64) return trimmed;
  // Rebuild PEM with exactly 64 chars per line (required by some OpenSSL/Node versions)
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.slice(i, i + 64));
  }
  return `${PEM_HEADER}\n${lines.join("\n")}\n${PEM_FOOTER}`;
}

function getPrivateKeyPem(): string {
  const raw = process.env.KALSHI_PRIVATE_KEY_PEM ?? "";
  if (!raw) return "";
  return normalizePrivateKeyPem(raw);
}

export const config = {
  apiKey: process.env.KALSHI_API_KEY ?? "",
  /** Path to RSA private key .pem file (optional if KALSHI_PRIVATE_KEY_PEM is set) */
  privateKeyPath: process.env.KALSHI_PRIVATE_KEY_PATH ?? "",
  /** PEM string for private key, normalized for SDK (optional if KALSHI_PRIVATE_KEY_PATH is set) */
  get privateKeyPem(): string {
    return getPrivateKeyPem();
  },
  /** Use demo environment when true */
  demo: process.env.KALSHI_DEMO === "true",
  basePath:
    process.env.KALSHI_BASE_PATH ??
    (process.env.KALSHI_DEMO === "true" ? BASE_PATHS.demo : BASE_PATHS.prod),
} as const;

/** Bot: Bitcoin up/down series (15-minute BTC price up or down) */
export const BTC_SERIES_TICKER = "KXBTC15M";

/** Bot: max number of open Bitcoin up/down markets to consider (default 15) */
export const BOT_MAX_MARKETS = parseInt(
  process.env.KALSHI_BOT_MAX_MARKETS ?? "1",
  10
);

/** Bot: side to buy — "yes" = up, "no" = down */
export const BOT_SIDE = (process.env.KALSHI_BOT_SIDE ?? "yes") as "yes" | "no";

/** Bot: limit price in cents (1–99). Use ask to take liquidity. */
export const BOT_PRICE_CENTS = parseInt(
  process.env.KALSHI_BOT_PRICE_CENTS ?? "50",
  10
);

/** Bot: contracts per order */
export const BOT_CONTRACTS = parseInt(
  process.env.KALSHI_BOT_CONTRACTS ?? "1",
  10
);

/** Bot: if set, only log and do not place orders */
export const BOT_DRY_RUN = process.env.KALSHI_BOT_DRY_RUN === "true";
