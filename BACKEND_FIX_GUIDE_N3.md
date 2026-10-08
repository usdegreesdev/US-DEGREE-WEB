# Backend follow-up for frontend ticket N3 (18+ consent on OAuth)

The frontend now requires the 18+ checkbox before Google/Apple sign-in on **both** the Login and Create Account tabs. A client can still be bypassed, so the backend must enforce consent for new accounts.

## 1. `POST /user` (Google / email sync)

- Body may include `age_consent: boolean`. The frontend sends it:
  - email signup: `true`/`false` as checked,
  - Google (either tab): `true`,
  - session restore / email login / checkVerification: **omitted**.
- **Required:** when this request would **create** a new user row, reject (e.g. `400 { code: "AGE_CONSENT_REQUIRED" }`) unless `age_consent === true`.
- **Required:** when the user already exists, never overwrite a stored `age_consent = true` with `false` or with a missing value. Only set it from `false/null` to `true`.
- `auth_provider` may now be `"credentials" | "google" | "apple"` (Apple Firebase sessions were previously posted as `google`). Accept `"apple"` and store it.

## 2. `POST /auth/apple`

- Body: `{ id_token, full_name?, age_consent? }`. `age_consent` is now **omitted** when the client does not know it (previously always sent, `false` for the Login tab).
- **Required:** if the Apple identity does not match an existing user and `age_consent !== true`, reject without creating the user (`400 AGE_CONSENT_REQUIRED`).
- For an existing user, ignore a missing `age_consent`; never downgrade a stored `true`.

## 3. Test

1. New Google/Apple identity, no `age_consent` -> 400, no row created.
2. New identity with `age_consent: true` -> 200, row created with consent stored.
3. Existing user, body without `age_consent` -> 200, stored consent unchanged.
4. Existing user, `age_consent: false` -> stored `true` stays `true`.

## 4. Call order and where consent is sent (frontend, first-time sign-in)

| Flow | First backend call | Carries `age_consent: true`? | Later |
|------|--------------------|------------------------------|-------|
| Email signup | `POST /user` (after Firebase create) | yes (checkbox value) | `/auth/login` lazily, once verified and a protected call is made |
| Google | `POST /user` (right after popup) | yes | `/auth/login` lazily on first protected call |
| Apple | `POST /auth/apple` | yes | none; Firebase custom-token sync is skipped |

`POST /auth/login` receives only `{ idToken }` and never `age_consent`. It runs after `/user` has already created the row, so it should only look up the user. If it can also create a user, it must not create one when no row exists and return `AGE_CONSENT_REQUIRED` instead. Tell the frontend if you need it to send `age_consent` there too.

Error shape the UI maps: `{ error: { code: "AGE_CONSENT_REQUIRED" } }` with status 400.
