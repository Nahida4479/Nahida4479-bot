import { createClient } from "@libsql/client";
import "dotenv/config";

export const db = createClient({
    url: process.env.url_db,
    authToken: process.env.token_db,
});

// Każdy krok osobno w try/catch - żeby awaria jednej tabeli nie przerywała
// w milczeniu tworzenia/aktualizowania reszty.
async function bezpiecznie(opis, fn) {
    try {
        await fn();
    } catch (err) {
        console.error(`Błąd inicjalizacji bazy (${opis}):`, err);
    }
}

// Wersja bez logowania - do ALTER TABLE ADD COLUMN, które celowo zawsze zawodzi
// po pierwszym uruchomieniu (kolumna już istnieje) - to nie jest błąd wart uwagi.
async function cicho(fn) {
    try {
        await fn();
    } catch (err) {
        // oczekiwane - kolumna/zmiana już istnieje z poprzedniego uruchomienia
    }
}

export async function initDB() {
    await bezpiecznie("tabela ekonomia", () => db.execute(`CREATE TABLE IF NOT EXISTS ekonomia (
        user_id TEXT,
        guild_id TEXT,
        solid_dice INTEGER DEFAULT 0,
        solid_dice_total INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
    )`));

    await bezpiecznie("tabela ekwipunek", () => db.execute(`CREATE TABLE IF NOT EXISTS ekwipunek (
        user_id TEXT,
        guild_id TEXT,
        item_nazwa TEXT,
        ilosc INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id, item_nazwa)
    )`));

    await bezpiecznie("tabela postacie", () => db.execute(`CREATE TABLE IF NOT EXISTS postacie (
        user_id TEXT,
        guild_id TEXT,
        postac TEXT,
        ilosc INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id, postac)
    )`));

    await bezpiecznie("tabela cooldowny", () => db.execute(`CREATE TABLE IF NOT EXISTS cooldowny (
        user_id TEXT,
        guild_id TEXT,
        komenda TEXT,
        ostatnio INTEGER,
        powiadomiono INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id, komenda)
    )`));

    await cicho(() => db.execute(`ALTER TABLE cooldowny ADD COLUMN powiadomiono INTEGER DEFAULT 0`));

    await bezpiecznie("tabela powiadomienia_cooldown", () => db.execute(`CREATE TABLE IF NOT EXISTS powiadomienia_cooldown (
        user_id TEXT,
        guild_id TEXT,
        PRIMARY KEY (user_id, guild_id)
    )`));

    await bezpiecznie("tabela serwery", () => db.execute(`CREATE TABLE IF NOT EXISTS serwery (
        guild_id TEXT PRIMARY KEY,
        kanal_id TEXT
    )`));

    await cicho(() => db.execute(`ALTER TABLE serwery ADD COLUMN nastepny_mammon INTEGER`));

    await bezpiecznie("tabela ustawienia", () => db.execute(`CREATE TABLE IF NOT EXISTS ustawienia (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        animacja_roll INTEGER DEFAULT 1,
        animacja_plecak INTEGER DEFAULT 1,
        animacja_kawiarnia INTEGER DEFAULT 1,
        PRIMARY KEY (user_id, guild_id)
    )`));

    await cicho(() => db.execute(`ALTER TABLE ustawienia ADD COLUMN animacja_kawiarnia INTEGER DEFAULT 1`));

    await bezpiecznie("tabela administracja", () => db.execute(`CREATE TABLE IF NOT EXISTS administracja (
        guild_id TEXT PRIMARY KEY,
        rola_id TEXT
    )`));

    await bezpiecznie("tabela cooldown_bypass", () => db.execute(`CREATE TABLE IF NOT EXISTS cooldown_bypass (
        user_id TEXT,
        guild_id TEXT,
        PRIMARY KEY (user_id, guild_id)
    )`));

    await bezpiecznie("tabela nteleaderboard_blokada", () => db.execute(`CREATE TABLE IF NOT EXISTS nteleaderboard_blokada (
        user_id TEXT,
        guild_id TEXT,
        PRIMARY KEY (user_id, guild_id)
    )`));

    await bezpiecznie("tabela skiny", () => db.execute(`CREATE TABLE IF NOT EXISTS skiny (
        plik TEXT PRIMARY KEY,
        nazwa TEXT NOT NULL,
        cena_aktualna INTEGER,
        nastepna_zmiana_ceny INTEGER
    )`));

    await cicho(() => db.execute(`ALTER TABLE skiny ADD COLUMN cena_aktualna INTEGER`));
    await cicho(() => db.execute(`ALTER TABLE skiny ADD COLUMN nastepna_zmiana_ceny INTEGER`));

    await bezpiecznie("tabela skiny_gracza", () => db.execute(`CREATE TABLE IF NOT EXISTS skiny_gracza (
        user_id TEXT,
        guild_id TEXT,
        plik TEXT,
        PRIMARY KEY (user_id, guild_id, plik)
    )`));

    await bezpiecznie("tabela profil_wybrany_skin", () => db.execute(`CREATE TABLE IF NOT EXISTS profil_wybrany_skin (
        user_id TEXT,
        guild_id TEXT,
        plik TEXT,
        PRIMARY KEY (user_id, guild_id)
    )`));

    const startoweSkiny = [
        ["Nanally_skin.jpg", "Nanally"],
        ["Nanally3.jpg", "Nanally"],
        ["Nanally4.jpg", "Nanally"],
        ["Nanally5.jpg", "Nanally"],
        ["Chiz2.jpg", "Chiz"],
        ["Chiz3.jpg", "Chiz"],
        ["Daffodill2.jpg", "Daffodill"],
        ["Fadia2.jpg", "Fadia"],
        ["Hotori3.jpg", "Hotori"],
        ["Jiuyuan2.jpg", "Jiuyuan"],
        ["Mint1.jpg", "Mint"],
        ["Mint3.jpg", "Mint"],
        ["Sakiri2.jpg", "Sakiri"],
        ["m_mc1.jpg", "MC"],
        ["m_mc2.jpg", "MC"],
        ["m_mc3.jpg", "MC"],
        ["m_mc4.jpg", "MC"],
        ["m_mc5.jpg", "MC"],
    ];

    for (const [plik, nazwa] of startoweSkiny) {
        await bezpiecznie(`seed skina ${plik}`, () => db.execute({
            sql: "INSERT INTO skiny (plik, nazwa) VALUES (?, ?) ON CONFLICT(plik) DO NOTHING",
            args: [plik, nazwa],
        }));
    }

    console.log("Baza danych turso działa poprawnie");
}