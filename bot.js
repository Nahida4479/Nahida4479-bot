// token_bot token_db url_db
import { createClient } from "@libsql/client";
import "dotenv/config";
import { existsSync } from "fs";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from "discord.js"
import { db, initDB } from "./create-database-table.js";
import { rozpocznijMajong } from "./majong.js";

const OWNER_IDS = ["1096839401524445264", "339487125684617227", "897497223380762624", "663480441772310556"  ]; // Nahida, Mia, Mlufka, Wieszak

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,

    ],
});

client.once("ready", async () => {
    await initDB();
    console.log(`Login in as ${client.user.tag}`);

    const rest = new REST ({ version: "10"}).setToken(process.env.token_bot);
    const commands = [
        new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Odbierz Solid Dice"),

        new SlashCommandBuilder()
        .setName("work")
        .setDescription("Odbierz Solid Dice"),

        new SlashCommandBuilder()
        .setName("pinkpawsheist")
        .setDescription("Bierzesz udział w wydarzeniu - Pink Paws Heist"),

        new SlashCommandBuilder()
        .setName("kawiarnia")
        .setDescription("Odbierz Solid Dice z kawiarni"),

        new SlashCommandBuilder()
        .setName("wyścig")
        .setDescription("Ścigaj się i omijaj przeszkody aby zdobyć Solid Dice"),

        new SlashCommandBuilder()
        .setName("mahjong")
        .setDescription("Zagraj w Mahjonga NTE - solo z botami lub multiplayer do 4 osób"),

        // new SlashCommandBuilder()
        // .setName("delivery")
        // .setDescription("Wykonaj dostawę aby odebrać Solid Dice"),

        new SlashCommandBuilder()
        .setName("łowienie")
        .setDescription("Zacznij łowić aby zdobyć Solid Dice"),

        new SlashCommandBuilder()
        .setName("ntegra")
        .setDescription("Ustaw kanał gry - Nte Gra")
        .addChannelOption((opt) =>
            opt.setName("kanal").setDescription("Wybierz kanał").setRequired(true).addChannelTypes(ChannelType.GuildText)
        ),

        new SlashCommandBuilder()
        .setName("administracja")
        .setDescription("Ustaw role które mogą zarządzać botem")
        .addRoleOption((opt) =>
            opt.setName("rola").setDescription("Wybierz rolę").setRequired(true)
        ),

        new SlashCommandBuilder()
        .setName("removecooldown")
        .setDescription("Usuwa cooldown nakładany przez system gry")
        .addUserOption((opt) =>
            opt.setName("user").setDescription("Użytkownik").setRequired(true)
        ),

        new SlashCommandBuilder()
        .setName("nteleaderboard")
        .setDescription("Tabela wyświetlające graczy według łącznej sumy zdobytych Solid Dice"),

        new SlashCommandBuilder()
        .setName("roll")
        .setDescription("Wylosuj przedmioty"),

        new SlashCommandBuilder()
        .setName("plecak")
        .setDescription("Sprawdź swój plecak"),

        new SlashCommandBuilder()
        .setName("skiny")
        .setDescription("Kup skiny postaci za Solid Dice"),

        new SlashCommandBuilder()
        .setName("addskin")
        .setDescription("[Administracja bota] Dodaj lub zaktualizuj skin w /skiny")
        .addStringOption((opt) =>
            opt.setName("plik").setDescription("Nazwa pliku w Gra/skins (np. Nanally3.jpg)").setRequired(true)
        )
        .addStringOption((opt) =>
            opt.setName("nazwa").setDescription("Nazwa postaci wyświetlana w /skiny").setRequired(true)
        ),

        new SlashCommandBuilder()
        .setName("mammonevent")
        .setDescription("[Administracja bota] Natychmiast przywołaj Mammona na kanale ustawionym w /ntegra"),

        // new SlashCommandBuilder()
        // .setName("wymiana")
        // .setDescription("Wymień itemy na Solid Dice")
        // .addStringOption((opt) =>
        //     opt.setName("rzadkosc")
        //         .setDescription("Wybierz rzadkość")
        //         .setRequired(true)
        //         .addChoices(
        //             { name: "Epicki", value: "epicki" },
        //             { name: "Rzadki", value: "rzadki" },
        //             { name: "Zwykły", value: "zwykly" },
        //             { name: "Wszystkie", value: "all" },
        //         )
        // ),

        new SlashCommandBuilder()
        .setName("animacje")
        .setDescription("Włącz lub wyłącz animacje"),

        new SlashCommandBuilder()
        .setName("pingcooldown")
        .setDescription("Włącz/wyłącz oznaczanie Cię, gdy zakończy się cooldown na jedną z Twoich komend"),

        new SlashCommandBuilder()
        .setName("help")
        .setDescription("Poradnik komend ekonomii - nagrody, straty, cooldowny i wideo"),



    ].map((cmd) => cmd.toJSON());

    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Komendy zarejestrowane")

    setInterval(async () => {
        try {
            // Termin kolejnego spawnu trzymamy w bazie (nie w pamięci) - inaczej każdy
            // restart bota (deploy, crash, pm2 restart) zerowałby odliczanie i ustawiał
            // nowe losowe 12-24h od nowa, przez co Mammon mógłby nigdy się nie zrespić
            // samoistnie przy częstych restartach.
            const serweryWynik = await db.execute("SELECT guild_id, kanal_id, nastepny_mammon FROM serwery WHERE kanal_id IS NOT NULL");
            const teraz = Date.now();

            for (const row of serweryWynik.rows) {
                const guildId = row.guild_id;
                const nastepnySpawn = row.nastepny_mammon ? Number(row.nastepny_mammon) : null;

                if (!nastepnySpawn) {
                    await db.execute({
                        sql: "UPDATE serwery SET nastepny_mammon = ? WHERE guild_id = ?",
                        args: [teraz + losowyOdstepSpawnuMammona(), guildId],
                    });
                    continue;
                }

                if (teraz < nastepnySpawn || aktywneMammony.has(guildId)) continue;

                await db.execute({
                    sql: "UPDATE serwery SET nastepny_mammon = ? WHERE guild_id = ?",
                    args: [teraz + losowyOdstepSpawnuMammona(), guildId],
                });

                const kanal = await client.channels.fetch(row.kanal_id).catch(() => null);
                if (kanal) await odpalMammona(guildId, kanal);
            }
        } catch (err) {
            console.error("Błąd harmonogramu Mammona:", err);
        }
    }, 10 * 60 * 1000);

    setInterval(async () => {
        try {
            // Tylko cooldowny osób, które włączyły /pinkcooldown - unika przeglądania
            // cooldownów wszystkich graczy co 30 sekund.
            const wynik = await db.execute(`
                SELECT c.user_id, c.guild_id, c.komenda, c.ostatnio
                FROM cooldowny c
                JOIN powiadomienia_cooldown p ON p.user_id = c.user_id AND p.guild_id = c.guild_id
                WHERE c.powiadomiono = 0
            `);
            const teraz = Date.now();
            const doWyslania = new Map();

            for (const row of wynik.rows) {
                const cooldownMs = KOMENDY_COOLDOWN_MS[row.komenda];
                if (!cooldownMs) continue;
                if (teraz - Number(row.ostatnio) < cooldownMs) continue;

                await db.execute({
                    sql: "UPDATE cooldowny SET powiadomiono = 1 WHERE user_id = ? AND guild_id = ? AND komenda = ?",
                    args: [row.user_id, row.guild_id, row.komenda],
                });

                const klucz = `${row.guild_id}:${row.user_id}`;
                if (!doWyslania.has(klucz)) doWyslania.set(klucz, { guildId: row.guild_id, userId: row.user_id, komendy: [] });
                doWyslania.get(klucz).komendy.push(row.komenda);
            }

            for (const { guildId, userId, komendy } of doWyslania.values()) {
                const serwerWynik = await db.execute({
                    sql: "SELECT kanal_id FROM serwery WHERE guild_id = ?",
                    args: [guildId],
                });
                const kanalId = serwerWynik.rows[0]?.kanal_id;
                if (!kanalId) continue;

                const kanal = await client.channels.fetch(kanalId).catch(() => null);
                if (!kanal) continue;

                const lista = komendy.map((k) => `\`/${k}\``).join(", ");
                await kanal.send({ content: `🔔 <@${userId}> Twój cooldown na ${lista} właśnie się zakończył!` }).catch(() => {});
            }
        } catch (err) {
            console.error("Błąd harmonogramu powiadomień /pingcooldown:", err);
        }
    }, 30 * 1000);
});

client.login(process.env.token_bot);

process.on('unhandledRejection', (reason) => {
    console.error('Nieobsłużone odrzucenie:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Krytyczny błąd bota:', error);
});

async function czyMaBypassCooldown(userId, guildId) {
    const wynik = await db.execute({
        sql: "SELECT 1 FROM cooldown_bypass WHERE user_id = ? AND guild_id = ?",
        args: [userId, guildId],
    });
    return wynik.rows.length > 0;
}

// Jedno miejsce z czasami cooldownów - używane przy sprawdzaniu w checkcooldown
// oraz przez harmonogram powiadomień /pinkcooldown, żeby wiedzieć kiedy dany
// cooldown realnie się kończy bez duplikowania tych liczb w dwóch miejscach.
const KOMENDY_COOLDOWN_MS = {
    daily: 24 * 60 * 60 * 1000,
    work: 10 * 60 * 1000,
    pinkpawsheist: 48 * 60 * 60 * 1000,
    "wyścig": 30 * 60 * 1000,
    "łowienie": 10 * 60 * 1000,
    mahjong: 60 * 60 * 1000,
};

async function checkcooldown(userId, guildId, komenda, cooldownMs) {
    if (await czyMaBypassCooldown(userId, guildId)) return null;

    const teraz = Date.now();
    const wynik = await db.execute({
        sql: "SELECT ostatnio FROM cooldowny WHERE user_id = ? AND guild_id = ? AND komenda = ?",
        args: [userId, guildId, komenda],
    });
    if (wynik.rows.length > 0) {
        const ostatnio = Number(wynik.rows[0].ostatnio);
        const roznica = teraz - ostatnio;
        if (roznica < cooldownMs) {
            const pozostalo =  cooldownMs - roznica;
            const godziny = Math.floor(pozostalo / 3600000)
            const minuty = Math.floor((pozostalo % 3600000) / 60000);
            const sekundy = Math.floor((pozostalo % 60000) / 1000);
            return `**❗Poczekaj jeszcze:** \`${godziny}h ${minuty}m ${sekundy}s\``;
        }
    }

    await db.execute({
        sql: "INSERT INTO cooldowny (user_id, guild_id, komenda, ostatnio, powiadomiono) VALUES (?, ?, ?, ?, 0) ON CONFLICT(user_id, guild_id, komenda) DO UPDATE SET ostatnio = ?, powiadomiono = 0",
        args: [userId, guildId, komenda, teraz, teraz]
    });

    return null;
}

// Uprawnienia administracyjne bota - właściciele bota, osoby z uprawnieniem
// Administrator na danym serwerze, oraz osoby z rolą ustawioną przez /administracja
async function czyAdministratorBota(interaction) {
    if (OWNER_IDS.includes(interaction.user.id)) return true;
    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;

    const wynik = await db.execute({
        sql: "SELECT rola_id FROM administracja WHERE guild_id = ?",
        args: [interaction.guild.id],
    });
    if (wynik.rows.length === 0) return false;

    const rolaId = wynik.rows[0].rola_id;
    return rolaId ? interaction.member.roles.cache.has(rolaId) : false;
}


//Solid Dice

async function addSolidDice(userId, guildId, ilosc) {
    await db.execute({
        sql: "INSERT INTO ekonomia (user_id, guild_id, solid_dice, solid_dice_total) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, guild_id) DO UPDATE SET solid_dice = solid_dice + ?, solid_dice_total = solid_dice_total + ?",
        args: [userId, guildId, ilosc, ilosc, ilosc, ilosc],
    });
}

async function getSolidDice(userId, guildId) {
    const portfel = await db.execute({
        sql: "SELECT solid_dice FROM ekonomia WHERE user_id = ? AND guild_id = ?",
        args: [userId, guildId],
    });
    return portfel.rows.length > 0 ? Number(portfel.rows[0].solid_dice) : 0;
}

// Skiny postaci

const CENA_SKINA = 100;

async function getKatalogSkinow() {
    const wynik = await db.execute("SELECT plik, nazwa FROM skiny ORDER BY nazwa ASC, plik ASC");
    return wynik.rows;
}

async function getPosiadaneSkiny(userId, guildId) {
    const wynik = await db.execute({
        sql: "SELECT plik FROM skiny_gracza WHERE user_id = ? AND guild_id = ?",
        args: [userId, guildId],
    });
    return new Set(wynik.rows.map(r => r.plik));
}

async function getPosiadaneSkinyZNazwami(userId, guildId) {
    const wynik = await db.execute({
        sql: `SELECT s.plik, s.nazwa FROM skiny_gracza sg
              JOIN skiny s ON s.plik = sg.plik
              WHERE sg.user_id = ? AND sg.guild_id = ?
              ORDER BY s.nazwa ASC, s.plik ASC`,
        args: [userId, guildId],
    });
    return wynik.rows;
}

async function kupSkina(userId, guildId, plik) {
    const posiadane = await getPosiadaneSkiny(userId, guildId);
    if (posiadane.has(plik)) return { sukces: false, powod: "posiadasz" };

    const solidDice = await getSolidDice(userId, guildId);
    if (solidDice < CENA_SKINA) return { sukces: false, powod: "brak_srodkow" };

    await db.execute({
        sql: "UPDATE ekonomia SET solid_dice = solid_dice - ? WHERE user_id = ? AND guild_id = ?",
        args: [CENA_SKINA, userId, guildId],
    });

    try {
        await db.execute({
            sql: "INSERT INTO skiny_gracza (user_id, guild_id, plik) VALUES (?, ?, ?)",
            args: [userId, guildId, plik],
        });
    } catch (err) {
        // ktoś kupił ten sam skin w tej samej chwili - zwróć Solid Dice
        await addSolidDice(userId, guildId, CENA_SKINA);
        return { sukces: false, powod: "posiadasz" };
    }

    return { sukces: true };
}

// Kawiarnia - produkuje 1 Solid Dice na godzinę, magazyn max 48

const KAWIARNIA_MAX_GODZIN = 48;
const KAWIARNIA_GODZINA_MS = 60 * 60 * 1000;

