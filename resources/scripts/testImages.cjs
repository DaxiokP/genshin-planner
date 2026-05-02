const http = require('https');
const map = require('../../src/maps/materialMap.json');

const entries = Object.entries(map);

const checkImage = (key, id) => {
    return new Promise((resolve) => {
        const url = `https://enka.network/ui/UI_ItemIcon_${id}.png`;
        const req = http.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
            if (res.statusCode >= 400 && res.statusCode !== 405) {
                resolve({ key, id, failed: true, reason: res.statusCode });
            } else {
                resolve({ key, id, failed: false });
            }
        });
        
        req.on('error', (err) => {
            resolve({ key, id, failed: true, reason: err.message });
        });
        req.on('timeout', () => {
            req.destroy();
            resolve({ key, id, failed: true, reason: 'timeout' });
        });
        req.end();
    });
};

async function checkAll() {
    console.log(`Checking ${entries.length} images...`);
    // Throttle to max 20 connections
    let missing = [];
    const chunks = [];
    for (let i = 0; i < entries.length; i += 20) {
        chunks.push(entries.slice(i, i + 20));
    }
    
    for (const chunk of chunks) {
        const results = await Promise.all(chunk.map(([key, val]) => checkImage(key, val.id)));
        missing.push(...results.filter(r => r.failed));
    }
    
    console.log(`Found ${missing.length} missing images.`);
    missing.forEach(m => console.log(`${m.key}: UI_ItemIcon_${m.id}.png (${m.reason})`));
}

checkAll();
