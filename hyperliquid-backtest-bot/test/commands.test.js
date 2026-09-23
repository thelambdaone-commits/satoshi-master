import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBacktestCommand } from '../src/commands.js';

test('analyse les paramètres avec des valeurs sûres par défaut', () => {
  assert.deepEqual(parseBacktestCommand(''), {
    coin: 'BTC',
    strategy: 'trend',
    capital: 20,
  });
  assert.deepEqual(parseBacktestCommand('eth breakout 25'), {
    coin: 'ETH',
    strategy: 'breakout',
    capital: 25,
  });
});

test('refuse les commandes ambiguës ou hors limites', () => {
  assert.throws(() => parseBacktestCommand('BTC martingale 20'), /stratégie/i);
  assert.throws(() => parseBacktestCommand('BTC trend 0'), /capital/i);
  assert.throws(() => parseBacktestCommand('BTC trend 20 extra'), /format/i);
});
