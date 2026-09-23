import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDataset, LocalNeuralTrader } from '../src/neural-trader.js';
import { fetchCandles, parseMarketCommand, validateSymbol } from '../src/trading.js';

function risingCandles(count = 80) {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index + Math.sin(index / 3);
    return {
      openTime: index,
      open: close - 0.4,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + index * 5,
    };
  });
}

test('construit des exemples finis à partir de bougies OHLCV', () => {
  const dataset = buildDataset(risingCandles(), 10);

  assert.ok(dataset.samples.length > 20);
  assert.equal(dataset.samples[0].features.length, 6);
  assert.ok(dataset.samples.every(({ features }) => features.every(Number.isFinite)));
  assert.ok(dataset.samples.every(({ target }) => target === 0 || target === 1));
});

test('entraîne localement un modèle et produit une probabilité bornée', () => {
  const trader = new LocalNeuralTrader({ windowSize: 10, epochs: 80, seed: 7 });
  const metrics = trader.train(risingCandles());
  const prediction = trader.predict(risingCandles());

  assert.ok(metrics.samples > 20);
  assert.ok(metrics.accuracy >= 0 && metrics.accuracy <= 1);
  assert.ok(prediction.probability >= 0 && prediction.probability <= 1);
  assert.ok(['ACHAT', 'VENTE', 'ATTENDRE'].includes(prediction.signal));
});

test('refuse de prédire avant entraînement', () => {
  const trader = new LocalNeuralTrader();
  assert.throws(() => trader.predict(risingCandles()), /entra.n/i);
});

test('valide strictement les symboles de marché', () => {
  assert.equal(validateSymbol('btcusdt'), 'BTCUSDT');
  assert.throws(() => validateSymbol('../etc/passwd'), /symbole/i);
  assert.throws(() => validateSymbol('A'.repeat(25)), /symbole/i);
});

test('analyse les commandes de trading et applique BTCUSDT par défaut', () => {
  assert.deepEqual(parseMarketCommand('/train'), { action: 'train', symbol: 'BTCUSDT' });
  assert.deepEqual(parseMarketCommand('/signal ethusdt'), {
    action: 'signal',
    symbol: 'ETHUSDT',
  });
});

test('convertit la réponse du fournisseur sans permettre de choisir son URL', async () => {
  let requestedUrl;
  const candles = await fetchCandles('ethusdt', {
    limit: 80,
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => [[1, '100', '110', '90', '105', '42']],
      };
    },
  });

  assert.equal(requestedUrl.hostname, 'api.binance.com');
  assert.equal(requestedUrl.searchParams.get('symbol'), 'ETHUSDT');
  assert.equal(requestedUrl.searchParams.get('limit'), '80');
  assert.deepEqual(candles[0], {
    openTime: 1,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 42,
  });
});
