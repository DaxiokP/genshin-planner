const https = require('https');
const fs = require('fs');
const path = require('path');

const mapPath = './src/maps/materialMap.json';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const downloadImage = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }, (response) => {
            if (response.statusCode >= 300) {
                file.close();
                fs.unlink(dest, () => reject(new Error('Status: ' + response.statusCode)));
            } else {
                response.pipe(file);
                file.on('finish', () => file.close(resolve));
            }
        });
        req.on('error', (err) => { file.close(); fs.unlink(dest, () => reject(err)); });
        req.on('timeout', () => { req.destroy(); file.close(); fs.unlink(dest, () => reject(new Error('Timeout'))); });
        req.setTimeout(10000);
    });
};

async function fixBrokenIcons() {
    // Find all entries that got the bad 2358-byte webp placeholder
    const broken = Object.entries(map).filter(([k, v]) => v.localExt === '.webp');
    console.log(`Found ${broken.length} broken webp icons to re-download...`);

    let fixed = 0;
    let failed = 0;

    for (let i = 0; i < broken.length; i += 5) {
        const chunk = broken.slice(i, i + 5);
        await Promise.all(chunk.map(async ([key, item]) => {
            const badPath = path.join(__dirname, '../../public', 'icons', `${item.id}.webp`);
            const goodPath = path.join(__dirname, '../../public', 'icons', `${item.id}.png`);
            const yattaUrl = `https://gi.yatta.moe/assets/UI/UI_ItemIcon_${item.id}.png`;

            // Delete the broken webp
            if (fs.existsSync(badPath)) fs.unlinkSync(badPath);

            try {
                await downloadImage(yattaUrl, goodPath);
                const stat = fs.statSync(goodPath);
                if (stat.size < 500) {
                    // Suspiciously small, likely another placeholder
                    fs.unlinkSync(goodPath);
                    throw new Error('File too small: ' + stat.size);
                }
                item.localExt = '.png';
                fixed++;
                console.log(`  ✓ ${key} (${item.id}) - ${stat.size} bytes`);
            } catch (err) {
                failed++;
                console.log(`  ✗ ${key} (${item.id}) - ${err.message}`);
            }
        }));
    }

    fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
    console.log(`\nDone! Fixed: ${fixed}, Still broken: ${failed}`);
}

fixBrokenIcons().catch(console.error);
