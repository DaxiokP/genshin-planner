const fs = require('fs');
const path = require('path');
const https = require('https');

const patchesPath = path.join(__dirname, '../../src/maps/patches.json');
if (!fs.existsSync(patchesPath)) {
  console.log('⚠️ No patches.json found. Skipping patch application.');
  process.exit(0);
}

const patches = JSON.parse(fs.readFileSync(patchesPath, 'utf8'));

// 1. Merge Characters
const charMapPath = path.join(__dirname, '../../src/maps/characterMap.json');
if (fs.existsSync(charMapPath) && patches.characters) {
  const charMap = JSON.parse(fs.readFileSync(charMapPath, 'utf8'));
  Object.assign(charMap, patches.characters);
  fs.writeFileSync(charMapPath, JSON.stringify(charMap, null, 2));
  console.log(`Merged ${Object.keys(patches.characters).length} characters into characterMap.json.`);
}

// 2. Merge Character Requirements
const charReqsPath = path.join(__dirname, '../../src/maps/characterRequirementsMap.json');
if (fs.existsSync(charReqsPath) && patches.characterRequirements) {
  const charReqs = JSON.parse(fs.readFileSync(charReqsPath, 'utf8'));
  Object.assign(charReqs, patches.characterRequirements);
  fs.writeFileSync(charReqsPath, JSON.stringify(charReqs, null, 2));
  console.log(`Merged ${Object.keys(patches.characterRequirements).length} character requirements into characterRequirementsMap.json.`);
}

// 3. Merge Weapons (with stats scaling copy)
const weaponMapPath = path.join(__dirname, '../../src/maps/weaponMap.json');
if (fs.existsSync(weaponMapPath) && patches.weapons) {
  const weaponMap = JSON.parse(fs.readFileSync(weaponMapPath, 'utf8'));
  
  const refWeaponKey = 'MistsplitterReforged';
  const refWeapon = weaponMap[refWeaponKey];
  
  Object.keys(patches.weapons).forEach(wepKey => {
    const patchedWeapon = { ...patches.weapons[wepKey] };
    if ((!patchedWeapon.stats || Object.keys(patchedWeapon.stats).length === 0) && refWeapon) {
      patchedWeapon.stats = refWeapon.stats;
      console.log(`Copied stats scaling from ${refWeaponKey} to patched weapon ${patchedWeapon.name}.`);
    }
    weaponMap[wepKey] = patchedWeapon;
  });
  
  fs.writeFileSync(weaponMapPath, JSON.stringify(weaponMap, null, 2));
  console.log(`Merged ${Object.keys(patches.weapons).length} weapons into weaponMap.json.`);
}

// 4. Merge Weapon Requirements
const weaponReqsPath = path.join(__dirname, '../../src/maps/weaponRequirementsMap.json');
if (fs.existsSync(weaponReqsPath) && patches.weaponRequirements) {
  const weaponReqs = JSON.parse(fs.readFileSync(weaponReqsPath, 'utf8'));
  Object.assign(weaponReqs, patches.weaponRequirements);
  fs.writeFileSync(weaponReqsPath, JSON.stringify(weaponReqs, null, 2));
  console.log(`Merged ${Object.keys(patches.weaponRequirements).length} weapon requirements into weaponRequirementsMap.json.`);
}

// 5. Merge Materials
const materialMapPath = path.join(__dirname, '../../src/maps/materialMap.json');
if (fs.existsSync(materialMapPath) && patches.materials) {
  const materialMap = JSON.parse(fs.readFileSync(materialMapPath, 'utf8'));
  Object.assign(materialMap, patches.materials);
  fs.writeFileSync(materialMapPath, JSON.stringify(materialMap, null, 2));
  console.log(`Merged ${Object.keys(patches.materials).length} materials into materialMap.json.`);
}

// 6. Merge Artifacts
const artifactMapPath = path.join(__dirname, '../../src/maps/artifactMap.json');
if (fs.existsSync(artifactMapPath) && patches.artifacts) {
  const artifactMap = JSON.parse(fs.readFileSync(artifactMapPath, 'utf8'));
  Object.assign(artifactMap, patches.artifacts);
  fs.writeFileSync(artifactMapPath, JSON.stringify(artifactMap, null, 2));
  console.log(`Merged ${Object.keys(patches.artifacts).length} artifacts into artifactMap.json.`);
}

