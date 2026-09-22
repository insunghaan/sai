// server.js - Minimal production HTTP server for Google Cloud Run
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Firestore } = require('@google-cloud/firestore');
const welcome = require('./server/welcome');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = '0.0.0.0';
const PUBLIC_DIR = __dirname;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'ubeeslab';
const db = new Firestore({ projectId: PROJECT_ID });

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

const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_PATTERN =
  /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

function isValidIp(ip) {
  return typeof ip === 'string' && (IPV4_PATTERN.test(ip) || IPV6_PATTERN.test(ip));
}

function isPrivateIp(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = parseInt(parts[1], 10);
    if (!Number.isNaN(second) && second >= 16 && second <= 31) return true;
  }
  return false;
}

function extractClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp && isValidIp(firstIp)) return firstIp;
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp && isValidIp(realIp.trim())) return realIp.trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && isValidIp(cfIp.trim())) return cfIp.trim();
  return null;
}

async function resolveGeoLocation(req, clientHint = {}) {
  const clientIp = extractClientIp(req);
  const clientTimezone = clientHint.timezone?.trim() || null;
  const clientLanguage = clientHint.language?.trim() || req.headers['accept-language']?.split(',')[0]?.trim() || null;

  const fallbackGeo = {
    country_code: null,
    country: null,
    region: null,
    city: null,
    timezone: clientTimezone,
    client_timezone: clientTimezone,
    client_language: clientLanguage,
  };

  if (!clientIp || isPrivateIp(clientIp)) {
    return fallbackGeo;
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, {
      signal: AbortSignal.timeout(1500),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SAI-Waitlist-Geo/1.0',
      },
    });

    if (!res.ok) return fallbackGeo;

    const data = await res.json();
    if (data && data.success === true) {
      return {
        country_code: data.country_code || null,
        country: data.country || null,
        region: data.region || null,
        city: data.city || null,
        timezone: data.timezone?.id || clientTimezone,
        client_timezone: clientTimezone,
        client_language: clientLanguage,
      };
    }
  } catch (err) {
    // Graceful fallback on lookup timeout or network failure
  }

  return fallbackGeo;
}

const FEATURE_LABELS = {
  ko: {
    checkin: '아침 체크인 & 컨디션 공유',
    calendar: '우리의 리듬 캘린더',
    care: '내가 챙길게',
    pulse: '심박이 빛으로 닿는 순간',
    breathe: '같은 속도로 쉬는 24초',
    walk: '각자의 걸음, 하나의 길',
    garden: '잘 잔 날, 함께 피어나',
    date: '함께한 순간',
    rhythm: '우리 둘 다 편한 시간',
    cycle: '생리 주기 예상 & 선택 공유',
    chat: '둘만의 대화'
  },
  ja: {
    checkin: '朝のチェックイン＆体調共有',
    calendar: 'ふたりのリズムカレンダー',
    care: '私がするね',
    pulse: '心拍が光で届く瞬間',
    breathe: '同じペースで休む24秒',
    walk: 'それぞれの歩み、ひとつの道',
    garden: '眠れた日に、一緒に咲く',
    date: 'ふたりの瞬間',
    rhythm: 'ふたりとも都合のいい時間',
    cycle: '生理周期の予測＆選択共有',
    chat: 'ふたりのトーク'
  }
};

const BUDGET_LABELS = {
  ko: {
    undecided: '아직 잘 모르겠어요',
    low: '월 5,000원 미만',
    mid: '월 5,000~10,000원',
    high: '월 10,000원 이상'
  },
  ja: {
    undecided: 'まだわからない',
    low: '月500円未満',
    mid: '月500〜1,000円',
    high: '月1,000円以上'
  }
};

const COUNTRY_LABELS = {
  ko: {
    KR: '한국',
    JP: '일본',
    other: '그 외',
    OTHER: '그 외'
  },
  ja: {
    KR: '韓国',
    JP: '日本',
    other: 'その他',
    OTHER: 'その他'
  }
};

async function saveWaitlistEntry(collection, email, data) {
  const country = data.country || (data.market === 'JP' ? 'JP' : 'KR');
  const feature = data.feature || '';
  const budget = data.budget || '';
  const countryLabel = data.country_label || COUNTRY_LABELS[data.language]?.[country] || country;
  const featureLabel = data.feature_label || FEATURE_LABELS[data.language]?.[feature] || feature;
  const budgetLabel = data.budget_label || BUDGET_LABELS[data.language]?.[budget] || budget;
  return welcome.saveSignup(db, collection, email, {
    ...data, country, feature, budget,
    country_label: countryLabel, feature_label: featureLabel, budget_label: budgetLabel,
    dropdown_selections: { country: countryLabel, feature: featureLabel, budget: budgetLabel }
  });
}

