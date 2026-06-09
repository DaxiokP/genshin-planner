const genshindb = require('genshin-db');
const fs = require('fs');

const weaponMap = {};
const weapons = genshindb.weapons('names', { matchCategories: true });

weapons.forEach(name => {
    const data = genshindb.weapons(name);
    if (!data) return;

    const key = data.name.replace(/[^a-zA-Z0-9]/g, '');
    
    // Precalculate stats for all 96 valid level-ascension combinations
    const stats = {};
    for (let lvl = 1; lvl <= 90; lvl++) {
        const ascensions = [];
        if (lvl === 20) ascensions.push(0, 1);
        else if (lvl === 40) ascensions.push(1, 2);
        else if (lvl === 50) ascensions.push(2, 3);
        else if (lvl === 60) ascensions.push(3, 4);
        else if (lvl === 70) ascensions.push(4, 5);
        else if (lvl === 80) ascensions.push(5, 6);
        else {
            let asc = 0;
            if (lvl > 80) asc = 6;
            else if (lvl > 70) asc = 5;
            else if (lvl > 60) asc = 4;
            else if (lvl > 50) asc = 3;
            else if (lvl > 40) asc = 2;
            else if (lvl > 20) asc = 1;
            ascensions.push(asc);
        }

        ascensions.forEach(asc => {
            try {
                const s = data.stats(lvl, asc);
                if (s) {
                    const atk = Math.round(s.attack * 100) / 100;
                    const specialized = s.specialized ? Math.round(s.specialized * 100) / 100 : 0;
                    stats[`${lvl}-${asc}`] = [atk, specialized];
                }
            } catch (e) {
                // Ignore errors for weapons that don't have stats
            }
        });
    }

    weaponMap[key] = {
        name: data.name,
        rarity: parseInt(data.rarity),
        type: data.weaponText,
        icon: data.images.mihoyo_icon,
        id: data.images.filename_icon.replace('UI_EquipIcon_', ''),
        substatType: data.mainStatText || '',
        stats: stats,
        version: data.version
    };
});

fs.writeFileSync('src/maps/weaponMap.json', JSON.stringify(weaponMap, null, 2));
console.log(`Mapped ${Object.keys(weaponMap).length} weapons with precalculated stats.`);

