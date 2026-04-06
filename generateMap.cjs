const genshindb = require('genshin-db');
const fs = require('fs');

const goodData = JSON.parse(fs.readFileSync('../genshin_export_2026-03-31_01-18.json', 'utf8'));

// The definitive Set of permitted item names
const allowedNames = new Set([
  // Character EXP
  "Wanderer's Advice",
  "Adventurer's Experience",
  "Hero's Wit",
  // Weapon EXP
  "Enhancement Ore",
  "Fine Enhancement Ore",
  "Mystic Enhancement Ore",
  "Sanctifying Unction",
  "Sanctifying Essence"
]);

// 1. Scrape Character Ascension bounds
genshindb.characters('names', { matchCategories: true }).forEach(charName => {
    const char = genshindb.characters(charName);
    if (!char || !char.costs) return;
    Object.values(char.costs).forEach(costArray => {
        costArray.forEach(item => allowedNames.add(item.name));
    });
    
    // Scrape corresponding Talents bounds
    const talents = genshindb.talents(charName);
    if (talents && talents.costs) {
        Object.values(talents.costs).forEach(costArray => {
            costArray.forEach(item => allowedNames.add(item.name));
        });
    }
});

// 2. Scrape Weapon Ascension bounds
genshindb.weapons('names', { matchCategories: true }).forEach(wepName => {
    const wep = genshindb.weapons(wepName);
    if (!wep || !wep.costs) return;
    Object.values(wep.costs).forEach(costArray => {
        costArray.forEach(item => allowedNames.add(item.name));
    });
});

console.log(`Compiled strict whitelist of ${allowedNames.size} items.`);

// The dictionaries
const map = {};
const categories = ['materials', 'weapons', 'artifacts', 'crafts'];

// Assign a sort group to each item based on its typeText, category, and ID range
// Order: 1=monster drops, 2=boss drops (rarity 5), 3=boss drops (rarity 4), 
//        4=elemental stones, 5=talent books, 6=weapon materials, 7=local specialties, 8=everything else
const getSortGroup = (data) => {
    const tt = data.typeText || '';
    const numId = parseInt(data.id) || 0;
    const r = data.rarity || 1;
    
    // Monster common drops (Damaged Mask, Slime, etc.) — IDs 112xxx
    if (tt === 'Character and Weapon Enhancement Material' && numId >= 112000 && numId < 113000) {
        return 100;
    }
    
    // Boss drops — Character Level-Up Material (Everflame Seed, etc.) — IDs 113xxx
    if (tt === 'Character Level-Up Material') {
        if (r >= 5) return 200;  // Weekly boss (rarity 5)
        return 300;              // Normal boss (rarity 4)
    }
    
    // Elemental stones — Character Ascension Material — IDs 104111-104174
    if (tt === 'Character Ascension Material' && numId >= 104100 && numId < 104200) {
        return 400;
    }
    
    // Talent books — Character Talent Material — IDs 104301-104364
    if (tt === 'Character Talent Material') {
        return 500;
    }
    
    // Weapon ascension domain materials — IDs 114xxx
    if (tt === 'Weapon Ascension Material' && numId >= 114000) {
        return 600;
    }
    
    // Local specialties (the plants/flowers) — IDs 100xxx-101xxx, usually rarity 1
    if (tt.startsWith('Local Specialty') || (numId >= 100000 && numId < 102000 && r <= 1)) {
        return 700;
    }
    
    // EXP materials, Mora, Crown of Insight, misc
    return 800;
};

const parseItem = (data) => {
    if (!allowedNames.has(data.name)) return false;
    
    if (data && data.images && data.images.filename_icon) {
        let id = data.images.filename_icon.replace('UI_ItemIcon_', '').replace('UI_ItemIcon_Equip_', '');
        const sortGroup = getSortGroup(data);
        const numId = parseInt(id) || 0;
        // Use a normalized key: strip non-alphanumeric, lowercase
        const key = data.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        
        if (!map[key]) {
            map[key] = {
                id: id,
                name: data.name,
                rarity: data.rarity || 1,
                sources: data.sources || [],
                sortGroup: sortGroup,
                sortRank: data.sortRank || numId
            };
        }
        return true;
    }
    return false;
};

// 3. Scan the ENTIRE genshin-db for all whitelisted items
let mappedCount = 0;
for (const cat of categories) {
    const names = genshindb[cat]('names', { matchCategories: true }) || [];
    names.forEach(name => {
        const data = genshindb[cat](name);
        if (data && parseItem(data)) {
            mappedCount++;
        }
    });
}

fs.writeFileSync('src/materialMap.json', JSON.stringify(map, null, 2));
console.log(`Successfully mapped ${mappedCount} total progression materials (full database).`);
