const DEFAULT_SYMBOL = 'BTCUSDT';
const MARKET_API = 'https://api.binance.com/api/v3/klines';

export function validateSymbol(value) {
  const symbol = String(value || DEFAULT_SYMBOL).trim().toUpperCase();
  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
    throw new Error('Symbole de marché invalide. Exemple attendu : BTCUSDT.');
  }
  return symbol;
}

export function parseMarketCommand(text) {
  const [rawAction, rawSymbol] = String(text).trim().split(/\s+/, 2);
  const action = rawAction.replace(/^\//, '').toLowerCase();
  if (!['train', 'signal'].includes(action)) throw new Error('Commande de trading inconnue.');
  return { action, symbol: validateSymbol(rawSymbol) };
}

export async function fetchCandles(symbol, { limit = 500, fetchImpl = fetch } = {}) {
  const safeSymbol = validateSymbol(symbol);
  const safeLimit = Math.max(50, Math.min(1000, Number(limit) || 500));
  const url = new URL(MARKET_API);
  url.searchParams.set('symbol', safeSymbol);
  url.searchParams.set('interval', '1h');
  url.searchParams.set('limit', String(safeLimit));

  const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Le fournisseur de marché a répondu ${response.status}.`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Réponse de marché invalide.');

  return rows.map((row) => ({
    openTime: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}
