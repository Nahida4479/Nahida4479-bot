// Szybki, niezależny test połączenia z Turso - nie dotyka reszty bota.
// Uruchom na Raspberry Pi: node test-db-connection.mjs
// Po sprawdzeniu możesz ten plik usunąć.
import { createClient } from "@libsql/client";
import "dotenv/config";

console.log("url_db:", process.env.url_db ? process.env.url_db.replace(/(:\/\/)(.{6}).*(.{4})$/, "$1$2...$3") : "❌ BRAK (nie ustawione w .env)");
console.log("token_db:", process.env.token_db ? `ustawiony, długość ${process.env.token_db.length} znaków` : "❌ BRAK (nie ustawione w .env)");

if (!process.env.url_db || !process.env.token_db) {
    console.log("\n❌ Brakuje url_db lub token_db w .env - to na 100% jest przyczyna błędu.");
    process.exit(1);
}

const db = createClient({
    url: process.env.url_db,
    authToken: process.env.token_db,
});

try {
    console.log("\nPróbuję wykonać proste zapytanie (SELECT 1)...");
    const wynik = await db.execute("SELECT 1 AS test");
    console.log("✅ Połączenie działa! Wynik:", wynik.rows);

    console.log("\nSprawdzam, czy tabela bot_heartbeat istnieje...");
    const tabele = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bot_heartbeat'");
    console.log(tabele.rows.length > 0 ? "✅ Tabela bot_heartbeat istnieje." : "⚠️ Tabela bot_heartbeat NIE istnieje - initDB() jeszcze jej nie stworzył albo coś przerwało jego działanie.");

    console.log("\nSprawdzam PRAGMA table_info(bot_heartbeat) (czy 'instancja' ma PRIMARY KEY)...");
    if (tabele.rows.length > 0) {
        const kolumny = await db.execute("PRAGMA table_info(bot_heartbeat)");
        console.log(kolumny.rows);
    }
} catch (err) {
    console.log("\n❌ Połączenie / zapytanie nie powiodło się:");
    console.error(err);
}
