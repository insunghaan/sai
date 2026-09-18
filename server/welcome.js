'use strict';
const { createHash, randomUUID, timingSafeEqual } = require('node:crypto');
const OUTBOX = 'sai_welcome_outbox';
const DAILY_CAP = 280;
const welcomeId = email => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

function config(env = process.env) {
  if (env.SAI_WELCOME_ENABLED !== 'true' || !env.BREVO_API_KEY?.trim()) return null;
  return { apiKey: env.BREVO_API_KEY.trim(), replyTo: 'youngminlee@ubeeslab.com' };
}

function message(language) {
  const ja = language === 'ja';
  const url = `https://42sai.io/?lang=${ja ? 'ja' : 'ko'}&utm_source=brevo&utm_medium=email&utm_campaign=waitlist_welcome`;
  const subject = ja ? 'SAIへようこそ。事前登録を受け付けました。' : 'SAI에 오신 것을 환영해요. 사전 신청이 완료됐어요.';
  const heading = ja ? 'ふたりの小さな毎日へ、ようこそ。' : '둘만의 작은 일상, SAI에 오신 걸 환영해요.';
  const body = ja ? 'SAIに関心をお寄せいただき、ありがとうございます。事前登録を受け付けました。準備が整いましたら、このメールアドレスにお知らせします。' : 'SAI에 관심을 가져주셔서 감사해요. 사전 신청이 정상적으로 접수됐습니다. 준비가 되면 등록하신 이메일로 소식을 전해드릴게요.';
  const action = ja ? 'SAIを見る' : 'SAI 둘러보기';
  const footer = ja ? 'このメールは、SAIに事前登録された方への確認メールです。お心当たりがない場合や登録の取り消しをご希望の場合は、このメールにご返信ください。' : '이 메일은 SAI 사전 신청을 확인하기 위해 발송됐습니다. 직접 신청하지 않으셨거나 신청 취소를 원하시면 이 메일에 답장해 주세요.';
  return {
    subject,
    textContent: `${heading}\n\n${body}\n\n${action}: ${url}\n\n${footer}`,
    htmlContent: `<!doctype html><html lang="${ja ? 'ja' : 'ko'}"><body style="margin:0;background:#f9faf5;color:#354c3b;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="600" style="width:100%;max-width:600px"><tr><td style="padding:24px;text-align:center;font-size:32px;font-weight:bold">SAI</td></tr><tr><td style="background:#e1ebc9;border-radius:24px;padding:40px 28px;text-align:center"><h1 style="font-size:26px;line-height:1.5">${heading}</h1><p style="font-size:16px;line-height:1.9">${body}</p><a href="${url.replaceAll('&', '&amp;')}" style="display:inline-block;margin-top:20px;padding:14px 24px;background:#354c3b;color:#fff;border-radius:24px;text-decoration:none">${action}</a></td></tr><tr><td style="padding:24px;font-size:12px;line-height:1.8;text-align:center">${footer}</td></tr></table></td></tr></table></body></html>`
  };
}

async function sendWelcome(job, settings, fetcher = fetch) {
  let response;
  try {
    response = await fetcher('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': settings.apiKey, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'SAI-Mailer/1.0' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        sender: { name: 'SAI', email: 'welcome@42sai.io' },
        to: [{ email: job.email }], replyTo: { email: settings.replyTo, name: 'SAI' },
        ...message(job.language), headers: { idempotencyKey: job.idempotency_key },
        tags: ['sai-waitlist-welcome-v1', job.language === 'ja' ? 'ja' : 'ko']
      })
    });
  } catch { return { status: 'uncertain', reason: 'network_or_timeout' }; }
  if (response.status === 429) return { status: 'pending', reason: 'rate_limit' };
  if (!response.ok) return { status: response.status >= 500 ? 'uncertain' : 'failed', reason: `http_${response.status}` };
  try {
    const body = await response.json();
    if (typeof body.messageId === 'string' && body.messageId) return { status: 'accepted', message_id: body.messageId };
  } catch { /* Ambiguous acceptance must not be automatically resent. */ }
  return { status: 'uncertain', reason: 'missing_message_id' };
}

