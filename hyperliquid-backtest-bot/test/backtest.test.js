import assert from 'node:assert/strict';
import test from 'node:test';

import { listStrategies, runBacktest, strategySignal } from '../src/backtest.js';

function candles(count = 300, direction = 1) {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + direction * index * 0.2 + Math.sin(index / 7);
    return {
      time: 1_700_000_000_000 + index * 3_600_000,
      open: close - 0.1,
      high: close + 0.7,
      low: close - 0.7,
      close,
      volume: 1000 + index,
    };
  });
}

test('expose trois stratégies simples et explicables', () => {
  assert.deepEqual(listStrategies().map(({ id }) => id), ['trend', 'breakout', 'rsi']);
});

test('la stratégie trend identifie les tendances établies', () => {
  assert.equal(strategySignal('trend', candles(80, 1)), 1);
  assert.equal(strategySignal('trend', candles(80, -1)), -1);
});

test('calcule un backtest long/short avec frais et slippage', () => {
  const result = runBacktest(candles(), 'trend', {
    initialCapital: 20,
    feeRate: 0.00045,
    slippageRate: 0.0001,
  });

  assert.equal(result.strategy, 'trend');
  assert.equal(result.initialCapital, 20);
  assert.ok(result.finalCapital >= 0);
  assert.ok(Number.isFinite(result.returnPct));
  assert.ok(result.maxDrawdownPct >= 0 && result.maxDrawdownPct <= 100);
  assert.ok(result.trades >= 1);
  assert.ok(result.longPeriods > 0);
  assert.ok(result.exposurePct >= 0 && result.exposurePct <= 100);
  assert.ok(Number.isFinite(result.sharpeRatio));
});

test('refuse les entrées et paramètres dangereux', () => {
  assert.throws(() => runBacktest(candles(), 'martingale'), /stratégie/i);
  assert.throws(() => runBacktest(candles(40), 'trend'), /bougies/i);
  assert.throws(() => runBacktest(candles(), 'trend', { initialCapital: 0 }), /capital/i);
  assert.throws(() => runBacktest(candles(), 'trend', { leverage: 10 }), /levier/i);
  const invalid = candles();
  invalid[100].close = Number.NaN;
  assert.throws(() => runBacktest(invalid, 'trend'), /invalide/i);
});
