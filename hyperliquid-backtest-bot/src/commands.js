import { validateStrategy } from './backtest.js';
import { validateCoin } from './market.js';

export function parseBacktestCommand(text) {
  const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length > 3) throw new Error('Format : /backtest BTC trend 20.');
  const capital = parts[2] === undefined ? 20 : Number(parts[2]);
  if (!Number.isFinite(capital) || capital < 1 || capital > 1_000_000) {
    throw new Error('Le capital doit être compris entre 1 et 1 000 000 USDC.');
  }
  return {
    coin: validateCoin(parts[0]),
    strategy: validateStrategy(parts[1]),
    capital,
  };
}
