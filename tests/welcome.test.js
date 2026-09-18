'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const welcome = require('../server/welcome');

// Transaction callbacks operate on snapshots and commit atomically; serialize
// concurrent calls to exercise duplicate signup/dispatch paths deterministically.
class MemoryDb {
  constructor() { this.docs = new Map(); this.tail = Promise.resolve(); }
  collection(name) { return { doc: id => this.ref(`${name}/${id}`) }; }
  ref(path) { return { path, update: data => this.runTransaction(async tx => { tx.update({ path }, data); }) }; }
  runTransaction(fn) {
    const work = this.tail.then(async () => {
      const staged = new Map(this.docs);
      const result = await fn({
        get: async ref => ({ exists: staged.has(ref.path), data: () => staged.get(ref.path) }),
        set: (ref, data) => staged.set(ref.path, data),
        create: (ref, data) => { assert(!staged.has(ref.path)); staged.set(ref.path, data); },
        update: (ref, data) => staged.set(ref.path, { ...staged.get(ref.path), ...data })
      });
      this.docs = staged; return result;
    });
    this.tail = work.catch(() => {}); return work;
  }
}
const settings = { apiKey: 'test-only', replyTo: 'youngminlee@ubeeslab.com' };
const email = 'example@example.com';
const data = language => ({ language, market: language === 'ja' ? 'JP' : 'KR', geo_location: { country_code: null } });

test('Korean/Japanese content uses the matching site language and no unsupported promises', () => {
  for (const language of ['ko', 'ja']) {
    const msg = welcome.message(language);
    assert(msg.htmlContent.includes(`lang="${language}"`));
    assert(msg.textContent.includes(`lang=${language}&utm_source=brevo`));
    assert(msg.subject.length > 0);
  }
});
test('disabled configuration does not queue mail', async () => {
  const db = new MemoryDb();
  const result = await welcome.saveSignup(db, 'sai_waitlist_kr', email, data('ko'), false);
  assert.equal(result.queued, false);
  assert.equal(db.docs.size, 1);
  assert.equal(welcome.config({ SAI_WELCOME_ENABLED: 'true' }), null);
});
test('concurrent cross-language registration creates exactly one job', async () => {
  const db = new MemoryDb();
  const result = await Promise.all([
    welcome.saveSignup(db, 'sai_waitlist_kr', email, data('ko'), true),
    welcome.saveSignup(db, 'sai_waitlist_jp', email, data('ja'), true)
  ]);
  assert.equal(result.filter(r => r.queued).length, 1);
  assert.equal(db.docs.get(`${welcome.OUTBOX}/${welcome.welcomeId(email)}`).language, 'ko');
});
test('existing historical signup receives no new welcome; attribution and date preserved', async () => {
  const db = new MemoryDb();
  const created = new Date('2026-01-01');
  db.docs.set(`sai_waitlist_kr/${email}`, { created_at: created, utm_source: 'original', geo_location: { country_code: 'KR' } });
  const result = await welcome.saveSignup(db, 'sai_waitlist_kr', email, data('ko'), true);
  assert.equal(result.queued, false);
  const saved = db.docs.get(`sai_waitlist_kr/${email}`);
  assert.equal(saved.created_at, created); assert.equal(saved.utm_source, 'original');
  assert.equal(saved.geo_location.country_code, 'KR');
});
test('database failure prevents email work', async () => {
  await assert.rejects(welcome.saveSignup({ runTransaction: async () => { throw Error('unavailable'); }, collection: () => ({ doc: () => ({}) }) }, 'sai_waitlist_kr', email, data('ko'), true));
});
test('concurrent dispatch sends once and reserves one daily attempt', async () => {
  const db = new MemoryDb();
  const job = await welcome.saveSignup(db, 'sai_waitlist_kr', email, data('ko'), true);
  let calls = 0;
  const send = async () => { calls++; return { status: 'accepted', message_id: 'test-message' }; };
  await Promise.all([welcome.dispatchWelcome(db, job.welcomeId, settings, send), welcome.dispatchWelcome(db, job.welcomeId, settings, send)]);
  assert.equal(calls, 1);
  assert.equal(db.docs.get(`${welcome.OUTBOX}/${job.welcomeId}`).status, 'accepted');
  await welcome.dispatchWelcome(db, job.welcomeId, settings, send); assert.equal(calls, 1);
});
test('daily quota postpones pending work without sending', async () => {
  const db = new MemoryDb(); const now = Date.now();
  const job = await welcome.saveSignup(db, 'sai_waitlist_kr', email, data('ko'), true);
  db.docs.set(`sai_mail_quota/${new Date(now).toISOString().slice(0, 10)}`, { attempts: welcome.DAILY_CAP });
  await welcome.dispatchWelcome(db, job.welcomeId, settings, async () => { assert.fail('must not send'); }, now + 1);
  assert(db.docs.get(`${welcome.OUTBOX}/${job.welcomeId}`).next_attempt_at > now);
});
test('uncertain delivery is not automatically retried', async () => {
  const db = new MemoryDb(); const job = await welcome.saveSignup(db, 'sai_waitlist_kr', email, data('ko'), true);
  let calls = 0; const send = async () => { calls++; return { status: 'uncertain', reason: 'network_or_timeout' }; };
  await welcome.dispatchWelcome(db, job.welcomeId, settings, send);
  await welcome.dispatchWelcome(db, job.welcomeId, settings, send, Date.now() + 7200000);
  assert.equal(calls, 1);
});
test('Brevo payload contains only recipient and confirmation content', async () => {
  let payload;
  const result = await welcome.sendWelcome({ email, language: 'ja', idempotency_key: 'test-id', health: 'DO_NOT_SEND' }, settings, async (url, request) => {
    payload = JSON.parse(request.body);
    assert.equal(request.headers['api-key'], 'test-only');
    return { ok: true, status: 201, json: async () => ({ messageId: 'abc' }) };
  });
  assert.equal(result.status, 'accepted'); assert.equal(payload.sender.email, 'welcome@42sai.io');
  assert.equal(payload.replyTo.email, settings.replyTo); assert(payload.htmlContent.includes('lang="ja"'));
  assert(!JSON.stringify(payload).includes('DO_NOT_SEND'));
});
test('rate limits retry; rejection and ambiguous provider responses do not', async () => {
  for (const [status, expected] of [[429,'pending'],[401,'failed'],[400,'failed'],[500,'uncertain']]) {
    const result = await welcome.sendWelcome({ email, language: 'ko' }, settings, async () => ({ status, ok: false }));
    assert.equal(result.status, expected);
  }
  assert.equal((await welcome.sendWelcome({ email }, settings, async () => { throw Error('timeout'); })).status, 'uncertain');
  assert.equal((await welcome.sendWelcome({ email }, settings, async () => ({ ok: true, json: async () => ({}) }))).status, 'uncertain');
});
test('retry authorization rejects missing, short and incorrect secrets', () => {
  const secret = 'x'.repeat(48);
  assert(!welcome.authorized(undefined, secret)); assert(!welcome.authorized('Bearer wrong', secret));
  assert(!welcome.authorized('Bearer short', 'short')); assert(welcome.authorized(`Bearer ${secret}`, secret));
});
