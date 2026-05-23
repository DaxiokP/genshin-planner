/**
 * Downloads all character namecard backgrounds into public/namecards/
 * Files are saved as: <id>.png  (e.g. Shougun.png, Klee.png, Tartaglia.png)
 * 
 * Sources tried:
 * - enka.network (https://enka.network/ui/UI_NameCardPic_[AssetName]_P.png)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const characterMap = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/maps/characterMap.json'), 'utf8'));
const outputDir = path.join(__dirname, '../../public', 'namecards');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Special Character Mappings for namecard assets in Enka.network
const namecardOverrides = {
    'Momoka': 'Kirara', // Kirara's ID in characterMap is Momoka
    'Yae': 'Yae1'       // Yae Miko's ID in characterMap is Yae
};

/**
 * Resolves the namecard asset name to use in the Enka URL.
 */
const getNamecardAssetName = (id) => {
    if (namecardOverrides[id]) {
        return namecardOverrides[id];
    }
    return id;
};

/**
 * Downloads an image from url to dest path.
 * Supports HTTP redirects and custom headers.
 */
const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        let finished = false;

        const cleanup = (err) => {
            if (finished) return;
            finished = true;
            file.close(() => {
                if (fs.existsSync(dest)) {
                    try {
                        fs.unlinkSync(dest);
                    } catch (e) {}
                }
                if (err) reject(err); else resolve();
            });
        };

        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }, (response) => {
            // Handle HTTP Redirects (301, 302, etc.)
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close(() => {
                    if (fs.existsSync(dest)) {
                        try {
                            fs.unlinkSync(dest);
                        } catch (e) {}
                    }
                });
                downloadImage(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                cleanup(new Error(`HTTP Status ${response.statusCode}`));
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
        req.setTimeout(20000, () => {
            req.destroy();
            cleanup(new Error('Timeout after 20s'));
        });
    });
};

const isValid = (dest) => fs.existsSync(dest) && fs.statSync(dest).size > 500;

const processAll = async () => {
    const seen = new Set();
    const tasks = [];

    for (const [key, data] of Object.entries(characterMap)) {
        if (!data.id || seen.has(data.id)) continue;
        
        // Skip traveler characters or placeholder test characters since they don't have namecards
        if (['PlayerBoy', 'PlayerGirl', 'MannequinBoy', 'MannequinGirl'].includes(data.id)) {
            continue;
        }

        seen.add(data.id);

        const assetName = getNamecardAssetName(data.id);
        const dest = path.join(outputDir, `${data.id}.png`);
        const url = `https://enka.network/ui/UI_NameCardPic_${assetName}_P.png`;

        tasks.push({
            key,
            name: data.name,
            id: data.id,
            assetName,
            url,
            dest
        });
    }

    console.log(`🖼️  ${tasks.length} character namecard backgrounds to process...`);
    let downloaded = 0, skipped = 0, failed = 0;

    // Process tasks in parallel chunks of 10
    const chunkSize = 10;
    for (let i = 0; i < tasks.length; i += chunkSize) {
        const chunk = tasks.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async ({ name, id, assetName, url, dest }) => {
            if (isValid(dest)) {
                skipped++;
                return;
            }

            try {
                await downloadImage(url, dest);
                if (isValid(dest)) {
                    console.log(`  ✓ ${name} (${id}) -> UI_NameCardPic_${assetName}_P.png`);
                    downloaded++;
                } else {
                    if (fs.existsSync(dest)) {
                        try {
                            fs.unlinkSync(dest);
                        } catch (e) {}
                    }
                    failed++;
                    console.log(`  ✗ FAILED: ${name} (${id}) - Empty file downloaded`);
                }
            } catch (e) {
                failed++;
                console.log(`  ✗ FAILED: ${name} (${id}) - ${e.message} (URL: ${url})`);
            }
        }));

        if ((i + chunkSize) % 30 === 0 || i + chunkSize >= tasks.length) {
            console.log(`  Progress: ${Math.min(i + chunkSize, tasks.length)}/${tasks.length}`);
        }
    }

    console.log(`\n🎉 Process Complete!`);
    console.log(`  Downloaded: ${downloaded}`);
    console.log(`  Skipped (already exists): ${skipped}`);
    console.log(`  Failed/Not Available: ${failed}`);
    console.log(`📁 Saved to: ${outputDir}\n`);
};

processAll().catch(console.error);
