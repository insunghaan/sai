# SAI teaser 2 / teaser 3

Added alternate landing pages for Korean/Japanese couple audiences. Existing `/` remains teaser-v9.html.

- `/teaser2?lang=ko` and `?lang=ja`: playful six-feature sampling (sleep sharing, pulse, guided breathing, care, moments, garden).
- `/teaser3?lang=ko` and `?lang=ja`: large product storytelling with focused interactive demos.
- `/teaser-review.html`: team comparison links to original and both alternatives. No shared voting collection; team can collect votes separately.
- Price: Korean planned pair price KRW 300,000; Japanese price is explicitly not a converted JPY price. Membership conditions pending.
- All demo readings/actions are synthetic, reset on close, and do not read sensors, send partner messages or infer emotions.
- Signup uses the existing `/api/waitlist` endpoint and existing opt-in version, with UTM forwarding. No production test signups were submitted.
- `teaser_demo_open`, `teaser_demo_complete`, `teaser_waitlist_success` carry variant + language, without email or demo readings. Waitlist success is a submission event, not a unique-lead assertion.
- Review pages are noindex/nofollow. Product illustrations and photographs reuse existing SAI assets. Apple was a layout reference only; no Apple assets or copy used.

Validation: 11 existing welcome-mail tests pass. Browser QA covers KO/JA on both designs, desktop/mobile layouts, image decoding, six demo flows, modal dismissal, tabs, language switching and mocked signup with UTM. No production emails or waitlist records created in tests.
