# SAI welcome emails

Sender: SAI <welcome@42sai.io>. Reply-To: youngminlee@ubeeslab.com.
Brevo account: youngminlee@b4play.io. GA and Clarity remain unchanged.

Set SAI_WELCOME_ENABLED=true only after domain/sender verification. Mount BREVO_API_KEY from Secret Manager sai-brevo-api-key (a pinned version), and SAI_MAIL_WORKER_TOKEN from sai-mail-worker-token. Never commit or log either value.

Waitlist signup and its outbox record are saved in one Firestore transaction. Both sai_waitlist_kr and sai_waitlist_jp are checked. A historical signup, duplicate submission or language switch does not generate another welcome message. Mail language is fixed from the first new registration. Existing timestamps, UTM attribution and known geolocation are preserved. Signup remains successful if subsequent email dispatch fails.

Statuses in sai_welcome_outbox:
- pending: queued or throttled; eligible after next_attempt_at.
- sending: claimed before calling Brevo. Never automatically reclaim: a crash may have happened after delivery.
- accepted: Brevo returned a message ID, not proof of inbox delivery.
- failed: explicit rejection; fix the cause and manually reconcile before resetting.
- uncertain: network failure, timeout, 5xx or missing message ID; check Brevo logs before any resend.

Quota: 280 attempts per UTC day for this SAI account, below Brevo Free 300/day. Retries consume attempts. Other sends in the same Brevo account share the provider limit. No subscription upgrades are performed.

POST /api/waitlist/welcome-retry requires Authorization: Bearer <SAI_MAIL_WORKER_TOKEN> and processes up to 10 due pending messages. An index is required on sai_welcome_outbox: status ASC, next_attempt_at ASC. Production scheduled retry is a separate deployment step; check rollout status before assuming the worker is scheduled. Never automatically backfill historical contacts.

The templates are Korean/Japanese confirmation messages with matching ?lang=ko / ?lang=ja landing URLs and UTM campaign waitlist_welcome. Email contents include no signup survey answers, health data or geolocation. Removal requests go to Reply-To and require operator handling.

Run npm test before publishing. Test email sending uses only an explicitly approved recipient, not historical customer data. The new server/ and tests/ and docs/ directories are blocked by the public file server.
