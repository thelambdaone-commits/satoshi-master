import 'dotenv/config';
import { Bot } from 'grammy';
import Groq from 'groq-sdk';

import { runBacktest } from './backtest.js';
import { createAnswer } from './chat.js';
import { calculateIndicators } from './indicators.js';
import { LocalNeuralTrader } from './neural-trader.js';
import { fetchCandles, validateSymbol } from './trading.js';

const { TELEGRAM_BOT_TOKEN, GROQ_API_KEY, TELEGRAM_ADMIN_ID } = process.env;
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_ID) {
  throw new Error('TELEGRAM_BOT_TOKEN et TELEGRAM_ADMIN_ID sont requis dans le fichier .env.');
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const traders = new Map();

bot.use(async (ctx, next) => {
  if (String(ctx.from?.id) !== String(TELEGRAM_ADMIN_ID)) {
    await ctx.reply('Accès refusé. Ce bot de trading est privé.');
    return;
  }
  await next();
});

bot.command('start', (ctx) =>
  ctx.reply(
    'Bot neuronal local en mode simulation uniquement.\n\n' +
      '/train BTCUSDT — entraîne le modèle sur 500 bougies horaires\n' +
      '/signal BTCUSDT — calcule un signal sans passer d’ordre\n\n' +
      '/backtest BTCUSDT — teste hors échantillon sur 1 000 bougies\n\n' +
      '/indicators BTCUSDT — affiche RSI, EMA, MACD et ATR\n\n' +
      'Ce prototype ne garantit aucun rendement. Ne partage jamais de seed ni de clé privée.',
  ),
);

bot.command('indicators', async (ctx) => {
  await ctx.replyWithChatAction('typing');
  try {
    const symbol = validateSymbol(ctx.match || 'BTCUSDT');
    const candles = await fetchCandles(symbol, { limit: 100 });
    const value = calculateIndicators(candles);
    await ctx.reply(
      `Indicateurs ${symbol} (bougies 1 h)\n` +
        `Prix : ${value.price.toFixed(4)}\n` +
        `Variation 24 h : ${value.change24hPct.toFixed(2)} %\n` +
        `Tendance : ${value.trend}\n` +
        `RSI 14 : ${value.rsi14.toFixed(1)}\n` +
        `EMA 20 / 50 : ${value.ema20.toFixed(4)} / ${value.ema50.toFixed(4)}\n` +
        `MACD / signal : ${value.macd.toFixed(4)} / ${value.macdSignal.toFixed(4)}\n` +
        `ATR 14 : ${value.atr14.toFixed(4)}\n\n` +
        'Indicateurs descriptifs, pas un conseil financier.',
    );
  } catch (error) {
    console.error('Erreur indicateurs :', error.message);
    await ctx.reply(`Indicateurs indisponibles : ${error.message}`);
  }
});

bot.command('backtest', async (ctx) => {
  await ctx.replyWithChatAction('typing');
  try {
    const symbol = validateSymbol(ctx.match || 'BTCUSDT');
    const candles = await fetchCandles(symbol, { limit: 1000 });
    const result = runBacktest(candles);
    const start = new Date(result.testStart).toISOString().slice(0, 10);
    const end = new Date(result.testEnd).toISOString().slice(0, 10);
    await ctx.reply(
      `Backtest hors échantillon ${symbol}\n` +
        `Période test : ${start} → ${end} (${result.testCandles} bougies)\n` +
        `Capital simulé : ${result.initialCapital.toFixed(2)} → ${result.finalCapital.toFixed(2)} USDT\n` +
        `Rendement : ${result.returnPct.toFixed(2)} %\n` +
        `Achat-conservation : ${result.benchmarkReturnPct.toFixed(2)} %\n` +
        `Drawdown maximal : ${result.maxDrawdownPct.toFixed(2)} %\n` +
        `Transactions : ${result.trades}\n` +
        `Exposition : ${result.exposurePct.toFixed(1)} %\n` +
        `Sharpe annualisé indicatif : ${result.sharpeRatio.toFixed(2)}\n` +
        `Périodes gagnantes en position : ${result.winRatePct.toFixed(1)} %\n\n` +
        'Simulation avec 0,1 % de frais, sans slippage. Aucun ordre réel.',
    );
  } catch (error) {
    console.error('Erreur backtest :', error.message);
    await ctx.reply(`Backtest impossible : ${error.message}`);
  }
});

bot.command('train', async (ctx) => {
  await ctx.replyWithChatAction('typing');
  try {
    const symbol = validateSymbol(ctx.match || 'BTCUSDT');
    const candles = await fetchCandles(symbol);
    const trader = new LocalNeuralTrader();
    const metrics = trader.train(candles);
    traders.set(symbol, trader);
    await ctx.reply(
      `Modèle ${symbol} entraîné localement sur ${metrics.samples} exemples.\n` +
        `Précision d’entraînement : ${(metrics.accuracy * 100).toFixed(1)} %.\n` +
        'Attention : cette mesure historique ne prédit pas les performances futures.',
    );
  } catch (error) {
    console.error('Erreur entraînement :', error.message);
    await ctx.reply(`Entraînement impossible : ${error.message}`);
  }
});

bot.command('signal', async (ctx) => {
  await ctx.replyWithChatAction('typing');
  try {
    const symbol = validateSymbol(ctx.match || 'BTCUSDT');
    const trader = traders.get(symbol);
    if (!trader) {
      await ctx.reply(`Aucun modèle pour ${symbol}. Lance d’abord /train ${symbol}.`);
      return;
    }
    const candles = await fetchCandles(symbol, { limit: 100 });
    const prediction = trader.predict(candles);
    await ctx.reply(
      `${symbol} : ${prediction.signal}\n` +
        `Probabilité de hausse estimée : ${(prediction.probability * 100).toFixed(1)} %\n\n` +
        'Signal expérimental, aucun ordre n’a été passé.',
    );
  } catch (error) {
    console.error('Erreur signal :', error.message);
    await ctx.reply(`Signal impossible : ${error.message}`);
  }
});

bot.on('message:text', async (ctx) => {
  if (!groq) {
    await ctx.reply('Utilise /train BTCUSDT ou /signal BTCUSDT.');
    return;
  }
  await ctx.replyWithChatAction('typing');

  try {
    const answer = await createAnswer(groq, ctx.message.text, model);
    await ctx.reply(answer);
  } catch (error) {
    console.error('Erreur Groq :', error.message);
    await ctx.reply("Désolé, l'IA est momentanément indisponible. Réessaie dans un instant.");
  }
});

bot.catch((error) => console.error('Erreur Telegram :', error.error));

bot.start({
  onStart: ({ username }) => console.log(`Bot @${username} démarré.`),
});
