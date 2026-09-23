import assert from 'node:assert/strict';
import test from 'node:test';

import * as chat from '../src/chat.js';
import { createAnswer } from '../src/chat.js';

test('envoie la persona et le message utilisateur à Groq', async () => {
  let request;
  const groq = {
    chat: {
      completions: {
        create: async (value) => {
          request = value;
          return { choices: [{ message: { content: 'Réponse de Satoshi' } }] };
        },
      },
    },
  };

  const answer = await createAnswer(groq, 'Bonjour', 'modele-test');

  assert.equal(answer, 'Réponse de Satoshi');
  assert.equal(request.model, 'modele-test');
  assert.equal(request.messages[0].role, 'system');
  assert.match(request.messages[0].content, /Satoshi/i);
  assert.deepEqual(request.messages[1], { role: 'user', content: 'Bonjour' });
});

test('retourne un message sûr si Groq ne fournit aucun texte', async () => {
  const groq = {
    chat: { completions: { create: async () => ({ choices: [] }) } },
  };

  const answer = await createAnswer(groq, 'Bonjour', 'modele-test');

  assert.equal(answer, "Je n'ai pas réussi à formuler une réponse. Réessaie.");
});

test('expose uniquement le dialogue direct avec Satoshi', async () => {
  assert.equal('createDiscussion' in chat, false);

  let request;
  const groq = {
    chat: {
      completions: {
        create: async (value) => {
          request = value;
          return { choices: [{ message: { content: 'Bonjour, je suis Satoshi.' } }] };
        },
      },
    },
  };

  await createAnswer(groq, 'Qui es-tu ?', 'modele-test');

  assert.match(request.messages[0].content, /Satoshi/i);
});
