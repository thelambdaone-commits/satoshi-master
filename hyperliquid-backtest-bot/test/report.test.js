import assert from 'node:assert/strict';
import test from 'node:test';

import { formatComparison, formatResult } from '../src/report.js';

const result = {
  strategy: 'trend',
  initialCapital: 20,
  finalCapital: 21,
  returnPct: 5,
  benchmarkReturnPct: 3,
  maxDrawdownPct: 1.5,
  trades: 4,
  winRatePct: 52,
  exposurePct: 80,
  sharpeRatio: 1.2,
  testStart: Date.UTC(2026, 0, 1),
  testEnd: Date.UTC(2026, 0, 10),
};

test('formate un rapport Telegram lisible avec avertissement', () => {
  const text = formatResult('BTC', result);

  assert.match(text, /BTC/);
  assert.match(text, /trend/);
  assert.match(text, /20\.00 → 21\.00 USDC/);
  assert.match(text, /aucun ordre réel/i);
  assert.ok(text.length < 4096);
});

test('compare les stratégies par rendement sans masquer le drawdown', () => {
  const text = formatComparison('BTC', [
    result,
    { ...result, strategy: 'rsi', returnPct: -2, maxDrawdownPct: 4 },
  ]);

  assert.ok(text.indexOf('trend') < text.indexOf('rsi'));
  assert.match(text, /DD 4\.00 %/);
});
