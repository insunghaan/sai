# Signup integrations and regional entry language

- Default entry URL `/`: JP IP -> temporary redirect to `/ja/`; KR/other/unknown -> Korean root.
- Explicit `/ja/` URL remains Japanese. User-selected `sai_language` cookie takes precedence at root; language button remains present.
- Legacy `?lang=ko/ja` links set the preference and normalize to canonical URLs.
- Country lookup uses existing IP geolocation provider with 800 ms timeout, bounded in-memory country cache and Korean fallback. No new IP persistence.
- Canonical crawler requests remain Korean at root; Japanese URL is linked through hreflang and sitemap. Personalized root responses are not shared-cacheable.
- New surveys store age_group, subscription_plan, features in language-specific Firestore collections; welcome outbox is transactional and deduplicated across languages.
- Brevo dispatch stays awaited. Slack webhook is now also awaited (2.5-second timeout) before responding, avoiding post-response CPU suspension. Slack failure does not roll back saved responses.
- Non-PII `sai_signup_integrations` logs report welcome queue and Slack delivery status.

2026-09-24 audit (read-only): Korean/Japanese collections contained 5/2 historical records. No new-schema submissions yet. Welcome outbox contained 4 accepted jobs. Brevo seven-day aggregate reported 4 requests, 4 delivered, zero errors/bounces. Welcome enabled and both integration secrets configured. No relevant errors in the last 7 days of Cloud Run logs. Historical Slack receipt could not be proven from existing logs.

Validation: 22 tests including real request-handler flow with in-memory Firestore and mocked Brevo/Slack, both locales, deduplication, invalid survey, webhook failure, Japan redirect/query preservation, country fallback and language preference. Tests send no real email or Slack messages and write no production records.
