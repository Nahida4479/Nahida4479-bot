// token_bot token_db url_db
import { createClient } from "@libsql/client";
import "dotenv/config";
import { existsSync } from "fs";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from "discord.js"
import { db, initDB } from "./create-database-table.js";

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

        // new SlashCommandBuilder()
        // .setName("delivery")
        // .setDescription("Wykonaj dostawę aby odebrać Solid Dice"),

        // new SlashCommandBuilder()
        // .setName("łowienie")
        // .setDescription("Zacznij łowić aby odebrać nagrody"),

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
        .setDescription("Włącz lub wyłącz animacje")



    ].map((cmd) => cmd.toJSON());

    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Komendy zarejestrowane")
});

client.login(process.env.token_bot);

process.on('unhandledRejection', (reason) => {
    console.error('Nieobsłużone odrzucenie:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Krytyczny błąd bota:', error);
});

async function checkcooldown(userId, guildId, komenda, cooldownMs) {
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
        sql: "INSERT INTO cooldowny (user_id, guild_id, komenda, ostatnio) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, guild_id, komenda) DO UPDATE SET ostatnio = ?",
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

const kawiarniaRysunek = [
"                ",
"                          )     (",
"                   ___...(-------)-....___",
"               .-\"\"       )    (          \"\"-.",
"         .-'``'|-._             )         _.-|",
"        /  .--.|   `\"\"---...........---\"\"`   |",
"       /  /    |                             |",
"       |  |    |                             |",
"        \\  \\   |                             |",
"         `\\ `\\ |                             |",
"           `\\ `|                             |",
"           _/ /\\                             /",
"          (__/  \\                           /",
"       _..---\"\"` \\                         /`\"\"---.._",
"    .-'           \\                       /          '-.",
"   :               `-.__             __.-'              :",
"   :                  ) \"\"---...---\"\" (                 :",
"    '._               `\"--...___...--\"`              _.'",
"       \"\"--..__                              __..--\"\"/",
"       '._     \"\"\"----.....______.....----\"\"\"     _.'",
"          `\"\"--..,,_____            _____,,..--\"\"`",
"                        `\"\"\"----\"\"\"`",
];

function ramkaKawiarni(odIndeks, doIndeks) {
    const stopka = "\n> Animację możesz wyłączyć pod /animacje";
    const wycinek = kawiarniaRysunek.slice(odIndeks, doIndeks).join("\n");
    return "```\n" + wycinek + "\n```" + stopka;
}

const kawiarniaAnimacja = [
    ramkaKawiarni(8, 14),
    ramkaKawiarni(3, 19),
    ramkaKawiarni(0, 22),
];

async function pokazKawiarniaAnimacje(interaction) {
    const msg = await interaction.editReply({ content: kawiarniaAnimacja[0] });
    for (let i = 1; i < kawiarniaAnimacja.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        await msg.edit(kawiarniaAnimacja[i]);
    }
    await new Promise(r => setTimeout(r, 600));
}

async function getUstawienia(userId, guildId) {
    const wynik = await db.execute({
        sql: "SELECT animacja_roll, animacja_plecak, animacja_kawiarnia FROM ustawienia WHERE user_id = ? AND guild_id = ?",
        args: [userId, guildId],
    });
    if (wynik.rows.length === 0) return { animacja_roll: 1, animacja_plecak: 1, animacja_kawiarnia: 1 };
    return {
        animacja_roll: Number(wynik.rows[0].animacja_roll ?? 1),
        animacja_plecak: Number(wynik.rows[0].animacja_plecak ?? 1),
        animacja_kawiarnia: Number(wynik.rows[0].animacja_kawiarnia ?? 1),
    };
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

       if (interaction.customId.startsWith("animacja_wlacz_") || interaction.customId.startsWith("animacja_wylacz_")) {
        const czesci = interaction.customId.split("_");
        const akcja = czesci[1];
        const animacja = czesci[2];
        const wartosc = akcja === "wlacz" ? 1 : 0;
        const obecne = await getUstawienia(interaction.user.id, interaction.guild.id);
        let nowyRoll = obecne.animacja_roll;
        let nowyPlecak = obecne.animacja_plecak;
        let nowaKawiarnia = obecne.animacja_kawiarnia;
        if (animacja === "roll") nowyRoll = wartosc;
        else if (animacja === "wymiana") nowyPlecak = wartosc;
        else if (animacja === "kawiarnia") nowaKawiarnia = wartosc;
        else if (animacja === "all") {
            nowyRoll = wartosc;
            nowyPlecak = wartosc;
            nowaKawiarnia = wartosc;
        }
        await db.execute({
            sql: "INSERT INTO ustawienia (user_id, guild_id, animacja_roll, animacja_plecak, animacja_kawiarnia) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, guild_id) DO UPDATE SET animacja_roll = ?, animacja_plecak = ?, animacja_kawiarnia = ?",
            args: [interaction.user.id, interaction.guild.id, nowyRoll, nowyPlecak, nowaKawiarnia, nowyRoll, nowyPlecak, nowaKawiarnia],
        });
        const komunikat = akcja === "wlacz" ? "✅ Animacja została włączona!" : "❌ Animacja została wyłączona!";
        await interaction.reply({ content: komunikat, ephemeral: true });
        return;
    }

    if (interaction.customId.startsWith("kawiarnia_odbior_")) {
        const userId = interaction.customId.replace("kawiarnia_odbior_", "");
        if (interaction.user.id !== userId) {
            await interaction.reply({ content: "❗ To nie twoja kawiarnia!", ephemeral: true });
            return;
        }

        const { dostepne } = await odbierzKawiarnie(interaction.user.id, interaction.guild.id);

        if (dostepne <= 0) {
            await interaction.reply({ content: "❗ Nie masz jeszcze nic do odebrania z kawiarni! Wróć za jakiś czas.", ephemeral: true });
            return;
        }

        const btnOdebrane = new ButtonBuilder()
            .setCustomId(`kawiarnia_odbior_${userId}`)
            .setLabel("☕ Odbierz")
            .setStyle(ButtonStyle.Success)
            .setDisabled(true);

        await interaction.update({ components: [new ActionRowBuilder().addComponents(btnOdebrane)] });
        await interaction.followUp({ content: `☕ Odebrałeś **${dostepne} Solid Dice** <:Red_roll:1512521789748547715>!`, ephemeral: true });
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

    const komendyEkonomii = ["daily", "work", "skillissues", "pinkpawsheist", "kawiarnia", "delivery", "łowienie"];

    if (komendyEkonomii.includes(interaction.commandName)) {
        const kanal = ustawienia.rows[0]?.kanal_id;
        if (kanal &&  interaction.channelId !== kanal) {
            await interaction.reply({ content: `Te komendy możesz używać tylko na kanale <#${kanal}>!`, ephemeral: true});
            return;
        }
    }

    if (interaction.commandName === "daily") {
        const cooldown = await checkcooldown(interaction.user.id , interaction.guild.id, "daily", 24 * 60 * 60 *1000);
        if (cooldown) {
            await interaction.reply({ content: cooldown, ephemeral: true});
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

        await interaction.reply({ embeds: [embed], files: [obrazek]});
    }

    if (interaction.commandName === "removecooldown") {
        if (!(await czyAdministratorBota(interaction))) {
            await interaction.reply({ content: "❗ Nie masz uprawnień", ephemeral: true });
            return;
        }

        const user = interaction.options.getUser("user")

        await db.execute({
            sql: "DELETE FROM cooldowny WHERE user_id = ? AND guild_id = ? and komenda IN ('daily', 'work', 'skillissues', 'pinkpawsheist', 'kawiarnia', 'delivery', 'łowienie')",
            args: [user.id, interaction.guild.id]
        });

        await interaction.reply({ content: `Cooldowny dla wszystkich komend ekonomii zostały usunięte dla ${user}`, ephemeral: true})
    }

    if (interaction.commandName === "administracja") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !OWNER_IDS.includes(interaction.user.id)) {
            await interaction.reply({ content: "❗ Tylko osoby z uprawnieniem Administrator mogą ustawiać rolę zarządzającą botem.", ephemeral: true });
            return;
        }

        const rola = interaction.options.getRole("rola");

        await db.execute({
            sql: "INSERT INTO administracja (guild_id, rola_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET rola_id = ?",
            args: [interaction.guild.id, rola.id, rola.id],
        });

        await interaction.reply({ content: `✅ Rola ${rola} może teraz używać \`/ntegra\` i \`/removecooldown\`.`, ephemeral: true });
    }

    if (interaction.commandName === "ntegra") {
        if (!(await czyAdministratorBota(interaction))) {
            await interaction.reply({ content: "❗ Nie masz uprawnień", ephemeral: true });
            return;
        }

        const kanal = interaction.options.getChannel("kanal");

        await db.execute({
            sql: "INSERT INTO serwery (guild_id, kanal_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET kanal_id = ?",
            args: [interaction.guild.id, kanal.id, kanal.id],
        });

        await interaction.reply({ content: `✅ Kanał ekonomii ustawiony na ${kanal}.`, ephemeral: true });
    }

    if (interaction.commandName === "addskin") {
        if (!OWNER_IDS.includes(interaction.user.id)) {
            await interaction.reply({ content: "❗ Nie masz uprawnień", ephemeral: true });
            return;
        }

        const plik = interaction.options.getString("plik").trim();
        const nazwa = interaction.options.getString("nazwa").trim();

        if (!existsSync(`./Gra/skins/${plik}`)) {
            await interaction.reply({ content: `❗ Nie znaleziono pliku \`Gra/skins/${plik}\`. Wgraj plik na serwer przed dodaniem skina.`, ephemeral: true });
            return;
        }

        await db.execute({
            sql: "INSERT INTO skiny (plik, nazwa) VALUES (?, ?) ON CONFLICT(plik) DO UPDATE SET nazwa = ?",
            args: [plik, nazwa, nazwa],
        });

        await interaction.reply({ content: `✅ Skin **${nazwa}** (\`${plik}\`) jest teraz dostępny w \`/skiny\`.`, ephemeral: true });
    }

    if (interaction.commandName === "nteleaderboard") {
        const wynik = await db.execute ({
            sql: "SELECT user_id, solid_dice_total FROM ekonomia WHERE guild_id = ? ORDER BY solid_dice_total DESC LIMIT 10",
            args: [interaction.guild.id],
        });

        if (wynik.rows.length === 0) {
            await interaction.reply({ content: "❗ Brak danych w rankingu", ephemeral: true});
            return;
        }

        const lista = wynik.rows.slice(0, 10).map((row, index) =>
        `**${index + 1}.** <@${row.user_id}> - **${row.solid_dice_total} <:Red_roll:1512521789748547715>** `
            ).join("\n");
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle("🏆 Ranking Solid Dice")
            .setDescription(lista);

        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "work") {
        const cooldown = await checkcooldown(interaction.user.id, interaction.guild.id, "work", 2 * 60 * 60  * 1000);
        if (cooldown) {
            await interaction.reply ({ content: cooldown, ephemeral: true});
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

        await interaction.reply({ embeds: [embed], files: [obrazek] });
    }

    if (interaction.commandName === "kawiarnia") {
        await interaction.deferReply();

        const ustawieniaAnim = await getUstawienia(interaction.user.id, interaction.guild.id);
        const animacjaWlaczona = ustawieniaAnim.animacja_kawiarnia === 1;

        if (animacjaWlaczona) {
            await pokazKawiarniaAnimacje(interaction);
        }

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

    const sumaRolli = ekonomia.rows.length > 0 ? ekonomia.rows[0].solid_dice_total / 10 : 0;
    const pozycjaTop = 3;
    const maxStron = postacie.rows.length + 1;

    // Funkcja generująca zawartość danej strony w locie
    const generujStrone = (indeks) => {
        if (indeks === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x2B2D31)
                .setTitle(`Plecak - ${interaction.user.username}`)
                .setDescription(`**Itemy:**\n<:Nanallyyy:1523097616722952345> Epickie x${epickieSzt}\n<:MintShock:1523097608548257824> Rzadkie x${rzadkieSzt}\n<:f_mc:1523097583726231563> Zwykłe x${zwykleSzt}`)
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

    const przyciskPoprzedni = new ButtonBuilder().setCustomId("poprzednia").setLabel("Poprzedni").setStyle(ButtonStyle.Primary).setDisabled(true);
    const przyciskSzukaj = new ButtonBuilder().setCustomId("szukaj_postac").setLabel("🔍 Szukaj").setStyle(ButtonStyle.Secondary).setDisabled(postacie.rows.length === 0);
    const przyciskNastepny = new ButtonBuilder().setCustomId("nastepna").setLabel("Nastepny").setStyle(ButtonStyle.Primary).setDisabled(maxStron <= 1);
    const wierszPrzyciskow = new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny);

    let aktualnaStrona = 0;
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
                .setTitle("Szukaj postaci")
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
                components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny)]
            });
            return;
        }

        if (i.customId === "poprzednia") aktualnaStrona--;
        else if (i.customId === "nastepna") aktualnaStrona++;

        przyciskPoprzedni.setDisabled(aktualnaStrona === 0);
        przyciskNastepny.setDisabled(aktualnaStrona === maxStron - 1);

        const nowaStrona = generujStrone(aktualnaStrona);

        await i.update({
            embeds: nowaStrona.embeds,
            files: nowaStrona.files,
            components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny)]
        });
    } catch (error) {
        console.error("Błąd podczas aktualizacji plecaka:", error);
    }
});

    collector.on("end", () => {
        przyciskPoprzedni.setDisabled(true);
        przyciskSzukaj.setDisabled(true);
        przyciskNastepny.setDisabled(true);
        wiadomosc.edit({ components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskSzukaj, przyciskNastepny)] }).catch(() => {});
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
    const cooldown = await checkcooldown(interaction.user.id, interaction.guild.id, "pinkpawsheist", 48 * 60 * 60 * 1000);
    if (cooldown) {
        await interaction.reply({ content: cooldown, ephemeral: true });
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

        await interaction.reply({ embeds: [embed] });

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

        await interaction.reply({ embeds: [embed] });
    }
}

