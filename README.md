# Bot Telegram avec réseau neuronal local de trading

Bot JavaScript basé sur grammY. Il entraîne localement un petit classifieur neuronal sur les
bougies horaires publiques de Binance et produit des signaux expérimentaux. Il fonctionne
strictement en **paper trading** : il ne détient aucune clé et ne passe aucun ordre.

L'ancien dialogue Groq reste disponible si `GROQ_API_KEY` est configuré, mais il n'intervient jamais
dans les calculs de trading.

## Installation

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
cp .env.example .env
```

Renseigne ensuite dans `.env` :

- `TELEGRAM_BOT_TOKEN`, obtenu auprès de [@BotFather](https://t.me/BotFather) ;
- `TELEGRAM_ADMIN_ID`, identifiant numérique du seul utilisateur autorisé ;
- éventuellement `GROQ_API_KEY`, pour dialoguer avec Satoshi ;
- éventuellement `GROQ_MODEL` pour changer de modèle.

Les variables doivent respecter la syntaxe `NOM=valeur`, sans `:`.

## Lancement

```bash
npm start
```

Dans Telegram :

```text
/train BTCUSDT
/signal BTCUSDT
/backtest BTCUSDT
/indicators BTCUSDT
```

Le modèle est gardé uniquement en mémoire et disparaît au redémarrage. La précision affichée est une
précision sur les données d'entraînement, pas un backtest hors échantillon et encore moins une promesse
de rendement. Pour raccorder un portefeuille réel, il faut d'abord ajouter un backtest, une gestion du
risque, un environnement testnet et une confirmation humaine explicite.

## Vérification avec les sessions de `stresser`

Les sessions Telethon authentifient le client de test ; elles ne fournissent pas de prix historiques.
Elles restent dans `/home/user/stresser` et le script ne les copie pas. Après avoir lancé le bot, teste
le parcours Telegram avec un bot que tu possèdes :

```bash
/home/user/stresser/venv/bin/python3 tools/backtest_session.py --bot @TonBotDeTest
```

Le bot entraîne le modèle sur les 70 % premières bougies puis calcule les résultats sur les 30 %
suivantes. Le rapport inclut rendement, drawdown maximal, transactions et périodes gagnantes, avec
0,1 % de frais simulés. Il affiche aussi le rendement achat-conservation, l'exposition et un ratio de
Sharpe annualisé indicatif. Le slippage n'est pas encore modélisé.

`/indicators` fournit un tableau de suivi sur bougies horaires : variation 24 h, tendance EMA 20/50,
RSI 14, MACD avec sa ligne de signal et ATR 14. Ces indicateurs sont descriptifs et ne déclenchent
jamais de transaction.

Pour exécuter les tests sans contacter Telegram ni Groq :

```bash
npm test
```

La persona Satoshi se modifie dans `src/chat.js` via la constante `PERSONA`.
