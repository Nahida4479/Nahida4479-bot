# 🎲 Nahida4479 Bot

> [!IMPORTANT]
> 🇬🇧[English version](README_EN.md)

Bot Discord dla polskiej społeczności **Neverness to Everness**, napisany w JavaScript z użyciem **discord.js**. Oferuje system ekonomii oparty na **Solid Dice**, systemie rollowania oraz zarządzanie serwerem.

---

## 📦 Wymagania

- Node.js v18+
- Baza danych **Turso (libSQL)**
- Konto Discord Developer + token bota

## ⚙️ Instalacja

```bash
git clone https://github.com/twoj-nick/bot
npm install
```

Utwórz plik `.env`:
```env
token_bot=TWÓJ_TOKEN_BOTA
url_db=libsql://twoja-baza.turso.io
token_db=TWÓJ_TOKEN_TURSO
```

Uruchom:
```bash
node bot.js
```

---

## 🗄️ Baza danych

Bot używa **Turso (libSQL)** - bezpłatnej bazy danych SQLite w chmurze. Tabele tworzone są automatycznie przy pierwszym uruchomieniu:

| Tabela | Opis |
|---|---|
| `ekonomia` | Portfele graczy (Solid Dice) |
| `ekwipunek` | Zdobyte przedmioty |
| `postacie` | Zebrane postacie i ich kopie |
| `cooldowny` | Cooldowny komend |
| `serwery` | Ustawienia serwerów |

---

## 📋 Komendy

| Komenda | Opis | Cooldown |
|---|---|---|
| `/daily` | Odbierz dzienne Solid Dice | 24h |
| `/work` | Zarabiaj Solid Dice | 2h |
| `/kawiarnia` | Odbierz Solid Dice z kawiarni | 4h |
| `/pinkpawsheist` | Weź udział w Pink Paws Heist | 48h |
| `/delivery` | Wykonaj dostawę aby dostać Solid Dice | 24h |
| `/łowienie` | Łów aby zdobyć nagrody | 10 min |
| `/roll` | Wylosuj 10 przedmiotów za 10 Solid Dice | brak |
| `/plecak` | Sprawdź swój ekwipunek i postacie | brak |
| `/wymiana` | Wymień itemy na Solid Dice | brak |
| `/nteleaderboard` | Ranking graczy według zdobytych Solid Dice | brak |
| `/ntegra` | Ustaw kanał do komend ekonomii *(admin)* | brak |
| `/administracja` | Ustaw rolę zarządzającą botem *(właściciel serwera)* | brak |
| `/removecooldown` | Usuń jednorazowo cooldown gracza *(właściciel dodany pod OWNER_ID)* | brak |

---

## 🎲 System ekonomii

- Zdobywaj **Solid Dice** przez komendy dzienne
- Używaj `/roll` aby losować przedmioty i postacie
- Zbieraj **6 kopii postaci** aby odblokować bonusy
- Wymieniaj nadmiarowe przedmioty na Solid Dice przez `/wymiana`

---

## 🛠️ Technologie

- [discord.js](https://discord.js.org/) — biblioteka Discord
- [Turso / libSQL](https://turso.tech/) — baza danych
- [dotenv](https://www.npmjs.com/package/dotenv) — zmienne środowiskowe
