const http = require('http');
const fs   = require('fs');
const path = require('path');
const net  = require('net');

const PORT         = 3000;
const ROOT         = __dirname;
const ANALYSIS_DIR = path.join(ROOT, 'analysis');

fs.mkdirSync(ANALYSIS_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function sanitizeName(raw) {
  return raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
}

function readBody(req, limitMB = 50) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const limit = limitMB * 1024 * 1024;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > limit) { reject(new Error(`Body exceeds ${limitMB} MB`)); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, contentType, body) {
  if (res.headersSent) return;
  const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  res.writeHead(status, {
    'Content-Type':                contentType,
    'Content-Length':              buf.length,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(buf);
}

function sendJSON(res, status, obj) {
  send(res, status, 'application/json', JSON.stringify(obj));
}

async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const { pathname } = new URL(req.url, 'http://localhost');

  // ── API ──────────────────────────────────────────────────────────────────

  if (pathname === '/api/list' && req.method === 'GET') {
    const names = fs.readdirSync(ANALYSIS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.slice(0, -5))
      .sort();
    return sendJSON(res, 200, names);
  }

  if (pathname.startsWith('/api/save/') && req.method === 'POST') {
    const name = sanitizeName(pathname.slice('/api/save/'.length));
    if (!name) return sendJSON(res, 400, { error: 'invalid name' });
    const body = await readBody(req);
    fs.writeFileSync(path.join(ANALYSIS_DIR, name + '.json'), body, 'utf8');
    console.log('[save]', `${name}.json`, `${(body.length / 1024).toFixed(0)} KB`);
    return sendJSON(res, 200, { ok: true, name });
  }

  if (pathname.startsWith('/api/load/') && req.method === 'GET') {
    const name = sanitizeName(pathname.slice('/api/load/'.length));
    const file = path.join(ANALYSIS_DIR, name + '.json');
    if (!fs.existsSync(file)) return sendJSON(res, 404, { error: 'not found' });
    const data = fs.readFileSync(file);
    console.log('[load]', `${name}.json`, `${(data.length / 1024).toFixed(0)} KB`);
    return send(res, 200, 'application/json', data);
  }

  if (pathname.startsWith('/api/delete/') && req.method === 'DELETE') {
    const name = sanitizeName(pathname.slice('/api/delete/'.length));
    const file = path.join(ANALYSIS_DIR, name + '.json');
    if (fs.existsSync(file)) { fs.unlinkSync(file); console.log('[delete]', `${name}.json`); }
    return sendJSON(res, 200, { ok: true });
  }

  // ── Static files ─────────────────────────────────────────────────────────
  const rel      = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(ROOT, rel);
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'text/plain', 'Forbidden');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile())
    return send(res, 404, 'text/plain', '404 Not Found');
  const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  return send(res, 200, mime, fs.readFileSync(filePath));
}

// Wrap async handler so uncaught rejections return 500 instead of crashing
const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(err => {
    console.error('[error]', req.method, req.url, err.message);
    sendJSON(res, 500, { error: err.message });
  });
});

// Listen on both IPv4 and IPv6 so Chrome's ::1 preference works on macOS
function listenOn(host) {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      handleRequest(req, res).catch(err => {
        console.error('[error]', req.method, req.url, err.message);
        sendJSON(res, 500, { error: err.message });
      });
    });
    s.listen(PORT, host, () => resolve(s));
    s.on('error', () => resolve(null)); // silently skip if address unavailable
  });
}

(async () => {
  const [s4, s6] = await Promise.all([listenOn('0.0.0.0'), listenOn('::1')]);
  const bound = [s4 && '0.0.0.0', s6 && '::1'].filter(Boolean);
  console.log('');
  console.log('  Portrait Analyzer');
  console.log('  ─────────────────────────────────────');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Listening on: ${bound.join(', ')}`);
  console.log(`  Analysis folder: ${ANALYSIS_DIR}`);
  console.log('');
})();
