const genshindb = require('genshin-db');
const fs = require('fs');

const characterMap = {};
const characters = genshindb.characters('names', { matchCategories: true });

characters.forEach(name => {
    const data = genshindb.characters(name);
    if (!data) return;

    // GOOD format uses PascalCase for keys usually, but let's check.
    // Actually GOOD usually follows the names closely but sometimes removes spaces.
    // We'll use a normalized key for mapping.
    const key = data.name.replace(/[^a-zA-Z0-9]/g, ''); 
    
    characterMap[key] = {
        name: data.name,
        rarity: data.rarity,
        element: data.elementText,
        weaponType: data.weaponText,
        icon: data.images.mihoyo_icon,
        id: data.images.filename_icon.replace('UI_AvatarIcon_', '')
    };
});

fs.writeFileSync('src/characterMap.json', JSON.stringify(characterMap, null, 2));
console.log(`Mapped ${Object.keys(characterMap).length} characters.`);
