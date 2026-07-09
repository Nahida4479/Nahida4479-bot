# 🎲 Nahida4479 Bot

> [!IMPORTANT]
> 🇬🇧 [English version](README_EN.md)

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

### Ekonomia

| Komenda | Opis | Cooldown |
|---|---|---|
| `/daily` | Odbierz codzienną nagrodę Solid Dice | 24h |
| `/work` | Idź do pracy i zarób Solid Dice | 10 min |
| `/pinkpawsheist` | Weź udział w napadzie Pink Paws Heist (50% szans na sukces) | 48h |
| `/kawiarnia` | Odbierz Solid Dice zgromadzone w kawiarni (1/h, magazyn max 48) | brak |
| `/wyścig` | Prowadź samochód i omijaj przeszkody, żeby dojechać do mety | 30 min |
| `/łowienie` | Złap 3 ryby zanim skończy się czas | 10 min |
| `/automat` | Złap zabawkę w automacie zanim skończy się czas | 10 min |
| `/roll` | Wylosuj 10 przedmiotów za 10 Solid Dice | brak |
| `/mahjong` | Zagraj w Mahjonga NTE - solo z botami albo multiplayer do 4 osób | 1h |
| `/skiny` | Kup skiny postaci w sklepie - ceny wahają się losowo co 2h, każdy z 18 skinów ma inny bonus | brak |
| `/plecak` | Sprawdź swoje Solid Dice, postacie, skiny i miejsce w rankingu | brak |
| `/profil` | Sprawdź swój profil (lub czyjś) i aktywuj bonus jednego z posiadanych skinów | brak |
| `/nteleaderboard` | Ranking graczy według łącznie zdobytych Solid Dice | brak |
| `/animacje` | Włącz lub wyłącz animację pokazywaną przy `/roll` | brak |
| `/pingcooldown` | Włącz/wyłącz oznaczanie Cię, gdy zakończy się cooldown na jedną z Twoich komend | brak |
| `/help` | Poradnik komend ekonomii - nagrody, straty, cooldowny i wideo | brak |

### Administracja

| Komenda | Opis |
|---|---|
| `/ntegra` | Ustaw kanał do komend ekonomii *(admin)* |
| `/administracja` | Ustaw rolę zarządzającą botem *(właściciel serwera)* |
| `/removecooldown` | Włącz/wyłącz permanentny bypass cooldownów dla gracza *(administracja bota)* |
| `/addskin` | Dodaj lub zaktualizuj skin w `/skiny` *(administracja bota)* |
| `/mammonevent` | Natychmiast przywołaj Mammona na kanale ustawionym w `/ntegra` *(administracja bota)* |

---

## 😈 Event: Mammon

Mammon respi się sam z siebie co 12-24h (losowo) na kanale ustawionym w `/ntegra` - pokonanie go wspólnie z innymi graczami daje Solid Dice, z bonusem dla TOP 3 graczy z największymi obrażeniami.

---

## 🎨 Skiny i bonusy

Każdy z 18 skinów w `/skiny` ma swój własny, unikalny bonus (np. krótszy cooldown konkretnej komendy, szansa na dodatkowe Solid Dice, wzmocnienie w walce z Mammonem) - nawet skiny tej samej postaci różnią się bonusem. Ceny skinów (1500-10000 Solid Dice, zależnie od siły bonusu) zmieniają się losowo o ±5-50% co 2 godziny, niezależnie dla każdego skina.

Zakup skina nie aktywuje jego bonusu automatycznie - trzeba go wybrać w `/profil`. Można mieć aktywny tylko jeden bonus na raz.

---

## 🎲 System ekonomii

- Zdobywaj **Solid Dice** przez komendy dzienne
- Używaj `/roll` aby losować przedmioty i postacie
- Zbieraj **6 kopii postaci** aby odblokować bonusy
- Kupuj kosmetyczne skiny za Solid Dice przez `/skiny`

---

## 🛠️ Technologie

- [discord.js](https://discord.js.org/) — biblioteka Discord
- [Turso / libSQL](https://turso.tech/) — baza danych
- [dotenv](https://www.npmjs.com/package/dotenv) — zmienne środowiskowe
