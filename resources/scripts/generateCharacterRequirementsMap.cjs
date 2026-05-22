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

const outputPath = path.join(__dirname, '../../src/maps/characterRequirementsMap.json');
fs.writeFileSync(outputPath, JSON.stringify(requirementsMap, null, 2));
console.log(`Generated character requirements map for ${Object.keys(requirementsMap).length} entries.`);
