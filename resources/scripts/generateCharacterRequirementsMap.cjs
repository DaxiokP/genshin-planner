const genshindb = require('genshin-db');
const fs = require('fs');
const path = require('path');

const characterMapPath = path.join(__dirname, '../../src/maps/characterMap.json');
const characterMap = JSON.parse(fs.readFileSync(characterMapPath, 'utf8'));

const requirementsMap = {};

// Helper to normalize material names to keys used in materialMap.json
function normalizeMaterialKey(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

// Populate requirements
Object.keys(characterMap).forEach(key => {
    const charData = characterMap[key];
    const charName = charData.name;
    
    // For Traveler, fetch Aether for ascensions and Traveler (Anemo) for talents
    const lookupName = (key === 'Aether' || key === 'Lumine' || key === 'Traveler') ? 'Aether' : charName;
    const talentLookupName = (key === 'Aether' || key === 'Lumine' || key === 'Traveler') ? 'Traveler (Anemo)' : charName;
    
    const char = genshindb.characters(lookupName);
    const talents = genshindb.talents(talentLookupName);
    
    if (!char) {
        console.warn(`Warning: Character not found in genshin-db: ${lookupName}`);
        return;
    }
    
    const charReqs = {
        ascension: {},
        talents: {}
    };
    
    // 1. Map ascension costs (ascend1 to ascend6)
    if (char.costs) {
        for (let i = 1; i <= 6; i++) {
            const costKey = `ascend${i}`;
            const costs = char.costs[costKey] || [];
            charReqs.ascension[i] = costs.map(item => ({
                key: normalizeMaterialKey(item.name),
                name: item.name,
                count: item.count
            }));
        }
    }
    
    // 2. Map talent costs (lvl2 to lvl10)
    if (talents && talents.costs) {
        for (let i = 2; i <= 10; i++) {
            const costKey = `lvl${i}`;
            const costs = talents.costs[costKey] || [];
            charReqs.talents[i] = costs.map(item => ({
                key: normalizeMaterialKey(item.name),
                name: item.name,
                count: item.count
            }));
        }
    }
    
    requirementsMap[key] = charReqs;
});

// Explicitly add 'Traveler' key mapping to Aether / Traveler (Anemo) to ensure both ways are covered
if (requirementsMap['Aether']) {
    requirementsMap['Traveler'] = requirementsMap['Aether'];
}

// Generate element-specific Traveler entries (TravelerAnemo, TravelerGeo, TravelerElectro, TravelerDendro, TravelerHydro, TravelerPyro, TravelerCryo)
const baseTravelerAscension = requirementsMap['Aether'] ? requirementsMap['Aether'].ascension : {};

function buildRotatingTalentCosts(books, mobs, weeklyBoss) {
    // books = [monThu, tueFri, wedSat] where each is [teachings, guide, philosophies]
    // mobs = [tier1, tier2, tier3]
    // weeklyBoss = { key, name }
    const [b1, b2, b3] = books;
    const [m1, m2, m3] = mobs;
    return {
        "2": [
            { key: "mora", name: "Mora", count: 12500 },
            { key: normalizeMaterialKey(b1[0]), name: b1[0], count: 3 },
            { key: normalizeMaterialKey(m1), name: m1, count: 6 }
        ],
        "3": [
            { key: "mora", name: "Mora", count: 17500 },
            { key: normalizeMaterialKey(b2[1]), name: b2[1], count: 2 },
            { key: normalizeMaterialKey(m2), name: m2, count: 3 }
        ],
        "4": [
            { key: "mora", name: "Mora", count: 25000 },
            { key: normalizeMaterialKey(b3[1]), name: b3[1], count: 4 },
            { key: normalizeMaterialKey(m2), name: m2, count: 4 }
        ],
        "5": [
            { key: "mora", name: "Mora", count: 30000 },
            { key: normalizeMaterialKey(b1[1]), name: b1[1], count: 6 },
            { key: normalizeMaterialKey(m2), name: m2, count: 6 }
        ],
        "6": [
            { key: "mora", name: "Mora", count: 37500 },
            { key: normalizeMaterialKey(b2[1]), name: b2[1], count: 9 },
            { key: normalizeMaterialKey(m2), name: m2, count: 9 }
        ],
        "7": [
            { key: "mora", name: "Mora", count: 120000 },
            { key: normalizeMaterialKey(b3[2]), name: b3[2], count: 4 },
            { key: normalizeMaterialKey(m3), name: m3, count: 4 },
            { key: normalizeMaterialKey(weeklyBoss), name: weeklyBoss, count: 1 }
        ],
        "8": [
            { key: "mora", name: "Mora", count: 260000 },
            { key: normalizeMaterialKey(b1[2]), name: b1[2], count: 6 },
            { key: normalizeMaterialKey(m3), name: m3, count: 6 },
            { key: normalizeMaterialKey(weeklyBoss), name: weeklyBoss, count: 1 }
        ],
        "9": [
            { key: "mora", name: "Mora", count: 450000 },
            { key: normalizeMaterialKey(b2[2]), name: b2[2], count: 12 },
            { key: normalizeMaterialKey(m3), name: m3, count: 9 },
            { key: normalizeMaterialKey(weeklyBoss), name: weeklyBoss, count: 2 }
        ],
        "10": [
            { key: "mora", name: "Mora", count: 700000 },
            { key: normalizeMaterialKey(b3[2]), name: b3[2], count: 16 },
            { key: normalizeMaterialKey(m3), name: m3, count: 12 },
            { key: normalizeMaterialKey(weeklyBoss), name: weeklyBoss, count: 2 },
            { key: "crownofinsight", name: "Crown of Insight", count: 1 }
        ]
    };
}

const mondstadtBooks = [
    ["Teachings of Freedom", "Guide to Freedom", "Philosophies of Freedom"],
    ["Teachings of Resistance", "Guide to Resistance", "Philosophies of Resistance"],
    ["Teachings of Ballad", "Guide to Ballad", "Philosophies of Ballad"]
];
const liyueBooks = [
    ["Teachings of Prosperity", "Guide to Prosperity", "Philosophies of Prosperity"],
    ["Teachings of Diligence", "Guide to Diligence", "Philosophies of Diligence"],
    ["Teachings of Gold", "Guide to Gold", "Philosophies of Gold"]
];
const snezhnayaBooks = [
    ["Teachings of Charity", "Guide to Charity", "Philosophies of Charity"],
    ["Teachings of Fortitude", "Guide to Fortitude", "Philosophies of Fortitude"],
    ["Teachings of Glory", "Guide to Glory", "Philosophies of Glory"]
];

['Anemo', 'Geo', 'Electro', 'Dendro', 'Hydro', 'Pyro', 'Cryo'].forEach(el => {
    const varKey = `Traveler${el}`;
    if (el === 'Geo') {
        // Geo Traveler official in-game quirk:
        // Skill & Burst use Liyue books + Samachurl Scrolls + Tail of Boreas
        // Normal Attack (autoTalents) uses Mondstadt books + Hilichurl Arrowheads + Dvalin's Sigh
        requirementsMap[varKey] = {
            ascension: baseTravelerAscension,
            talents: buildRotatingTalentCosts(
                liyueBooks,
                ["Divining Scroll", "Sealed Scroll", "Forbidden Curse Scroll"],
                "Tail of Boreas"
            ),
            autoTalents: buildRotatingTalentCosts(
                mondstadtBooks,
                ["Firm Arrowhead", "Sharp Arrowhead", "Weathered Arrowhead"],
                "Dvalin's Sigh"
            )
        };
    } else if (el === 'Cryo') {
        requirementsMap[varKey] = {
            ascension: baseTravelerAscension,
            talents: buildRotatingTalentCosts(
                snezhnayaBooks,
                ["Chimeric Core", "Symbiotic Chimeric Nucleus", "Prime Chimeric Nexus"],
                "Ascended Sample: Queen"
            )
        };
    } else {
        const tData = genshindb.talents(`Traveler (${el})`);
        const talentsObj = {};
        if (tData && tData.costs) {
            for (let i = 2; i <= 10; i++) {
                const costKey = `lvl${i}`;
                const costs = tData.costs[costKey] || [];
                talentsObj[i] = costs.map(item => ({
                    key: normalizeMaterialKey(item.name),
                    name: item.name,
                    count: item.count
                }));
            }
        }
        requirementsMap[varKey] = {
            ascension: baseTravelerAscension,
            talents: talentsObj
        };
    }
});

const outputPath = path.join(__dirname, '../../src/maps/characterRequirementsMap.json');
fs.writeFileSync(outputPath, JSON.stringify(requirementsMap, null, 2));
console.log(`Generated character requirements map for ${Object.keys(requirementsMap).length} entries.`);