async function sendSlackWaitlistNotification(params) {
  const webhookUrl = process.env.SLACK_WAITLIST_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return false;
  }

  const geo = params.geo_location || {};
  const locationParts = [];
  if (geo.city) locationParts.push(geo.city);
  if (geo.region && geo.region !== geo.city) locationParts.push(geo.region);
  if (geo.country) locationParts.push(geo.country);
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : '위치 미상';
  const tzStr = geo.timezone || geo.client_timezone || '미상';

  const isJp = params.market === 'JP';
  const flag = isJp ? '🇯🇵 JP' : '🇰🇷 KR';
  const statusBadge = params.alreadyExisted ? '*(기존 신청자 정보 업데이트)*' : '*(신규 사전신청)*';
  const headerText = isJp
    ? `✨ [SAI ${flag}] 新しい事前登録が届きました！`
    : `✨ [SAI ${flag}] 새로운 사전신청이 접수되었습니다!`;

  const details = [
    `• *이메일:* \`${params.email}\` ${statusBadge}`,
    `• *마켓 / 언어:* ${flag} (${params.language || 'ko'})`,
    `• *거주 국가:* ${params.country_label || params.country || '미선택'}`,
    `• *기대 기능:* ${params.feature_label || params.feature || '미선택'}`,
    `• *구독 희망 예산:* ${params.budget_label || params.budget || '미선택'}`,
    `• *접속 위치:* ${locationStr}`,
    `• *타임존:* ${tzStr}`,
    params.utm_source ? `• *유입 경로 (UTM):* ${params.utm_source}${params.utm_campaign ? ` / ${params.utm_campaign}` : ''}` : null,
    `• *접수 일시:* ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (KST)`,
  ].filter(Boolean).join('\n');

  const payload = {
    text: `[SAI ${flag}] 새로운 사전신청: ${params.email} (${locationStr})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: headerText,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: details,
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) {
      console.warn(`[SAI Slack Notification] Webhook returned HTTP ${res.status}: ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[SAI Slack Notification] Failed to deliver Slack message: ${err.message}`);
    return false;
  }
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

  // Authenticated retry endpoint: processes queued jobs, never historical signups.
  if (pathname === '/api/waitlist/welcome-retry') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!welcome.authorized(req.headers.authorization)) {
      res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return;
    }
    if (req.method !== 'POST') {
      res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(JSON.stringify({ error: 'Method Not Allowed' })); return;
    }
    welcome.dispatchPending(db).then(counts => {
      res.statusCode = 200; res.end(JSON.stringify({ counts }));
    }).catch(() => {
      console.error('SAI welcome retry failed');
      res.statusCode = 500; res.end(JSON.stringify({ error: 'Retry failed' }));
    });
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

        // Validate consent
        if (!data.consent || data.consent_version !== '2026-09-17') {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Consent is required' }));
          return;
        }

        // Routing is strictly determined by the active SAI experience / language
        const language = (typeof data.language === 'string' && data.language.trim().toLowerCase() === 'ja')
          ? 'ja'
          : ((typeof data.locale === 'string' && data.locale.trim().toLowerCase() === 'ja') ? 'ja' : 'ko');
        const market = language === 'ja' ? 'JP' : 'KR';
        const targetCollection = language === 'ja' ? 'sai_waitlist_jp' : 'sai_waitlist_kr';

        // Residence country from form answer
        const country = typeof data.country === 'string' ? data.country.trim().toUpperCase() : (market === 'JP' ? 'JP' : 'KR');
        const feature = typeof data.feature === 'string' ? data.feature.trim() : '';
        const budget = typeof data.budget === 'string' ? data.budget.trim() : '';

        const geoLocation = await resolveGeoLocation(req, {
          timezone: typeof data.client_timezone === 'string' ? data.client_timezone : undefined,
          language: typeof data.client_language === 'string' ? data.client_language : undefined
        });

        const docData = {
          market,
          language,
          country,
          country_label: typeof data.country_label === 'string' ? data.country_label.trim() : undefined,
          feature,
          feature_label: typeof data.feature_label === 'string' ? data.feature_label.trim() : undefined,
          budget,
          budget_label: typeof data.budget_label === 'string' ? data.budget_label.trim() : undefined,
          geo_location: geoLocation,
          source: 'sai_landing',
          consent_version: '2026-09-17',
          utm_source: typeof data.utm_source === 'string' ? data.utm_source.trim() : undefined,
          utm_medium: typeof data.utm_medium === 'string' ? data.utm_medium.trim() : undefined,
          utm_campaign: typeof data.utm_campaign === 'string' ? data.utm_campaign.trim() : undefined,
          utm_content: typeof data.utm_content === 'string' ? data.utm_content.trim() : undefined,
          utm_term: typeof data.utm_term === 'string' ? data.utm_term.trim() : undefined
        };

        const saveResult = await saveWaitlistEntry(targetCollection, email, docData);

        // Await the initial send: Cloud Run may suspend CPU after the response.
        // Signup is already durable; a mail error must not undo a successful signup.
        if (saveResult.queued) {
          try { await welcome.dispatchWelcome(db, saveResult.welcomeId); }
          catch { console.error('SAI welcome dispatch failed; inspect outbox'); }
        }

        // Non-blocking Slack notification
        sendSlackWaitlistNotification({
          email,
          market,
          language,
          country: docData.country,
          country_label: COUNTRY_LABELS[language]?.[docData.country] || docData.country,
          feature: docData.feature,
          feature_label: FEATURE_LABELS[language]?.[docData.feature] || docData.feature,
          budget: docData.budget,
          budget_label: BUDGET_LABELS[language]?.[docData.budget] || docData.budget,
          geo_location: geoLocation,
          utm_source: docData.utm_source,
          utm_campaign: docData.utm_campaign,
          alreadyExisted: saveResult.alreadyExisted,
          createdAt: saveResult.createdAt
        }).catch(err => {
          console.warn('[SAI Slack Notification] Unhandled error:', err.message);
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
  } else if (['/teaser2', '/teaser2/', '/teaser3', '/teaser3/', '/teaser4', '/teaser4/', '/teaser-review', '/teaser-review/'].includes(pathname)) {
    targetFile = pathname.replace(/^\/+|\/+$/g, '') + '.html';
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
    filePath.startsWith(path.join(PUBLIC_DIR, 'server') + path.sep) ||
    filePath.startsWith(path.join(PUBLIC_DIR, 'tests') + path.sep) ||
    filePath.startsWith(path.join(PUBLIC_DIR, 'docs') + path.sep) ||
    filePath.startsWith(path.join(PUBLIC_DIR, 'node_modules') + path.sep) ||
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
