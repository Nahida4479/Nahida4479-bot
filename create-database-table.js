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
        await db.execute(`CREATE TABLE IF NOT EXISTS ustawienia (
            user_id TEXT NOT NULL, 
            guild_id TEXT NOT NULL, 
            animacja_roll INTEGER DEFAULT 1, 
            animacja_plecak INTEGER DEFAULT 1, 
            PRIMARY KEY (user_id, guild_id)
        )`);

        console.log("Baza danych turso działa poprawnie");
    } catch (err) {
        console.error("Błąd podczas tworzenia tabel:", err);
    }
}