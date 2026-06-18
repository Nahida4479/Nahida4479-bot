# 🎲 Nahida4479 Bot

A Discord bot for the Polish **Neverness to Everness** community, written in JavaScript using **discord.js**. Features an economy system based on **Solid Dice**, gacha rolling, and server management.

---

## 📦 Requirements

- Node.js v18+
- **Turso (libSQL)** database
- Discord Developer account + bot token

## ⚙️ Installation

```bash
git clone https://github.com/Nahida4479/Nahida4479-bot.git
npm install
```

Create a `.env` file:
```env
token_bot=YOUR_BOT_TOKEN
url_db=libsql://your-database.turso.io
token_db=YOUR_TURSO_TOKEN
```

Run:
```bash
node bot.js
```

---

## 🗄️ Database

The bot uses **Turso (libSQL)** - a free cloud LibSQL database. Tables are created automatically on first launch:

| Table | Description |
|---|---|
| `ekonomia` | Player wallets (Solid Dice) |
| `ekwipunek` | Collected items |
| `postacie` | Collected characters and their copies |
| `cooldowny` | Command cooldowns |
| `serwery` | Server settings |

---

## 📋 Commands

| Command | Description | Cooldown |
|---|---|---|
| `/daily` | Collect daily Solid Dice | 24h |
| `/work` | Earn Solid Dice | 2h |
| `/kawiarnia` | Collect Solid Dice from the café | 4h |
| `/pinkpawsheist` | Participate in Pink Paws Heist | 48h |
| `/delivery` | Complete a delivery to earn Solid Dice | 24h |
| `/łowienie` | Go fishing to earn Solid Dice | 10 min |
| `/roll` | Roll 10 items for 10 Solid Dice | none |
| `/plecak` | Check your collected items and characters | none |
| `/wymiana` | Exchange items for Solid Dice | none |
| `/nteleaderboard` | Player ranking by **ALL** Solid Dice ever earned | none |
| `/ntegra` | Set the economy commands channel *(admin)* | none |
| `/administracja` | Set the bot management role *(owner)* | none |
| `/removecooldown` | Remove a player's cooldown **ONCE** *(owner — defined in OWNER_IDS)* | none |

---

## 🎲 Economy System

- Earn **Solid Dice** through daily commands
- Use `/roll` to draw items and characters
- Collect **6 copies of a character** to unlock bonuses
- Exchange surplus items for Solid Dice via `/wymiana`

---

## 🛠️ Technologies

- [discord.js](https://discord.js.org/) - Discord library
- [Turso / libSQL](https://turso.tech/) - database
- [dotenv](https://www.npmjs.com/package/dotenv) - environment variables
