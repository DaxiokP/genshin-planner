const m = require('../../src/maps/materialMap.json');
const groups = {};
Object.entries(m).forEach(([k, v]) => {
    const g = v.sortGroup || 999;
    if (!groups[g]) groups[g] = [];
    groups[g].push(k);
});
Object.keys(groups).sort((a, b) => a - b).forEach(g => {
    console.log(`\nGroup ${g} (${groups[g].length} items):`);
    console.log(groups[g].slice(0, 6).join(', '));
});
