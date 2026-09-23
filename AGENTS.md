# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Node.js 20+ ESM Telegram bot built with grammY. Runtime code lives in `src/`: `bot.js` wires Telegram commands, `chat.js` handles optional Groq personas, `trading.js` fetches and validates market data, and `neural-trader.js`, `backtest.js`, and `indicators.js` contain domain logic. Keep Telegram handlers thin and place reusable calculations in focused modules. Tests live in `test/` and mirror source concerns, for example `test/indicators.test.js`. `tools/backtest_session.py` provides an optional Telethon end-to-end check.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`; use Node.js 20 or newer.
- `npm start` runs the bot with `node src/bot.js`.
- `npm test` runs all deterministic `node:test` suites.
- `node --test test/trading.test.js` runs one test file while iterating.
- `/home/user/stresser/venv/bin/python3 tools/backtest_session.py --bot @BotName` exercises a running test bot through Telegram.

Copy `.env.example` to `.env` for local use and provide `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ADMIN_ID`. Groq variables are optional.

## Coding Style & Naming Conventions

Use ES modules, 2-space indentation, single quotes, semicolons, and trailing commas in multiline literals. Prefer `camelCase` for functions and variables, `PascalCase` for classes, and descriptive lowercase filenames such as `neural-trader.js`. Keep functions small, inject external clients such as `fetchImpl` for testability, and validate all command or market input at module boundaries. No formatter or linter is currently configured, so match surrounding code.

## Testing Guidelines

Use `node:test` with `node:assert/strict`. Name files `<feature>.test.js` and write behavior-focused test descriptions. Tests must be deterministic and must not contact Telegram, Groq, or Binance; substitute injected clients and fixtures. Add regression coverage for input validation, calculations, and error paths whenever behavior changes.

## Commit & Pull Request Guidelines

Use short, imperative Conventional Commit subjects, such as `fix(trading): reject malformed symbols`. Keep commits scoped to one concern. Pull requests should explain user-visible behavior, safety implications, configuration changes, and verification commands. Link relevant issues and include screenshots or transcripts when Telegram messages or command flows change.

## Security & Configuration

Never commit `.env`, API tokens, Telegram sessions, or user data. The bot is paper-trading only: do not add wallet custody or live order execution without explicit risk controls, testnet validation, and human confirmation. Keep provider URLs fixed in code and treat all external responses as untrusted.
