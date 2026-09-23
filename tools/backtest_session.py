#!/usr/bin/env python3
"""Vérifie /backtest avec une session Telethon existante de stresser."""

import argparse
import asyncio
from pathlib import Path
import re
import sys

from telethon import TelegramClient
from telethon.errors import FloodWaitError

STRESSER_DIR = Path("/home/user/stresser")
sys.path.insert(0, str(STRESSER_DIR))
from flood import ACCOUNTS  # noqa: E402


async def latest_incoming(client, bot):
    messages = await client.get_messages(bot, limit=10)
    return next((message for message in messages if not message.out), None)


async def run(args):
    if not re.fullmatch(r"@[A-Za-z0-9_]{5,32}", args.bot):
        raise ValueError("--bot doit être un username Telegram valide")
    symbol = args.symbol.upper()
    if not re.fullmatch(r"[A-Z0-9]{5,20}", symbol):
        raise ValueError("symbole invalide")
    if args.account_index < 0 or args.account_index >= len(ACCOUNTS):
        raise ValueError("index de session invalide")

    account = ACCOUNTS[args.account_index]
    session_path = STRESSER_DIR / account["session"]
    client = TelegramClient(str(session_path), account["api_id"], account["api_hash"])
    await client.start()
    try:
        before = await latest_incoming(client, args.bot)
        before_id = before.id if before else 0
        await client.send_message(args.bot, f"/backtest {symbol}")

        for _ in range(30):
            await asyncio.sleep(1)
            response = await latest_incoming(client, args.bot)
            if response and response.id > before_id:
                text = response.raw_text.casefold()
                required = ("backtest hors échantillon", "rendement", "drawdown maximal")
                if all(marker in text for marker in required):
                    print("PASS: réponse /backtest reçue et complète")
                    return 0
                print("FAIL: réponse reçue mais format de backtest incomplet")
                return 1
        print("FAIL: aucune réponse au backtest dans les 30 secondes")
        return 1
    except FloodWaitError as error:
        print(f"INCONCLUSIVE: limite Telegram ({error.seconds}s)")
        return 3
    finally:
        await client.disconnect()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bot", required=True, help="Bot de test possédé, par ex. @MonBotTest")
    parser.add_argument("--symbol", default="BTCUSDT")
    parser.add_argument("--account-index", type=int, default=0)
    args = parser.parse_args()
    try:
        return asyncio.run(run(args))
    except ValueError as error:
        parser.error(str(error))


if __name__ == "__main__":
    raise SystemExit(main())
