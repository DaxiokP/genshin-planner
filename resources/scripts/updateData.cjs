const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'generateCharacterMap.cjs',
  'generateCharacterRequirementsMap.cjs',
  'generateWeaponMap.cjs',
  'generateWeaponRequirementsMap.cjs',
  'generateArtifactMap.cjs',
  'generateMap.cjs',
  'downloadCharacterIcons.cjs',
  'downloadWeaponIcons.cjs',
  'downloadArtifactIcons.cjs',
  'downloadIcons.cjs',
  'downloadSplashArts.cjs',
  'downloadNamecards.cjs'
];

console.log('🔄 Starting Genshin Planner Data & Asset Update Process...\n');

scripts.forEach((script, index) => {
  const scriptPath = path.join(__dirname, script);
  console.log(`[${index + 1}/${scripts.length}] Running ${script}...`);
  try {
    execSync(`node "${scriptPath}"`, { cwd: path.join(__dirname, '../..'), stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Error running ${script}:`, error.message);
    process.exit(1);
  }
  console.log('');
});

console.log('✅ Genshin Planner update completed successfully!');
