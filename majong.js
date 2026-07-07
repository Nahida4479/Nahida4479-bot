// Mahjong NTE (styl syczuański): 3 kolory x 9 cyfr x 4 kopie = 108 klocków,
// wymiana 3 klocków na start, deklaracja koloru do pozbycia, przejęcia Pung/Kong/Ron,
// wygrana = 4 układy (Chi/Pung/Kong) + para, bez klocków zadeklarowanego koloru.
import sharp from "sharp";
import { existsSync } from "fs";
import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";

const KOLORY = ["Z", "K", "B"];
const NAZWY_KOLOROW = { Z: "Znaki", K: "Kropki", B: "Bambusy" };
const EMOTKI_KOLOROW = { Z: "🟥", K: "🟨", B: "🟩" };
const ODMIANY_KOLOROW = {
    Z: ["Znak", "Znaki", "Znaków"],
    K: ["Kropka", "Kropki", "Kropek"],
    B: ["Bambus", "Bambusy", "Bambusów"],
};

// "1 Znak", "3 Znaki", "6 Znaków" - poprawna polska odmiana po liczebniku
function etykietaKlocka(t) {
    const cyfra = Number(t[1]);
    const odmiana = cyfra === 1 ? 0 : cyfra <= 4 ? 1 : 2;
    return `${cyfra} ${ODMIANY_KOLOROW[t[0]][odmiana]}`;
}

// Stałe ID emotek klocków - wgrane na serwerze emotek bota, działają wszędzie gdzie jest bot
const EMOTKI_KLOCKOW = {
    B1: "1523728735910498404", B2: "1523728788863844433", B3: "1523728822049046610",
    B4: "1523728857063231649", B5: "1523728892932653198", B6: "1523728941955682336",
    B7: "1523728975330021536", B8: "1523729008322416701", B9: "1523729044787691530",
    K1: "1523729081873727620", K2: "1523729114048102492", K3: "1523729147434766539",
    K4: "1523729176450957556", K5: "1523729215697063966", K6: "1523729256528609340",
    K7: "1523729300069814435", K8: "1523729339911376946", K9: "1523729379375579157",
    Z1: "1523729422782431253", Z2: "1523729463702192219", Z3: "1523729545646182421",
    Z4: "1523729498720305357", Z5: "1523729581205360691", Z6: "1523729621332263032",
    Z7: "1523729661966811406", Z8: "1523729698520174714", Z9: "1523729733274308708",
};

function emotkaKlocka(gra, t) {
    if (EMOTKI_KLOCKOW[t]) return `<:mj${t}:${EMOTKI_KLOCKOW[t]}>`;
    const wlasna = gra?.guild?.emojis?.cache?.find(e => e.name === `mj${t}`);
    return wlasna ? wlasna.toString() : EMOTKI_KOLOROW[t[0]];
}

function nazwaZEmotka(gra, t) {
    return `${etykietaKlocka(t)} ${emotkaKlocka(gra, t)}`;
}

function emojiDlaMenu(gra, t) {
    if (EMOTKI_KLOCKOW[t]) return { id: EMOTKI_KLOCKOW[t] };
    const wlasna = gra?.guild?.emojis?.cache?.find(e => e.name === `mj${t}`);
    return wlasna ? { id: wlasna.id } : EMOTKI_KOLOROW[t[0]];
}

const MAJONG_CZAS_TURY_MS = 30000;
const MAJONG_CZAS_DOLACZANIA_MS = 30000;
const MAJONG_CZAS_PRZEJECIA_MS = 10000;
const MAJONG_LIMIT_GRY_MS = 20 * 60 * 1000;
const MAJONG_LIMIT_BEZCZYNNOSCI_MS = 60 * 1000;
const BOT_NAZWY = ["Bot Mint", "Bot Chiz", "Bot Nanally"];

const aktywneMajongi = new Set();