async function getKawiarniaOstatnio(userId, guildId) {
    const wynik = await db.execute({
        sql: "SELECT ostatnio FROM cooldowny WHERE user_id = ? AND guild_id = ? AND komenda = ?",
        args: [userId, guildId, "kawiarnia_produkcja"],
    });

    if (wynik.rows.length === 0) {
        const teraz = Date.now();
        await db.execute({
            sql: "INSERT INTO cooldowny (user_id, guild_id, komenda, ostatnio) VALUES (?, ?, ?, ?)",
            args: [userId, guildId, "kawiarnia_produkcja", teraz],
        });
        return teraz;
    }

    return Number(wynik.rows[0].ostatnio);
}

function obliczKawiarnie(ostatnio) {
    const teraz = Date.now();
    const godzinyPelne = Math.floor((teraz - ostatnio) / KAWIARNIA_GODZINA_MS);
    const dostepne = Math.min(godzinyPelne, KAWIARNIA_MAX_GODZIN);
    return { dostepne, godzinyPelne, teraz };
}

async function odbierzKawiarnie(userId, guildId) {
    const ostatnio = await getKawiarniaOstatnio(userId, guildId);
    const { dostepne, godzinyPelne, teraz } = obliczKawiarnie(ostatnio);

    if (dostepne <= 0) return { dostepne: 0 };

    // Po przekroczeniu magazynu (48h) nadmiar czasu przepada - zegar startuje od teraz
    const nowyOstatnio = godzinyPelne >= KAWIARNIA_MAX_GODZIN ? teraz : ostatnio + dostepne * KAWIARNIA_GODZINA_MS;

    await db.execute({
        sql: "UPDATE cooldowny SET ostatnio = ? WHERE user_id = ? AND guild_id = ? AND komenda = ?",
        args: [nowyOstatnio, userId, guildId, "kawiarnia_produkcja"],
    });
    await addSolidDice(userId, guildId, dostepne);

    return { dostepne };
}

function formatCzas(ms) {
    const godziny = Math.floor(ms / 3600000);
    const minuty = Math.floor((ms % 3600000) / 60000);
    const sekundy = Math.floor((ms % 60000) / 1000);
    return `${godziny}h ${minuty}m ${sekundy}s`;
}

const POSTACIE_LEGENDARNE = ["Sakiri", "Baicang", "Hator", "Fadia", "Daffodill", "Jiuyuan", "Hotori", "Nanally", "Chiz", "Lacrimosa", "Chaos"];
const POSTACIE_RZADKIE = ["Mint", "Skia", "Edgar", "Aurelia", "Adler", "Haniel"];

const items = {
    legendarny: [
        ...POSTACIE_LEGENDARNE.map(p => ({ nazwa: p, typ: "postac_legendarna" })),
    ],

    epicki: [
        { nazwa: "Ręcznie pisany list", typ: "item" },
        { nazwa: "Bilet do kina", typ: "item" },
        { nazwa: "Plastry R", typ: "item" },
        { nazwa: "Czekolada", typ: "item" },
        { nazwa: "Płyta z Muzyką", typ: "item" },
        { nazwa: "Dress Sleeves of Vanity", typ: "item" },
        { nazwa: "Good Boy Stamp", typ: "item" },
        { nazwa: "MP3", typ: "item" },
        { nazwa: "Chaotic Core", typ: "item" },
        { nazwa: "Tri-key", typ: "item" },
        { nazwa: "Umbrella ARC", typ: "item" },
        { nazwa: "Reality Refuge ARC", typ: "item" },
        { nazwa: "Youthful Fantasy ARC", typ: "item" },
        { nazwa: "Camellia Society ARC", typ: "item" },
        { nazwa: "Raging Flames ARC", typ: "item" },
        { nazwa: "Blow up the Crowd ARC", typ: "item" },
        { nazwa: "Tears Beneath the Mask ARC", typ: "item" },
        { nazwa: "Eternal Waltz ARC", typ: "item" },
        { nazwa: "Song of The Whale ARC", typ: "item" },
        { nazwa: "Dreamless Seed", typ: "item" },
        { nazwa: "Fluffy Cotton", typ: "item" },
        { nazwa: "Your Happiness is Priceless ARC", typ: "item" },
        { nazwa: "The Forgotten ARC", typ: "item" },
        { nazwa: "Clear Skies ARC", typ: "item" },
        { nazwa: "Shiny Days ARC", typ: "item" },
        { nazwa: "Małpa w klatce (Nahida)", typ: "item" },
        { nazwa: "Mind Royale ARC", typ: "item" },
        { nazwa: "Watch Your Heads! ARC", typ: "item" },
        { nazwa: "A Time Will Come ARC", typ: "item" },
        { nazwa: "The Fool's Spring ARC", typ: "item" },
        { nazwa: "Drawn Blade ARC", typ: "item" },
        { nazwa: "Oraora! ARC", typ: "item" },
        { nazwa: "Train Log", typ: "item" },
        { nazwa: "Covetous Coin", typ: "item" },
        { nazwa: "Boxer's Respect", typ: "item" },
        { nazwa: "Magic Thread", typ: "item" },
    ],
    rzadki: [
        { nazwa: "Warp Piece", typ: "ilosc_losowa", min: 1, max: 30 },
        { nazwa: "Lost Piece", typ: "ilosc_losowa", min: 1, max: 30 },
        { nazwa: "5x Solid Dice", typ: "solid_dice", ilosc: 5 },
        ...POSTACIE_RZADKIE.map(p => ({ nazwa: p, typ: "postac_rzadka" })),
        { nazwa: "Confessional Flower Seed", typ: "item" },
        { nazwa: "Charging Knight", typ: "item" },
        { nazwa: "Spark Plug", typ: "item" },
        { nazwa: "A Page from Delusion's Shore", typ: "item" },
        { nazwa: "Water Moon Pick", typ: "item" },
        { nazwa: "Nest Guard Fragment", typ: "item" },
        { nazwa: "Expansion Core", typ: "item" },
        { nazwa: "Heterogeneous Unit", typ: "item" },
        { nazwa: "Little Melon Seed", typ: "item" },
        { nazwa: "Arcane Thread", typ: "item" },
        { nazwa: "Blade Forging Stone", typ: "item" },
        { nazwa: "Unextinguished Scale Armor", typ: "item" },
        { nazwa: "Eternal Shell", typ: "item" },
        { nazwa: "Song Scale Pattern", typ: "item" },
        { nazwa: "Mint To Mary Mint", typ: "item" },
        { nazwa: "Mint Leisurely Holiday", typ: "item" },
        { nazwa: "Golden Spring", typ: "item" },
        { nazwa: "Blue Fable", typ: "item" },
        { nazwa: "Holy Worship Month", typ: "item" },
        { nazwa: "Nightingale's Sonata", typ: "item" },
        { nazwa: "Glimmering Ice", typ: "item" },
        { nazwa: "Frytki", typ: "item" },
        { nazwa: "Seasonal Sushi Boat", typ: "item" },
        { nazwa: "Rose Lychee Cake", typ: "item" },
        { nazwa: "Ebisu Royal Tower", typ: "item" },
        { nazwa: "Mhm! Coin", typ: "item" },
        { nazwa: "Tomato 100 Jelly Photo", typ: "item" },
        { nazwa: "Asahi Inori - Cobalt Mayoiuta", typ: "item" },
    ],

    zwykly: [
        { nazwa: "Yellow Glaze Vase", typ: "item" },
        { nazwa: "Serenade", typ: "item" },
        { nazwa: "Fantasia", typ: "item" },
        { nazwa: "Waltz", typ: "item" },
        { nazwa: "Variations", typ: "item" },
        { nazwa: "Pastoral", typ: "item" },
        { nazwa: "Elite Hunter Guide", typ: "item" },
        { nazwa: "Battle Coins", typ: "item" },
        { nazwa: "Scale Pattern", typ: "item" },
        { nazwa: "Chaotic Dye", typ: "item" },
        { nazwa: "Manhole Boss", typ: "item" },
        { nazwa: "Dove's Flutter", typ: "item" },
        { nazwa: "Know Weariness", typ: "item" },
        { nazwa: "Resonance of Faith", typ: "item" },
        { nazwa: "Suspended Whispers", typ: "item" },
        { nazwa: "U-00NE", typ: "item" },
        { nazwa: "Goodheart Crispy Mouse Cookie", typ: "item" },
        { nazwa: "Manhole Crook", typ: "item" },
        { nazwa: "Nestling's Longing", typ: "item" },
        { nazwa: "FNG", typ: "item" },
        { nazwa: "First Expectations", typ: "item" },
        { nazwa: "Synchronicity of Thought", typ: "item" },
        { nazwa: "Hesitation of The Waves", typ: "item" },
        { nazwa: "DynamiK", typ: "item" },
        { nazwa: "Cool-lala Spicy Snack", typ: "item" },
        { nazwa: "Cold Brew", typ: "item" },
        { nazwa: "Bob's Sunshine Ranch", typ: "item" },
        { nazwa: "Saki Melon Bread", typ: "item" },
        { nazwa: "Magi-Puff Whole Wheat Bread", typ: "item" },
        { nazwa: "Crave Bites! Chocolate Flavor", typ: "item" },
        { nazwa: "Gubichi Butter Flavor Chips", typ: "item" },
        { nazwa: "Gubichi Cucumber Flavor Chips", typ: "item" },
        { nazwa: "Gubichi Original Flavor Chips", typ: "item" },
        { nazwa: "Refreshing Glacier", typ: "item" },
        { nazwa: "Refreshing Fruity", typ: "item" },
        { nazwa: "DynamiK Zero", typ: "item" },
        { nazwa: "ApeX", typ: "item" },
        { nazwa: "Silver Moon Waltz - Asahi Inori", typ: "item" },
        { nazwa: "Chej czat", typ: "item" },
        { nazwa: "Kokoro Rider L1 Series", typ: "item" },
        { nazwa: "Kokoro Rider L2 Series", typ: "item" },
        { nazwa: "Kokoro Rider L3 Series", typ: "item" },
        { nazwa: "Clear Skies ARC", typ: "item" },
        { nazwa: "Failing You, Heavy in My Heart ARC", typ: "item" },
        { nazwa: "Drawn Blade ARC", typ: "item" },
        { nazwa: "A Time Will Come ARC", typ: "item" },
        { nazwa: "Annulrota", typ: "item" },
        { nazwa: "Lost Wallet", typ: "item" },
        { nazwa: "Bon na wyzywisko Nahidy", typ: "item" },
    ],
}



function losujKategorie() {
    const los = Math.random() * 100;
    if (los < 6.67) return "legendarny";
    else if (los < 20) return "epicki";
    else if (los < 46.67) return "rzadki";
    else return "zwykly";
}

function losujItem(kategoria) {
    const lista = items[kategoria];
    return lista[Math.floor(Math.random() * lista.length)];
}

async function przetworzItem(userId, guildId, item) {
    
    if (item.typ === "solid_dice") {
        await addSolidDice(userId, guildId, item.ilosc);
        await db.execute({
            sql: "INSERT INTO ekwipunek (user_id, guild_id, item_nazwa, ilosc) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
            args: [userId, guildId, item.nazwa, item.ilosc],
        });
        return { wyswietlana: `**${item.nazwa}** 🎲 (+${item.ilosc} <:Red_roll:1512521789748547715>)`, solidDice: item.ilosc };
    }

    if (item.typ === "ilosc_losowa") {
        const ilosc = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
        await db.execute({
            sql: "INSERT INTO ekwipunek (user_id, guild_id, item_nazwa, ilosc) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, guild_id, item_nazwa) DO UPDATE SET ilosc = ilosc + ?",
            args: [userId, guildId, item.nazwa, ilosc, ilosc],
        });
        return { wyswietlana: `**${item.nazwa}** x${ilosc}`, solidDice: 0 };
    }

    if (item.typ === "postac_legendarna" || item.typ === "postac_rzadka") {
        const maxSzt = 6;
        const wynikPostac = await db.execute({
            sql: "SELECT ilosc FROM postacie WHERE user_id = ? AND guild_id = ? AND postac = ?",
            args: [userId, guildId, item.nazwa],
        });

        const obecnaIlosc = wynikPostac.rows.length > 0 ? Number(wynikPostac.rows[0].ilosc) : 0;

        if (obecnaIlosc >= maxSzt) {
            await addSolidDice(userId, guildId, 1);
            return { wyswietlana: `**${item.nazwa}** — masz już 6/6, otrzymujesz **+1 Solid Dice** <:Red_roll:1512521789748547715>`, solidDice: 1 };
        }

        const nowaIlosc = obecnaIlosc + 1;
        await db.execute({
            sql: "INSERT INTO postacie (user_id, guild_id, postac, ilosc) VALUES (?, ?, ?, 1) ON CONFLICT(user_id, guild_id, postac) DO UPDATE SET ilosc = ilosc + 1",
            args: [userId, guildId, item.nazwa],
        });

        return { wyswietlana: `**${item.nazwa}** (${nowaIlosc}/${maxSzt})`, solidDice: 0 };
    }

    await db.execute({
        sql: "INSERT INTO ekwipunek (user_id, guild_id, item_nazwa, ilosc) VALUES (?, ?, ?, 1) ON CONFLICT(user_id, guild_id, item_nazwa) DO UPDATE SET ilosc = ilosc + 1",
        args: [userId, guildId, item.nazwa],
    });
    return { wyswietlana: `**${item.nazwa}**`, solidDice: 0 };
}

const animacjaKlatki = [
"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n  Pobieranie itemów...\n\n  [██ ·  ·  ·  ·  ·  ·  · ]\n\n  > Selekcja itemów\n```",

"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n  Pobieranie itemów...\n\n  [████ ·  ·  ·  ·  ·  ·  ]\n\n  > Selekcja itemów\n```",

"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n  Pobieranie itemów... ✅\n\n  [██████ ·  ·  ·  ·  ·   ]\n\n  > Segregowanie itemów\n```",

"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n  Segregowanie: 📦 📦 📦 📦\n\n  [████████ ·  ·  ·  ·    ]\n\n  > Segregowanie itemów\n```",

"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n  Segregowanie: 📦 📦 📦 ✅\n\n  [██████████ ·  ·  ·     ]\n\n  > Przetwarzanie itemów na Solid Dice\n```",

"```\n╔══════════════════════════╗\n║   *** VOID EXCHANGE ***  ║\n╚══════════════════════════╝\n\n       💥 💥 💥 💥 💥\n\n  [████████████ ·  ·      ]\n\n  > Przetwarzanie itemów na Solid Dice\n```",

"```\n╔══════════════════════════╗\n║   *** VOID EXCHANGE ***  ║\n╚══════════════════════════╝\n\n     💥 💥 💥 💥 💥 💥\n\n  [██████████████ ·       ]\n\n  > Przetwarzanie itemów na Solid Dice\n```",

"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n  Krystalizacja... ✨✨✨\n\n  [████████████████ ·     ]\n\n  > Formowanie Solid Dice\n```",

"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n       🎲 🎲 🎲 🎲 🎲\n\n  [██████████████████ ·   ]\n\n  > Formowanie Solid Dice\n```",

"```\n╔══════════════════════════╗\n║      VOID  EXCHANGE      ║\n╚══════════════════════════╝\n\n  ✅ Konwersja zakończona!\n\n  [██████████████████████]\n\n  > Solid Dice gotowe do wydania 🎲\n```",
];

