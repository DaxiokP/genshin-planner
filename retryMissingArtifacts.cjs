/**
 * Re-attempts to download missing artifact icons using alternative sources.
 * Run this after downloadArtifactIcons.cjs to fill gaps.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const artifactMap = JSON.parse(fs.readFileSync('./src/artifactMap.json', 'utf8'));
const outputDir = path.join(__dirname, 'public', 'artifacts');
const SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);
        const req = lib.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'image/png,image/*,*/*',
            }
        }, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlink(dest, () => {});
                return downloadImage(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => {});
                return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        });
        req.on('error', (err) => { file.close(); fs.unlink(dest, () => {}); reject(err); });
        req.setTimeout(20000, () => { req.destroy(); file.close(); fs.unlink(dest, () => {}); reject(new Error('Timeout')); });
    });
};

const isValid = (dest) => fs.existsSync(dest) && fs.statSync(dest).size > 500;

const processAll = async () => {
    // Collect missing icons
    const missing = [];
    for (const [key, data] of Object.entries(artifactMap)) {
        for (const slot of SLOTS) {
            const fn = data.icons?.['filename_' + slot];
            if (!fn) continue;
            const dest = path.join(outputDir, `${fn}.png`);
            if (!isValid(dest)) {
                // Try alternate URLs
                const urls = [
                    `https://gi.yatta.moe/assets/UI/${fn}.png`,
                    `https://enka.network/ui/${fn}.png`,
                    `https://res.cloudinary.com/genshin/image/upload/${fn}.png`,
                    `https://genshin.honeyhunterworld.com/img/${fn}.webp`,
                ];
                missing.push({ key, slot, fn, dest, urls });
            }
        }
    }

    if (missing.length === 0) {
        console.log('✅ All artifact icons are present!');
        return;
    }

    console.log(`🔄 Attempting to fill ${missing.length} missing artifact icons...`);
    let downloaded = 0, failed = 0;

    for (let i = 0; i < missing.length; i += 5) {
        const chunk = missing.slice(i, i + 5);
        await Promise.all(chunk.map(async ({ key, slot, fn, dest, urls }) => {
            let success = false;
            for (const url of urls) {
                try {
                    await downloadImage(url, dest);
                    if (isValid(dest)) {
                        console.log(`  ✓ ${key}/${slot} from ${new URL(url).hostname}`);
                        downloaded++;
                        success = true;
                        break;
                    } else {
                        if (fs.existsSync(dest)) fs.unlinkSync(dest);
                    }
                } catch (e) {
                    // try next
                }
            }
            if (!success) {
                failed++;
                console.log(`  ✗ FAILED: ${key}/${slot} (${fn})`);
            }
        }));
    }

    console.log(`\n✅ Done! Downloaded: ${downloaded}, Failed: ${failed}`);
};

processAll().catch(console.error);