function losowaLiczba(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== Rendering kafelków =====

const TILE_W = 60;
const TILE_H = 84;
const cacheKafelkow = new Map();

const POZYCJE = {
    1: [[1, 1]],
    2: [[1, 0], [1, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
    7: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2], [1, 1]],
    8: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    9: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
};

function svgKafelka(kolor, cyfra) {
    let srodek = "";
    const cx = (kol) => 15 + kol * 15;
    const cy = (rzad) => 24 + rzad * 22;

    if (kolor === "Z") {
        srodek = `<text x="30" y="50" font-size="36" font-family="DejaVu Sans, sans-serif" font-weight="bold" fill="#b91c1c" text-anchor="middle">${cyfra}</text>
                  <rect x="14" y="58" width="32" height="9" rx="3" fill="#b91c1c"/>
                  <rect x="14" y="14" width="32" height="4" rx="2" fill="#b91c1c"/>`;
    } else if (kolor === "K") {
        srodek = POZYCJE[cyfra].map(([kol, rzad]) =>
            `<circle cx="${cx(kol)}" cy="${cy(rzad)}" r="6.5" fill="#d4a017" stroke="#8a6a10" stroke-width="1.5"/>`
        ).join("") + `<text x="9" y="14" font-size="11" font-family="DejaVu Sans, sans-serif" font-weight="bold" fill="#8a6a10" text-anchor="middle">${cyfra}</text>`;
    } else {
        srodek = POZYCJE[cyfra].map(([kol, rzad]) =>
            `<rect x="${cx(kol) - 3.5}" y="${cy(rzad) - 9}" width="7" height="18" rx="3" fill="#15803d" stroke="#0c4a24" stroke-width="1"/>`
        ).join("") + `<text x="9" y="14" font-size="11" font-family="DejaVu Sans, sans-serif" font-weight="bold" fill="#15803d" text-anchor="middle">${cyfra}</text>`;
    }

    return `<svg width="${TILE_W}" height="${TILE_H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="${TILE_W - 2}" height="${TILE_H - 2}" rx="8" fill="#f7f3e8" stroke="#8b8b8b" stroke-width="2"/>
        ${srodek}</svg>`;
}

async function kafelekPng(klocek) {
    if (cacheKafelkow.has(klocek)) return cacheKafelkow.get(klocek);
    const obietnica = (async () => {
        const wlasny = `./Gra/majong/${klocek}.png`;
        if (existsSync(wlasny)) {
            return await sharp(wlasny).resize(TILE_W, TILE_H).png().toBuffer();
        }
        return await sharp(Buffer.from(svgKafelka(klocek[0], Number(klocek[1])))).png().toBuffer();
    })();
    cacheKafelkow.set(klocek, obietnica);
    return obietnica;
}

async function obrazekReki(klocki) {
    const gap = 4;
    const szerokosc = klocki.length * (TILE_W + gap) + gap;
    const wysokosc = TILE_H + 26;

    const kompozycja = [];
    for (let i = 0; i < klocki.length; i++) {
        kompozycja.push({ input: await kafelekPng(klocki[i]), left: gap + i * (TILE_W + gap), top: 4 });
    }
    const etykiety = `<svg width="${szerokosc}" height="${wysokosc}" xmlns="http://www.w3.org/2000/svg">${klocki.map((_, i) =>
        `<text x="${gap + i * (TILE_W + gap) + TILE_W / 2}" y="${TILE_H + 22}" font-size="15" font-family="DejaVu Sans, sans-serif" font-weight="bold" fill="#eeeeee" text-anchor="middle">${i + 1}</text>`
    ).join("")}</svg>`;
    kompozycja.push({ input: Buffer.from(etykiety), left: 0, top: 0 });

    return await sharp({ create: { width: szerokosc, height: wysokosc, channels: 4, background: { r: 24, g: 66, b: 44, alpha: 1 } } })
        .composite(kompozycja).png().toBuffer();
}

async function obrazekOdrzutow(odrzucone) {
    const skala = 0.68;
    const w = Math.round(TILE_W * skala), h = Math.round(TILE_H * skala);
    const naRzad = 13;
    const rzedy = Math.max(1, Math.ceil(odrzucone.length / naRzad));
    const szerokosc = naRzad * (w + 3) + 3;
    const wysokosc = rzedy * (h + 3) + 3;

    const kompozycja = [];
    for (let i = 0; i < odrzucone.length; i++) {
        const male = await sharp(await kafelekPng(odrzucone[i])).resize(w, h).png().toBuffer();
        kompozycja.push({ input: male, left: 3 + (i % naRzad) * (w + 3), top: 3 + Math.floor(i / naRzad) * (h + 3) });
    }
    return await sharp({ create: { width: szerokosc, height: wysokosc, channels: 4, background: { r: 24, g: 66, b: 44, alpha: 1 } } })
        .composite(kompozycja).png().toBuffer();
}

// ===== Logika gry =====

function nowyMur() {
    const mur = [];
    for (const kolor of KOLORY) for (let c = 1; c <= 9; c++) for (let k = 0; k < 4; k++) mur.push(`${kolor}${c}`);
    for (let i = mur.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mur[i], mur[j]] = [mur[j], mur[i]];
    }
    return mur;
}

function sortujReke(reka) {
    const porzadek = { Z: 0, K: 1, B: 2 };
    reka.sort((a, b) => porzadek[a[0]] - porzadek[b[0]] || Number(a[1]) - Number(b[1]));
}

function indeksKlocka(klocek) {
    return KOLORY.indexOf(klocek[0]) * 9 + (Number(klocek[1]) - 1);
}

function policzKlocki(reka) {
    const liczniki = new Array(27).fill(0);
    for (const k of reka) liczniki[indeksKlocka(k)]++;
    return liczniki;
}

function dekompozycja(liczniki, potrzebneUklady) {
    if (potrzebneUklady === 0) return liczniki.every(x => x === 0);
    const i = liczniki.findIndex(x => x > 0);
    if (i === -1) return false;

    if (liczniki[i] >= 3) {
        liczniki[i] -= 3;
        if (dekompozycja(liczniki, potrzebneUklady - 1)) { liczniki[i] += 3; return true; }
        liczniki[i] += 3;
    }
    if (i % 9 <= 6 && liczniki[i + 1] > 0 && liczniki[i + 2] > 0) {
        liczniki[i]--; liczniki[i + 1]--; liczniki[i + 2]--;
        if (dekompozycja(liczniki, potrzebneUklady - 1)) { liczniki[i]++; liczniki[i + 1]++; liczniki[i + 2]++; return true; }
        liczniki[i]++; liczniki[i + 1]++; liczniki[i + 2]++;
    }
    return false;
}

