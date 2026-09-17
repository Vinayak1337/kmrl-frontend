const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const mime = { '.js': 'application/javascript', '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.css': 'text/css' };
http.createServer((req, res) => {
 const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
 let file = path.resolve(root, '.' + pathname);
 if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
 res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
 fs.createReadStream(file).pipe(res);
}).listen(8082, '127.0.0.1');
