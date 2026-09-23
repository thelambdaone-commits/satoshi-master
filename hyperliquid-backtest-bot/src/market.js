const API_URL = 'https://api.hyperliquid.xyz/info';
const HOUR_MS = 3_600_000;

export function validateCoin(value) {
  const coin = String(value || 'BTC').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,20}$/.test(coin)) {
    throw new Error('Symbole Hyperliquid invalide. Exemple : BTC.');
  }
  return coin;
}

export async function fetchCandles(
  coin,
  { limit = 1000, fetchImpl = fetch, now = Date.now() } = {},
) {
  const safeCoin = validateCoin(coin);
  const safeLimit = Math.max(80, Math.min(2000, Number(limit) || 1000));
  const response = await fetchImpl(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: {
        coin: safeCoin,
        interval: '1h',
        startTime: now - safeLimit * HOUR_MS,
        endTime: now,
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Hyperliquid a répondu ${response.status}.`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Réponse Hyperliquid invalide.');
  const candles = rows.map((row) => ({
    time: Number(row.t),
    open: Number(row.o),
    high: Number(row.h),
    low: Number(row.l),
    close: Number(row.c),
    volume: Number(row.v),
  }));
  if (
    candles.some((candle) =>
      Object.values(candle).some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new Error('Réponse Hyperliquid invalide.');
  }
  return candles;
}
