const https = require('https');
const fs = require('fs');
const path = require('path');
const mapPath = './src/materialMap.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (response) => {
            if (response.statusCode >= 300) {
                file.close();
                fs.unlink(dest, () => reject(new Error('Status: ' + response.statusCode)));
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            }
        });
        req.on('error', (err) => {
            file.close();
            fs.unlink(dest, () => reject(err));
        });
        req.on('timeout', () => {
            req.destroy();
            file.close();
            fs.unlink(dest, () => reject(new Error('Timeout')));
        });
        req.setTimeout(10000);
    });
};

const processQueue = async () => {
    const keys = Object.keys(map);
    console.log(`Starting download for ${keys.length} items...`);
    let downloadedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < keys.length; i += 10) {
        const chunk = keys.slice(i, i + 10);
        await Promise.all(chunk.map(async (key) => {
            const item = map[key];
            const dest = path.join(__dirname, 'public', 'icons', `${item.id}.png`);
            
            // Skip if already downloaded
            if (fs.existsSync(dest) && fs.statSync(dest).size > 500) {
                item.localExt = '.png';
                skippedCount++;
                return;
            }
            
            // Primary: gi.yatta.moe
            const yattaUrl = `https://gi.yatta.moe/assets/UI/UI_ItemIcon_${item.id}.png`;
            // Fallback: enka.network
            const enkaUrl = `https://enka.network/ui/UI_ItemIcon_${item.id}.png`;
            
            try {
                await downloadImage(yattaUrl, dest);
                if (fs.statSync(dest).size < 500) {
                    fs.unlinkSync(dest);
                    throw new Error('File too small');
                }
                item.localExt = '.png';
                downloadedCount++;
            } catch (err) {
                // Fallback to Enka
                try {
                    await downloadImage(enkaUrl, dest);
                    if (fs.statSync(dest).size < 500) {
                        fs.unlinkSync(dest);
                        throw new Error('File too small');
                    }
                    item.localExt = '.png';
                    downloadedCount++;
                } catch (err2) {
                    failedCount++;
                    console.log(`  ✗ ${key} (${item.id}) - failed from both sources`);
                }
            }
        }));
    }
    
    fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
    console.log(`\nDone! Downloaded: ${downloadedCount}, Skipped (already cached): ${skippedCount}, Failed: ${failedCount}`);
};

processQueue().catch(console.error);