function czyWygrywajaca(reka, liczbaUkladow, kolorZakazany) {
    if (kolorZakazany && reka.some(k => k[0] === kolorZakazany)) return false;
    const liczniki = policzKlocki(reka);
    const potrzebne = 4 - liczbaUkladow;
    for (let para = 0; para < 27; para++) {
        if (liczniki[para] >= 2) {
            liczniki[para] -= 2;
            if (dekompozycja(liczniki, potrzebne)) { liczniki[para] += 2; return true; }
            liczniki[para] += 2;
        }
    }
    return false;
}

// Heurystyka "najmniej przydatnego" klocka - do auto-odrzutu i botów
function wybierzOdrzut(gracz) {
    const zakazane = gracz.reka.filter(k => k[0] === gracz.kolorZakazany);
    if (zakazane.length > 0) return zakazane[0];

    const liczniki = policzKlocki(gracz.reka);
    let najgorszy = gracz.reka[0];
    let najgorszyWynik = Infinity;
    for (const k of gracz.reka) {
        const i = indeksKlocka(k);
        let wynik = (liczniki[i] - 1) * 4;
        const cyfra = i % 9;
        if (cyfra > 0 && liczniki[i - 1] > 0) wynik += 2;
        if (cyfra < 8 && liczniki[i + 1] > 0) wynik += 2;
        if (cyfra > 1 && liczniki[i - 2] > 0) wynik += 1;
        if (cyfra < 7 && liczniki[i + 2] > 0) wynik += 1;
        if (wynik < najgorszyWynik) { najgorszyWynik = wynik; najgorszy = k; }
    }
    return najgorszy;
}

function najmniejszyKolorZ3(reka) {
    const naKolor = { Z: [], K: [], B: [] };
    for (const k of reka) naKolor[k[0]].push(k);
    const posortowane = KOLORY.slice().sort((a, b) => naKolor[a].length - naKolor[b].length);
    for (const kolor of posortowane) if (naKolor[kolor].length >= 3) return naKolor[kolor].slice(0, 3);
    return reka.slice(0, 3);
}

function najmniejszyKolor(reka) {
    const liczby = { Z: 0, K: 0, B: 0 };
    for (const k of reka) liczby[k[0]]++;
    return KOLORY.slice().sort((a, b) => liczby[a] - liczby[b])[0];
}

function usunZReki(reka, klocek) {
    const i = reka.indexOf(klocek);
    if (i !== -1) reka.splice(i, 1);
}

// ===== Interfejs graczy =====

function embedZasad() {
    return new EmbedBuilder()
        .setColor(0x1B5E20)
        .setTitle("🀄 Mahjong NTE")
        .setDescription(
            "**Cel:** skompletuj **4 układy + parę** (2 identyczne klocki).\n\n" +
            "**Układy:**\n" +
            "• **Chi** - 3 kolejne cyfry tego samego koloru (tylko z własnych dociągów)\n" +
            "• **Pung** - 3 identyczne klocki\n" +
            "• **Kong** - 4 identyczne klocki\n\n" +
            "**Początek gry:**\n" +
            "1. Oddajesz **3 klocki jednego koloru** następnemu graczowi\n" +
            "2. Deklarujesz **kolor, którego całkiem się pozbywasz** - nie możesz z nim wygrać, odrzucasz go w pierwszej kolejności\n\n" +
            "**Przejęcia:** gdy ktoś odrzuci klocek, którego masz 2 (**Pung**) lub 3 (**Kong**) - możesz go przejąć.\n" +
            "**Wygrana:** **Tsumo** (sam dociągasz brakujący klocek) lub **Ron** (przejmujesz odrzucony brakujący klocek) - dzieją się automatycznie.\n\n" +
            `⏱️ Tura trwa **${MAJONG_CZAS_TURY_MS / 1000}s** - po czasie klocek odrzuca się sam.\n` +
            "💰 **Nagrody:** każdy gracz, który dokończy partię: **30-50** <:Red_roll:1512521789748547715>, zwycięzca: dodatkowe **+50**."
        );
}

function opcjeOdrzutu(gra, gracz) {
    const zakazane = gracz.reka.filter(k => k[0] === gracz.kolorZakazany);
    const doWyboru = zakazane.length > 0 ? zakazane : gracz.reka;
    const widziane = new Set();
    const opcje = [];
    for (let i = 0; i < gracz.reka.length; i++) {
        const k = gracz.reka[i];
        if (!doWyboru.includes(k) || widziane.has(k)) continue;
        widziane.add(k);
        opcje.push({ label: `#${k[1]}`, value: k, emoji: emojiDlaMenu(gra, k) });
    }
    return opcje.slice(0, 25);
}

function tekstMeldow(gra, gracz) {
    if (gracz.melds.length === 0) return "brak";
    return gracz.melds.map(m => `${m.typ === "kong" ? "Kong" : "Pung"} ${nazwaZEmotka(gra, m.klocek)}`).join(", ");
}

