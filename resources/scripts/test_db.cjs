const genshindb = require('genshin-db');
const weapon = genshindb.weapons('A Thousand Floating Dreams');

// We can get the curves from a weapon by inspecting its stats function's closure.
// But we don't need closure compilation hacks if we can just get them from genshin-db.
// Wait! Let's see how genshindb is constructed.
// In Node.js, we can write a script to look at the module's internal data.
// E.g., const weaponsData = require('genshin-db/src/data/english/weapons.json');
// Let's check if we can require the raw JSON files from genshin-db!
try {
  const rawData = require('genshin-db/src/data/english/weapons.json');
  console.log('Successfully required raw weapons.json!');
  console.log('Keys of first weapon:', Object.keys(rawData[Object.keys(rawData)[0]]));
} catch (e) {
  console.log('Error requiring raw weapons:', e.message);
}
