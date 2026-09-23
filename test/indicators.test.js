import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateIndicators } from '../src/indicators.js';

function risingCandles(count = 80) {
  return Array.from({ length: count }, (_, index) => ({
    openTime: index,
    open: 99 + index,
    high: 101 + index,
    low: 98 + index,
    close: 100 + index,
    volume: 1000 + index,
  }));
}

test('calcule RSI, EMA, MACD et ATR avec un biais haussier cohérent', () => {
  const indicators = calculateIndicators(risingCandles());

  assert.equal(indicators.price, 179);
  assert.equal(indicators.rsi14, 100);
  assert.ok(indicators.ema20 > indicators.ema50);
  assert.ok(indicators.macd > 0);
  assert.ok(indicators.atr14 > 0);
  assert.equal(indicators.trend, 'HAUSSIÈRE');
});

test('refuse un historique insuffisant ou invalide', () => {
  assert.throws(() => calculateIndicators(risingCandles(20)), /bougies/i);
  const invalid = risingCandles();
  invalid[10].close = Number.NaN;
  assert.throws(() => calculateIndicators(invalid), /invalide/i);
});