async function pokazAnimacje(interaction) {
    const stopka = "\n> *Animację możesz wyłączyć pod /animacje*";
    
    const klatkiZStopka = animacjaKlatki.map(klatka => {
        return klatka.replace(/```$/, "") + stopka + "\n```";
    });

    console.log(klatkiZStopka[0]); // 👈 dodaj to tymczasowo
    
    await interaction.editReply({ content: klatkiZStopka[0], embeds: [], components: [] });
    for (let i = 1; i < klatkiZStopka.length; i++) {
        await new Promise(r => setTimeout(r, 1000));
        await interaction.editReply({ content: klatkiZStopka[i] });
    }
}

async function policzItemy(userId, guildId, rzadkosc) {
    const listaItemow = items[rzadkosc].filter(i => i.typ === "item" || i.typ === "ilosc_losowa");
    const nazwy = listaItemow.map(i => i.nazwa);

    if (nazwy.length === 0) return { lacznieItemow: 0, szczegoly: [] };

    const placeholders = nazwy.map(() => "?").join(", ");
    const wynik = await db.execute({
        sql: `SELECT item_nazwa, ilosc FROM ekwipunek WHERE user_id = ? AND guild_id = ? AND item_nazwa IN (${placeholders})`,
        args: [userId, guildId, ...nazwy],
    });

    const lacznieItemow = wynik.rows.reduce((sum, r) => sum + Number(r.ilosc), 0);
    return { lacznieItemow, szczegoly: wynik.rows };
}

const rollAnimacja = [
`\`\`\`
◌
◌ ◌
◌ ◌ ◌

[ SEARCHING ]
\`\`\``,

`\`\`\`
◈
◈ ◈
◈ ◈ ◈

[ ANALYZING ]
\`\`\``,

`\`\`\`
⬡
⬡ ⬡
⬡ ⬡ ⬡

⚡ SIGNAL DETECTED ⚡
\`\`\``,

`\`\`\`
▒░▒░▒░▒░▒░
░▒░▒░▒░▒░▒
▒░▒░▒░▒░▒░

[ DECRYPTING ]
\`\`\``,

`\`\`\`
■■□□□□□□□□

[ DECRYPTING ]
\`\`\``,

`\`\`\`
■■■■□□□□□□

[ DECRYPTING ]
\`\`\``,

`\`\`\`
■■■■■■□□□□

[ DECRYPTING ]
\`\`\``,

`\`\`\`
■■■■■■■■□□

[ DECRYPTING ]
\`\`\``,

`\`\`\`
■■■■■■■■■■

[ DECRYPTING ]
\`\`\``,

`\`\`\`
⚠ ANOMALY FOUND ⚠
\`\`\``,

`\`\`\`
✦
✦ ✦
✦ ✦ ✦
\`\`\``,

`\`\`\`
⚡
⚡ ⚡
⚡ ⚡ ⚡
\`\`\``,

`\`\`\`
💥
\`\`\``,

`\`\`\`
✨ ITEM ACQUIRED ✨
\`\`\``
];

async function pokazRollAnimacje(interaction) {
    const stopka = "\n Animację możesz wyłączyć pod /animacje";
    
    const klatkiZStopka = rollAnimacja.map(klatka => {
        return klatka.replace(/```$/, "") + stopka + "\n```";
    });

    const msg = await interaction.editReply({ content: klatkiZStopka[0] });
    for (let i = 1; i < klatkiZStopka.length; i++) {
        await new Promise(r => setTimeout(r, 600));
        await msg.edit(klatkiZStopka[i]);
    }
    await new Promise(r => setTimeout(r, 400));
}

async function getUstawienia(userId, guildId) {
    const wynik = await db.execute({
        sql: "SELECT animacja_roll, animacja_plecak FROM ustawienia WHERE user_id = ? AND guild_id = ?",
        args: [userId, guildId],
    });
    if (wynik.rows.length === 0) return { animacja_roll: 1, animacja_plecak: 1 };
    return {
        animacja_roll: Number(wynik.rows[0].animacja_roll ?? 1),
        animacja_plecak: Number(wynik.rows[0].animacja_plecak ?? 1),
    };
}

// Mammon - event bossa

const MAMMON_SCIEZKA_OBRAZKA = "./Gra/mammon/mammon.jpg";
const MAMMON_HP_BAZA = 400;
const MAMMON_HP_ZA_GRACZA = 200;
const MAMMON_ATAK_OBRAZENIA = 10;
const MAMMON_ULT_OBRAZENIA = MAMMON_ATAK_OBRAZENIA * 3;
const MAMMON_COOLDOWN_ATAK_MS = 1000;
const MAMMON_COOLDOWN_ULT_MS = 10000;
const MAMMON_CZAS_DOLACZANIA_MS = 30000;
const MAMMON_CZAS_WALKI_MS = 60000;
const MAMMON_SPAWN_MIN_H = 12;
const MAMMON_SPAWN_MAX_H = 24;

const aktywneMammony = new Map();

const MAMMON_ABILITKI = {
    dmg50: { nazwa: "💥 Cios Mocy", opis: "Zadaje jednorazowo 50 obrażeń Mammonowi." },
    blokada5s: { nazwa: "🛡️ Monopol", opis: "Przez 5 sekund tylko Ty możesz atakować Mammona." },
    czas10s: { nazwa: "⏳ Przedłużenie", opis: "Dodaje +10 sekund do czasu walki dla wszystkich." },
    blokujUlt: { nazwa: "🔒 Sabotaż", opis: "Blokada ULT-a losowemu graczowi na czas bicia mammona." },
    leczmamona: { nazwa: "🧪 Eliksir Mammona", opis: "Dodaje Mammonowi od 10 do 100 HP (ryzykowna!)." },
};

function losowaAbilitkaMammona() {
    const klucze = Object.keys(MAMMON_ABILITKI);
    return klucze[Math.floor(Math.random() * klucze.length)];
}

function losowaLiczba(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function paskHpMammona(hp, maxHp) {
    const dlugosc = 20;
    const procent = maxHp > 0 ? Math.max(0, hp) / maxHp : 0;
    const wypelnione = Math.round(procent * dlugosc);
    return `\`[${"█".repeat(wypelnione)}${"░".repeat(dlugosc - wypelnione)}]\` **${Math.max(0, hp)}/${maxHp} HP**`;
}

function budujRegulaminMammona(dolaczanieOtwarte) {
    return new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle("😈 Mammon się pojawił!")
        .setDescription(
            "📜 **Zasady:**\n" +
            "• Wykonaj **przynajmniej 1 atak** → 30-60 <:Red_roll:1512521789748547715>\n" +
            "• Wykonaj **przynajmniej 1 ULT** → 60-100 <:Red_roll:1512521789748547715> (zamiast bazowej nagrody)\n" +
            "• **TOP 3** graczy z największymi obrażeniami → dodatkowe 30-50 <:Red_roll:1512521789748547715> do nagrody\n" +
            `• Cooldown ataku: **${MAMMON_COOLDOWN_ATAK_MS / 1000}s** | Cooldown ULT: **${MAMMON_COOLDOWN_ULT_MS / 1000}s**\n\n` +
            "🎲 **Losowa umiejętność:** po dołączeniu dostajesz jedną z 5 losowych, jednorazowych umiejętności\n\n" +
            "Kliknij **⚔️ Dołącz**, aby wziąć udział w walce!"
        )
        .setFooter({ text: dolaczanieOtwarte ? "Dołączanie otwarte - masz 30 sekund!" : "Dołączanie zamknięte" });
}

function panelGraczaMammon(stan, gracz) {
    const info = MAMMON_ABILITKI[gracz.abilitka];
    const naCooldownieAtaku = Date.now() - gracz.ostatniAtak < MAMMON_COOLDOWN_ATAK_MS;
    const naCooldownieUlt = Date.now() - gracz.ostatniaUlta < MAMMON_COOLDOWN_ULT_MS;

    const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .addFields(
            { name: "Umiejętność", value: gracz.abilitkaUzyta ? `~~${info.nazwa}~~ (użyta)` : `**${info.nazwa}**\n_${info.opis}_`, inline: false },
        );

    const btnAtak = new ButtonBuilder().setCustomId("mammon_atak").setLabel("🗡️ Atak").setStyle(ButtonStyle.Primary).setDisabled(naCooldownieAtaku);
    const btnUlt = new ButtonBuilder()
        .setCustomId("mammon_ulta")
        .setLabel(gracz.ultZablokowany ? "🔒 ULT zablokowany" : "💥 ULT")
        .setStyle(ButtonStyle.Success)
        .setDisabled(gracz.ultyDostepne <= 0 || gracz.ultZablokowany || naCooldownieUlt);
    const btnAbilitka = new ButtonBuilder()
        .setCustomId("mammon_abilitka")
        .setLabel(gracz.abilitkaUzyta ? "✅ Umiejętność użyta" : `🎲 ${info.nazwa}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(gracz.abilitkaUzyta);

    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(btnAtak, btnUlt, btnAbilitka)] };
}

async function aktualizujPublicznaMammona(stan, wymuszona) {
    const teraz = Date.now();
    if (!wymuszona && teraz - stan.ostatniaAktualizacja < 1200) return;
    stan.ostatniaAktualizacja = teraz;

    const embedy = [stan.regulamin];

    if (stan.uczestnicy.size > 0) {
        const czasTekst = !stan.dolaczanieOtwarte && !stan.zakonczone
            ? `\n⏱️ Pozostały czas: **${Math.max(0, Math.ceil((stan.czasZakonczeniaWalki - Date.now()) / 1000))}s**`
            : "";
        const embedHp = new EmbedBuilder()
            .setColor(0x8B0000)
            .setDescription(`${paskHpMammona(stan.hp, stan.maxHp)}\n\n👥 Walczących: ${stan.uczestnicy.size}${czasTekst}`);
        if (existsSync(MAMMON_SCIEZKA_OBRAZKA)) embedHp.setImage("attachment://mammon.jpg");
        if (stan.dziennik.length > 0) {
            embedHp.addFields({ name: "📜 Ostatnie wydarzenia", value: stan.dziennik.join("\n") });
        }
        embedy.push(embedHp);
    }

    const zawartosc = { embeds: embedy };
    if (!stan.obrazekWyslany && existsSync(MAMMON_SCIEZKA_OBRAZKA)) {
        zawartosc.files = [new AttachmentBuilder(MAMMON_SCIEZKA_OBRAZKA, { name: "mammon.jpg" })];
        stan.obrazekWyslany = true;
    }
    zawartosc.components = stan.dolaczanieOtwarte
        ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("mammon_dolacz").setLabel("⚔️ Dołącz").setStyle(ButtonStyle.Danger))]
        : [];

    await stan.wiadomosc.edit(zawartosc).catch(() => {});
}

async function zakonczWalkeMammon(guildId, pokonany) {
    const stan = aktywneMammony.get(guildId);
    if (!stan || stan.zakonczone) return;
    stan.zakonczone = true;
    clearTimeout(stan.timeoutDolaczania);
    clearTimeout(stan.timeoutKoniec);
    clearInterval(stan.interwalCzasu);
    aktywneMammony.delete(guildId);

    const listaGraczy = [...stan.uczestnicy.entries()];
    const rankingObrazen = [...listaGraczy].sort((a, b) => b[1].obrazeniaZadane - a[1].obrazeniaZadane);

    // Bonus TOP 3 liczy się tylko wśród graczy, którzy i tak kwalifikują się do nagrody bazowej
    // (żeby ktoś kto zadał obrażenia wyłącznie umiejętnością, ale nigdy nie zaatakował/nie użył ULT,
    // nie zajął miejsca w rankingu kosztem kogoś realnie walczącego)
    const kwalifikowaniDoNagrody = listaGraczy.filter(([, g]) => g.ataki > 0 || g.ultyUzyte > 0);
    const rankingBonusowy = [...kwalifikowaniDoNagrody].sort((a, b) => b[1].obrazeniaZadane - a[1].obrazeniaZadane);
    const top3Ids = new Set(rankingBonusowy.slice(0, 3).filter(([, g]) => g.obrazeniaZadane > 0).map(([id]) => id));

    let podsumowanie = "";
    for (const [userId, gracz] of listaGraczy) {
        let nagroda = 0;
        let bonus = 0;

        if (pokonany) {
            if (gracz.ultyUzyte > 0) nagroda = losowaLiczba(60, 100);
            else if (gracz.ataki > 0) nagroda = losowaLiczba(30, 60);

            if (nagroda > 0 && top3Ids.has(userId)) {
                bonus = losowaLiczba(30, 50);
                nagroda += bonus;
            }

            if (nagroda > 0) {
                await addSolidDice(userId, guildId, nagroda);
                podsumowanie += `<@${userId}> +${nagroda} <:Red_roll:1512521789748547715>${bonus > 0 ? ` (w tym +${bonus} <:Red_roll:1512521789748547715> za TOP 3 obrażeń)` : ""}\n`;
            }
        }

        if (gracz.ostatniaInterakcja) {
            const embedOsobisty = new EmbedBuilder()
                .setColor(nagroda > 0 ? 0x2ECC71 : 0x555555)
                .setTitle("📊 Twoje podsumowanie starcia z Mammonem")
                .addFields(
                    { name: "Twoje ataki", value: `${gracz.ataki}`, inline: true },
                    { name: "Wykorzystane ULT-y", value: `${gracz.ultyUzyte}`, inline: true },
                    { name: "Zadane obrażenia", value: `${gracz.obrazeniaZadane}`, inline: true },
                    {
                        name: "Nagroda",
                        value: nagroda > 0
                            ? `**+${nagroda}** <:Red_roll:1512521789748547715>${bonus > 0 ? ` (w tym +${bonus} za TOP 3)` : ""}`
                            : "Brak nagrody",
                        inline: false,
                    },
                );
            await gracz.ostatniaInterakcja.followUp({ embeds: [embedOsobisty], ephemeral: true }).catch(() => {});
        }
    }

    const medale = ["🥇", "🥈", "🥉"];
    const rankingTekst = rankingObrazen
        .filter(([, g]) => g.obrazeniaZadane > 0)
        .slice(0, 5)
        .map(([userId, g], i) => `${medale[i] ?? "▪️"} <@${userId}> - **${g.obrazeniaZadane}** obrażeń`)
        .join("\n") || "Nikt nie zadał żadnych obrażeń.";

    const embed = new EmbedBuilder()
        .setColor(pokonany ? 0x2ECC71 : 0x555555)
        .setTitle(pokonany ? "💀 Mammon został pokonany!" : "🏃 Mammon uciekł!")
        .setDescription(
            pokonany
                ? (podsumowanie || "Nikt nie zdążył zadać obrażeń.")
                : "Czas minął zanim ktokolwiek zdołał go pokonać. Spróbujcie przy następnym spawnie!"
        )
        .addFields({ name: "🏆 Ranking obrażeń", value: rankingTekst });

    await stan.wiadomosc.edit({ embeds: [embed], components: [] }).catch(() => {});
}

async function odpalMammona(guildId, kanal) {
    const regulamin = budujRegulaminMammona(true);
    const btnDolacz = new ButtonBuilder().setCustomId("mammon_dolacz").setLabel("⚔️ Dołącz").setStyle(ButtonStyle.Danger);

    const wiadomosc = await kanal.send({ embeds: [regulamin], components: [new ActionRowBuilder().addComponents(btnDolacz)] });

    const stan = {
        hp: 0,
        maxHp: 0,
        uczestnicy: new Map(),
        dolaczanieOtwarte: true,
        zakonczone: false,
        obrazekWyslany: false,
        ostatniaAktualizacja: 0,
        dziennik: [],
        blokadaAtakuDo: 0,
        blokadaAtakuGracz: null,
        czasZakonczeniaWalki: 0,
        regulamin,
        wiadomosc,
    };
    aktywneMammony.set(guildId, stan);

    stan.timeoutDolaczania = setTimeout(async () => {
        stan.dolaczanieOtwarte = false;

        if (stan.uczestnicy.size === 0) {
            stan.zakonczone = true;
            aktywneMammony.delete(guildId);
            await stan.wiadomosc.edit({
                embeds: [budujRegulaminMammona(false).setDescription("😴 Nikt nie dołączył do walki. Mammon wraca do ukrycia...")],
                components: [],
            }).catch(() => {});
            return;
        }

        stan.regulamin = budujRegulaminMammona(false);
        stan.czasZakonczeniaWalki = Date.now() + MAMMON_CZAS_WALKI_MS;
        await aktualizujPublicznaMammona(stan, true);
        stan.timeoutKoniec = setTimeout(() => zakonczWalkeMammon(guildId, false), MAMMON_CZAS_WALKI_MS);
        stan.interwalCzasu = setInterval(() => aktualizujPublicznaMammona(stan, true), 5000);
    }, MAMMON_CZAS_DOLACZANIA_MS);
}

function losowyOdstepSpawnuMammona() {
    const godziny = MAMMON_SPAWN_MIN_H + Math.random() * (MAMMON_SPAWN_MAX_H - MAMMON_SPAWN_MIN_H);
    return godziny * 60 * 60 * 1000;
}

// ===== /help =====

const HELP_STRONY = [
    {
        komenda: "/daily",
        plik: "daily",
        opis: "Odbierz codzienną nagrodę Solid Dice.",
        zdobywasz: "10-14 Solid Dice",
        tracisz: "Nie dotyczy",
        cooldown: "24 godziny",
    },
    {
        komenda: "/work",
        plik: "work",
        opis: "Idź do pracy i zarób Solid Dice.",
        zdobywasz: "5-9 Solid Dice",
        tracisz: "Nie dotyczy",
        cooldown: "10 minut",
    },
    {
        komenda: "/pinkpawsheist",
        plik: "pinkpawsheist",
        opis: "Weź udział w napadzie Pink Paws Heist - 50% szans na sukces, 50% na porażkę.",
        zdobywasz: "1-30 Solid Dice (sukces, 50% szans)",
        tracisz: "1-30 Solid Dice (porażka, 50% szans - nigdy więcej niż masz)",
        cooldown: "48 godzin",
    },
    {
        komenda: "/kawiarnia",
        plik: "kawiarnia",
        opis: "Kawiarnia produkuje Solid Dice co godzinę - odbierz zgromadzoną ilość, kiedy chcesz.",
        zdobywasz: "1 Solid Dice za każdą pełną godzinę od ostatniego odbioru (magazyn max 48)",
        tracisz: "Nie dotyczy",
        cooldown: "Brak - można sprawdzać w każdej chwili",
    },
    {
        komenda: "/wyścig",
        plik: "wyscig",
        opis: "Prowadź samochód i omijaj przeszkody przez 5 ticków, żeby dojechać do mety.",
        zdobywasz: "5-15 Solid Dice (dojazd do mety)",
        tracisz: "Nie tracisz Solid Dice - rozbicie kończy grę po prostu bez nagrody",
        cooldown: "30 minut",
    },
    {
        komenda: "/łowienie",
        plik: "lowienie",
        opis: "Steruj łódką i złap 3 ryby zanim skończy się czas.",
        zdobywasz: "1-10 Solid Dice (złowienie 3 ryb w 25 sekund)",
        tracisz: "1-5 Solid Dice (jeśli czas minie zanim złowisz 3 ryby)",
        cooldown: "10 minut",
    },
    {
        komenda: "/roll",
        plik: "roll",
        opis: "Wylosuj 10 przedmiotów np. postacie, dodatkowe Solid Dice.",
        zdobywasz: "Przedmioty, postacie i losowo dodatkowe Solid Dice (np. 5x Solid Dice = +5)",
        tracisz: "Koszt 10 Solid Dice za każde użycie",
        cooldown: "Brak - ograniczone tylko posiadanym saldem",
    },
    {
        komenda: "/mahjong",
        plik: "majong",
        opis: "Zagraj w Mahjonga NTE - solo z botami albo multiplayer do 4 osób.",
        zdobywasz: "10-30 Solid Dice za dokończenie partii, dodatkowe +50 za wygraną",
        tracisz: "Nie dotyczy - w najgorszym razie nie dostajesz nagrody (remis, partia przerwana)",
        cooldown: "1 godzina (dla osoby zakładającej grę)",
    },
    {
        komenda: "/skiny",
        plik: "skiny",
        opis: "Kup skiny postaci w sklepie, możesz je wyświetlić w /plecak w zakładce Skiny.",
        zdobywasz: "Kosmetyczny skin na stałe",
        tracisz: "Koszt 100 Solid Dice za skin",
        cooldown: "Brak",
    },
    {
        komenda: "/plecak",
        plik: "plecak",
        opis: "Podgląd Twojego konta: aktualne i łącznie zdobyte Solid Dice, miejsce w topce serwera, zebrane postacie z /roll oraz kupione skiny z /skiny.",
        zdobywasz: "Nie dotyczy - to tylko podgląd Twojego stanu konta",
        tracisz: "Nie dotyczy",
        cooldown: "Brak",
    },
    {
        komenda: "/nteleaderboard",
        plik: "nteleaderboard",
        opis: "Wyświetl ranking graczy na serwerze według łącznie zdobytych Solid Dice.",
        zdobywasz: "Nie dotyczy - to tylko podgląd rankingu serwera",
        tracisz: "Nie dotyczy",
        cooldown: "Brak",
    },
    {
        komenda: "/animacje",
        plik: "animacje",
        opis: "Włącz lub wyłącz animację pokazywaną przy /roll.",
        zdobywasz: "Nie dotyczy - to tylko ustawienia Twojego konta",
        tracisz: "Nie dotyczy",
        cooldown: "Brak",
    },
    {
        komenda: "/pingcooldown",
        plik: "pingcooldown",
        opis: "Włącz/wyłącz oznaczanie Cię na kanale ekonomii, gdy zakończy się cooldown na jedną z Twoich komend.",
        zdobywasz: "Nie dotyczy - to tylko ustawienia Twojego konta",
        tracisz: "Nie dotyczy",
        cooldown: "Brak",
    },
    {
        komenda: "😈 Event: Mammon",
        plik: "mammon",
        opis: "Mammon respi się sam z siebie na kanale ekonomii i można go pokonać wspólnie z innymi graczami (administracja może też przywołać go ręcznie przez /mammonevent).",
        zdobywasz: "30-60 Solid Dice (przynajmniej 1 atak) lub 60-100 (przynajmniej 1 ULT) po pokonaniu Mammona, plus dodatkowe 30-50 dla TOP 3 graczy z największymi obrażeniami",
        tracisz: "Nie dotyczy",
        cooldown: "Mammon pojawia się sam z siebie co 12-24 godzin (losowo) na serwer",
    },
];

function budujStroneHelp(indeks) {
    const strona = HELP_STRONY[indeks];
    const embedSzybki = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(strona.komenda)
        .setDescription(strona.opis)
        .addFields(
            { name: "💰 Zdobywasz", value: strona.zdobywasz },
            { name: "💸 Możesz stracić", value: strona.tracisz },
            { name: "⏱️ Cooldown", value: strona.cooldown },
        )
        .setFooter({ text: `Strona ${indeks + 1}/${HELP_STRONY.length}` });

    const sciezkaGif = `./Gra/video/${strona.plik}.gif`;
    const pliki = [];
    let embedPelny = embedSzybki;

    if (existsSync(sciezkaGif)) {
        pliki.push(new AttachmentBuilder(sciezkaGif, { name: `${strona.plik}.gif` }));
        // Osobny embed z gifem - strona pokazuje się od razu z embedSzybki (bez wgrywania
        // pliku), a gif dogrywa się drugą, wolniejszą edycją, żeby nie blokować tekstu
        embedPelny = EmbedBuilder.from(embedSzybki).setImage(`attachment://${strona.plik}.gif`);
    } else {
        embedSzybki.addFields({ name: "🎥 Wideo", value: "Wkrótce dodane" });
    }

    return { embedySzybkie: [embedSzybki], embeds: [embedPelny], files: pliki };
}

client.on("interactionCreate", async (interaction) => {
    try {
    if (!interaction.guild) return;

    if (interaction.isButton()) {
        if (interaction.customId === "roll_rzadkosc") {
        await interaction.reply({
            content: `# 📊 Rzadkości:\n\n<:Mint:1523097622187999365> **Legendarna**\n<:Nanallyyy:1523097616722952345> **Epicka** \n<:MintShock:1523097608548257824> **Rzadka**\n<:f_mc:1523097583726231563> **Zwykła**`,
            ephemeral: true,
        });
        return;
    }

       if (interaction.customId === "mammon_dolacz") {
        const stan = aktywneMammony.get(interaction.guild.id);
        if (!stan || !stan.dolaczanieOtwarte) {
            await interaction.reply({ content: "❗ Dołączanie do tej walki jest już zamknięte.", ephemeral: true });
            return;
        }

        // Ackujemy natychmiast, zanim zrobimy jakąkolwiek wolniejszą pracę (edycja
        // publicznej wiadomości to zapytanie sieciowe do Discorda) - inaczej 3-sekundowe
        // okno na potwierdzenie kliknięcia może minąć i Discord pokaże "Unknown interaction"
        await interaction.deferReply({ ephemeral: true });

        if (!stan.uczestnicy.has(interaction.user.id)) {
            stan.uczestnicy.set(interaction.user.id, {
                ataki: 0,
                ultyUzyte: 0,
                ultyDostepne: 0,
                ostatniAtak: 0,
                ostatniaUlta: 0,
                obrazeniaZadane: 0,
                ultZablokowany: false,
                abilitka: losowaAbilitkaMammona(),
                abilitkaUzyta: false,
                ostatniaInterakcja: interaction,
            });
            const n = stan.uczestnicy.size;
            const nowyMaxHp = MAMMON_HP_BAZA + n * MAMMON_HP_ZA_GRACZA;
            stan.hp += nowyMaxHp - stan.maxHp;
            stan.maxHp = nowyMaxHp;
            await aktualizujPublicznaMammona(stan, true);
        }

        const gracz = stan.uczestnicy.get(interaction.user.id);
        await interaction.editReply(panelGraczaMammon(stan, gracz));
        return;
    }

    if (interaction.customId === "mammon_atak" || interaction.customId === "mammon_ulta") {
        const stan = aktywneMammony.get(interaction.guild.id);
        if (!stan || stan.zakonczone) {
            await interaction.update({ content: "❗ Ta walka z Mammonem już się zakończyła.", embeds: [], components: [] }).catch(() => {});
            return;
        }

        const gracz = stan.uczestnicy.get(interaction.user.id);
        if (!gracz) {
            await interaction.reply({ content: "❗ Nie dołączyłeś do tej walki!", ephemeral: true });
            return;
        }
        gracz.ostatniaInterakcja = interaction;

        if (stan.blokadaAtakuDo > Date.now() && stan.blokadaAtakuGracz !== interaction.user.id) {
            const pozostaloBlokady = ((stan.blokadaAtakuDo - Date.now()) / 1000).toFixed(1);
            await interaction.reply({ content: `❗ <@${stan.blokadaAtakuGracz}> zmonopolizował atak na Mammona! Poczekaj jeszcze ${pozostaloBlokady}s.`, ephemeral: true });
            return;
        }

        const teraz = Date.now();
        let cooldownUzytyMs = 0;

        if (interaction.customId === "mammon_atak") {
            const pozostalo = MAMMON_COOLDOWN_ATAK_MS - (teraz - gracz.ostatniAtak);
            if (pozostalo > 0) {
                await interaction.deferUpdate().catch(() => {});
                return;
            }
            gracz.ostatniAtak = teraz;
            gracz.ataki++;
            if (gracz.ataki % 5 === 0) gracz.ultyDostepne++;
            stan.hp = Math.max(0, stan.hp - MAMMON_ATAK_OBRAZENIA);
            gracz.obrazeniaZadane += MAMMON_ATAK_OBRAZENIA;
            cooldownUzytyMs = MAMMON_COOLDOWN_ATAK_MS;
        } else {
            if (gracz.ultZablokowany) {
                await interaction.reply({ content: "❗ Twoje ULT zostało zablokowane na tę walkę!", ephemeral: true });
                return;
            }
            if (gracz.ultyDostepne <= 0) {
                await interaction.reply({ content: "❗ Nie masz jeszcze dostępnego ULT (potrzeba 5 ataków).", ephemeral: true });
                return;
            }
            const pozostalo = MAMMON_COOLDOWN_ULT_MS - (teraz - gracz.ostatniaUlta);
            if (pozostalo > 0) {
                await interaction.deferUpdate().catch(() => {});
                return;
            }
            gracz.ostatniaUlta = teraz;
            gracz.ultyDostepne--;
            gracz.ultyUzyte++;
            stan.hp = Math.max(0, stan.hp - MAMMON_ULT_OBRAZENIA);
            gracz.obrazeniaZadane += MAMMON_ULT_OBRAZENIA;
            cooldownUzytyMs = MAMMON_COOLDOWN_ULT_MS;
        }

        // Ackujemy natychmiast (deferUpdate jest lokalny i szybki) - dopiero PO tym
        // robimy wolniejszą edycję publicznej wiadomości, żeby nie przekroczyć
        // 3-sekundowego okna Discorda na potwierdzenie kliknięcia
        await interaction.deferUpdate().catch(() => {});

        if (stan.hp <= 0) {
            await zakonczWalkeMammon(interaction.guild.id, true);
            await interaction.editReply({ content: "💀 Zadałeś ostateczny cios!", embeds: [], components: [] }).catch(() => {});
            return;
        }

        await aktualizujPublicznaMammona(stan, false);
        await interaction.editReply(panelGraczaMammon(stan, gracz)).catch(() => {});

        setTimeout(async () => {
            if (stan.zakonczone) return;
            const wciazGracz = stan.uczestnicy.get(interaction.user.id);
            if (!wciazGracz) return;
            try {
                await interaction.editReply(panelGraczaMammon(stan, wciazGracz));
            } catch {}
        }, cooldownUzytyMs);
        return;
    }

    if (interaction.customId === "mammon_abilitka") {
        const stan = aktywneMammony.get(interaction.guild.id);
        if (!stan || stan.zakonczone) {
            await interaction.update({ content: "❗ Ta walka z Mammonem już się zakończyła.", embeds: [], components: [] }).catch(() => {});
            return;
        }

        const gracz = stan.uczestnicy.get(interaction.user.id);
        if (!gracz) {
            await interaction.reply({ content: "❗ Nie dołączyłeś do tej walki!", ephemeral: true });
            return;
        }
        gracz.ostatniaInterakcja = interaction;
        if (gracz.abilitkaUzyta) {
            await interaction.reply({ content: "❗ Już wykorzystałeś swoją umiejętność w tej walce.", ephemeral: true });
            return;
        }

        gracz.abilitkaUzyta = true;
        const info = MAMMON_ABILITKI[gracz.abilitka];
        let logWpis = "";

        switch (gracz.abilitka) {
            case "dmg50": {
                stan.hp = Math.max(0, stan.hp - 50);
                gracz.obrazeniaZadane += 50;
                logWpis = `💥 <@${interaction.user.id}> użył **${info.nazwa}** - Mammon traci 50 HP!`;
                break;
            }
            case "blokada5s": {
                stan.blokadaAtakuDo = Date.now() + 5000;
                stan.blokadaAtakuGracz = interaction.user.id;
                logWpis = `🛡️ <@${interaction.user.id}> użył **${info.nazwa}** - przez 5 sekund tylko on może atakować Mammona!`;
                break;
            }
            case "czas10s": {
                if (stan.timeoutKoniec) {
                    clearTimeout(stan.timeoutKoniec);
                    const pozostaloDoKonca = stan.czasZakonczeniaWalki - Date.now() + 10000;
                    stan.czasZakonczeniaWalki += 10000;
                    stan.timeoutKoniec = setTimeout(() => zakonczWalkeMammon(interaction.guild.id, false), pozostaloDoKonca);
                }
                logWpis = `⏳ <@${interaction.user.id}> użył **${info.nazwa}** - wszyscy dostają +10 sekund na pokonanie Mammona!`;
                break;
            }
            case "blokujUlt": {
                const uczestnicyLista = [...stan.uczestnicy.entries()];
                const [celId, celGracz] = uczestnicyLista[Math.floor(Math.random() * uczestnicyLista.length)];
                celGracz.ultZablokowany = true;
                logWpis = `🔒 <@${interaction.user.id}> użył **${info.nazwa}** - <@${celId}> ma zablokowanego ULT na resztę starcia!`;
                break;
            }
            case "leczmamona": {
                const ile = losowaLiczba(10, 100);
                stan.maxHp += ile;
                stan.hp += ile;
                logWpis = `🧪 <@${interaction.user.id}> użył **${info.nazwa}** - Mammon odzyskuje +${ile} HP!`;
                break;
            }
        }

        stan.dziennik.push(logWpis);
        if (stan.dziennik.length > 5) stan.dziennik.shift();

        // Ackujemy natychmiast (deferUpdate jest lokalny i szybki) - dopiero PO tym
        // robimy wolniejszą edycję publicznej wiadomości, żeby nie przekroczyć
        // 3-sekundowego okna Discorda na potwierdzenie kliknięcia
        await interaction.deferUpdate().catch(() => {});

        if (stan.hp <= 0) {
            await zakonczWalkeMammon(interaction.guild.id, true);
            await interaction.editReply({ content: "💀 Zadałeś ostateczny cios!", embeds: [], components: [] }).catch(() => {});
            return;
        }

        await aktualizujPublicznaMammona(stan, true);
        await interaction.editReply(panelGraczaMammon(stan, gracz)).catch(() => {});
        return;
    }

       if (interaction.customId.startsWith("animacja_wlacz_") || interaction.customId.startsWith("animacja_wylacz_")) {
        const czesci = interaction.customId.split("_");
        const akcja = czesci[1];
        const animacja = czesci[2];
        const wartosc = akcja === "wlacz" ? 1 : 0;
        await interaction.deferReply({ ephemeral: true });
        const obecne = await getUstawienia(interaction.user.id, interaction.guild.id);
        let nowyRoll = obecne.animacja_roll;
        let nowyPlecak = obecne.animacja_plecak;
        if (animacja === "roll") nowyRoll = wartosc;
        else if (animacja === "wymiana") nowyPlecak = wartosc;
        else if (animacja === "all") {
            nowyRoll = wartosc;
            nowyPlecak = wartosc;
        }
        await db.execute({
            sql: "INSERT INTO ustawienia (user_id, guild_id, animacja_roll, animacja_plecak) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, guild_id) DO UPDATE SET animacja_roll = ?, animacja_plecak = ?",
            args: [interaction.user.id, interaction.guild.id, nowyRoll, nowyPlecak, nowyRoll, nowyPlecak],
        });
        const komunikat = akcja === "wlacz" ? "✅ Animacja została włączona!" : "❌ Animacja została wyłączona!";
        await interaction.editReply({ content: komunikat });
        return;
    }

    if (interaction.customId.startsWith("kawiarnia_odbior_")) {
        const userId = interaction.customId.replace("kawiarnia_odbior_", "");
        if (interaction.user.id !== userId) {
            await interaction.reply({ content: "❗ To nie twoja kawiarnia!", ephemeral: true });
            return;
        }

        await interaction.deferUpdate().catch(() => {});

        const { dostepne } = await odbierzKawiarnie(interaction.user.id, interaction.guild.id);

        if (dostepne <= 0) {
            await interaction.followUp({ content: "❗ Nie masz jeszcze nic do odebrania z kawiarni! Wróć za jakiś czas.", ephemeral: true }).catch(() => {});
            return;
        }

        const btnOdebrane = new ButtonBuilder()
            .setCustomId(`kawiarnia_odbior_${userId}`)
            .setLabel("☕ Odbierz")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true);

        await interaction.editReply({ components: [new ActionRowBuilder().addComponents(btnOdebrane)] }).catch(() => {});
        await interaction.followUp({ content: `☕ Odebrałeś **${dostepne} Solid Dice** <:Red_roll:1512521789748547715>!`, ephemeral: true }).catch(() => {});
        return;
    }

    if (interaction.customId.startsWith("wymiana_nie_")) {
        await interaction.update({ content: "❌ Anulowano wymianę.", embeds: [], components: [] });
        return;
    }

    if (interaction.customId.startsWith("wymiana_tak_")) {
        const czesci = interaction.customId.split("_");
        const userId = czesci[2];
        const rzadkosc = czesci[3];

        if (interaction.user.id !== userId) {
            await interaction.reply({ content: "❗ To nie twoja wymiana!", ephemeral: true });
            return;
        }

        await interaction.update({ content: "⏳ Przetwarzanie...", embeds: [], components: [] });

        const progi = {
            epicki: { wymagane: 20, solidDice: 2 },
            rzadki: { wymagane: 50, solidDice: 1 },
            zwykly: { wymagane: 130, solidDice: 1 },
        };

        const kategorie = rzadkosc === "all" ? ["epicki", "rzadki", "zwykly"] : [rzadkosc];
        let lacznieSolidDice = 0;
        let podsumowanie = "";

        for (const kat of kategorie) {
            const { lacznieItemow, szczegoly } = await policzItemy(interaction.user.id, interaction.guild.id, kat);
            const prog = progi[kat];
            const nazwyKategorii = { epicki: "Epickie", rzadki: "Rzadkie", zwykly: "Zwykłe" };

            if (lacznieItemow < prog.wymagane) {
                podsumowanie += `**${nazwyKategorii[kat]}:** Nie masz wystarczającej ilości itemów (${lacznieItemow}/${prog.wymagane})\n`;
                continue;
            }

            const iloscWymian = Math.floor(lacznieItemow / prog.wymagane);
            const itemowWymieniono = iloscWymian * prog.wymagane;
            const itemowZostalo = lacznieItemow - itemowWymieniono;
            const solidDiceZysk = iloscWymian * prog.solidDice;
            lacznieSolidDice += solidDiceZysk;

            let doUsuniecia = itemowWymieniono;
            for (const row of szczegoly) {
                if (doUsuniecia <= 0) break;
                const usun = Math.min(Number(row.ilosc), doUsuniecia);
                await db.execute({
                    sql: "UPDATE ekwipunek SET ilosc = ilosc - ? WHERE user_id = ? AND guild_id = ? AND item_nazwa = ?",
                    args: [usun, interaction.user.id, interaction.guild.id, row.item_nazwa],
                });
                doUsuniecia -= usun;
            }

            await db.execute({
                sql: "DELETE FROM ekwipunek WHERE user_id = ? AND guild_id = ? AND ilosc <= 0",
                args: [interaction.user.id, interaction.guild.id],
            });

            await addSolidDice(interaction.user.id, interaction.guild.id, solidDiceZysk);
            podsumowanie += `**${nazwyKategorii[kat]}:** Wymieniono ${itemowWymieniono} itemów → +${solidDiceZysk} <:Red_roll:1512521789748547715> | Pozostało: ${itemowZostalo} itemów\n`;
        }

        if (lacznieSolidDice === 0 && !podsumowanie.includes("Wymieniono")) {
            await interaction.editReply({ content: "❗ Nie masz wystarczającej ilości itemów do wymiany!", embeds: [], components: [] });
            return;
        }

        await pokazAnimacje(interaction);

        const embedWynik = new EmbedBuilder()
            .setColor(lacznieSolidDice > 0 ? 0x00FF00 : 0xFF0000)
            .setTitle("🔄 Wynik Wymiany")
            .setDescription(podsumowanie)
            .addFields({ name: "Łącznie zdobyte", value: `**${lacznieSolidDice} Solid Dice** 🎲` })
            .setTimestamp();

        await interaction.editReply({ content: "", embeds: [embedWynik] });
        return;
    }

}

    if (!interaction.isChatInputCommand()) return;

    const ustawienia = await db.execute({
        sql: "SELECT kanal_id FROM serwery WHERE guild_id = ?",
        args: [interaction.guild.id],
    });

    const komendyEkonomii = ["daily", "work", "skillissues", "pinkpawsheist", "kawiarnia", "delivery", "łowienie", "wyścig", "mahjong", "skiny", "roll", "plecak", "wymiana", "animacje", "pingcooldown"];

    if (komendyEkonomii.includes(interaction.commandName)) {
        const kanal = ustawienia.rows[0]?.kanal_id;
        if (kanal &&  interaction.channelId !== kanal) {
            await interaction.reply({ content: `Te komendy możesz używać tylko na kanale <#${kanal}>!`, ephemeral: true});
            return;
        }
    }

    if (interaction.commandName === "daily") {
        await interaction.deferReply();

        const cooldown = await checkcooldown(interaction.user.id , interaction.guild.id, "daily", KOMENDY_COOLDOWN_MS.daily);
        if (cooldown) {
            await interaction.editReply({ content: cooldown });
            return;
        }
        const ilosc = Math.floor(Math.random() * 5) + 10;
        await addSolidDice(interaction.user.id, interaction.guild.id, ilosc);

        const wiadomosci = [
            "Wykonałeś/aś codzienne misje",
            "Odebrałeś/aś daily",
            "Wbiłeś/aś do gry i wykonałeś/aś zadania",
            "Zalogowałeś/aś się do gry",
        ];
        
        const wiadomosc = wiadomosci[Math.floor(Math.random() * wiadomosci.length)];
        const obrazek = new AttachmentBuilder("./Gra/Red_roll.jpg");

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle("<:Red_roll:1512521789748547715> Daily")
            .setDescription(wiadomosc)
            .addFields({ name: "Otrzymałeś/aś", value: `**${ilosc} Solid Dice** <:Red_roll:1512521789748547715>`})
            .setThumbnail("attachment://Red_roll.jpg")

        await interaction.editReply({ embeds: [embed], files: [obrazek]});
    }

    if (interaction.commandName === "removecooldown") {
        await interaction.deferReply({ ephemeral: true });

        if (!(await czyAdministratorBota(interaction))) {
            await interaction.editReply({ content: "❗ Nie masz uprawnień" });
            return;
        }

        const user = interaction.options.getUser("user")

        const maBypass = await czyMaBypassCooldown(user.id, interaction.guild.id);

        if (maBypass) {
            await db.execute({
                sql: "DELETE FROM cooldown_bypass WHERE user_id = ? AND guild_id = ?",
                args: [user.id, interaction.guild.id],
            });
            await interaction.editReply({ content: `✅ Cooldowny wróciły do normy dla ${user}.` });
        } else {
            await db.execute({
                sql: "INSERT INTO cooldown_bypass (user_id, guild_id) VALUES (?, ?)",
                args: [user.id, interaction.guild.id],
            });
            await db.execute({
                sql: "DELETE FROM cooldowny WHERE user_id = ? AND guild_id = ? and komenda IN ('daily', 'work', 'skillissues', 'pinkpawsheist', 'kawiarnia', 'delivery', 'łowienie', 'wyścig', 'mahjong')",
                args: [user.id, interaction.guild.id]
            });
            await interaction.editReply({ content: `✅ ${user} może teraz używać komend ekonomii bez cooldownu - aż ktoś ponownie wpisze \`/removecooldown\` dla tego użytkownika.` });
        }
    }

    if (interaction.commandName === "administracja") {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !OWNER_IDS.includes(interaction.user.id)) {
            await interaction.editReply({ content: "❗ Tylko osoby z uprawnieniem Administrator mogą ustawiać rolę zarządzającą botem." });
            return;
        }

        const rola = interaction.options.getRole("rola");

        await db.execute({
            sql: "INSERT INTO administracja (guild_id, rola_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET rola_id = ?",
            args: [interaction.guild.id, rola.id, rola.id],
        });

        await interaction.editReply({ content: `✅ Rola ${rola} może teraz używać \`/ntegra\` i \`/removecooldown\`.` });
    }

    if (interaction.commandName === "ntegra") {
        await interaction.deferReply({ ephemeral: true });

        if (!(await czyAdministratorBota(interaction))) {
            await interaction.editReply({ content: "❗ Nie masz uprawnień" });
            return;
        }

        const kanal = interaction.options.getChannel("kanal");

        await db.execute({
            sql: "INSERT INTO serwery (guild_id, kanal_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET kanal_id = ?",
            args: [interaction.guild.id, kanal.id, kanal.id],
        });

        await interaction.editReply({ content: `✅ Kanał ekonomii ustawiony na ${kanal}.` });
    }

    if (interaction.commandName === "addskin") {
        await interaction.deferReply({ ephemeral: true });

        if (!OWNER_IDS.includes(interaction.user.id)) {
            await interaction.editReply({ content: "❗ Nie masz uprawnień" });
            return;
        }

        const plik = interaction.options.getString("plik").trim();
        const nazwa = interaction.options.getString("nazwa").trim();

        if (!existsSync(`./Gra/skins/${plik}`)) {
            await interaction.editReply({ content: `❗ Nie znaleziono pliku \`Gra/skins/${plik}\`. Wgraj plik na serwer przed dodaniem skina.` });
            return;
        }

        await db.execute({
            sql: "INSERT INTO skiny (plik, nazwa) VALUES (?, ?) ON CONFLICT(plik) DO UPDATE SET nazwa = ?",
            args: [plik, nazwa, nazwa],
        });

        await interaction.editReply({ content: `✅ Skin **${nazwa}** (\`${plik}\`) jest teraz dostępny w \`/skiny\`.` });
    }

    if (interaction.commandName === "mammonevent") {
        await interaction.deferReply({ ephemeral: true });

        if (!(await czyAdministratorBota(interaction))) {
            await interaction.editReply({ content: "❗ Nie masz uprawnień" });
            return;
        }

        if (aktywneMammony.has(interaction.guild.id)) {
            await interaction.editReply({ content: "❗ Mammon już jest aktywny na tym serwerze!" });
            return;
        }

        const ustawieniaSerwera = await db.execute({
            sql: "SELECT kanal_id FROM serwery WHERE guild_id = ?",
            args: [interaction.guild.id],
        });
        const kanalId = ustawieniaSerwera.rows[0]?.kanal_id;
        if (!kanalId) {
            await interaction.editReply({ content: "❗ Najpierw ustaw kanał komendą /ntegra." });
            return;
        }

        const kanal = await interaction.guild.channels.fetch(kanalId).catch(() => null);
        if (!kanal) {
            await interaction.editReply({ content: "❗ Nie mogę znaleźć skonfigurowanego kanału. Ustaw go ponownie przez /ntegra." });
            return;
        }

        await odpalMammona(interaction.guild.id, kanal);
        await interaction.editReply({ content: `✅ Mammon przywołany na ${kanal}!` });
    }

    if (interaction.commandName === "nteleaderboard") {
        await interaction.deferReply();

        const wynik = await db.execute ({
            sql: "SELECT user_id, solid_dice_total FROM ekonomia WHERE guild_id = ? ORDER BY solid_dice_total DESC LIMIT 10",
            args: [interaction.guild.id],
        });

        if (wynik.rows.length === 0) {
            await interaction.editReply({ content: "❗ Brak danych w rankingu" });
            return;
        }

        const lista = wynik.rows.slice(0, 10).map((row, index) =>
        `**${index + 1}.** <@${row.user_id}> - **${row.solid_dice_total} <:Red_roll:1512521789748547715>** `
            ).join("\n");
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle("🏆 Ranking Solid Dice")
            .setDescription(lista);

        await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "work") {
        await interaction.deferReply();

        const cooldown = await checkcooldown(interaction.user.id, interaction.guild.id, "work", KOMENDY_COOLDOWN_MS.work);
        if (cooldown) {
            await interaction.editReply({ content: cooldown });
            return;
        }

        const ilosc = Math.floor(Math.random() * 5) + 5;
        await addSolidDice(interaction.user.id, interaction.guild.id, ilosc);

        const wiadomosci = [
            "Znalazłeś anomalie",
            "Wygrałeś/aś wyścig",
            "Użyłeś Chizz i złapałeś/aś moby do pokeballa",
            "Zrealizowałeś/aś kody",
            "Znalazłeś portfel na ulicy",
            "Pomogłeś policji",
            "Nie przejechałeś/aś żadnego człowieka",
            "Zagrałeś szybką partię Mahjonga w lokalnym klubie i ograłeś stałych bywalców.",
            "Uciekłeś/aś z więzienia",
            "Poprawnie wykonałeś zadanie", 
            "Szef nie miał dziś do Ciebie pretensji", 
            "Zwykły dzień w pracy dobra robota",
            "Nie zapomniałeś parasola jak dziś wracałeś/aś z pracy", 
            "Wieszak nie wystrzelił Nahidy z procy",
            "Wieszak nie powiedział skill issues",

        ];
        
        const wiadomosc = wiadomosci[Math.floor(Math.random() * wiadomosci.length)];
        const obrazek = new AttachmentBuilder("./Gra/Red_roll.jpg");

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle("<:Red_roll:1512521789748547715> Work")
            .setDescription(wiadomosc)
            .addFields({ name: "Otrzymałeś/aś", value: `**${ilosc} Solid DIce** <:Red_roll:1512521789748547715>`}) 
            .setThumbnail("attachment://Red_roll.jpg")

        await interaction.editReply({ embeds: [embed], files: [obrazek] });
    }

    if (interaction.commandName === "kawiarnia") {
        await interaction.deferReply();

        const ostatnio = await getKawiarniaOstatnio(interaction.user.id, interaction.guild.id);
        const { dostepne, teraz } = obliczKawiarnie(ostatnio);

        const embed = new EmbedBuilder()
            .setColor(0x8B5A2B)
            .setTitle("☕ Kawiarnia")
            .setDescription("Kawiarnia produkuje **1 Solid Dice** co godzinę (max **48**).")
            .addFields(
                { name: "Dostępne do odebrania", value: `**${dostepne} Solid Dice** <:Red_roll:1512521789748547715>` },
                { name: "Czas od ostatniego odebrania", value: formatCzas(teraz - ostatnio) },
            );

        const btnOdbierz = new ButtonBuilder()
            .setCustomId(`kawiarnia_odbior_${interaction.user.id}`)
            .setLabel("☕ Odbierz")
            .setStyle(ButtonStyle.Success)
            .setDisabled(dostepne <= 0);

        const row = new ActionRowBuilder().addComponents(btnOdbierz);

        await interaction.editReply({ content: "", embeds: [embed], components: [row] });
    }

    if (interaction.commandName === "wyścig") {
        await interaction.deferReply();

        const cooldown = await checkcooldown(interaction.user.id, interaction.guild.id, "wyścig", KOMENDY_COOLDOWN_MS["wyścig"]);
        if (cooldown) {
            await interaction.editReply({ content: cooldown });
            return;
        }

        const WYSCIG_TICKI = 5;
        const WYSCIG_TICK_MS = 1200;

        // tor[t] = pas zajęty przez przeszkodę, która dociera do auta w ticku t (0=lewy, 1=prawy, null=wolna droga).
        // Wzory bez dwóch przeszkód tick po ticku, żeby dało się zareagować mimo opóźnień Discorda.
        const tor = new Array(WYSCIG_TICKI + 1).fill(null);
        const wzoryPrzeszkod = [[2, 4], [1, 3], [3, 5], [1, 4], [2, 5], [1, 3, 5]];
        const wzor = wzoryPrzeszkod[Math.floor(Math.random() * wzoryPrzeszkod.length)];
        const emotkiPrzeszkod = {};
        for (const t of wzor) {
            tor[t] = Math.floor(Math.random() * 2);
            emotkiPrzeszkod[t] = Math.random() < 0.5 ? "🚧" : "🪨";
        }

        let pas = Math.floor(Math.random() * 2);
        let tick = 0;
        let rozbity = false;
        let zakonczony = false;

        const rysujRzad = (lewy, prawy, idx) => `🌴${lewy}${idx % 2 === 0 ? "⬛" : "⬜"}${prawy}🌴`;

        const rysujPlansze = () => {
            const rzedy = [];
            for (let d = 4; d >= 1; d--) {
                const idx = tick + d;
                let lewy = "⬛", prawy = "⬛";
                if (idx <= WYSCIG_TICKI && tor[idx] !== null) {
                    if (tor[idx] === 0) lewy = emotkiPrzeszkod[idx];
                    else prawy = emotkiPrzeszkod[idx];
                } else if (idx === WYSCIG_TICKI + 1) {
                    lewy = "🏁";
                    prawy = "🏁";
                }
                rzedy.push(rysujRzad(lewy, prawy, idx));
            }
            const auto = rozbity ? "💥" : "🏎️";
            rzedy.push(rysujRzad(pas === 0 ? auto : "⬛", pas === 1 ? auto : "⬛", tick));
            return rzedy.join("\n");
        };

        const przyciskiWyscigu = (wylaczone) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("wyscig_lewo").setLabel("⬅️ Lewo").setStyle(ButtonStyle.Primary).setDisabled(wylaczone),
            new ButtonBuilder().setCustomId("wyscig_prawo").setLabel("➡️ Prawo").setStyle(ButtonStyle.Primary).setDisabled(wylaczone),
        );

        const naglowekWyscigu = `🏁 **Wyścig** - ${interaction.user.username} | Omijaj przeszkody i dojedź do mety!\n\n`;

        const wiadomoscWyscigu = await interaction.editReply({
            content: naglowekWyscigu + rysujPlansze(),
            components: [przyciskiWyscigu(false)],
        });

        const collectorWyscigu = wiadomoscWyscigu.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: (WYSCIG_TICKI + 2) * WYSCIG_TICK_MS + 10000,
        });

        collectorWyscigu.on("collect", async (i) => {
            try {
                if (zakonczony) {
                    await i.deferUpdate().catch(() => {});
                    return;
                }
                pas = i.customId === "wyscig_lewo" ? 0 : 1;
                await i.update({ content: naglowekWyscigu + rysujPlansze(), components: [przyciskiWyscigu(false)] });
            } catch (error) {
                console.error("Błąd w /wyścig:", error);
            }
        });

        for (let t = 1; t <= WYSCIG_TICKI; t++) {
            await new Promise(r => setTimeout(r, WYSCIG_TICK_MS));
            tick = t;
            if (tor[t] !== null && tor[t] === pas) {
                rozbity = true;
                break;
            }
            await interaction.editReply({ content: naglowekWyscigu + rysujPlansze(), components: [przyciskiWyscigu(false)] }).catch(() => {});
        }

        zakonczony = true;
        collectorWyscigu.stop();

        if (rozbity) {
            await interaction.editReply({
                content: naglowekWyscigu + rysujPlansze() + "\n\n💥 **Rozbiłeś się!** Nie zdobywasz Solid Dice - spróbuj ponownie za godzinę.",
                components: [przyciskiWyscigu(true)],
            }).catch(() => {});
        } else {
            const nagrodaWyscigu = losowaLiczba(5, 15);
            await addSolidDice(interaction.user.id, interaction.guild.id, nagrodaWyscigu);
            await interaction.editReply({
                content: naglowekWyscigu + rysujPlansze() + `\n\n🏆 **Meta!** Zdobywasz **+${nagrodaWyscigu}** <:Red_roll:1512521789748547715>!`,
                components: [przyciskiWyscigu(true)],
            }).catch(() => {});
        }
    }

    if (interaction.commandName === "mahjong") {
        await interaction.deferReply();

        const cooldown = await checkcooldown(interaction.user.id, interaction.guild.id, "mahjong", KOMENDY_COOLDOWN_MS.mahjong);
        if (cooldown) {
            await interaction.editReply({ content: cooldown });
            return;
        }
        await rozpocznijMajong(interaction, { addSolidDice, losowaLiczba });
        return;
    }

    if (interaction.commandName === "łowienie") {
        await interaction.deferReply();

        const cooldown = await checkcooldown(interaction.user.id, interaction.guild.id, "łowienie", KOMENDY_COOLDOWN_MS["łowienie"]);
        if (cooldown) {
            await interaction.editReply({ content: cooldown });
            return;
        }

        const LOWIENIE_CEL = 3;
        const LOWIENIE_CZAS_MS = 25000;
        const LOWIENIE_SZEROKOSC = 5;

        let pozycja = 2;
        let ryba = 0;
        let zlowione = 0;
        let koniecLowienia = false;
        const koniecCzasu = Date.now() + LOWIENIE_CZAS_MS;

        const losujRybe = () => {
            let nowa;
            do {
                nowa = Math.floor(Math.random() * LOWIENIE_SZEROKOSC);
            } while (nowa === pozycja || nowa === ryba);
            return nowa;
        };
        ryba = losujRybe();

        const rysujJezioro = () => {
            const pozostaloS = Math.max(0, Math.ceil((koniecCzasu - Date.now()) / 1000));
            const rzadLodki = Array.from({ length: LOWIENIE_SZEROKOSC }, (_, i) => (i === pozycja ? "<:ShinkuStare:1523709064910213221>" : "🌫️")).join("");
            const rzadZyłki = Array.from({ length: LOWIENIE_SZEROKOSC }, (_, i) => (i === pozycja ? "🪝" : "🌊")).join("");
            const rzadRyby = Array.from({ length: LOWIENIE_SZEROKOSC }, (_, i) => (i === ryba ? "<:ryba:1523710391614439425>" : "🌊")).join("");
            return `🎣 **Łowienie** - ${interaction.user.username}\nZłap **${LOWIENIE_CEL} ryby** zanim skończy się czas! Najedź hakiem nad rybę i kliknij **Łów**.\n\n${rzadLodki}\n${rzadZyłki}\n${rzadRyby}\n🌊🌊🌊🌊🌊\n\n🐟 Złowione: **${zlowione}/${LOWIENIE_CEL}** | ⏱️ Pozostało: **${pozostaloS}s**`;
        };

        const przyciskiLowienia = (wylaczone) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("lowienie_lewo").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(wylaczone),
            new ButtonBuilder().setCustomId("lowienie_low").setLabel("🎣 Łów").setStyle(ButtonStyle.Success).setDisabled(wylaczone),
            new ButtonBuilder().setCustomId("lowienie_prawo").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(wylaczone),
        );

        const wiadomoscLowienia = await interaction.editReply({
            content: rysujJezioro(),
            components: [przyciskiLowienia(false)],
        });

        const collectorLowienia = wiadomoscLowienia.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: LOWIENIE_CZAS_MS + 5000,
        });

        const zakonczLowienie = async (wygrana) => {
            if (koniecLowienia) return;
            koniecLowienia = true;
            clearInterval(interwalZegara);
            clearTimeout(timeoutLowienia);
            collectorLowienia.stop();

            if (wygrana) {
                const nagrodaLowienia = losowaLiczba(1, 10);
                await addSolidDice(interaction.user.id, interaction.guild.id, nagrodaLowienia);
                await interaction.editReply({
                    content: rysujJezioro() + `\n\n🏆 **Złapałeś wszystkie ryby!** Zdobywasz **+${nagrodaLowienia}** <:Red_roll:1512521789748547715>!`,
                    components: [przyciskiLowienia(true)],
                }).catch(() => {});
            } else {
                const strata = losowaLiczba(1, 5);
                const saldo = await getSolidDice(interaction.user.id, interaction.guild.id);
                const realnaStrata = Math.min(strata, saldo);
                if (realnaStrata > 0) {
                    await db.execute({
                        sql: "UPDATE ekonomia SET solid_dice = solid_dice - ? WHERE user_id = ? AND guild_id = ?",
                        args: [realnaStrata, interaction.user.id, interaction.guild.id],
                    });
                }
                await interaction.editReply({
                    content: rysujJezioro() + `\n\n🐟💨 **Ryby uciekły!** Czas minął - złowiłeś ${zlowione}/${LOWIENIE_CEL}. Tracisz **-${realnaStrata}** <:Red_roll:1512521789748547715>.`,
                    components: [przyciskiLowienia(true)],
                }).catch(() => {});
            }
        };

        const timeoutLowienia = setTimeout(() => zakonczLowienie(false), LOWIENIE_CZAS_MS);
        const interwalZegara = setInterval(() => {
            if (!koniecLowienia) interaction.editReply({ content: rysujJezioro(), components: [przyciskiLowienia(false)] }).catch(() => {});
        }, 3000);

        collectorLowienia.on("collect", async (i) => {
            try {
                if (koniecLowienia) {
                    await i.deferUpdate().catch(() => {});
                    return;
                }

                if (i.customId === "lowienie_lewo") pozycja = Math.max(0, pozycja - 1);
                else if (i.customId === "lowienie_prawo") pozycja = Math.min(LOWIENIE_SZEROKOSC - 1, pozycja + 1);
                else if (i.customId === "lowienie_low" && pozycja === ryba) {
                    zlowione++;
                    if (zlowione >= LOWIENIE_CEL) {
                        await i.deferUpdate().catch(() => {});
                        await zakonczLowienie(true);
                        return;
                    }
                    ryba = losujRybe();
                }

                await i.update({ content: rysujJezioro(), components: [przyciskiLowienia(false)] });
            } catch (error) {
                console.error("Błąd w /łowienie:", error);
            }
        });
    }

    if (interaction.commandName === "roll") {
    await interaction.deferReply();

    const portfel = await db.execute({
        sql: "SELECT solid_dice FROM ekonomia WHERE user_id = ? AND guild_id = ?",
        args: [interaction.user.id, interaction.guild.id],
    });

    const solidDice = portfel.rows.length > 0 ? Number(portfel.rows[0].solid_dice) : 0;

    if (solidDice < 10) {
        await interaction.editReply({ content: `❗ Nie masz wystarczająco Solid Dice! Posiadasz **${solidDice}/10** <:Red_roll:1512521789748547715>` });
        return;
    }

    await db.execute({
        sql: "UPDATE ekonomia SET solid_dice = solid_dice - 10 WHERE user_id = ? AND guild_id = ?",
        args: [interaction.user.id, interaction.guild.id],
    });

    const wylosowane = [];
    let solidDiceZwrot = 0;

    for (let i = 0; i < 10; i++) {
        const kategoria = losujKategorie();
        const item = losujItem(kategoria);
        const wynik = await przetworzItem(interaction.user.id, interaction.guild.id, item);
        wylosowane.push({ ...wynik, kategoria });
        solidDiceZwrot += wynik.solidDice;
    }

    const emoji = {
        legendarny: "<:Mint:1523097622187999365>",
        epicki: "<:Nanallyyy:1523097616722952345>",
        rzadki: "<:MintShock:1523097608548257824>",
        zwykly: "<:MintShock:1523097608548257824>",
    };

    const lista = wylosowane.map((w, i) =>
        `${i + 1}. ${emoji[w.kategoria]} ${w.wyswietlana}`
    ).join("\n");

    const obrazek = new AttachmentBuilder("./Gra/Red_roll.jpg");

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("🎲 Wyniki Rollowania!")
        .setDescription(lista)
        .addFields({ name: "Solid Dice zwrot", value: `**${solidDiceZwrot} <:Red_roll:1512521789748547715>**` })
        .setThumbnail("attachment://Red_roll.jpg")
        .setTimestamp();    

        const przyciskRzadkosci = new ButtonBuilder()
        .setCustomId("roll_rzadkosc")
        .setLabel("📊 Zobacz możliwe do zdobycia rzadkości")
        .setStyle(ButtonStyle.Secondary);
    const rzadkoscRow = new ActionRowBuilder().addComponents(przyciskRzadkosci)

    const ustawieniaRoll = await getUstawienia(interaction.user.id, interaction.guild.id);
        if (ustawieniaRoll.animacja_roll === 1) {
            await pokazRollAnimacje(interaction);
            await interaction.editReply({ content: "", embeds: [embed], files: [obrazek], components: [rzadkoscRow] });
        } else {
            await interaction.editReply({ content: "", embeds: [embed], files: [obrazek], components: [rzadkoscRow] });
        }
}

