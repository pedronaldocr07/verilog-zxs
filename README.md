# Kalshi TypeScript kickoff

TypeScript boilerplate for the [Kalshi](https://kalshi.com) API: REST (via official SDK) and optional WebSocket/Express server.

## Setup

```bash
cp .env.sample .env
# Edit .env: set KALSHI_API_KEY and either KALSHI_PRIVATE_KEY_PATH or KALSHI_PRIVATE_KEY_PEM
npm install
```

## Scripts

- **`npm run run`** – Run the main script (e.g. fetch balance via REST).
- **`npm run bot`** – Run the Bitcoin up/down trading bot (see below).
- **`npm run monitor`** – Run real-time price monitor for UP/DOWN best bid/ask (see below).
- **`npm start`** – Start the Express server (default port 5000).
- **`npm run build`** – Compile TypeScript to `dist/`.

## Environment

| Variable | Description |
|----------|-------------|
| `KALSHI_API_KEY` | Your Kalshi API key id. |
| `KALSHI_PRIVATE_KEY_PATH` | Path to your RSA private key `.pem` file. |
| `KALSHI_PRIVATE_KEY_PEM` | Alternatively, the PEM string (e.g. from a secret manager). |
| `KALSHI_DEMO` | Set to `true` to use the demo API. |
| `KALSHI_BASE_PATH` | Optional override for API base URL. |

## Real-time price monitor

Monitor best bid/ask for **UP (YES)** and **DOWN (NO)** tokens on the first open Bitcoin 15m market. Use this to decide which side to buy for profit.

**Env vars**

| Variable | Description |
|----------|-------------|
| `KALSHI_MONITOR_INTERVAL_MS` | Poll interval in ms (default 2000). |
| `KALSHI_MONITOR_TICKER` | Optional market ticker; if unset, uses first open KXBTC15M market. |

**Example**

```bash
npm run monitor
# [KXBTC15M-26FEB021130-30] UP   bid=0.54 ask=0.56  |  DOWN bid=0.44 ask=0.46  |  last=0.56  @ ...
```

**In code:** use `getMarketPrices(ticker)` or `startPriceMonitor({ ticker, intervalMs, onPrices })` from `./monitor` to build buy logic (e.g. buy UP when up ask &lt; threshold, or buy DOWN when down ask &lt; threshold).

## Bitcoin up/down trading bot

The bot trades only on **Bitcoin 15-minute price up/down** markets (series `KXBTC15M`). It places **one order only**, on the first open market.

**Bot env vars**

| Variable | Description |
|----------|-------------|
| `KALSHI_BOT_SIDE` | `yes` (buy up) or `no` (buy down). Default: `yes`. |
| `KALSHI_BOT_PRICE_CENTS` | Limit price in cents (1–99). Default: `50`. |
| `KALSHI_BOT_CONTRACTS` | Contracts per order. Default: `1`. |
| `KALSHI_BOT_MAX_MARKETS` | Max markets to fetch when picking the first one (default 15). |
| `KALSHI_BOT_DRY_RUN` | Set to `true` to log only, no real orders. |

**Examples**

```bash
# Dry run (no orders)
KALSHI_BOT_DRY_RUN=true npm run bot

# Buy YES (up) at 50¢ — one order on first open market
npm run bot

# Buy NO (down) at 45¢, 2 contracts — one order only
KALSHI_BOT_SIDE=no KALSHI_BOT_PRICE_CENTS=45 KALSHI_BOT_CONTRACTS=2 npm run bot
```

## Docs

- [Kalshi API](https://docs.kalshi.com/)
- [TypeScript SDK quick start](https://docs.kalshi.com/sdks/typescript/quickstart)
- [WebSockets](https://docs.kalshi.com/websockets/websocket-connection)
