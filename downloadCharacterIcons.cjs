/**
 * Downloads all character portrait icons into public/characters/
 * Files are saved as: <id>.png  (e.g. Shougun.png, Tartaglia.png)
 * 
 * Sources tried in order:
 * 1. enka.network  (UI_AvatarIcon_<id>.png)
 * 2. gi.yatta.moe  (UI_AvatarIcon_<id>.png)
 * 3. mihoyo CDN    (stored in characterMap.icon)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const characterMap = JSON.parse(fs.readFileSync('./src/characterMap.json', 'utf8'));
const outputDir = path.join(__dirname, 'public', 'characters');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        let finished = false;
        const cleanup = (err) => {
            if (finished) return;
            finished = true;
            file.close(() => {
                if (fs.existsSync(dest)) try { fs.unlinkSync(dest); } catch {}
                if (err) reject(err); else resolve();
            });
        };
        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close(() => { if (fs.existsSync(dest)) try { fs.unlinkSync(dest); } catch {} });
                downloadImage(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                cleanup(new Error(`HTTP ${response.statusCode}`));
                response.resume();
                return;
            }
            response.pipe(file);
            file.on('finish', () => { finished = true; file.close(resolve); });
            file.on('error', cleanup);
        });
        req.on('error', cleanup);
        req.setTimeout(20000, () => { req.destroy(); cleanup(new Error('Timeout')); });
    });
};

const isValid = (dest) => fs.existsSync(dest) && fs.statSync(dest).size > 500;

const processAll = async () => {
    const seen = new Set();
    const tasks = [];

    for (const [key, data] of Object.entries(characterMap)) {
        if (!data.id || seen.has(data.id)) continue;
        seen.add(data.id);

        const dest = path.join(outputDir, `${data.id}.png`);
        if (isValid(dest)) continue;

        tasks.push({
            key,
            name: data.name,
            id: data.id,
            dest,
            urls: [
                `https://enka.network/ui/UI_AvatarIcon_${data.id}.png`,
                `https://gi.yatta.moe/assets/UI/UI_AvatarIcon_${data.id}.png`,
                data.icon, // mihoyo CDN fallback
            ].filter(Boolean)
        });
    }

    if (tasks.length === 0) {
        console.log('✅ All character icons already present!');
        return;
    }

    console.log(`🧑 ${tasks.length} character icons to download (sequential)...`);
    let downloaded = 0, failed = 0;

    for (const { key, name, id, dest, urls } of tasks) {
        let success = false;
        for (const url of urls) {
            try {
                await downloadImage(url, dest);
                if (isValid(dest)) {
                    const hostname = new URL(url).hostname;
                    console.log(`  ✓ ${name} from ${hostname}`);
                    downloaded++;
                    success = true;
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
            console.log(`  ✗ FAILED: ${name} (${id})`);
        }
    }

    console.log(`\n✅ Done! Downloaded: ${downloaded}, Failed: ${failed}`);
    console.log(`📁 Saved to: ${outputDir}`);
};

processAll().catch(console.error);
