/**
 * Downloads all weapon icons into public/weapons/
 * Files are saved as: <id>.png  (e.g. Sword_Estoc.png)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const weaponMap = JSON.parse(fs.readFileSync('./src/maps/weaponMap.json', 'utf8'));
const outputDir = path.join(__dirname, '../../public', 'weapons');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

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
    const tasks = Object.entries(weaponMap).map(([key, data]) => {
        const id = data.id;
        const dest = path.join(outputDir, `${id}.png`);

        // URL priority: mihoyo CDN -> enka.network -> yatta.moe
        const mihoyoUrl = data.icon; // e.g. https://upload-os-bbs.mihoyo.com/.../UI_EquipIcon_Sword_Estoc.png
        const enkaUrl = `https://enka.network/ui/UI_EquipIcon_${id}.png`;
        const yattaUrl = `https://gi.yatta.moe/assets/UI/UI_EquipIcon_${id}.png`;

        return { key, name: data.name, id, dest, urls: [mihoyoUrl, enkaUrl, yattaUrl].filter(Boolean) };
    });

    console.log(`⚔️  ${tasks.length} weapon icons to process...`);
    let downloaded = 0, skipped = 0, failed = 0;

    // Download in chunks of 10
    for (let i = 0; i < tasks.length; i += 10) {
        const chunk = tasks.slice(i, i + 10);
        await Promise.all(chunk.map(async ({ key, name, id, dest, urls }) => {
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
                console.log(`  ✗ ${name} (${id})`);
            }
        }));

        if ((i + 10) % 50 === 0) {
            console.log(`  Progress: ${Math.min(i + 10, tasks.length)}/${tasks.length}`);
        }
    }

    console.log(`\n✅ Done! Downloaded: ${downloaded}, Skipped (cached): ${skipped}, Failed: ${failed}`);
};

processAll().catch(console.error);
