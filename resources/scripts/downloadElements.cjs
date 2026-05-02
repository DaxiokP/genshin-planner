const fs = require('fs');
const https = require('https');
const path = require('path');

const elements = ['pyro', 'hydro', 'anemo', 'electro', 'dendro', 'cryo', 'geo'];
const targetDir = path.join(__dirname, '..', '..', 'public', 'elements');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

elements.forEach(element => {
  const url = `https://genshin.jmp.blue/elements/${element}/icon`;
  const dest = path.join(targetDir, `${element}.png`);
  
  const file = fs.createWriteStream(dest);
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${element}.png`);
      });
    } else {
      console.error(`Failed to download ${element}: HTTP ${response.statusCode}`);
      file.close();
      fs.unlink(dest, () => {}); // Delete empty file
    }
  }).on('error', (err) => {
    fs.unlink(dest, () => {}); // Delete empty file
    console.error(`Error downloading ${element}: ${err.message}`);
  });
});
