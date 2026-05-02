/**
 * Downloads all artifact piece icons into public/artifacts/
 * Files are saved as: <filename>.png  (e.g. UI_RelicIcon_15014_4.png)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const artifactMap = JSON.parse(fs.readFileSync('./src/maps/artifactMap.json', 'utf8'));
const outputDir = path.join(__dirname, '../../public', 'artifacts');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }, (response) => {
            if (response.statusCode >= 300) {
                file.close();
                fs.unlink(dest, () => {});
                reject(new Error(`HTTP ${response.statusCode}`));
            } else {
                response.pipe(file);
                file.on('finish', () => file.close(resolve));
            }
        });
        req.on('error', (err) => { file.close(); fs.unlink(dest, () => {}); reject(err); });
        req.setTimeout(15000, () => { req.destroy(); file.close(); fs.unlink(dest, () => {}); reject(new Error('Timeout')); });
    });
};

const isValid = (dest) => fs.existsSync(dest) && fs.statSync(dest).size > 500;

const processAll = async () => {
    // Build a flat list of {filename, urls[]} to download
    const tasks = [];

    for (const [key, data] of Object.entries(artifactMap)) {
        const icons = data.icons || {};
        for (const slot of SLOTS) {
            // Determine the filename for this slot
            const filenameKey = `filename_${slot}`;
            const filename = icons[filenameKey];
            
            if (!filename) continue; // slot not available for this set

            const dest = path.join(outputDir, `${filename}.png`);

            // Build URL priority list
            const mihoyoUrl = icons[`mihoyo_${slot}`] || icons[slot];
            const enkaUrl = `https://enka.network/ui/${filename}.png`;
            const yattaUrl = `https://gi.yatta.moe/assets/UI/${filename}.png`;

            tasks.push({ key, slot, filename, dest, urls: [mihoyoUrl, enkaUrl, yattaUrl].filter(Boolean) });
        }
    }

    console.log(`📦 ${tasks.length} artifact icons to process...`);
    let downloaded = 0, skipped = 0, failed = 0;

    // Download in chunks of 10
    for (let i = 0; i < tasks.length; i += 10) {
        const chunk = tasks.slice(i, i + 10);
        await Promise.all(chunk.map(async ({ key, slot, filename, dest, urls }) => {
            if (isValid(dest)) {
                skipped++;
                return;
            }

            let success = false;
            for (const url of urls) {
                try {
                    await downloadImage(url, dest);
                    if (isValid(dest)) {
                        success = true;
                        downloaded++;
                        break;
                    } else {
                        fs.unlink(dest, () => {});
                    }
                } catch { /* try next */ }
            }

            if (!success) {
                failed++;
                console.log(`  ✗ ${key}/${slot} (${filename})`);
            }
        }));

        if ((i + 10) % 50 === 0) {
            console.log(`  Progress: ${Math.min(i + 10, tasks.length)}/${tasks.length}`);
        }
    }

    console.log(`\n✅ Done! Downloaded: ${downloaded}, Skipped (cached): ${skipped}, Failed: ${failed}`);
};

processAll().catch(console.error);
