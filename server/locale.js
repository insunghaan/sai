'use strict';
function languagePreference(cookie = '') {
  const value = cookie.split(';').map(x => x.trim()).find(x => x.startsWith('sai_language='))?.slice(13);
  return value === 'ja' || value === 'ko' ? value : null;
}
async function defaultLanguage(req, lookupCountry) {
  const preference = languagePreference(req.headers.cookie);
  if (preference) return preference;
  // Keep canonical pages crawlable independently of crawler location.
  if (/bot|crawler|spider|slurp|bingpreview/i.test(req.headers['user-agent'] || '')) return 'ko';
  try { return await lookupCountry(req) === 'JP' ? 'ja' : 'ko'; }
  catch { return 'ko'; }
}
module.exports = { defaultLanguage, languagePreference };
