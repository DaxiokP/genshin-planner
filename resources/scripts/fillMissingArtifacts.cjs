/**
 * Sequential downloader for missing artifact icons.
 * No concurrency to avoid any race conditions.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const artifactMap = JSON.parse(fs.readFileSync('./src/maps/artifactMap.json', 'utf8'));
const outputDir = path.join(__dirname, '../../public', 'artifacts');
const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);
        let finished = false;
        const cleanup = (err) => {
            if (finished) return;
            finished = true;
            file.close(() => {
                if (fs.existsSync(dest)) {
                    try { fs.unlinkSync(dest); } catch {}
                }
                if (err) reject(err);
                else resolve();
            });
        };
        const req = lib.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close(() => {
                    if (fs.existsSync(dest)) try { fs.unlinkSync(dest); } catch {}
                });
                downloadImage(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                cleanup(new Error(`HTTP ${response.statusCode}`));
                response.resume();
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                finished = true;
                file.close(resolve);
            });
            file.on('error', cleanup);
        });
        req.on('error', cleanup);
        req.setTimeout(20000, () => { req.destroy(); cleanup(new Error('Timeout')); });
    });
};

const isValid = (dest) => fs.existsSync(dest) && fs.statSync(dest).size > 500;

const processAll = async () => {
    // Collect all tasks
    const tasks = [];
    for (const [key, data] of Object.entries(artifactMap)) {
        for (const slot of SLOTS) {
            const fn = data.icons?.['filename_' + slot];
            if (!fn) continue;
            const dest = path.join(outputDir, `${fn}.png`);
            if (isValid(dest)) continue; // Already good

            tasks.push({
                key, slot, fn, dest,
                urls: [
                    `https://enka.network/ui/${fn}.png`,
                    `https://gi.yatta.moe/assets/UI/${fn}.png`,
                    data.icons?.['mihoyo_' + slot],
                    data.icons?.[slot],
                ].filter(Boolean)
            });
        }
    }

    if (tasks.length === 0) {
        console.log('✅ All artifact icons already present!');
        return;
    }

    console.log(`🔄 Downloading ${tasks.length} missing artifact icons (sequential)...`);
    let downloaded = 0, failed = 0;

    for (const { key, slot, fn, dest, urls } of tasks) {
        let success = false;
        for (const url of urls) {
            try {
                await downloadImage(url, dest);
                if (isValid(dest)) {
                    const hostname = new URL(url).hostname;
                    console.log(`  ✓ ${key}/${slot} from ${hostname} (${fn})`);
                    success = true;
                    downloaded++;
                    break;
                } else {
                    if (fs.existsSync(dest)) try { fs.unlinkSync(dest); } catch {}
                }
            } catch (e) {
                if (fs.existsSync(dest)) try { fs.unlinkSync(dest); } catch {}
            }
        }
        if (!success) {
            failed++;
            console.log(`  ✗ FAILED: ${key}/${slot} (${fn})`);
        }
    }

    console.log(`\n✅ Done! Downloaded: ${downloaded}, Failed: ${failed}`);
};

processAll().catch(console.error);