if (interaction.commandName === "plecak") {
    await interaction.deferReply();

    const ekwipunek = await db.execute({
        sql: "SELECT item_nazwa, ilosc FROM ekwipunek WHERE user_id = ? AND guild_id = ?",
        args: [interaction.user.id, interaction.guild.id],
    });

    const postacie = await db.execute({
        sql: "SELECT postac, ilosc FROM postacie WHERE user_id = ? AND guild_id = ? ORDER BY postac ASC",
        args: [interaction.user.id, interaction.guild.id],
    });

    const ekonomia = await db.execute({
        sql: "SELECT solid_dice, solid_dice_total FROM ekonomia WHERE user_id = ? AND guild_id = ?",
        args: [interaction.user.id, interaction.guild.id],
    });

    const posiadaneSkiny = await getPosiadaneSkinyZNazwami(interaction.user.id, interaction.guild.id);

    const zdjeciaPostaci = {
    "Adler": "Adler.jpg",
    "Aurelia": "Aurelia.jpg",
    "Baicang": "Baicang.jpg",
    "Chaos": "Chaos.jpg",
    "Chiz": "Chiz.jpg",
    "Daffodill": "Daffodill.jpg",
    "Edgar": "Edgar.jpg",
    "Fadia": "Fadia.jpg",
    "Haniel": "Haniel.jpg",
    "Hator": "Hator.jpg",
    "Hotori": "Hotori.jpg",
    "Jiuyuan": "Jiuyuan.jpg",
    "Lacrimosa": "Lacrimosa.jpg",
    "Mint": "Mint.jpg",
    "Nanally": "Nanally.jpg",
    "Sakiri": "Sakiri.jpg",
    "Skia": "Skia.jpg"
};

    let epickieSzt = 0, rzadkieSzt = 0, zwykleSzt = 0;
    const nazwyEpickie = items.epicki.map(i => i.nazwa);
    const nazwyRzadkie = items.rzadki.map(i => i.nazwa);
    const nazwyZwykle = items.zwykly.map(i => i.nazwa);

    for (const wiersz of ekwipunek.rows) {
        const ilosc = Number(wiersz.ilosc);
        if (nazwyEpickie.includes(wiersz.item_nazwa)) epickieSzt += ilosc;
        else if (nazwyRzadkie.includes(wiersz.item_nazwa)) rzadkieSzt += ilosc;
        else if (nazwyZwykle.includes(wiersz.item_nazwa)) zwykleSzt += ilosc;
    }

    const solidDiceAktualne = ekonomia.rows.length > 0 ? Number(ekonomia.rows[0].solid_dice) : 0;
    const solidDiceTotal = ekonomia.rows.length > 0 ? Number(ekonomia.rows[0].solid_dice_total) : 0;
    const sumaRolli = solidDiceTotal / 10;

    const rankingWynik = await db.execute({
        sql: "SELECT COUNT(*) AS wyzsi FROM ekonomia WHERE guild_id = ? AND solid_dice_total > ?",
        args: [interaction.guild.id, solidDiceTotal],
    });
    const pozycjaTop = Number(rankingWynik.rows[0].wyzsi) + 1;

    const maxStron = postacie.rows.length + 1;

    // Funkcja generująca zawartość danej strony w locie
    const generujStrone = (indeks) => {
        if (indeks === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle(`Plecak - ${interaction.user.username}`)
                .setDescription(`**Itemy:**\n<:Nanallyyy:1523097616722952345> Epickie x${epickieSzt}\n<:MintShock:1523097608548257824> Rzadkie x${rzadkieSzt}\n<:f_mc:1523097583726231563> Zwykłe x${zwykleSzt}\n\n**Solid Dice:**\n<:Red_roll:1512521789748547715> Aktualnie: ${solidDiceAktualne}\n<:Red_roll:1512521789748547715> Łącznie zdobyte: ${solidDiceTotal}\n🏆 Miejsce w topce serwera: #${pozycjaTop}`)
                .setFooter({ text: `Strona 1 / ${maxStron}` });
            return { embeds: [embed], files: [] };
        }

        const p = postacie.rows[indeks - 1];
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setDescription(`**Postać: ${p.postac}**\n\n**Zgromadzone kopie**\n**Kopie:** ${p.ilosc}/6\n\n**Statystyki Konta**\n**Rolle:** ${Math.floor(sumaRolli)} | **Top:** #${pozycjaTop}`)
            .setFooter({ text: `Strona ${indeks + 1} / ${maxStron}` });

        const pliki = [];
        if (zdjeciaPostaci[p.postac]) {
            const nazwaPliku = zdjeciaPostaci[p.postac];
            const attachment = new AttachmentBuilder(`./Gra/${nazwaPliku}`);
            embed.setImage(`attachment://${nazwaPliku}`);
            pliki.push(attachment);
        }

        return { embeds: [embed], files: pliki };
    };

    const generujStronaSkinyGracza = (indeks) => {
        const skin = posiadaneSkiny[indeks];
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle(`Skiny - ${interaction.user.username}`)
            .setImage(`attachment://${skin.plik}`)
            .setFooter({ text: `${skin.nazwa} • Skin ${indeks + 1}/${posiadaneSkiny.length}` });

        const attachment = new AttachmentBuilder(`./Gra/skins/${skin.plik}`, { name: skin.plik });

        return { embeds: [embed], files: [attachment] };
    };

    let tryb = "plecak";

    const przyciskPoprzedni = new ButtonBuilder().setCustomId("poprzednia").setLabel("Poprzedni").setStyle(ButtonStyle.Primary).setDisabled(true);
    const przyciskSzukaj = new ButtonBuilder().setCustomId("szukaj_postac").setLabel("🔍 Szukaj").setStyle(ButtonStyle.Secondary).setDisabled(postacie.rows.length === 0);
    const przyciskNastepny = new ButtonBuilder().setCustomId("nastepna").setLabel("Nastepny").setStyle(ButtonStyle.Primary).setDisabled(maxStron <= 1);
    const przyciskSkiny = new ButtonBuilder().setCustomId("plecak_skiny_toggle").setLabel("🎨 Skiny").setStyle(ButtonStyle.Secondary).setDisabled(posiadaneSkiny.length === 0);
    const wierszPrzyciskow = new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny, przyciskSkiny);

    let aktualnaStrona = 0;
    let aktualnaStronaSkiny = 0;
    const poczatkowaStrona = generujStrone(aktualnaStrona);

    const wiadomosc = await interaction.editReply({
        embeds: poczatkowaStrona.embeds,
        files: poczatkowaStrona.files,
        components: [wierszPrzyciskow],
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = wiadomosc.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (i) => {
    try {
        if (i.customId === "szukaj_postac") {
            const modal = new ModalBuilder()
                .setCustomId("plecak_szukaj_modal")
                .setTitle("Wyszukaj postać")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("nazwa_postaci")
                            .setLabel("Nazwa postaci")
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

            await i.showModal(modal);
            const submitted = await i.awaitModalSubmit({ time: 60000, filter: (m) => m.user.id === interaction.user.id }).catch(() => null);
            if (!submitted) return;

            const szukanaNazwa = submitted.fields.getTextInputValue("nazwa_postaci").trim().toLowerCase();
            const znalezionyIndeks = postacie.rows.findIndex(p => p.postac.toLowerCase().includes(szukanaNazwa));

            if (znalezionyIndeks === -1) {
                await submitted.reply({ content: `❗ Nie znaleziono postaci "${szukanaNazwa}" w Twoim plecaku.`, ephemeral: true });
                return;
            }

            aktualnaStrona = znalezionyIndeks + 1;
            przyciskPoprzedni.setDisabled(aktualnaStrona === 0);
            przyciskNastepny.setDisabled(aktualnaStrona === maxStron - 1);

            const nowaStronaSzukana = generujStrone(aktualnaStrona);
            await submitted.update({
                embeds: nowaStronaSzukana.embeds,
                files: nowaStronaSzukana.files,
                components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny, przyciskSkiny)]
            });
            return;
        }

        if (i.customId === "plecak_skiny_toggle") {
            tryb = tryb === "plecak" ? "skiny" : "plecak";
            przyciskSkiny.setLabel(tryb === "skiny" ? "🔙 Powrót" : "🎨 Skiny");
            przyciskSzukaj.setDisabled(tryb === "skiny" || postacie.rows.length === 0);
        } else if (i.customId === "poprzednia") {
            if (tryb === "skiny") aktualnaStronaSkiny--; else aktualnaStrona--;
        } else if (i.customId === "nastepna") {
            if (tryb === "skiny") aktualnaStronaSkiny++; else aktualnaStrona++;
        }

        if (tryb === "skiny") {
            przyciskPoprzedni.setDisabled(aktualnaStronaSkiny === 0);
            przyciskNastepny.setDisabled(aktualnaStronaSkiny === posiadaneSkiny.length - 1);
        } else {
            przyciskPoprzedni.setDisabled(aktualnaStrona === 0);
            przyciskNastepny.setDisabled(aktualnaStrona === maxStron - 1);
        }

        const nowaZawartosc = tryb === "skiny" ? generujStronaSkinyGracza(aktualnaStronaSkiny) : generujStrone(aktualnaStrona);

        await i.update({
            embeds: nowaZawartosc.embeds,
            files: nowaZawartosc.files,
            components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny, przyciskSkiny)]
        });
    } catch (error) {
        console.error("Błąd podczas aktualizacji plecaka:", error);
    }
});

    collector.on("end", () => {
        przyciskPoprzedni.setDisabled(true);
        przyciskSzukaj.setDisabled(true);
        przyciskNastepny.setDisabled(true);
        przyciskSkiny.setDisabled(true);
        wiadomosc.edit({ components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny, przyciskSkiny)] }).catch(() => {});
    });
}

