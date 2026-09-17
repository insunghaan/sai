// server.js - Minimal production HTTP server for Google Cloud Run
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = '0.0.0.0';
const PUBLIC_DIR = __dirname;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'ubeeslab';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Clean SVG favicon for SAI
const FAVICON_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
  `<rect width="32" height="32" rx="8" fill="#1b1c1e"/>` +
  `<text x="16" y="21" font-size="14" font-family="-apple-system,sans-serif" font-weight="700" fill="#f5f5f7" text-anchor="middle">SㅅI</text>` +
  `</svg>`,
  'utf-8'
);

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60000) {
    return cachedToken;
  }

  // 1. Production (Cloud Run metadata server)
  try {
    const metaRes = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(1000)
    });
    if (metaRes.ok) {
      const data = await metaRes.json();
      cachedToken = data.access_token;
      tokenExpiry = now + (data.expires_in * 1000);
      return cachedToken;
    }
  } catch (_) {}

  // 2. Local development fallback (gcloud CLI)
  try {
    const { execSync } = require('node:child_process');
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (token) {
      cachedToken = token;
      tokenExpiry = now + (30 * 60 * 1000);
      return cachedToken;
    }
  } catch (_) {}

  throw new Error('Unable to acquire Google Cloud access token');
}

async function saveWaitlistEntry(collection, email, data) {
  const token = await getAccessToken();
  const encodedDocId = encodeURIComponent(email);
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodedDocId}`;

  let createdAt = new Date().toISOString();
  try {
    const getRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(3000)
    });
    if (getRes.ok) {
      const existing = await getRes.json();
      if (existing?.fields?.created_at?.timestampValue) {
        createdAt = existing.fields.created_at.timestampValue;
      }
    }
  } catch (err) {
    console.warn('Could not check existing doc, using current timestamp for created_at:', err.message);
  }

  const body = {
    fields: {
      email: { stringValue: email },
      country: { stringValue: data.country || '' },
      feature: { stringValue: data.feature || '' },
      budget: { stringValue: data.budget || '' },
      locale: { stringValue: data.locale || 'ko' },
      client_ip: { stringValue: data.client_ip || '' },
      user_agent: { stringValue: data.user_agent || '' },
      created_at: { timestampValue: createdAt },
      updated_at: { timestampValue: new Date().toISOString() }
    }
  };

  const patchRes = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000)
  });

  if (!patchRes.ok) {
    const errText = await patchRes.text();
    throw new Error(`Firestore API error (${patchRes.status}): ${errText}`);
  }

  return await patchRes.json();
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    pathname = decodeURIComponent(parsed.pathname);
  } catch (err) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  // Health check endpoint
  if (pathname === '/_health' || pathname === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('OK');
    return;
  }

  // Waitlist API endpoint
  if (pathname === '/api/waitlist') {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 100 * 1024) {
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email) || email.length > 254) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Valid email is required' }));
          return;
        }

        const country = typeof data.country === 'string' ? data.country.trim().toUpperCase() : 'OTHER';
        const feature = typeof data.feature === 'string' ? data.feature.trim() : '';
        const budget = typeof data.budget === 'string' ? data.budget.trim() : '';
        const locale = typeof data.locale === 'string' ? data.locale.trim().toLowerCase() : 'ko';

        let targetCollection = 'sai_waitlist_other';
        if (country === 'KR') {
          targetCollection = 'sai_waitlist_kr';
        } else if (country === 'JP') {
          targetCollection = 'sai_waitlist_jp';
        }

        const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        await saveWaitlistEntry(targetCollection, email, {
          country,
          feature,
          budget,
          locale,
          client_ip: clientIp,
          user_agent: userAgent
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: true, collection: targetCollection }));
      } catch (err) {
        console.error('Waitlist submission error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end('Method Not Allowed');
    return;
  }

  // Root mapping: public root '/' and '/index.html' serve teaser-v9.html
  let targetFile;
  if (pathname === '/' || pathname === '/index.html') {
    targetFile = 'teaser-v9.html';
  } else if (pathname === '/favicon.ico') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(FAVICON_SVG);
    }
    return;
  } else {
    targetFile = pathname.replace(/^\/+/, '');
  }

  // Prevent directory traversal
  const safePath = path.normalize(targetFile).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Block hidden files or server configuration files
  const baseName = path.basename(filePath);
  if (
    baseName.startsWith('.') ||
    baseName === 'Dockerfile' ||
    baseName === 'cloudbuild.yaml' ||
    baseName === 'server.js'
  ) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('404 Not Found');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);

    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`SAI production server listening on http://${HOST}:${PORT}`);
});