async function pokazPanel(gracz, gra, tresc, komponenty) {
    if (gracz.bot || !gracz.interakcja) return;
    gracz.ostatniWidok = { tresc, komponenty };
    sortujReke(gracz.reka);
    const obrazek = await obrazekReki(gracz.reka);
    const embed = new EmbedBuilder()
        .setColor(0x1B5E20)
        .setDescription(tresc)
        .addFields(
            { name: "Twoje układy", value: tekstMeldow(gra, gracz), inline: true },
            { name: "Kolor zakazany", value: gracz.kolorZakazany ? `${EMOTKI_KOLOROW[gracz.kolorZakazany]} ${NAZWY_KOLOROW[gracz.kolorZakazany]}` : "jeszcze nie wybrany", inline: true },
        )
        .setImage("attachment://reka.png");
    try {
        await gracz.interakcja.editReply({
            content: "",
            embeds: [embed],
            files: [new AttachmentBuilder(obrazek, { name: "reka.png" })],
            components: komponenty ?? [],
        });
        gracz.panelUszkodzony = false;
    } catch {
        // Token interakcji wygasł (np. chwilowe obciążenie) - gracz musi kliknąć
        // "Otwórz panel gracza" na stole, żeby dostać świeży panel
        gracz.panelUszkodzony = true;
        await aktualizujStol(gra, true).catch(() => {});
    }
}

// Czeka na interakcję gracza na jego panelu (lub timeout) - zwraca interakcję albo null
function czekajNaAkcje(gracz, pasujaceId, timeoutMs) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => { gracz.oczekiwanie = null; resolve(null); }, timeoutMs);
        gracz.oczekiwanie = {
            pasujaceId,
            resolve: (i) => { clearTimeout(timer); gracz.oczekiwanie = null; resolve(i); },
        };
    });
}

async function aktualizujStol(gra, wymuszona) {
    const teraz = Date.now();
    if (!wymuszona && teraz - gra.ostatniaAktualizacja < 1500) return;
    gra.ostatniaAktualizacja = teraz;

    const naTurze = gra.gracze[gra.tura];
    const embed = new EmbedBuilder()
        .setColor(0x1B5E20)
        .setTitle("🀄 Mahjong NTE - partia w toku")
        .addFields(
            { name: "Gracze", value: gra.gracze.map((g, i) => `${i === gra.tura ? "▶️" : "▫️"} ${g.bot ? g.nazwa : `<@${g.id}>`}${g.kolorZakazany ? ` (bez ${EMOTKI_KOLOROW[g.kolorZakazany]})` : ""} - układy: ${g.melds.length}`).join("\n") },
            { name: "Mur", value: `${gra.mur.length} klocków`, inline: true },
            { name: "Ostatni odrzut", value: gra.ostatniOdrzut ? `${nazwaZEmotka(gra, gra.ostatniOdrzut.klocek)} (${gra.ostatniOdrzut.nazwa})` : "brak", inline: true },
        );

    const uszkodzeni = gra.gracze.filter(g => !g.bot && g.panelUszkodzony);
    if (uszkodzeni.length > 0) {
        embed.addFields({
            name: "⚠️ Panel wygasł",
            value: uszkodzeni.map(g => `<@${g.id}>`).join(", ") + " - kliknij **🀄 Otwórz panel gracza** poniżej, żeby dalej grać.",
        });
    }

    const zawartosc = {
        embeds: [embed],
        components: gra.zakonczona ? [] : [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("mj_panel").setLabel("🀄 Otwórz panel gracza").setStyle(ButtonStyle.Secondary)
        )],
    };
    if (gra.odrzucone.length > 0) {
        embed.setImage("attachment://stol.png");
        zawartosc.files = [new AttachmentBuilder(await obrazekOdrzutow(gra.odrzucone), { name: "stol.png" })];
    } else {
        zawartosc.files = [];
    }
    await gra.wiadomoscStolu.edit(zawartosc).catch(() => {});
}

// ===== Fazy gry =====

async function fazaWymiany(gra) {
    const wybory = await Promise.all(gra.gracze.map(async (gracz) => {
        if (gracz.bot) return najmniejszyKolorZ3(gracz.reka);

        while (true) {
            sortujReke(gracz.reka);
            const opcje = [];
            const uzyte = new Map();
            for (const k of gracz.reka) {
                const n = (uzyte.get(k) ?? 0);
                uzyte.set(k, n + 1);
                opcje.push({ label: `#${k[1]}`, value: `${k}_${n}`, emoji: emojiDlaMenu(gra, k) });
            }
            const menu = new StringSelectMenuBuilder().setCustomId("mj_wymiana").setPlaceholder("Wybierz 3 klocki JEDNEGO koloru do oddania").setMinValues(3).setMaxValues(3).addOptions(opcje.slice(0, 25));
            await pokazPanel(gracz, gra, "🔄 **Wymiana:** oddaj 3 klocki **jednego koloru** następnemu graczowi.\nPodpowiedź: najlepiej pozbyć się koloru, którego masz najmniej.", [new ActionRowBuilder().addComponents(menu)]);

            const akcja = await czekajNaAkcje(gracz, ["mj_wymiana"], MAJONG_CZAS_TURY_MS);
            if (!akcja) return najmniejszyKolorZ3(gracz.reka);

            const wybrane = akcja.values.map(v => v.split("_")[0]);
            if (new Set(wybrane.map(k => k[0])).size !== 1) {
                await akcja.followUp({ content: "❗ Wszystkie 3 klocki muszą być tego samego koloru!", ephemeral: true }).catch(() => {});
                continue;
            }
            return wybrane;
        }
    }));

    for (let i = 0; i < 4; i++) {
        for (const k of wybory[i]) usunZReki(gra.gracze[i].reka, k);
    }
    for (let i = 0; i < 4; i++) {
        gra.gracze[(i + 1) % 4].reka.push(...wybory[i]);
    }
}

