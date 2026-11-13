# Trial and workshop access by WhatsApp

The new trial form asks for a workshop name and WhatsApp, then verifies a six-digit code before provisioning. There is no requested email or password and no synthetic email address. Existing email/password access stays available. Only dedicated phone-only identities created through this flow may sign in with this OTP flow; matching a legacy metadata phone never attaches an existing account.

## Operations

- Apply `20261113222936_workshop_phone_trial_login.sql` before enabling. It adds private challenges, identity reservations, counters and milestones. The old provision RPC is unchanged. Trial-claim email becomes nullable for phone-only accounts; old claims and subscriptions are untouched.
- `WORKSHOP_PHONE_AUTH_ENABLED=true` selects the new public trial form. `WORKSHOP_PHONE_LOGIN_ENABLED=true` independently enables phone login and must remain enabled once phone-only accounts exist. Missing sender/template/pepper keeps the old form available. Set `WORKSHOP_PHONE_AUTH_TEMPLATE` to a verified **APPROVED AUTHENTICATION COPY_CODE** template, `WORKSHOP_PHONE_AUTH_LANGUAGE` to its actual language. Sender is the existing central `WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_API_TOKEN`, independent of each workshop's own-number coexistence approval.
- `MOBILE_OTP_PEPPER` must contain at least 32 secret characters. Never expose it, a code, sender token or a generated internal password. The public API returns no auth tokens or account identity; SSR sets the normal session cookies.
- Codes last 5 minutes, are bound to a 15-minute HttpOnly/Secure/SameSite=Strict host cookie, and permit 5 wrong attempts. Resend cooldown is 60 seconds. A new code supersedes older codes. Per-phone, per-IP and global database counters bound requests across replicas. `unknown` IP uses a shared restricted bucket. The proxy must overwrite `x-real-ip`; use the existing trusted Cloudflare extraction.
- Code verification reserves the account ID and leases provisioning. A lost response retries that reservation. Phone-only Auth users are server-confirmed only after the custom OTP verification. Organization, owner membership and 15-day trial claim are inserted atomically. Returning accounts reuse the same organization and trial dates. Removed memberships fail closed.
- A random internal phone-password is rotated only for these explicitly mapped identities and exchanged for the normal Auth session. It is never sent to the visitor. A session that remains valid does not request another OTP on an ordinary visit. Recovery or phone changes for these accounts require a separately verified flow; changing workshop/profile contact phones does not change the login identity.
- After entering, an optional link offers profile completion. Contact/billing email is optional and does not become a recovery or login identity merely by entering it.

## Analytics

`trial-v3-phone-v1` is a new cohort; old v2 reports are not reinterpreted. Browser events allow field/phase labels only, including code edit/verification attempt, and respect existing measurement preferences/DNT/GPC. No entered names, numbers, codes or errors are collected.

Separate private operational milestones record request admitted, Meta accepted, delivery confirmed, failed, verified, trial created and first order. Each phase is counted once per request; first order once per workshop. These are global period event counts, not a person-level conversion funnel, and do not inherit anonymous campaign filters. Reissues and late events can belong to different reporting periods.

The existing signed webhook ingests central sender delivery statuses if Meta forwards them to this app. **Acceptance is not delivery.** The central sender token currently belongs to the existing `fronterasexpress` Meta app, whereas the coexistence webhook uses `Mivra`. Do not change the other app's webhook or break existing notifications to obtain delivery telemetry. Without forwarded receipts, show delivery as unconfirmed; verified OTP remains a distinct reliable milestone.

Challenges are cleaned after a day, rate keys after two days and PII-free operational milestones after 90 days. Phone-to-account mapping remains for access. Codes are HMACed; all new tables and service functions deny `anon`/`authenticated`. The internal first-order trigger has narrowly scoped definer rights, an empty search path and no public execution grant.

## Release checks

Verify the template and sender in Meta, then a controlled real recipient test before switching the default trial form. Do not infer approval from a successful phone metadata read or from an HTTP-accepted but undelivered message. At implementation preflight the configured `WHATSAPP_BUSINESS_ACCOUNT_ID` does not expose the WABA `message_templates` endpoint (Meta code 100); its value must be confirmed rather than guessed.

Run focused OTP, SQL isolation, analytics and legacy signup tests; typecheck/build; mobile and desktop browser checks including autofill, resend, wrong/expired code and no horizontal overflow. An isolated Auth integration test must confirm native phone account/session creation and returning access without rotating an existing email user's password. Send no real WhatsApp during mocks or fixtures.

Roll back the UI by setting `WORKSHOP_PHONE_AUTH_ENABLED=false`. Preserve the new login option while any phone-only customer exists: never hide the only login method for an already-created account during rollback. Existing email/password logins and records must remain unchanged.
