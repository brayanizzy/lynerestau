const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    const name = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\//, '');
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep) || !types[path.extname(file)]) { response.writeHead(404).end(); return; }
    const body = await fs.readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
server.listen(4180, '127.0.0.1', () => console.log('Vitrine preview: http://127.0.0.1:4180'));
