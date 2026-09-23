import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchCandles, validateCoin } from '../src/market.js';

test('valide strictement le symbole Hyperliquid', () => {
  assert.equal(validateCoin(' btc '), 'BTC');
  assert.throws(() => validateCoin('../BTC'), /symbole/i);
  assert.throws(() => validateCoin('A'.repeat(25)), /symbole/i);
});

test('interroge uniquement Hyperliquid et valide sa réponse', async () => {
  let request;
  const result = await fetchCandles('btc', {
    now: 1_800_000_000_000,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => [
          { t: 1, o: '100', h: '110', l: '90', c: '105', v: '42' },
        ],
      };
    },
  });

  assert.equal(request.url, 'https://api.hyperliquid.xyz/info');
  const body = JSON.parse(request.options.body);
  assert.equal(body.type, 'candleSnapshot');
  assert.equal(body.req.coin, 'BTC');
  assert.equal(body.req.interval, '1h');
  assert.deepEqual(result[0], {
    time: 1,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 42,
  });
});

test('refuse une réponse distante malformée', async () => {
  await assert.rejects(
    fetchCandles('BTC', {
      fetchImpl: async () => ({ ok: true, json: async () => [{ c: 'oops' }] }),
    }),
    /invalide/i,
  );
});
