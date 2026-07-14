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
| `/papier-kamień-nożyce` | Wyzwij innego gracza na pojedynek o Solid Dice - do 3 wygranych rund | 15 min (dla wyzywającego) |
| `/bond` | Sprawdź system więzi z postaciami - poziomy, bonusy i swój postęp | brak |
| `/bonusy` | Zobacz swoje (albo czyjeś) aktualnie aktywne bonusy - z więzi i ze skina | brak |
| `/skiny` | Kup skiny postaci w sklepie - ceny wahają się losowo co 2h, każdy z 20 skinów ma inny bonus | brak |
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
| `/panel` | Zarządzaj graczem: Solid Dice, cooldowny, ranking, skiny *(administracja bota)* |

---

## 😈 Event: Mammon

Mammon respi się sam z siebie co 6-12h (losowo) na kanale ustawionym w `/ntegra` - pokonanie go wspólnie z innymi graczami daje Solid Dice, z bonusem dla TOP 3 graczy z największymi obrażeniami.

---

## 🎨 Skiny i bonusy

Każdy z 20 skinów w `/skiny` ma swój własny, unikalny bonus (np. krótszy cooldown konkretnej komendy, szansa na dodatkowe Solid Dice, wzmocnienie w walce z Mammonem) - nawet skiny tej samej postaci różnią się bonusem. Ceny skinów (500-10000 Solid Dice, zależnie od siły bonusu) zmieniają się losowo o ±5-50% co 2 godziny, niezależnie dla każdego skina.

Zakup skina nie aktywuje jego bonusu automatycznie - trzeba go wybrać w `/profil`. Można mieć aktywny tylko jeden bonus na raz.

---

## 🔗 Więź z postaciami i `/papier-kamień-nożyce`

`/papier-kamień-nożyce` to pojedynek 1v1 o Solid Dice: osoba wyzywająca ustawia stawkę, drugi gracz dołącza, obaj wybierają postać ze swojego `/plecak`, a potem grają rundy (10 sekund na wybór) do 3 wygranych - zwycięzca zgarnia stawkę od przegranego.

Grając (i wygrywając) daną postacią w `/papier-kamień-nożyce`, buduje się jej **więź** - 7 postaci ma przypisaną na stałe jedną komendę ekonomii, w której odblokowują kolejne bonusy wraz z poziomem więzi (1-10, liczonym z sumy Solid Dice zdobytych tą postacią w tej grze):

| Postać | Komenda |
|---|---|
| Nanally | `/wyścig` |
| Hotori | `/mahjong` |
| Lacrimosa | `/automat` |
| Chaos | `/łowienie` |
| Sakiri | `/daily` |
| Fadia | `/work` |
| Chiz | `/pinkpawsheist` |

Poziomy kumulują się - na poziomie N aktywne są bonusy wszystkich poziomów 1..N naraz, nie tylko najwyższego osiągniętego. Poziomy 1-9 dają rosnące bonusy specyficzne dla przypisanej komendy (dodatkowe Solid Dice, krótszy cooldown, szansa na bonusową nagrodę), a poziom 10 jest wspólny dla wszystkich postaci - startowy punkt w `/papier-kamień-nożyce`. Pełną listę poziomów i własny postęp sprawdzisz w `/bond`, a wszystkie aktualnie aktywne bonusy (więź + skin) naraz w `/bonusy`.

Dodatkowo: każda nagroda Solid Dice z komendy ekonomii (`/daily`, `/work`, `/pinkpawsheist`, `/wyścig`, `/łowienie`, `/automat`, `/mahjong`) ma **20% szans**, że cała trafi też - obok zwykłego zasilenia konta - do więzi losowej postaci, którą aktualnie posiadasz w `/plecak`.

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
