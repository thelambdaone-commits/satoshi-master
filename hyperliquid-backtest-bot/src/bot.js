import 'dotenv/config';
import { Bot } from 'grammy';

import { listStrategies, runBacktest } from './backtest.js';
import { parseBacktestCommand } from './commands.js';
import { analyzeResult } from './groq.js';
import { fetchCandles } from './market.js';
import { formatComparison, formatResult } from './report.js';

const token = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const adminUserId = process.env.ADMIN_USER_ID || process.env.TELEGRAM_ADMIN_ID;
const groqApiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
  throw new Error('BOT_TOKEN manquant ou invalide.');
}
if (!adminUserId || !/^\d+$/.test(adminUserId)) {
  throw new Error('ADMIN_USER_ID manquant ou invalide.');
}

const bot = new Bot(token);
const activeUsers = new Set();

bot.use(async (ctx, next) => {
  if (String(ctx.from?.id) !== adminUserId) {
    await ctx.reply('Accès refusé.');
    return;
  }
  await next();
});

async function runExclusive(ctx, operation) {
  const userId = String(ctx.from.id);
  if (activeUsers.has(userId)) {
    await ctx.reply('Un calcul est déjà en cours.');
    return;
  }
  activeUsers.add(userId);
  await ctx.replyWithChatAction('typing');
  try {
    await operation();
  } catch (error) {
    console.error('Commande impossible :', error.message);
    await ctx.reply(`Commande impossible : ${error.message}`);
  } finally {
    activeUsers.delete(userId);
  }
}

bot.command('start', (ctx) =>
  ctx.reply(
    'Backtests Hyperliquid, sans trading réel.\n\n' +
      '/strategies\n' +
      '/backtest BTC trend 20\n' +
      '/compare BTC trend 20\n' +
      '/analyse BTC trend 20\n\n' +
      'Format : symbole, stratégie, capital simulé en USDC.',
  ),
);

bot.command('strategies', (ctx) =>
  ctx.reply(listStrategies().map(({ id, label }) => `• ${id} — ${label}`).join('\n')),
);

bot.command('backtest', (ctx) =>
  runExclusive(ctx, async () => {
    const input = parseBacktestCommand(ctx.match);
    const candles = await fetchCandles(input.coin);
    const result = runBacktest(candles, input.strategy, { initialCapital: input.capital });
    await ctx.reply(formatResult(input.coin, result));
  }),
);

bot.command('compare', (ctx) =>
  runExclusive(ctx, async () => {
    const input = parseBacktestCommand(ctx.match);
    const candles = await fetchCandles(input.coin);
    const results = listStrategies().map(({ id }) =>
      runBacktest(candles, id, { initialCapital: input.capital }),
    );
    await ctx.reply(formatComparison(input.coin, results));
  }),
);

bot.command('analyse', (ctx) =>
  runExclusive(ctx, async () => {
    const input = parseBacktestCommand(ctx.match);
    const candles = await fetchCandles(input.coin);
    const result = runBacktest(candles, input.strategy, { initialCapital: input.capital });
    await ctx.reply(formatResult(input.coin, result));
    const analysis = await analyzeResult(result, {
      apiKey: groqApiKey,
      model: groqModel,
    });
    await ctx.reply(`Analyse Groq\n\n${analysis}`);
  }),
);

bot.on('message:text', (ctx) => ctx.reply('Commande inconnue. Utilise /start.'));
bot.catch((error) => console.error('Erreur Telegram :', error.error?.message || 'inconnue'));
bot.start({ onStart: ({ username }) => console.log(`Bot @${username} démarré.`) });
