# Hyperliquid Backtest Telegram Bot

Bot Telegram minimal pour comparer trois stratégies sur les bougies horaires publiques de
Hyperliquid. Il ne contient aucune clé de wallet et ne peut passer aucun ordre.

## Commandes

```text
/strategies
/backtest BTC trend 20
/compare BTC trend 20
/analyse BTC trend 20
```

Stratégies disponibles :

- `trend` : suivi de tendance EMA 20/50 ;
- `breakout` : cassure du plus haut ou du plus bas des 20 bougies précédentes ;
- `rsi` : retour à la moyenne avec RSI 14.

Le dernier paramètre est le capital simulé en USDC. Les calculs utilisent un levier de 1×,
0,045 % de frais et 0,01 % de slippage par exécution. Les données sont historiques et les résultats
ne prédisent pas les performances futures.

## Installation

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
cp .env.example .env
npm test
npm start
```

Renseigne `BOT_TOKEN` et `ADMIN_USER_ID` dans `.env`. Les mêmes noms existent dans
`tg-crypto-wallet`, mais ne copie pas son fichier `.env` entier : ce bot n'a besoin d'aucune clé de
wallet. `GROQ_API_KEY` est facultative et sert uniquement à commenter un rapport via `/analyse`.

Les réponses Telegram sont limitées au propriétaire identifié par `ADMIN_USER_ID`. Groq reçoit
uniquement les métriques numériques du backtest, jamais les secrets ni les messages Telegram.