async function fazaDeklaracji(gra) {
    await Promise.all(gra.gracze.map(async (gracz) => {
        if (gracz.bot) {
            gracz.kolorZakazany = najmniejszyKolor(gracz.reka);
            return;
        }

        const liczby = { Z: 0, K: 0, B: 0 };
        for (const k of gracz.reka) liczby[k[0]]++;
        const rzad = new ActionRowBuilder().addComponents(KOLORY.map(kolor =>
            new ButtonBuilder().setCustomId(`mj_void_${kolor}`).setLabel(`${NAZWY_KOLOROW[kolor]} (masz ${liczby[kolor]})`).setStyle(ButtonStyle.Secondary)
        ));
        await pokazPanel(gracz, gra, "🚫 **Deklaracja:** wybierz kolor, którego **całkiem się pozbędziesz**. Nie możesz z nim wygrać!\nPodpowiedź: wybierz ten, którego masz najmniej.", [rzad]);

        const akcja = await czekajNaAkcje(gracz, ["mj_void_Z", "mj_void_K", "mj_void_B"], MAJONG_CZAS_TURY_MS);
        gracz.kolorZakazany = akcja ? akcja.customId.split("_")[2] : najmniejszyKolor(gracz.reka);
    }));
}

function mozliwyKongZReki(gracz) {
    const liczniki = policzKlocki(gracz.reka);
    for (let i = 0; i < 27; i++) {
        if (liczniki[i] === 4) {
            const klocek = `${KOLORY[Math.floor(i / 9)]}${(i % 9) + 1}`;
            if (klocek[0] !== gracz.kolorZakazany) return { typ: "ukryty", klocek };
        }
    }
    for (const meld of gracz.melds) {
        if (meld.typ === "pung" && gracz.reka.includes(meld.klocek)) return { typ: "dolozony", klocek: meld.klocek };
    }
    return null;
}

function wykonajKong(gracz, kong) {
    if (kong.typ === "ukryty") {
        for (let n = 0; n < 4; n++) usunZReki(gracz.reka, kong.klocek);
        gracz.melds.push({ typ: "kong", klocek: kong.klocek });
    } else {
        usunZReki(gracz.reka, kong.klocek);
        const meld = gracz.melds.find(m => m.typ === "pung" && m.klocek === kong.klocek);
        if (meld) meld.typ = "kong";
    }
}