if (interaction.commandName === "skiny") {
    await interaction.deferReply();

    const katalog = await getKatalogSkinow();

    if (katalog.length === 0) {
        await interaction.editReply({ content: "❗ Sklep skinów jest aktualnie pusty." });
        return;
    }

    const budujEmbedSklepu = async (skin, posiadany) => {
        const solidDice = await getSolidDice(interaction.user.id, interaction.guild.id);
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle("Sklep ze skinami")
            .setDescription(`Masz **${solidDice}** <:Red_roll:1512521789748547715> w swoim portfelu.`);

        if (skin) {
            embed.setImage(`attachment://${skin.plik}`);
            embed.setFooter({ text: `${skin.nazwa} • ${posiadany ? "Posiadasz" : `${CENA_SKINA} Solid Dice`}` });
        }

        return embed;
    };

    const budujMenu = () => {
        return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("skiny_wybor")
                .setPlaceholder("Wybierz skina")
                .addOptions(katalog.slice(0, 25).map(skin => ({ label: skin.nazwa, value: skin.plik })))
        );
    };

    const wiadomoscSkiny = await interaction.editReply({
        embeds: [await budujEmbedSklepu(null, false)],
        components: [budujMenu()],
    });

    const filterSkiny = (i) => i.user.id === interaction.user.id;
    const collectorSkiny = wiadomoscSkiny.createMessageComponentCollector({ filter: filterSkiny, time: 180000 });

    let wybranySkin = null;

    collectorSkiny.on("collect", async (i) => {
        try {
            if (i.isStringSelectMenu() && i.customId === "skiny_wybor") {
                await i.deferUpdate();

                wybranySkin = katalog.find(s => s.plik === i.values[0]);
                const posiadane = await getPosiadaneSkiny(interaction.user.id, interaction.guild.id);
                const posiadany = posiadane.has(wybranySkin.plik);

                const attachment = new AttachmentBuilder(`./Gra/skins/${wybranySkin.plik}`, { name: wybranySkin.plik });
                const btnKup = new ButtonBuilder()
                    .setCustomId("skiny_kup")
                    .setLabel(posiadany ? "✅ Posiadasz" : `Kup za ${CENA_SKINA}`)
                    .setStyle(posiadany ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setDisabled(posiadany);

                await i.editReply({
                    embeds: [await budujEmbedSklepu(wybranySkin, posiadany)],
                    files: [attachment],
                    components: [budujMenu(), new ActionRowBuilder().addComponents(btnKup)],
                });
                return;
            }

            if (i.isButton() && i.customId === "skiny_kup") {
                await i.deferUpdate();
                if (!wybranySkin) return;

                const wynikZakupu = await kupSkina(interaction.user.id, interaction.guild.id, wybranySkin.plik);

                if (!wynikZakupu.sukces) {
                    const powodTresc = wynikZakupu.powod === "brak_srodkow"
                        ? "❗ Nie masz wystarczająco Solid Dice na ten skin!"
                        : "❗ Już posiadasz ten skin!";
                    await i.followUp({ content: powodTresc, ephemeral: true });
                    return;
                }

                const attachment = new AttachmentBuilder(`./Gra/skins/${wybranySkin.plik}`, { name: wybranySkin.plik });
                const btnPosiadasz = new ButtonBuilder()
                    .setCustomId("skiny_kup")
                    .setLabel("✅ Posiadasz")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                await i.editReply({
                    embeds: [await budujEmbedSklepu(wybranySkin, true)],
                    files: [attachment],
                    components: [budujMenu(), new ActionRowBuilder().addComponents(btnPosiadasz)],
                });
                await i.followUp({ content: `✅ Kupiłeś skin **${wybranySkin.nazwa}**!`, ephemeral: true });
                return;
            }
        } catch (error) {
            console.error("Błąd podczas aktualizacji /skiny:", error);
        }
    });

    collectorSkiny.on("end", () => {
        wiadomoscSkiny.edit({ components: [] }).catch(() => {});
    });
}

