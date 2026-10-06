const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.bin': 'application/octet-stream',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const WORKSPACE_DIR = path.resolve(__dirname, '..');

const server = http.createServer((req, res) => {
    // Enable CORS for all local requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') {
        reqPath = '/index.html';
    }

    let filePath = path.join(BASE_DIR, reqPath);
    let targetPath = null;

    if (filePath.startsWith(BASE_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        targetPath = filePath;
    } else {
        const altPath = path.join(WORKSPACE_DIR, reqPath);
        if (altPath.startsWith(WORKSPACE_DIR) && fs.existsSync(altPath) && fs.statSync(altPath).isFile()) {
            targetPath = altPath;
        }
    }

    if (!targetPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + reqPath);
        return;
    }

    filePath = targetPath;
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found: ' + reqPath);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Cache-Control': 'no-cache'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} in use, trying ${Number(PORT) + 1}...`);
        server.listen(Number(PORT) + 1);
    } else {
        console.error('Server error:', err);
    }
});

server.listen(PORT, () => {
    const address = server.address();
    console.log(`\n==================================================`);
    console.log(`🏠 3D Hostel Management running at:`);
    console.log(`   http://localhost:${address.port}/`);
    console.log(`==================================================\n`);
});
