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

### Economy

| Command | Description | Cooldown |
|---|---|---|
| `/daily` | Collect a daily Solid Dice reward | 24h |
| `/work` | Go to work and earn Solid Dice | 10 min |
| `/pinkpawsheist` | Take part in the Pink Paws Heist (50% success chance) | 48h |
| `/kawiarnia` | Collect Solid Dice accumulated at the café (1/h, capped at 48) | none |
| `/wyścig` | Drive a car and dodge obstacles to reach the finish line | 30 min |
| `/łowienie` | Catch 3 fish before time runs out | 10 min |
| `/automat` | Grab a toy in the claw machine before time runs out | 10 min |
| `/roll` | Roll 10 items for 10 Solid Dice | none |
| `/mahjong` | Play NTE Mahjong - solo with bots or multiplayer up to 4 players | 1h |
| `/papier-kamień-nożyce` | Challenge another player to a rock-paper-scissors duel for Solid Dice - best of 3 rounds | 15 min (challenger only) |
| `/bond` | Check the character bond system - levels, bonuses and your own progress | none |
| `/bonusy` | See your (or someone else's) currently active bonuses - from bonds and from a skin | none |
| `/skiny` | Buy character skins from the shop - prices fluctuate every 2h, each of the 20 skins has a different bonus | none |
| `/plecak` | Check your Solid Dice, characters, skins and leaderboard rank | none |
| `/profil` | Check your profile (or someone else's) and activate one owned skin's bonus | none |
| `/nteleaderboard` | Player ranking by **ALL** Solid Dice ever earned | none |
| `/animacje` | Turn the `/roll` animation on or off | none |
| `/pingcooldown` | Toggle being pinged when one of your command cooldowns ends | none |
| `/help` | Guide to economy commands - rewards, losses, cooldowns and video | none |

### Administration

| Command | Description |
|---|---|
| `/ntegra` | Set the economy commands channel *(admin)* |
| `/administracja` | Set the bot management role *(server owner)* |
| `/removecooldown` | Toggle a permanent cooldown bypass for a player *(bot administration)* |
| `/addskin` | Add or update a skin in `/skiny` *(bot administration)* |
| `/mammonevent` | Instantly summon Mammon in the channel set via `/ntegra` *(bot administration)* |
| `/panel` | Manage a player: Solid Dice, cooldowns, leaderboard, skins *(bot administration)* |

---

## 😈 Event: Mammon

Mammon spawns on its own every 6-12h (random) in the channel set via `/ntegra` - defeating it together with other players rewards Solid Dice, with a bonus for the TOP 3 players by damage dealt.

---

## 🎨 Skins and bonuses

Each of the 20 skins in `/skiny` has its own unique bonus attached (e.g. a shorter cooldown on a specific command, a chance at extra Solid Dice, a boost while fighting Mammon) - even skins of the same character differ in their bonus. Skin prices (500-10000 Solid Dice, depending on bonus strength) fluctuate randomly by ±5-50% every 2 hours, independently per skin.

Buying a skin doesn't activate its bonus automatically - it has to be selected in `/profil`. Only one bonus can be active at a time.

---

## 🔗 Character bonds and `/papier-kamień-nożyce`

`/papier-kamień-nożyce` is a 1v1 duel for Solid Dice: the challenger sets a stake, a second player joins, both pick a character from their `/plecak`, then play rounds (10 seconds to choose) up to 3 wins - the winner takes the stake from the loser.

Playing (and winning) with a given character in `/papier-kamień-nożyce` builds that character's **bond** - 7 characters are each permanently tied to one economy command, unlocking increasing bonuses for it as their bond level (1-10, based on total Solid Dice won with that character in this game) rises:

| Character | Command |
|---|---|
| Nanally | `/wyścig` |
| Hotori | `/mahjong` |
| Lacrimosa | `/automat` |
| Chaos | `/łowienie` |
| Sakiri | `/daily` |
| Fadia | `/work` |
| Chiz | `/pinkpawsheist` |

Levels stack - at level N, the bonuses of every level 1..N are active at once, not just the highest one reached. Levels 1-9 grant growing bonuses specific to the assigned command (extra Solid Dice, shorter cooldown, a chance at a bonus reward), while level 10 is always a 15% chance to double (2x) the Solid Dice earned from that command. Check the full level list and your own progress in `/bond`, and every currently active bonus (bond + skin) at once in `/bonusy`.

On top of that: every Solid Dice reward from an economy command (`/daily`, `/work`, `/pinkpawsheist`, `/wyścig`, `/łowienie`, `/automat`, `/mahjong`) has a **20% chance** to also go - on top of the normal wallet reward - to the bond of a random character you currently own in `/plecak`.

---

## 🎲 Economy System

- Earn **Solid Dice** through daily commands
- Use `/roll` to draw items and characters
- Collect **6 copies of a character** to unlock bonuses
- Buy cosmetic skins with Solid Dice via `/skiny`

---

## 🛠️ Technologies

- [discord.js](https://discord.js.org/) - Discord library
- [Turso / libSQL](https://turso.tech/) - database
- [dotenv](https://www.npmjs.com/package/dotenv) - environment variables
