const genshindb = require('genshin-db');
const fs = require('fs');

const artifactMap = {};
const artifacts = genshindb.artifacts('names', { matchCategories: true });

artifacts.forEach(name => {
    const data = genshindb.artifacts(name);
    if (!data) return;

    const key = data.name.replace(/[^a-zA-Z0-9]/g, '');
    
    artifactMap[key] = {
        name: data.name,
        icons: data.images
    };
});

fs.writeFileSync('src/maps/artifactMap.json', JSON.stringify(artifactMap, null, 2));
console.log(`Mapped ${Object.keys(artifactMap).length} artifact sets.`);