if (interaction.commandName === "pinkpawsheist") {
    await interaction.deferReply();

    const cooldown = await checkcooldown(interaction.user.id, interaction.guild.id, "pinkpawsheist", KOMENDY_COOLDOWN_MS.pinkpawsheist);
    if (cooldown) {
        await interaction.editReply({ content: cooldown });
        return;
    }

    const wygrana = Math.random() < 0.5;

    if (wygrana) {
        const ilosc = Math.floor(Math.random() * 30) + 1;
        await addSolidDice(interaction.user.id, interaction.guild.id, ilosc);

        const wiadomosci1 = [
            "Uciekłeś/aś z łupem",
            "Nie zostałeś/aś schwytany/a",
            "Akcja zakończona sukcesem!",
        ];
        const wiadomosc = wiadomosci1[Math.floor(Math.random() * wiadomosci1.length)];

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle("🐾 Pink Paws Heist - Sukces!")
            .setDescription(wiadomosc)
            .addFields({ name: "Otrzymałeś/aś", value: `**+${ilosc} Solid Dice** <:Red_roll:1512521789748547715>` });

        await interaction.editReply({ embeds: [embed] });

    } else {
        const portfel = await db.execute({
            sql: "SELECT solid_dice FROM ekonomia WHERE user_id = ? AND guild_id = ?",
            args: [interaction.user.id, interaction.guild.id],
        });
        const obecneSD = portfel.rows.length > 0 ? Number(portfel.rows[0].solid_dice) : 0;
        const proba = Math.floor(Math.random() * 30) + 1;
        const realnaStrata = Math.min(proba, obecneSD);

        await db.execute({
            sql: "UPDATE ekonomia SET solid_dice = solid_dice - ? WHERE user_id = ? AND guild_id = ?",
            args: [realnaStrata, interaction.user.id, interaction.guild.id],
        });

        const wiadomosci2 = [
            "Zostałeś/aś schwytany/a",
            "Nie udało się!",
            "Zostałeś/aś zablokowany/a podczas ucieczki",
            "Zostałeś/aś przyłapany/a"
        ];
        const wiadomosc = wiadomosci2[Math.floor(Math.random() * wiadomosci2.length)];

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle("🐾 Pink Paws Heist - Porażka!")
            .setDescription(wiadomosc)
            .addFields({ name: "Straciłeś/aś", value: `**-${realnaStrata} Solid Dice** <:Red_roll:1512521789748547715>` });

        await interaction.editReply({ embeds: [embed] });
    }
}

