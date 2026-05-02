const genshindb = require('genshin-db');
const fs = require('fs');

const weaponMap = {};
const weapons = genshindb.weapons('names', { matchCategories: true });

weapons.forEach(name => {
    const data = genshindb.weapons(name);
    if (!data) return;

    const key = data.name.replace(/[^a-zA-Z0-9]/g, '');
    
    weaponMap[key] = {
        name: data.name,
        rarity: data.rarity,
        type: data.weaponText,
        icon: data.images.mihoyo_icon,
        id: data.images.filename_icon.replace('UI_EquipIcon_', '')
    };
});

fs.writeFileSync('src/maps/weaponMap.json', JSON.stringify(weaponMap, null, 2));
console.log(`Mapped ${Object.keys(weaponMap).length} weapons.`);
