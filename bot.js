// token_bot token_db url_db
import { createClient } from "@libsql/client";
import "dotenv/config";
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js"
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

        // new SlashCommandBuilder()
        // .setName("kawiarnia")
        // .setDescription("Odbierz Solid Dice z kawiarni"),

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
            opt.setName("kanal").setDescription("Wybierz kanał").setRequired(true)
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


//Solid Dice 

async function addSolidDice(userId, guildId, ilosc) {
    await db.execute({
        sql: "INSERT INTO ekonomia (user_id, guild_id, solid_dice, solid_dice_total) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, guild_id) DO UPDATE SET solid_dice = solid_dice + ?, solid_dice_total = solid_dice_total + ?",
        args: [userId, guildId, ilosc, ilosc, ilosc, ilosc],
    });
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

    console.log(klatkiZStopka[0]); // tymczasowo
    
    const msg = await interaction.reply({ content: klatkiZStopka[0], fetchReply: true });
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

client.on("interactionCreate", async (interaction) => {
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
        await interaction.reply({ content: komunikat, ephemeral: true });
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
        if (!OWNER_IDS.includes(interaction.user.id)) {
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

    if (interaction.commandName === "roll") {
    const portfel = await db.execute({
        sql: "SELECT solid_dice FROM ekonomia WHERE user_id = ? AND guild_id = ?",
        args: [interaction.user.id, interaction.guild.id],
    });

    const solidDice = portfel.rows.length > 0 ? Number(portfel.rows[0].solid_dice) : 0;

    if (solidDice < 10) {
        await interaction.reply({ content: `❗ Nie masz wystarczająco Solid Dice! Posiadasz **${solidDice}/10** <:Red_roll:1512521789748547715>`, ephemeral: true });
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
            await interaction.reply({ content: "", embeds: [embed], files: [obrazek], components: [rzadkoscRow] });
        }
    await pokazRollAnimacje(interaction);
    await interaction.editReply({ content: "", embeds: [embed], files: [obrazek], components:[rzadkoscRow] });
}

if (interaction.commandName === "plecak") {
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
    const przyciskNastepny = new ButtonBuilder().setCustomId("nastepna").setLabel("Nastepny").setStyle(ButtonStyle.Primary).setDisabled(maxStron <= 1);
    const wierszPrzyciskow = new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskNastepny);

    let aktualnaStrona = 0;
    const poczatkowaStrona = generujStrone(aktualnaStrona);

    const wiadomosc = await interaction.reply({
        embeds: poczatkowaStrona.embeds,
        files: poczatkowaStrona.files,
        components: [wierszPrzyciskow],
        fetchReply: true
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = wiadomosc.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (i) => {
    try {
        if (i.customId === "poprzednia") aktualnaStrona--;
        else if (i.customId === "nastepna") aktualnaStrona++;

        przyciskPoprzedni.setDisabled(aktualnaStrona === 0);
        przyciskNastepny.setDisabled(aktualnaStrona === maxStron - 1);

        const nowaStrona = generujStrone(aktualnaStrona);

        await i.update({
            embeds: nowaStrona.embeds,
            files: nowaStrona.files,
            components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskNastepny)]
        });
    } catch (error) {
        console.error("Błąd podczas aktualizacji plecaka:", error);
    }
});

    collector.on("end", () => {
        przyciskPoprzedni.setDisabled(true);
        przyciskNastepny.setDisabled(true);
        wiadomosc.edit({ components: [new ActionRowBuilder().addComponents(przyciskPoprzedni, przyciskNastepny)] }).catch(() => {});
    });
}
process.on('unhandledRejection', (reason, promise) => {
    console.error('Nieobsłużone odrzucenie:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Krytyczny błąd bota:', error);
});


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
    const animacja = interaction.options.getString("animacja");
    const obecne = await getUstawienia(interaction.user.id, interaction.guild.id);

    const statusRoll = obecne.animacja_roll === 1 ? "✅ Włączona" : "❌ Wyłączona";
    const statusWymiana = obecne.animacja_plecak === 1 ? "✅ Włączona" : "❌ Wyłączona";

    const btnWlacz = new ButtonBuilder()
        .setCustomId(`animacja_wlacz_${animacja}`)
        .setLabel("✅ Włącz")
        .setStyle(ButtonStyle.Success);

    const btnWylacz = new ButtonBuilder()
        .setCustomId(`animacja_wylacz_${animacja}`)
        .setLabel("❌ Wyłącz")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(btnWlacz, btnWylacz);

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("⚙️ Ustawienia animacji")
        .addFields(
            { name: "🎲 Animacja Roll", value: statusRoll },
            // { name: "🔄 Animacja Wymiana", value: statusWymiana },
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

});