if (interaction.commandName === "animacje") {
    await interaction.deferReply({ ephemeral: true });

    const obecne = await getUstawienia(interaction.user.id, interaction.guild.id);

    const statusRoll = obecne.animacja_roll === 1 ? "✅ Włączona" : "❌ Wyłączona";
    const statusWymiana = obecne.animacja_plecak === 1 ? "✅ Włączona" : "❌ Wyłączona";

    const btnWlaczRoll = new ButtonBuilder()
        .setCustomId("animacja_wlacz_roll")
        .setLabel("✅ Włącz")
        .setStyle(ButtonStyle.Success);

    const btnWylaczRoll = new ButtonBuilder()
        .setCustomId("animacja_wylacz_roll")
        .setLabel("❌ Wyłącz")
        .setStyle(ButtonStyle.Danger);

    const rowRoll = new ActionRowBuilder().addComponents(btnWlaczRoll, btnWylaczRoll);

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("⚙️ Ustawienia animacji")
        .addFields(
            { name: "🎲 Animacja Roll", value: statusRoll },
            // { name: "🔄 Animacja Wymiana", value: statusWymiana },
        );

    await interaction.editReply({ embeds: [embed], components: [rowRoll] });
}

if (interaction.commandName === "pingcooldown") {
    await interaction.deferReply({ ephemeral: true });

    const istnieje = await db.execute({
        sql: "SELECT 1 FROM powiadomienia_cooldown WHERE user_id = ? AND guild_id = ?",
        args: [interaction.user.id, interaction.guild.id],
    });

    if (istnieje.rows.length > 0) {
        await db.execute({
            sql: "DELETE FROM powiadomienia_cooldown WHERE user_id = ? AND guild_id = ?",
            args: [interaction.user.id, interaction.guild.id],
        });
        await interaction.editReply({ content: "❌ Nie będziesz już oznaczany/a, gdy zakończy się Twój cooldown." });
    } else {
        await db.execute({
            sql: "INSERT INTO powiadomienia_cooldown (user_id, guild_id) VALUES (?, ?)",
            args: [interaction.user.id, interaction.guild.id],
        });
        await interaction.editReply({ content: "✅ Będziesz oznaczany/a na kanale ekonomii, gdy zakończy się cooldown na jedną z Twoich komend (np. `/work`, `/pinkpawsheist`, `/daily` itd.)." });
    }
}