if (interaction.commandName === "animacje") {
    const obecne = await getUstawienia(interaction.user.id, interaction.guild.id);

    const statusRoll = obecne.animacja_roll === 1 ? "✅ Włączona" : "❌ Wyłączona";
    const statusWymiana = obecne.animacja_plecak === 1 ? "✅ Włączona" : "❌ Wyłączona";
    const statusKawiarnia = obecne.animacja_kawiarnia === 1 ? "✅ Włączona" : "❌ Wyłączona";

    const btnWlaczRoll = new ButtonBuilder()
        .setCustomId("animacja_wlacz_roll")
        .setLabel("✅ Włącz")
        .setStyle(ButtonStyle.Success);

    const btnWylaczRoll = new ButtonBuilder()
        .setCustomId("animacja_wylacz_roll")
        .setLabel("❌ Wyłącz")
        .setStyle(ButtonStyle.Danger);

    const btnWlaczKawiarnia = new ButtonBuilder()
        .setCustomId("animacja_wlacz_kawiarnia")
        .setLabel("✅ Włącz")
        .setStyle(ButtonStyle.Success);

    const btnWylaczKawiarnia = new ButtonBuilder()
        .setCustomId("animacja_wylacz_kawiarnia")
        .setLabel("❌ Wyłącz")
        .setStyle(ButtonStyle.Danger);

    const rowRoll = new ActionRowBuilder().addComponents(btnWlaczRoll, btnWylaczRoll);
    const rowKawiarnia = new ActionRowBuilder().addComponents(btnWlaczKawiarnia, btnWylaczKawiarnia);

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("⚙️ Ustawienia animacji")
        .addFields(
            { name: "🎲 Animacja Roll", value: statusRoll },
            { name: "☕ Animacja Kawiarni", value: statusKawiarnia },
            // { name: "🔄 Animacja Wymiana", value: statusWymiana },
        );

    await interaction.reply({ embeds: [embed], components: [rowRoll, rowKawiarnia], ephemeral: true });
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