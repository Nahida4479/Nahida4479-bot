// Strażnik failover Nest <-> Raspberry Pi. Uruchamiać TYLKO na Raspberry Pi,
// jako osobny proces pm2 (nie w bot.js!) - np.: pm2 start watchdog.js --name Nahida-watchdog
//
// Zasada działania: bot.js (identyczny na Neście i na Pi) zapisuje co ~15s znacznik
// czasu do wspólnej bazy Turso pod kluczem "instancja" = instance_name z .env
// ("nest" na Neście, "pi" na Raspberry Pi). Ten skrypt co PROG_SPRAWDZANIA_MS
// sprawdza znacznik wiersza "nest":
//   - jeśli świeży (< PROG_AWARII_MS) i bot na Pi akurat działa -> zatrzymuje go (failback)
//   - jeśli nieświeży (Nest padł) i bot na Pi nie działa -> uruchamia go (failover)
// W obu przypadkach wysyła maila z informacją o zmianie stanu (nie przy każdym
// sprawdzeniu - tylko przy faktycznej zmianie).
//
// Wymagane zmienne środowiskowe (ten sam .env co bot.js na Pi):
//   url_db, token_db        - te same co w bot.js (wspólna baza z Nestem)
//   email_user              - adres Gmail, z którego wysyłane są maile
//   email_pass              - "hasło aplikacji" Gmail (https://myaccount.google.com/apppasswords)
//   email_do                - adres odbiorcy powiadomień (bez tego watchdog nie wyśle maila)
// Opcjonalne:
//   bot_dir                 - katalog z bot.js na Pi (domyślnie katalog, w którym leży ten plik watchdog.js -
//                             bot.js i watchdog.js zawsze są w tym samym repo, więc nie trzeba tego ustawiać
//                             ręcznie i nazwa/lokalizacja katalogu repo może się zmieniać bez psucia watchdoga)
//   pm2_process_name        - nazwa procesu pm2 dla bota (domyślnie kopia-nest). UWAGA: musi to być
//                             nazwa dedykowana wyłącznie procesowi bot.js z TEGO repo (Nahida4479-bot) -
//                             jeśli na Pi działają inne, niepowiązane boty pod pm2, ich nazwa nie może
//                             się pokrywać z tą wartością, bo watchdog może tym procesem zarządzać
//                             (restartować/zatrzymywać/usuwać i tworzyć od nowa).

import { setDefaultResultOrder } from "node:dns";
import { createClient } from "@libsql/client";
import { execSync } from "node:child_process";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import "dotenv/config";

// Patrz komentarz w bot.js - część hostingów ma niedziałający wychodzący IPv6,
// co bez tego objawia się jako ConnectTimeoutError mimo sprawnego IPv4.
setDefaultResultOrder("ipv4first");

const PROG_AWARII_MS = 60 * 1000; // Nest uznany za martwy po tylu ms bez heartbeatu
const PROG_SPRAWDZANIA_MS = 20 * 1000; // co ile watchdog sprawdza stan

// Domyślnie katalog tego pliku - watchdog.js zawsze leży obok bot.js w tym samym
// repo, więc to jest odporne na zmianę nazwy/lokalizacji katalogu repo na Pi
// (w przeciwieństwie do sztywno wpisanej ścieżki).
const BOT_DIR = process.env.bot_dir || dirname(fileURLToPath(import.meta.url));
const NAZWA_PROCESU = process.env.pm2_process_name || "kopia-nest";
const EMAIL_DO = process.env.email_do || null;

console.log(`[watchdog] Katalog bota (bot_dir): ${BOT_DIR}`);
console.log(`[watchdog] Zarządzana nazwa procesu pm2 (pm2_process_name): ${NAZWA_PROCESU}`);
if (!existsSync(join(BOT_DIR, "bot.js"))) {
    console.error(`[watchdog] UWAGA: nie znaleziono ${join(BOT_DIR, "bot.js")} - watchdog uruchomi pm2 z niewłaściwego katalogu. Ustaw poprawną ścieżkę w zmiennej bot_dir w .env.`);
}

if (!EMAIL_DO) {
    console.warn("[watchdog] Brak email_do w .env - powiadomienia mailowe o awarii/powrocie nie będą wysyłane.");
}

const db = createClient({
    url: process.env.url_db,
    authToken: process.env.token_db,
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.email_user,
        pass: process.env.email_pass,
    },
});

async function wyslijMaila(temat, tresc) {
    if (!EMAIL_DO) return;
    try {
        await transporter.sendMail({
            from: process.env.email_user,
            to: EMAIL_DO,
            subject: temat,
            text: tresc,
        });
        console.log(`[watchdog] Wysłano maila: ${temat}`);
    } catch (err) {
        console.error("[watchdog] Błąd wysyłki maila:", err);
    }
}