if (interaction.commandName === "help") {
    let aktualnaStronaHelp = 0;
    let wersjaHelp = 0;

    const przyciskiHelp = () => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("help_poprzednia").setLabel("Poprzednia").setStyle(ButtonStyle.Primary).setDisabled(aktualnaStronaHelp === 0),
        new ButtonBuilder().setCustomId("help_nastepna").setLabel("Następna").setStyle(ButtonStyle.Primary).setDisabled(aktualnaStronaHelp === HELP_STRONY.length - 1),
    );

    const listaHelp = () => new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("help_wybierz")
            .setPlaceholder("📖 Wybierz komendę...")
            .addOptions(
                HELP_STRONY.map((strona, i) => ({
                    label: strona.komenda,
                    value: String(i),
                    default: i === aktualnaStronaHelp,
                }))
            )
    );

    await interaction.deferReply({ ephemeral: true });

    const poczatkowaStronaHelp = budujStroneHelp(aktualnaStronaHelp);
    // Strona pokazuje się od razu z samym tekstem (embedySzybkie, bez plików) -
    // gif dogrywa się drugą edycją w tle, żeby wgrywanie większego pliku nie
    // blokowało wyświetlenia treści
    const wiadomoscHelp = await interaction.editReply({
        embeds: poczatkowaStronaHelp.embedySzybkie,
        components: [listaHelp(), przyciskiHelp()],
    });
    if (poczatkowaStronaHelp.files.length > 0) {
        await interaction.editReply({
            embeds: poczatkowaStronaHelp.embeds,
            files: poczatkowaStronaHelp.files,
            components: [listaHelp(), przyciskiHelp()],
        }).catch(() => {});
    }

    const collectorHelp = wiadomoscHelp.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
    });

    collectorHelp.on("collect", async (i) => {
        try {
            // Ackujemy natychmiast (deferUpdate jest lokalne i szybkie) - wgranie gifa
            // do Discorda potrafi trwać dłużej niż 3 sekundy, a wtedy interakcja
            // przez i.update() zdążyłaby wygasnąć i pokazać "Ta czynność się nie powiodła"
            await i.deferUpdate();

            wersjaHelp++;
            const mojaWersjaHelp = wersjaHelp;

            if (i.customId === "help_poprzednia") aktualnaStronaHelp--;
            else if (i.customId === "help_nastepna") aktualnaStronaHelp++;
            else if (i.customId === "help_wybierz") aktualnaStronaHelp = Number(i.values[0]);

            const nowaStronaHelp = budujStroneHelp(aktualnaStronaHelp);

            // Tak jak przy pierwszym otwarciu - najpierw sam tekst, gif dogrywa się
            // po nim. Jeśli w międzyczasie ktoś kliknął dalej, nie nadpisujemy już
            // nowszej strony przeterminowanym gifem z tego kliknięcia.
            await i.editReply({
                embeds: nowaStronaHelp.embedySzybkie,
                components: [listaHelp(), przyciskiHelp()],
            });

            if (nowaStronaHelp.files.length > 0 && mojaWersjaHelp === wersjaHelp) {
                await i.editReply({
                    embeds: nowaStronaHelp.embeds,
                    files: nowaStronaHelp.files,
                    components: [listaHelp(), przyciskiHelp()],
                }).catch(() => {});
            }
        } catch (error) {
            console.error("Błąd w /help:", error);
        }
    });
}
    } catch (error) {
        console.error("Błąd w interactionCreate:", error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "❗ Wystąpił nieoczekiwany błąd. Spróbuj ponownie.", ephemeral: true });
            } else {
                await interaction.reply({ content: "❗ Wystąpił nieoczekiwany błąd. Spróbuj ponownie.", ephemeral: true });
            }
        } catch {}
    }
});