async function turaGracza(gra, gracz, poPrzejeciu) {
    // dobranie (pomijane po przejęciu Punga)
    if (!poPrzejeciu) {
        if (gra.mur.length === 0) return { remis: true };
        const dobrany = gra.mur.pop();
        gracz.reka.push(dobrany);
        gracz.ostatnioDobrany = dobrany;

        if (czyWygrywajaca(gracz.reka, gracz.melds.length, gracz.kolorZakazany)) {
            return { zwyciezca: gracz, sposob: "Tsumo" };
        }
    }

    // Kong z ręki (bot: zawsze; człowiek: przycisk)
    let kong = mozliwyKongZReki(gracz);
    while (kong && gracz.bot) {
        wykonajKong(gracz, kong);
        if (gra.mur.length === 0) return { remis: true };
        gracz.reka.push(gra.mur.pop());
        if (czyWygrywajaca(gracz.reka, gracz.melds.length, gracz.kolorZakazany)) return { zwyciezca: gracz, sposob: "Tsumo" };
        kong = mozliwyKongZReki(gracz);
    }

    // wybór odrzutu
    let odrzut;
    if (gracz.bot) {
        await new Promise(r => setTimeout(r, 900 + Math.random() * 700));
        odrzut = wybierzOdrzut(gracz);
    } else {
        while (true) {
            const komponenty = [new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId("mj_odrzut").setPlaceholder("Wybierz klocek do odrzucenia").addOptions(opcjeOdrzutu(gra, gracz))
            )];
            kong = mozliwyKongZReki(gracz);
            if (kong) komponenty.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("mj_kong").setLabel(`💠 Kong: ${etykietaKlocka(kong.klocek)}`).setStyle(ButtonStyle.Success)
            ));

            const info = gracz.ostatnioDobrany ? `Dobrałeś: **${nazwaZEmotka(gra, gracz.ostatnioDobrany)}**\n` : "";
            const musiszZakazany = gracz.reka.some(k => k[0] === gracz.kolorZakazany) ? `⚠️ Masz klocki zakazanego koloru - musisz odrzucać najpierw je!\n` : "";
            await pokazPanel(gracz, gra, `▶️ **Twoja tura!** ${info}${musiszZakazany}Wybierz klocek do odrzucenia (${MAJONG_CZAS_TURY_MS / 1000}s).`, komponenty);

            const akcja = await czekajNaAkcje(gracz, ["mj_odrzut", "mj_kong"], MAJONG_CZAS_TURY_MS);
            if (!akcja) { odrzut = wybierzOdrzut(gracz); break; }

            if (akcja.customId === "mj_kong") {
                wykonajKong(gracz, kong);
                if (gra.mur.length === 0) return { remis: true };
                gracz.reka.push(gra.mur.pop());
                gracz.ostatnioDobrany = gracz.reka[gracz.reka.length - 1];
                if (czyWygrywajaca(gracz.reka, gracz.melds.length, gracz.kolorZakazany)) return { zwyciezca: gracz, sposob: "Tsumo" };
                continue;
            }
            odrzut = akcja.values[0];
            break;
        }
    }

    usunZReki(gracz.reka, odrzut);
    gra.odrzucone.push(odrzut);
    gra.ostatniOdrzut = { klocek: odrzut, nazwa: gracz.nazwa, gracz };
    gracz.ostatnioDobrany = null;
    if (!gracz.bot) await pokazPanel(gracz, gra, `Odrzuciłeś **${nazwaZEmotka(gra, odrzut)}**. Czekaj na swoją turę...`, []);
    await aktualizujStol(gra, false);

    // Ron - automatyczny (priorytet nad Pung/Kong)
    for (let d = 1; d <= 3; d++) {
        const inny = gra.gracze[(gra.tura + d) % 4];
        if (odrzut[0] !== inny.kolorZakazany && czyWygrywajaca([...inny.reka, odrzut], inny.melds.length, inny.kolorZakazany)) {
            inny.reka.push(odrzut);
            gra.odrzucone.pop();
            return { zwyciezca: inny, sposob: "Ron" };
        }
    }

    // Pung/Kong z odrzutu
    for (let d = 1; d <= 3; d++) {
        const inny = gra.gracze[(gra.tura + d) % 4];
        if (odrzut[0] === inny.kolorZakazany) continue;
        const kopie = inny.reka.filter(k => k === odrzut).length;
        if (kopie < 2) continue;

        let decyzja = null;
        if (inny.bot) {
            decyzja = kopie >= 3 ? "kong" : "pung";
        } else {
            const przyciski = [new ButtonBuilder().setCustomId("mj_pung").setLabel("✊ Pung").setStyle(ButtonStyle.Success)];
            if (kopie >= 3) przyciski.push(new ButtonBuilder().setCustomId("mj_kongclaim").setLabel("💠 Kong").setStyle(ButtonStyle.Success));
            przyciski.push(new ButtonBuilder().setCustomId("mj_pas").setLabel("Pas").setStyle(ButtonStyle.Secondary));
            await pokazPanel(inny, gra, `❕ ${gracz.nazwa} odrzucił **${nazwaZEmotka(gra, odrzut)}** - możesz go przejąć! (${MAJONG_CZAS_PRZEJECIA_MS / 1000}s)`, [new ActionRowBuilder().addComponents(przyciski)]);
            const akcja = await czekajNaAkcje(inny, ["mj_pung", "mj_kongclaim", "mj_pas"], MAJONG_CZAS_PRZEJECIA_MS);
            if (akcja?.customId === "mj_pung") decyzja = "pung";
            else if (akcja?.customId === "mj_kongclaim") decyzja = "kong";
            else await pokazPanel(inny, gra, "Czekaj na swoją turę...", []);
        }

        if (decyzja) {
            gra.odrzucone.pop();
            const ileZReki = decyzja === "kong" ? 3 : 2;
            for (let n = 0; n < ileZReki; n++) usunZReki(inny.reka, odrzut);
            inny.melds.push({ typ: decyzja, klocek: odrzut });
            gra.ostatniOdrzut = null;

            if (decyzja === "kong") {
                if (gra.mur.length === 0) return { remis: true };
                inny.reka.push(gra.mur.pop());
                inny.ostatnioDobrany = inny.reka[inny.reka.length - 1];
                if (czyWygrywajaca(inny.reka, inny.melds.length, inny.kolorZakazany)) return { zwyciezca: inny, sposob: "Tsumo" };
            }
            return { przejecie: (gra.tura + d) % 4 };
        }
    }

    return {};
}

async function petlaGry(gra) {
    const koniecGry = Date.now() + MAJONG_LIMIT_GRY_MS;
    let poPrzejeciu = false;

    while (Date.now() < koniecGry) {
        if (Date.now() - gra.ostatniaAktywnoscLudzi > MAJONG_LIMIT_BEZCZYNNOSCI_MS) {
            return { przerwana: true };
        }

        const gracz = gra.gracze[gra.tura];
        await aktualizujStol(gra, true);

        const wynik = await turaGracza(gra, gracz, poPrzejeciu);
        poPrzejeciu = false;

        if (wynik.remis) return { remis: true };
        if (wynik.zwyciezca) return wynik;
        if (wynik.przejecie !== undefined) {
            gra.tura = wynik.przejecie;
            poPrzejeciu = true;
            continue;
        }
        gra.tura = (gra.tura + 1) % 4;
    }
    return { remis: true };
}

