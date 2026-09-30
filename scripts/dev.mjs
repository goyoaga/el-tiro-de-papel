import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve('.', pathname === '/' ? 'index.html' : `.${pathname}`);
  if (file !== resolve('index.html') && !file.startsWith(resolve('src') + sep)) {
    response.writeHead(404); response.end('Not found'); return;
  }
  try { response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); response.end(await readFile(file)); }
  catch { response.writeHead(404); response.end('Not found'); }
}).listen(4173, '0.0.0.0', () => console.log('http://localhost:4173'));