// Store the signup and the welcome job together. Both language lists are checked
// so switching languages or concurrent requests cannot create a second email.
async function saveSignup(db, collection, email, data, enabled = !!config()) {
  const ref = db.collection(collection).doc(email);
  const other = db.collection(collection === 'sai_waitlist_jp' ? 'sai_waitlist_kr' : 'sai_waitlist_jp').doc(email);
  const id = welcomeId(email);
  const jobRef = db.collection(OUTBOX).doc(id);
  const now = new Date();
  const candidate = { email, language: data.language, status: 'pending', attempts: 0,
    next_attempt_at: now.getTime(), created_at: now.toISOString(), idempotency_key: randomUUID() };
  return db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    const otherExisting = await tx.get(other);
    const existingJob = await tx.get(jobRef);
    const old = existing.data() || {};
    const record = { ...data, email, created_at: old.created_at || now, updated_at: now };
    record.geo_location = { ...old.geo_location, ...Object.fromEntries(Object.entries(data.geo_location || {}).map(([key, value]) => [key, value || old.geo_location?.[key] || null])) };
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (!record[key] && old[key]) record[key] = old[key];
    }
    for (const key of Object.keys(record)) if (record[key] === undefined) delete record[key];
    tx.set(ref, record);
    const queued = enabled && !existing.exists && !otherExisting.exists && !existingJob.exists;
    if (queued) tx.create(jobRef, candidate);
    const created = record.created_at;
    return { alreadyExisted: existing.exists, createdAt: typeof created.toDate === 'function' ? created.toDate().toISOString() : new Date(created).toISOString(), welcomeId: id, queued };
  });
}

async function dispatchWelcome(db, id, settings = config(), send = sendWelcome, now = Date.now()) {
  if (!settings) return 'disabled';
  const ref = db.collection(OUTBOX).doc(id);
  const quota = db.collection('sai_mail_quota').doc(new Date(now).toISOString().slice(0, 10));
  const claim = await db.runTransaction(async tx => {
    const snap = await tx.get(ref); const job = snap.data();
    if (!job || job.status !== 'pending' || job.next_attempt_at > now) return null;
    const daily = await tx.get(quota); const attempts = Number(daily.data()?.attempts || 0);
    if (attempts >= DAILY_CAP) {
      tx.update(ref, { next_attempt_at: Date.parse(new Date(now).toISOString().slice(0, 10)) + 86400000 });
      return null;
    }
    tx.set(quota, { attempts: attempts + 1 });
    tx.update(ref, { status: 'sending', started_at: now, attempts: job.attempts + 1 });
    return job;
  });
  if (!claim) return 'skipped';
  const result = await send(claim, settings);
  await ref.update({ ...result, ...(result.status === 'accepted' ? { accepted_at: new Date().toISOString() } : { next_attempt_at: now + 3600000 }) });
  return result.status;
}

async function dispatchPending(db) {
  if (!config()) return { disabled: 1 };
  const jobs = await db.collection(OUTBOX).where('status', '==', 'pending')
    .where('next_attempt_at', '<=', Date.now()).orderBy('next_attempt_at').limit(10).get();
  const counts = {};
  for (const doc of jobs.docs) {
    const result = await dispatchWelcome(db, doc.id);
    counts[result] = (counts[result] || 0) + 1;
  }
  return counts;
}

function authorized(header, token = process.env.SAI_MAIL_WORKER_TOKEN) {
  if (!token || token.length < 32 || typeof header !== 'string') return false;
  const actual = Buffer.from(header); const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

module.exports = { OUTBOX, DAILY_CAP, config, message, welcomeId, saveSignup, sendWelcome, dispatchWelcome, dispatchPending, authorized };