// Helper to download image
const downloadImage = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        downloadImage(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Status ${response.statusCode}`));
      } else {
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }
    });
    req.on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
    req.setTimeout(15000, () => {
      req.destroy();
      file.close();
      fs.unlink(dest, () => {});
      reject(new Error('Timeout'));
    });
  });
};

const isPlaceholder = (filePath, fallbackPath) => {
  if (!fs.existsSync(filePath) || !fs.existsSync(fallbackPath)) return false;
  return fs.statSync(filePath).size === fs.statSync(fallbackPath).size;
};

const isValid = (filePath, fallbackPath) => {
  if (!fs.existsSync(filePath)) return false;
  if (fs.statSync(filePath).size <= 500) return false;
  if (fallbackPath && isPlaceholder(filePath, fallbackPath)) return false;
  return true;
};

// Asset Download Jobs
const assetJobs = [
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/c/c8/Sandrone_Icon.png/revision/latest/scale-to-width-down/256',
    dest: 'public/characters/Sandrone.png',
    fallback: 'public/characters/Shenhe.png'
  },
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/4/41/Sandrone_Wish.png/revision/latest/scale-to-width-down/1024',
    dest: 'public/splash_arts/Sandrone.png',
    fallback: 'public/splash_arts/Shenhe.png'
  },
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/4/4d/Namecard_Background_Sandrone_Tea_Break.png/revision/latest/scale-to-width-down/512',
    dest: 'public/namecards/Sandrone.png',
    fallback: 'public/namecards/Shenhe.png'
  },
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/c/c4/Weapon_A_Teaspoon_of_Transcendence.png/revision/latest/scale-to-width-down/256',
    dest: 'public/weapons/Claymore_Transcendence.png',
    fallback: 'public/weapons/Claymore_Aniki.png'
  },
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/5/50/Item_Madman%27s_Restraint.png/revision/latest/scale-to-width-down/256',
    dest: 'public/icons/113082.png',
    fallback: 'public/icons/112122.png'
  },
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/b/b4/Item_Fractured_Lunar_Iron.png/revision/latest/scale-to-width-down/256',
    dest: 'public/icons/112995.png',
    fallback: 'public/icons/112122.png'
  },
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/b/b4/Item_Depleted_Lunar_Iron.png/revision/latest/scale-to-width-down/256',
    dest: 'public/icons/112996.png',
    fallback: 'public/icons/112123.png'
  },
  {
    url: 'https://static.wikia.nocookie.net/gensin-impact/images/a/ad/Item_Unblemished_Lunar_Iron.png/revision/latest/scale-to-width-down/256',
    dest: 'public/icons/112997.png',
    fallback: 'public/icons/112124.png'
  }
];

// Artifact Relics
const artifactFallbackMap = {
  flower: 'public/artifacts/UI_RelicIcon_15014_4.png',
  plume: 'public/artifacts/UI_RelicIcon_15014_2.png',
  sands: 'public/artifacts/UI_RelicIcon_15014_5.png',
  goblet: 'public/artifacts/UI_RelicIcon_15014_1.png',
  circlet: 'public/artifacts/UI_RelicIcon_15014_3.png'
};

async function processAssets() {
  console.log('\n🌐 Processing patch assets...');
  
  for (const job of assetJobs) {
    const destPath = path.join(__dirname, '../../', job.dest);
    const fallbackPath = path.join(__dirname, '../../', job.fallback);
    const destDir = path.dirname(destPath);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (isValid(destPath, fallbackPath)) {
      continue;
    }

    // Try to download
    try {
      console.log(`  Downloading ${job.dest} from Fandom Wiki...`);
      await downloadImage(job.url, destPath);
      if (isValid(destPath, fallbackPath)) {
        console.log(`    ✓ Success!`);
        continue;
      }
    } catch (e) {
      console.log(`    ✗ Failed download: ${e.message}`);
    }

    // Fallback copy if download failed and we don't already have it
    if (!fs.existsSync(destPath) && fs.existsSync(fallbackPath)) {
      try {
        fs.copyFileSync(fallbackPath, destPath);
        console.log(`    ✓ Copied fallback placeholder: ${job.fallback} -> ${job.dest}`);
      } catch (err) {
        console.error(`    ✗ Fallback copy failed:`, err.message);
      }
    }
  }

  // Artifact fallbacks if BBS downloads failed
  if (patches.artifacts) {
    Object.values(patches.artifacts).forEach(art => {
      const slots = ['flower', 'plume', 'sands', 'goblet', 'circlet'];
      slots.forEach(slot => {
        const filenameKey = `filename_${slot}`;
        const filename = art.icons && art.icons[filenameKey];
        if (filename) {
          const destPath = path.join(__dirname, '../../public/artifacts', `${filename}.png`);
          if (!isValid(destPath)) {
            const fallbackPath = path.join(__dirname, '../../', artifactFallbackMap[slot]);
            if (fs.existsSync(fallbackPath)) {
              fs.copyFileSync(fallbackPath, destPath);
              console.log(`  ✓ Copied fallback artifact: ${artifactFallbackMap[slot]} -> public/artifacts/${filename}.png`);
            }
          }
        }
      });
    });
  }

  console.log('✅ Patches applied successfully.');
}

processAssets().catch(console.error);