async function zakonczGre(gra, wynik, deps) {
    gra.zakonczona = true;
    aktywneMajongi.delete(gra);

    let podsumowanie = "";
    if (!wynik.przerwana) {
        for (const gracz of gra.gracze) {
            if (gracz.bot) continue;
            let nagroda = deps.losowaLiczba(10, 30);
            let bonus = "";
            if (wynik.zwyciezca === gracz) {
                nagroda += 50;
                bonus = " (w tym +50 za wygraną)";
            }
            await deps.addSolidDice(gracz.id, gra.guildId, nagroda);
            podsumowanie += `<@${gracz.id}> +${nagroda} <:Red_roll:1512521789748547715>${bonus}\n`;
        }
    }

    const tytul = wynik.przerwana
        ? "🀄 Partia przerwana - brak aktywności graczy"
        : wynik.zwyciezca
            ? `🀄 ${wynik.sposob}! Wygrywa ${wynik.zwyciezca.nazwa}!`
            : "🀄 Remis - mur się wyczerpał";
    const embed = new EmbedBuilder()
        .setColor(wynik.zwyciezca ? 0x2ECC71 : 0x555555)
        .setTitle(tytul)
        .setDescription(wynik.przerwana ? "Nikt nie ruszył się przez minutę, więc Mahjong się zwinął. Bez nagród." : (podsumowanie || "Brak nagród."));

    const zawartosc = { embeds: [embed], components: [], files: [] };
    if (wynik.zwyciezca) {
        sortujReke(wynik.zwyciezca.reka);
        embed.setImage("attachment://reka.png");
        embed.addFields({ name: "Zwycięska ręka", value: tekstMeldow(gra, wynik.zwyciezca) === "brak" ? "wszystko z ręki" : `+ ${tekstMeldow(gra, wynik.zwyciezca)}` });
        zawartosc.files = [new AttachmentBuilder(await obrazekReki(wynik.zwyciezca.reka), { name: "reka.png" })];
    }
    await gra.wiadomoscStolu.edit(zawartosc).catch(() => {});

    for (const gracz of gra.gracze) {
        if (!gracz.bot) await pokazPanel(gracz, gra, wynik.przerwana ? "Partia przerwana z powodu braku aktywności." : wynik.zwyciezca === gracz ? "🏆 **Wygrałeś!**" : "Partia zakończona - wyniki na kanale.", []).catch(() => {});
    }
}

// ===== Start / lobby =====

function nowyGracz(id, nazwa, bot, interakcja) {
    return { id, nazwa, bot, interakcja, reka: [], melds: [], kolorZakazany: null, oczekiwanie: null, ostatnioDobrany: null, ostatniWidok: null, panelUszkodzony: false };
}

function podepnijKolektorPanelu(gra, gracz, wiadomoscPanelu, czasMs) {
    const kolektor = wiadomoscPanelu.createMessageComponentCollector({ time: czasMs });
    kolektor.on("collect", async (i) => {
        try {
            gra.ostatniaAktywnoscLudzi = Date.now();
            if (gracz.oczekiwanie && gracz.oczekiwanie.pasujaceId.includes(i.customId)) {
                gracz.interakcja = i;
                await i.deferUpdate().catch(() => {});
                gracz.oczekiwanie.resolve(i);
            } else {
                await i.deferUpdate().catch(() => {});
            }
        } catch (err) {
            console.error("Błąd panelu majonga:", err);
        }
    });
}

// Przycisk na publicznym stole - pozwala odzyskać panel graczowi, który przypadkiem
// zamknął (odrzucił) swoją ephemeralną wiadomość
function podepnijPrzyciskPanelu(gra) {
    const kolektor = gra.wiadomoscStolu.createMessageComponentCollector({ time: MAJONG_LIMIT_GRY_MS + 120000 });
    kolektor.on("collect", async (i) => {
        try {
            if (i.customId !== "mj_panel") { await i.deferUpdate().catch(() => {}); return; }

            const gracz = gra.gracze.find(g => !g.bot && g.id === i.user.id);
            if (!gracz || gra.zakonczona) {
                await i.reply({ content: "❗ Nie grasz w tej partii.", ephemeral: true });
                return;
            }

            gra.ostatniaAktywnoscLudzi = Date.now();
            gracz.interakcja = i;
            const panel = await i.reply({ content: "🀄 Panel przywrócony!", ephemeral: true, fetchReply: true });
            podepnijKolektorPanelu(gra, gracz, panel, MAJONG_LIMIT_GRY_MS + 120000);

            const widok = gracz.ostatniWidok ?? { tresc: "Czekaj na swoją turę...", komponenty: [] };
            await pokazPanel(gracz, gra, widok.tresc, widok.komponenty);
            if (!gracz.panelUszkodzony) await aktualizujStol(gra, true).catch(() => {});
        } catch (err) {
            console.error("Błąd otwierania panelu majonga:", err);
        }
    });
}

async function rozpocznijPartie(gra, deps) {
    gra.wystartowala = true;
    gra.mur = nowyMur();
    for (const gracz of gra.gracze) {
        gracz.reka = gra.mur.splice(0, 13);
        sortujReke(gracz.reka);
    }
    podepnijPrzyciskPanelu(gra);
    await aktualizujStol(gra, true);

    try {
        await fazaWymiany(gra);
        await fazaDeklaracji(gra);
        const wynik = await petlaGry(gra);
        await zakonczGre(gra, wynik, deps);
    } catch (err) {
        console.error("Błąd partii majonga:", err);
        gra.zakonczona = true;
        aktywneMajongi.delete(gra);
        await gra.wiadomoscStolu.edit({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle("🀄 Partia przerwana przez błąd bota")], components: [], files: [] }).catch(() => {});
    }
}

