const https = require('https');
const fs = require('fs');
const path = require('path');

const download = (url, dest) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dest);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
    if (res.statusCode !== 200) {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      return reject(new Error(`Status ${res.statusCode}`));
    }
    res.pipe(file);
    file.on('finish', () => file.close(resolve));
  }).on('error', err => {
    file.close();
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    reject(err);
  });
});

async function main() {
  console.log('🚀 Downloading exact 7.0 & Il Dottore assets from Yatta CDN...');

  const weaponDownloads = [
    { url: 'https://gi.yatta.moe/assets/UI/UI_EquipIcon_Sword_Swanlake.png', dest: 'public/weapons/Sword_Swanlake.png' },
    { url: 'https://gi.yatta.moe/assets/UI/UI_EquipIcon_Sword_SerpentTooth.png', dest: 'public/weapons/Sword_SerpentTooth.png' },
    { url: 'https://gi.yatta.moe/assets/UI/UI_EquipIcon_Claymore_EscapeWheel.png', dest: 'public/weapons/Claymore_EscapeWheel.png' },
    { url: 'https://gi.yatta.moe/assets/UI/UI_EquipIcon_Catalyst_SandMemoria.png', dest: 'public/weapons/Catalyst_SandMemoria.png' },
    { url: 'https://gi.yatta.moe/assets/UI/UI_EquipIcon_Pole_FaesCrystalle.png', dest: 'public/weapons/Pole_FaesCrystalle.png' },
    { url: 'https://gi.yatta.moe/assets/UI/UI_EquipIcon_Bow_ShatteredMirror.png', dest: 'public/weapons/Bow_ShatteredMirror.png' }
  ];

  const materialIds = [
    '101275', '101276', '101277', '101279', '101282',
    '112146', '112147', '112148', '112149', '112150', '112151', '112152', '112153', '112154', '112155', '112156', '112157',
    '113082', '113087', '113088', '113089', '113090', '113091',
    '104365', '104366', '104367', '104368', '104369', '104370', '104371', '104372', '104373'
  ];

  for (const w of weaponDownloads) {
    const fullDest = path.join(__dirname, '../../', w.dest);
    try {
      await download(w.url, fullDest);
      console.log(`  ✓ Weapon: ${w.dest} (${fs.statSync(fullDest).size} bytes)`);
    } catch(e) {
      console.error(`  ✗ Weapon: ${w.dest} - ${e.message}`);
    }
  }

  for (const id of materialIds) {
    const relDest = `public/icons/${id}.png`;
    const fullDest = path.join(__dirname, '../../', relDest);
    const url = `https://gi.yatta.moe/assets/UI/UI_ItemIcon_${id}.png`;
    try {
      await download(url, fullDest);
      console.log(`  ✓ Material ${id}: ${relDest} (${fs.statSync(fullDest).size} bytes)`);
    } catch(e) {
      console.error(`  ✗ Material ${id}: ${relDest} - ${e.message}`);
    }
  }

  console.log('✅ Yatta asset download complete!');
}

main();
