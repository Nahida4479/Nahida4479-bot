// Ciągła weryfikacja łączności z Discordem i bazą Turso, niezależna od bota -
// zostaw odpalone w tle (pm2 albo po prostu w screen/tmux) przez kilka-kilkanaście
// minut, żeby zebrać konkretne dane o tym jak często/jak długo trwają zerwania
// połączenia. Przyda się jako dowód przy zgłoszeniu do supportu hostingu.
// Uruchom: node network-check.mjs   (zatrzymaj Ctrl+C)
import { createClient } from "@libsql/client";
import "dotenv/config";

const db = createClient({
    url: process.env.url_db,
    authToken: process.env.token_db,
});

function znacznikCzasu() {
    return new Date().toISOString().slice(11, 19);
}

async function sprawdzDiscorda() {
    const start = Date.now();
    try {
        const odpowiedz = await fetch("https://discord.com/api/v10/gateway", { signal: AbortSignal.timeout(10000) });
        console.log(`[${znacznikCzasu()}] Discord: ✅ OK (${Date.now() - start}ms, status ${odpowiedz.status})`);
    } catch (err) {
        console.log(`[${znacznikCzasu()}] Discord: ❌ BŁĄD po ${Date.now() - start}ms - ${err.message}`);
    }
}

async function sprawdzBaze() {
    const start = Date.now();
    try {
        await db.execute("SELECT 1");
        console.log(`[${znacznikCzasu()}] Baza:    ✅ OK (${Date.now() - start}ms)`);
    } catch (err) {
        console.log(`[${znacznikCzasu()}] Baza:    ❌ BŁĄD po ${Date.now() - start}ms - ${err.message}`);
    }
}

console.log("Sprawdzanie połączenia z Discordem i bazą co 5s. Ctrl+C żeby zatrzymać.\n");
sprawdzDiscorda();
sprawdzBaze();
setInterval(() => {
    sprawdzDiscorda();
    sprawdzBaze();
}, 5000);
