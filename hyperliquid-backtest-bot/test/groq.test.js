import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeResult } from '../src/groq.js';

test('envoie uniquement le rapport borné à Groq', async () => {
  let request;
  const answer = await analyzeResult(
    { strategy: 'trend', returnPct: 1.2, maxDrawdownPct: 0.5, trades: 4 },
    {
      apiKey: 'test-key',
      model: 'test-model',
      fetchImpl: async (url, options) => {
        request = { url, options };
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'Analyse prudente.' } }] }),
        };
      },
    },
  );

  assert.equal(answer, 'Analyse prudente.');
  assert.equal(request.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, 'test-model');
  assert.ok(body.max_completion_tokens <= 400);
  assert.doesNotMatch(JSON.stringify(body), /test-key/);
});

test('exige une clé et refuse une réponse vide', async () => {
  await assert.rejects(analyzeResult({}, {}), /GROQ_API_KEY/);
  await assert.rejects(
    analyzeResult({}, {
      apiKey: 'key',
      fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [] }) }),
    }),
    /vide/i,
  );
});
