const genshindb = require('genshin-db');
const fs = require('fs');
const path = require('path');

const weaponMapPath = path.join(__dirname, '../../src/maps/weaponMap.json');
const weaponMap = JSON.parse(fs.readFileSync(weaponMapPath, 'utf8'));

const requirementsMap = {};

// Helper to normalize material names to keys used in materialMap.json
function normalizeMaterialKey(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

// Populate requirements
Object.keys(weaponMap).forEach(key => {
    const wepData = weaponMap[key];
    const wepName = wepData.name;
    
    const wep = genshindb.weapons(wepName);
    
    if (!wep) {
        console.warn(`Warning: Weapon not found in genshin-db: ${wepName}`);
        return;
    }
    
    const wepReqs = {
        ascension: {}
    };
    
    // Map ascension costs (ascend1 to ascend6)
    if (wep.costs) {
        for (let i = 1; i <= 6; i++) {
            const costKey = `ascend${i}`;
            const costs = wep.costs[costKey] || [];
            wepReqs.ascension[i] = costs.map(item => ({
                key: normalizeMaterialKey(item.name),
                name: item.name,
                count: item.count
            }));
        }
    }
    
    requirementsMap[wepName] = wepReqs;
});

const outputPath = path.join(__dirname, '../../src/maps/weaponRequirementsMap.json');
fs.writeFileSync(outputPath, JSON.stringify(requirementsMap, null, 2));
console.log(`Generated weapon requirements map for ${Object.keys(requirementsMap).length} entries.`);