export async function rozpocznijMajong(interaction, deps) {
    const rzadTrybow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("mj_solo").setLabel("🤖 Solo (z botami)").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("mj_multi").setLabel("👥 Multiplayer").setStyle(ButtonStyle.Success),
    );
    const wiadomosc = await interaction.editReply({ embeds: [embedZasad()], components: [rzadTrybow] });

    const kolektorTrybu = wiadomosc.createMessageComponentCollector({ time: 60000 });
    let trybWybrany = false;
    let gra = null;

    kolektorTrybu.on("collect", async (i) => {
        try {
            if (i.customId === "mj_solo" || i.customId === "mj_multi") {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: "❗ Tylko osoba, która wpisała /majong, wybiera tryb.", ephemeral: true });
                    return;
                }
                if (trybWybrany) { await i.deferUpdate().catch(() => {}); return; }
                trybWybrany = true;

                gra = {
                    guildId: interaction.guild.id,
                    guild: interaction.guild,
                    gracze: [],
                    mur: [],
                    tura: 0,
                    odrzucone: [],
                    ostatniOdrzut: null,
                    ostatniaAktualizacja: 0,
                    ostatniaAktywnoscLudzi: Date.now(),
                    zakonczona: false,
                    wystartowala: false,
                    wiadomoscStolu: wiadomosc,
                };
                aktywneMajongi.add(gra);

                const tworca = nowyGracz(interaction.user.id, interaction.user.username, false, i);
                gra.gracze.push(tworca);
                const panelTworcy = await i.reply({ content: "🀄 Twój panel gry - tu pojawi się Twoja ręka!", ephemeral: true, fetchReply: true });
                podepnijKolektorPanelu(gra, tworca, panelTworcy, MAJONG_LIMIT_GRY_MS + 120000);

                if (i.customId === "mj_solo") {
                    kolektorTrybu.stop();
                    for (let n = 0; n < 3; n++) gra.gracze.push(nowyGracz(`bot_${n}`, BOT_NAZWY[n], true, null));
                    await wiadomosc.edit({ embeds: [embedZasad().setFooter({ text: "Tryb solo - partia startuje!" })], components: [] }).catch(() => {});
                    rozpocznijPartie(gra, deps);
                    return;
                }

                // multiplayer - okno dołączania
                const rzadDolacz = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("mj_dolacz").setLabel("🀄 Dołącz do partii").setStyle(ButtonStyle.Success)
                );
                await wiadomosc.edit({
                    embeds: [embedZasad().setFooter({ text: `Multiplayer - dołączanie otwarte przez ${MAJONG_CZAS_DOLACZANIA_MS / 1000}s! (1/4)` })],
                    components: [rzadDolacz],
                }).catch(() => {});

                setTimeout(async () => {
                    kolektorTrybu.stop();
                    while (gra.gracze.length < 4) gra.gracze.push(nowyGracz(`bot_${gra.gracze.length}`, BOT_NAZWY[gra.gracze.length - 1] ?? `Bot ${gra.gracze.length}`, true, null));
                    await wiadomosc.edit({
                        embeds: [embedZasad().setFooter({ text: `Start! Gracze: ${gra.gracze.map(g => g.nazwa).join(", ")}` })],
                        components: [],
                    }).catch(() => {});
                    rozpocznijPartie(gra, deps);
                }, MAJONG_CZAS_DOLACZANIA_MS);
                return;
            }

            if (i.customId === "mj_dolacz") {
                if (!gra || gra.wystartowala || gra.gracze.length >= 4) { await i.reply({ content: "❗ Partia jest już pełna lub wystartowała!", ephemeral: true }); return; }
                if (gra.gracze.some(g => g.id === i.user.id)) { await i.reply({ content: "❗ Już dołączyłeś!", ephemeral: true }); return; }

                gra.ostatniaAktywnoscLudzi = Date.now();
                const gracz = nowyGracz(i.user.id, i.user.username, false, i);
                gra.gracze.push(gracz);
                const panel = await i.reply({ content: "🀄 Dołączyłeś! Tu pojawi się Twoja ręka po starcie partii.", ephemeral: true, fetchReply: true });
                podepnijKolektorPanelu(gra, gracz, panel, MAJONG_LIMIT_GRY_MS + 120000);

                await wiadomosc.edit({
                    embeds: [embedZasad().setFooter({ text: `Multiplayer - dołączanie otwarte! (${gra.gracze.length}/4)` })],
                }).catch(() => {});
            }
        } catch (err) {
            console.error("Błąd lobby majonga:", err);
        }
    });

    kolektorTrybu.on("end", async () => {
        if (!trybWybrany) {
            await wiadomosc.edit({ components: [] }).catch(() => {});
        }
    });
}

export const _test = { nowyMur, czyWygrywajaca, dekompozycja, wybierzOdrzut, najmniejszyKolorZ3, najmniejszyKolor, policzKlocki, svgKafelka, mozliwyKongZReki, nowyGracz, etykietaKlocka, nazwaZEmotka };
