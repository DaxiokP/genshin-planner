import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./src/maps/materialMap.json', 'utf8'));

const weaponMats = [];
Object.entries(data).forEach(([key, val]) => {
  if (val.sortGroup === 600) {
    weaponMats.push({ key, name: val.name, sortRank: val.sortRank, rarity: val.rarity });
  }
});

// Group by sortRank
const groups = {};
weaponMats.forEach(item => {
  if (!groups[item.sortRank]) groups[item.sortRank] = [];
  groups[item.sortRank].push(item);
});

Object.entries(groups).forEach(([rank, items]) => {
  console.log(`Rank ${rank}:`, items.map(i => `${i.name} (${i.rarity}★)`).join(', '));
});
