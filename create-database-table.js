import { createClient } from "@libsql/client";
import "dotenv/config";

export const db = createClient({
    url: process.env.url_db,
    authToken: process.env.token_db,
});

export async function initDB() {
    try {
        await db.execute(`CREATE TABLE IF NOT EXISTS ekonomia (
            user_id TEXT, 
            guild_id TEXT, 
            solid_dice INTEGER DEFAULT 0, 
            solid_dice_total INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, guild_id)
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS ekwipunek (
            user_id TEXT, 
            guild_id TEXT, 
            item_nazwa TEXT, 
            ilosc INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, guild_id, item_nazwa)
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS postacie (
            user_id TEXT, 
            guild_id TEXT, 
            postac TEXT, 
            ilosc INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, guild_id, postac)
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS cooldowny (
            user_id TEXT, 
            guild_id TEXT, 
            komenda TEXT, 
            ostatnio INTEGER,
            PRIMARY KEY (user_id, guild_id, komenda)
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS serwery (
            guild_id TEXT PRIMARY KEY,
            kanal_id TEXT
        )`);

        try {
            await db.execute(`ALTER TABLE serwery ADD COLUMN nastepny_mammon INTEGER`);
        } catch (err) {
            // kolumna już istnieje - baza była utworzona przed dodaniem harmonogramu Mammona
        }
        await db.execute(`CREATE TABLE IF NOT EXISTS ustawienia (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            animacja_roll INTEGER DEFAULT 1,
            animacja_plecak INTEGER DEFAULT 1,
            animacja_kawiarnia INTEGER DEFAULT 1,
            PRIMARY KEY (user_id, guild_id)
        )`);

        try {
            await db.execute(`ALTER TABLE ustawienia ADD COLUMN animacja_kawiarnia INTEGER DEFAULT 1`);
        } catch (err) {
            // kolumna już istnieje - baza była utworzona przed dodaniem animacji kawiarni
        }

        await db.execute(`CREATE TABLE IF NOT EXISTS administracja (
            guild_id TEXT PRIMARY KEY,
            rola_id TEXT
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS cooldown_bypass (
            user_id TEXT,
            guild_id TEXT,
            PRIMARY KEY (user_id, guild_id)
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS skiny (
            plik TEXT PRIMARY KEY,
            nazwa TEXT NOT NULL
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS skiny_gracza (
            user_id TEXT,
            guild_id TEXT,
            plik TEXT,
            PRIMARY KEY (user_id, guild_id, plik)
        )`);

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
            await db.execute({
                sql: "INSERT INTO skiny (plik, nazwa) VALUES (?, ?) ON CONFLICT(plik) DO NOTHING",
                args: [plik, nazwa],
            });
        }

        console.log("Baza danych turso działa poprawnie");
    } catch (err) {
        console.error("Błąd podczas tworzenia tabel:", err);
    }
}