import assert from 'node:assert/strict';
import test from 'node:test';

import { runBacktest } from '../src/backtest.js';

function candles(count = 260) {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.12 + Math.sin(index / 5) * 3;
    return {
      openTime: 1_700_000_000_000 + index * 3_600_000,
      open: close - 0.2,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + (index % 20) * 15,
    };
  });
}

test('backteste uniquement sur la période située après les données d’entraînement', () => {
  const result = runBacktest(candles(), {
    trainRatio: 0.7,
    initialCapital: 1000,
    feeRate: 0.001,
  });

  assert.equal(result.trainingCandles, 182);
  assert.equal(result.testCandles, 78);
  assert.equal(result.initialCapital, 1000);
  assert.ok(Number.isFinite(result.finalCapital));
  assert.ok(Number.isFinite(result.returnPct));
  assert.ok(result.maxDrawdownPct >= 0);
  assert.ok(result.trades >= 0);
  assert.ok(Number.isFinite(result.benchmarkReturnPct));
  assert.ok(result.exposurePct >= 0 && result.exposurePct <= 100);
  assert.ok(Number.isFinite(result.sharpeRatio));
  assert.ok(result.testStart > candles()[181].openTime);
});

test('refuse les paramètres de backtest dangereux ou incohérents', () => {
  assert.throws(() => runBacktest(candles(40)), /bougies/i);
  assert.throws(() => runBacktest(candles(), { trainRatio: 0.95 }), /ratio/i);
  assert.throws(() => runBacktest(candles(), { feeRate: -1 }), /frais/i);
});