function informacjeOProcesie(nazwa) {
    try {
        const wyjscie = execSync("pm2 jlist").toString();
        const lista = JSON.parse(wyjscie);
        return lista.find((p) => p.name === nazwa) || null;
    } catch (err) {
        console.error("[watchdog] Błąd odczytu statusu pm2:", err);
        return null;
    }
}

// Proces pm2 o tej nazwie liczy się jako "prawdziwie działający bot" tylko
// wtedy, gdy jest online I wskazuje na aktualny katalog repo (BOT_DIR). Sam
// status "online" nie wystarczy - inna, stara rejestracja o tej samej nazwie
// (np. sprzed przeniesienia repo na inny katalog) mogłaby zmylić watchdoga,
// który uznałby, że bot działa, podczas gdy w rzeczywistości działa zombie
// proces ze starego, nieaktualnego katalogu.
function botDziala() {
    const proc = informacjeOProcesie(NAZWA_PROCESU);
    return !!proc && proc.pm2_env.status === "online" && proc.pm2_env.pm_cwd === BOT_DIR;
}

function uruchomBota() {
    if (botDziala()) return;
    const proc = informacjeOProcesie(NAZWA_PROCESU);
    try {
        if (proc && proc.pm2_env.pm_cwd !== BOT_DIR) {
            console.warn(`[watchdog] Proces pm2 "${NAZWA_PROCESU}" wskazuje na inny katalog (${proc.pm2_env.pm_cwd}) niż aktualny (${BOT_DIR}) - usuwam starą rejestrację i uruchamiam od nowa z właściwego katalogu.`);
            execSync(`pm2 delete ${NAZWA_PROCESU}`);
            execSync(`pm2 start bot.js --name ${NAZWA_PROCESU}`, { cwd: BOT_DIR });
        } else if (!proc) {
            execSync(`pm2 start bot.js --name ${NAZWA_PROCESU}`, { cwd: BOT_DIR });
        } else {
            execSync(`pm2 restart ${NAZWA_PROCESU}`);
        }
        console.log("[watchdog] Bot na Raspberry Pi uruchomiony.");
    } catch (err) {
        console.error("[watchdog] Błąd uruchamiania bota:", err);
    }
}

function zatrzymajBota() {
    if (!botDziala()) return;
    try {
        execSync(`pm2 stop ${NAZWA_PROCESU}`);
        console.log("[watchdog] Bot na Raspberry Pi zatrzymany.");
    } catch (err) {
        console.error("[watchdog] Błąd zatrzymywania bota:", err);
    }
}

// Stan startowy odczytany z rzeczywistego statusu pm2 (a nie założony), żeby
// restart samego watchdoga nie wywołał zbędnej zmiany stanu/maila.
let piAktywny = botDziala();
console.log(`[watchdog] Start. Stan początkowy bota na Pi: ${piAktywny ? "aktywny" : "nieaktywny"}.`);

async function sprawdz() {
    try {
        const wynik = await db.execute("SELECT ostatnie_bicie FROM bot_heartbeat WHERE instancja = 'nest'");

        // Brak wiersza (np. świeża instalacja, Nest jeszcze nie zdążył zapisać
        // pierwszego heartbeatu) traktujemy jako "nieznany, ale nie awaria" -
        // żeby watchdog nie odpalił bota na Pi od razu przy pierwszym uruchomieniu.
        const zdrowy = wynik.rows.length === 0
            ? true
            : Date.now() - Number(wynik.rows[0].ostatnie_bicie) < PROG_AWARII_MS;

        if (!zdrowy && !piAktywny) {
            uruchomBota();
            piAktywny = true;
            const minutOd = Math.round((Date.now() - Number(wynik.rows[0].ostatnie_bicie)) / 60000);
            await wyslijMaila(
                "🔴 Awaria bota Nahida4479 na Nest",
                `Bot na Nest nie zgłasza się od ok. ${minutOd} min.\n\nBot zapasowy na Raspberry Pi został automatycznie uruchomiony i przejął obsługę serwera.`
            );
        } else if (zdrowy && piAktywny) {
            zatrzymajBota();
            piAktywny = false;
            await wyslijMaila(
                "🟢 Nest wrócił do działania - bot Nahida4479",
                "Bot na Nest znów zgłasza się poprawnie.\n\nBot zapasowy na Raspberry Pi został automatycznie zatrzymany - Nest przejął z powrotem obsługę serwera."
            );
        }
    } catch (err) {
        console.error("[watchdog] Błąd sprawdzania stanu:", err);
    }
}

console.log(`[watchdog] Sprawdzanie co ${PROG_SPRAWDZANIA_MS / 1000}s, próg awarii ${PROG_AWARII_MS / 1000}s.`);
sprawdz();
setInterval(sprawdz, PROG_SPRAWDZANIA_MS);
