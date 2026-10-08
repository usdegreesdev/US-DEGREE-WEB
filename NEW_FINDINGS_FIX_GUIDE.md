# New findings after the report-fix commit

Hand this file to a frontend developer. It covers bugs **introduced or left incomplete** by commit `68f35dd` (“error fixes from the report”).

The original 16 tickets (C1–L2) live in [`FRONTEND_FIX_GUIDE.md`](./FRONTEND_FIX_GUIDE.md). Do not reopen those except where a ticket below says it **reopens** H2 / H6 / M3.

These findings are also on the hosted site: https://us-degree-web.vercel.app/

Suggested PR titles: `fix(N1): clear loading when auth listener skips`.

---

## How to use this document

1. Work **Sprint 1 (auth)** first. N1–N5 and N7 share `AuthContext` — one PR is fine if it stays reviewable; split if the diff is large.
2. Do not skip High to do N8–N11.
3. Before opening a PR:

```bash
npm run typecheck
npm run lint
npm test
npm run dev
```

4. Tick every **Done when** in the browser. Auth tickets need a real Firebase project.

### Ground rules (same as the original guide)

- Do not store passwords or JWTs in `localStorage`.
- Browser traffic goes through `/api/proxy/...`.
- Do not add `any`. Do not weaken CSP.
- Prefer existing helpers (`toSafeHttpUrl`, `getFriendlyErrorMessage`, `clearAppJwt`).

---

## Sprint order

| Sprint | Tickets | Goal |
|--------|---------|------|
| 1 — auth | **N1**, **N2**, **N3**, **N4**, **N5**, **N7**, **N10** | Login cannot stick on a spinner; no leftover Firebase user; 18+ on every OAuth create; no stale `age_consent` |
| 2 — search / compare / CTA | **N6**, **N8**, **N9**, **N11** | Failed SSR search looks like an error; Apply Now never uses `#`; compare rows do not throw; search cards mount one layout |

---

## Ticket index

| ID | Severity | Status on Vercel | Summary |
|----|----------|------------------|---------|
| N1 | High | Code live, not account-tested | Email login can leave `loading === true` forever |
| N2 | High | Code live, not account-tested | Email login `/user` failure leaves Firebase signed in |
| N3 | High | **Confirmed live** | Login-tab Google/Apple skip 18+ consent |
| N4 | Medium | Code live | Cancelled Google signup poisons the next `/user` with `age_consent` |
| N5 | Medium | Code live | Failed signup sync leaves an orphan Firebase user |
| N6 | Medium | Code live | SSR search failure looks like “No results”; `?view=` ignored |
| N7 | Medium | Code live | Google modal closes before backend sync finishes |
| N8 | Medium | Code live (hidden when URL is valid) | Apply Now falls back to `href="#"` |
| N9 | Medium | Code live | `buildCollegeRow` throws on partial API rows |
| N10 | Low | Code live | Apple users posted as `auth_provider: "google"`; JWT set before custom token |
| N11 | Low | **Confirmed live** | Search result cards mount desktop + mobile trees |

---

# Sprint 1 — auth

N1, N2, N4, N5, N7, and N10 are all in `src/context/AuthContext.tsx` (plus `useAuthForm.ts` / `api.ts` where noted). Fix them together if you can keep the PR coherent.

---

## N1 — Email login can leave `loading` true forever

**Severity:** High  
**Files:** `src/context/AuthContext.tsx` (`onAuthStateChanged`), `src/app/profile/page.tsx`

### Current behavior

`login()` sets `authActionInProgress.current = true`. The Firebase listener hits:

```ts
if (authActionInProgress.current) {
  return; // setLoading(false) is below this return
}
```

If that is the **first** auth callback after mount, `loading` never flips to `false`. `login()` may still `setUser(...)`. `/profile` gates on `if (loading || !user)` and can spin forever.

### Required change

On the early-return path, still end loading:

```ts
if (authActionInProgress.current) {
  setLoading(false);
  return;
}
```

Keep N2’s sign-out-on-sync-failure in `login()` itself — do not rely on this listener during an in-progress email login.

### Test

1. Sign in with email/password on a cold load, then open `/profile`.
2. The dashboard must appear; the spinner must not stick.
3. Repeat after a hard refresh with Remember me / Firebase persistence.

### Done when

- [ ] Early-return in `onAuthStateChanged` always calls `setLoading(false)`.
- [ ] `/profile` after a successful email login is not an infinite `Spin`.

---

## N2 — Email login `/user` failure leaves Firebase signed in

**Severity:** High (reopens original **H6** on the email path)  
**Files:** `src/context/AuthContext.tsx` (`login`)

### Current behavior

`login()` sets `authActionInProgress`, so the listener **skips** the new sign-out + toast path. If `syncUserRecord` is not `ok`, `login()` throws and `finally` only clears the flag. `auth.currentUser` is still set. Navbar can look logged out while Firebase can still mint an app JWT later.

`EMAIL_NOT_VERIFIED` is a special case: you **want** the Firebase session so resend verification works. Do not sign out on that throw.

### Required change

```ts
if (!res.ok) {
  clearAppJwt();
  currentUidRef.current = null;
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Sign-out after failed login sync:", e);
  }
  throw new Error("Failed to sync user session with backend");
}
```

Use `getFriendlyErrorMessage` / a stable copy, not a raw backend body (original **M1**).

### Test

1. Temporarily make `POST /api/proxy/user` return 500.
2. Email login: UI shows a retryable error; Firebase `currentUser` is null; Application → IndexedDB has no live session you can refresh into.
3. Restore the API; login works.

### Done when

- [ ] Failed `/user` during email login signs out Firebase and clears the app JWT.
- [ ] Unverified-email login still keeps the session for the verification screen.

---

## N3 — Login-tab Google/Apple still skip 18+ consent

**Severity:** High (leftover original **H2**)  
**Files:**  
- `src/components/auth/login/useAuthForm.ts`  
- `src/components/auth/LoginModal.tsx`  
- `src/components/auth/login/SocialAuthButtons.tsx`  
- `src/lib/auth/api.ts` (`exchangeAppleIdToken`)  
**Needs backend:** yes, for new-account enforcement.

### Current behavior (confirmed on https://us-degree-web.vercel.app/)

- **Welcome Back** shows Google + Apple and **no** 18+ checkbox.
- **Create Account** shows the checkbox. Google without it correctly shows *You must confirm you are 18 or older to continue*.
- `handleGoogleSignIn` / `handleAppleSignIn` only gate when `mode === "signup"`.
- First-time users almost always click Google on Welcome Back.
- Apple always posts `age_consent: !!ageConsent`, so Login sends **`false`** and can overwrite an existing `true`.

### Required change

Pick one product rule and implement it fully:

**Preferred — consent before any OAuth that can create an account**

1. Show the 18+ checkbox on both Sign In and Create Account whenever Google/Apple are visible.
2. Block OAuth until it is checked (same error copy).
3. Send `age_consent: true` only when the box is checked.
4. In `exchangeAppleIdToken`, **omit** `age_consent` when the argument is `undefined`. Never send `false` for a returning Login-tab user:

```ts
body: JSON.stringify({
  id_token: idToken,
  full_name: fullName,
  ...(ageConsent !== undefined ? { age_consent: ageConsent } : {}),
}),
```

5. Ask backend to reject **new** OAuth users without consent.

**Alternative — hide Google/Apple on the Login tab** until the user switches to Create Account. Still omit `age_consent` when undefined.

### Test (no need to finish a real Google account for the UI gate)

1. On Vercel/local Welcome Back: Google is not clickable without 18+ (or Google is hidden).
2. Create Account + unchecked box + Google → rose error, **no** popup.
3. Create Account + checked box → popup opens.
4. Network tab on Apple Login: request body must not contain `"age_consent": false`.

### Done when

- [ ] No OAuth path can register without an explicit 18+ confirmation in the UI.
- [ ] Returning Apple/Google login does not send `age_consent: false`.
- [ ] Backend follow-up is noted on the PR if the API does not yet reject missing consent.

---

## N4 — Cancelled Google signup poisons the next `/user` sync

**Severity:** Medium  
**Files:** `src/context/AuthContext.tsx` (`loginWithGoogle`, `onAuthStateChanged`)

### Current behavior

```ts
pendingGoogleAgeConsentRef.current = ageConsent ?? null;
await signInWithPopup(...);
```

If the popup is cancelled, nothing clears the ref. A later **email** login can POST `age_consent: true` because the listener always reads that ref.

### Required change

```ts
const loginWithGoogle = async (ageConsent?: boolean) => {
  if (!auth) throw new Error(NOT_CONFIGURED_MESSAGE);
  clearAppJwt();
  pendingGoogleAgeConsentRef.current = ageConsent ?? null;
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    // ... existing success handling
    return result.user;
  } catch (err) {
    pendingGoogleAgeConsentRef.current = null;
    throw err;
  }
};
```

Also: only attach `age_consent` when the Firebase user is actually a Google credential (`providerData` includes `google.com`), not on password/Apple.

### Test

1. Create Account, check 18+, click Google, close the popup.
2. Sign in with email/password.
3. The `/user` POST body must **not** contain `age_consent` from the cancelled Google attempt.

### Done when

- [ ] Popup cancel / error clears `pendingGoogleAgeConsentRef`.
- [ ] Email and Apple syncs never inherit a leftover Google consent flag.

---

## N5 — Signup sync failure leaves an orphan Firebase user

**Severity:** Medium  
**Files:** `src/context/AuthContext.tsx` (`signup`)

### Current behavior

If `POST /user` fails after `createUserWithEmailAndPassword`, the code `signOut`s but does **not** `deleteUser`. Retry with the same email hits `auth/email-already-in-use` even though Postgres has no row.

### Required change

Import `deleteUser` from `firebase/auth`. When `!syncOk`:

```ts
try {
  await deleteUser(credential.user);
} catch (e) {
  console.error("Could not delete orphan Firebase user:", e);
}
try {
  await signOut(auth);
} catch { /* already signed out after deleteUser */ }
clearAppJwt();
throw new Error("We couldn't finish creating your account. Please try again.");
```

If `deleteUser` requires a fresh credential and fails, show: “Account setup failed. Wait a minute and try again, or reset password if this email is stuck.”

### Test

1. Force `/user` to 500 during signup.
2. UI error, no hanging session.
3. Immediate retry with the same email must **not** be `email-already-in-use` (or the recovery copy is shown).

### Done when

- [ ] Failed Postgres sync does not leave a usable Firebase user for that email.
- [ ] User can retry signup.

---

## N7 — Google modal closes before backend sync finishes

**Severity:** Medium  
**Files:** `src/components/auth/login/useAuthForm.ts`, `src/context/AuthContext.tsx`

### Current behavior

`loginWithGoogle` returns when the popup returns. The form then `onSuccess` + `onClose`. Sync runs later in `onAuthStateChanged`. If `/user` fails, the user already saw a successful close, then a toast and a sign-out.

### Required change

Make `loginWithGoogle` **await** backend sync before resolving:

- Set `authActionInProgress` around the popup **and** the `syncUserRecord` call (same pattern as email `login()`), **or**
- Return a promise that resolves only after `res.ok` and `setUser`.

`useAuthForm` should not close the modal until that promise resolves. On failure, show `getFriendlyErrorMessage` inside the modal.

### Test

1. Break `POST /user`.
2. Google sign-in: modal stays open (or reopens) with an error; user is not left thinking they are signed in.
3. Restore API: modal closes only after the navbar shows the signed-in user.

### Done when

- [ ] `onSuccess` / `onClose` run only after `/user` succeeds.
- [ ] Sync failure does not look like a successful login.

---

## N10 — Apple synced as Google; app JWT set before custom token

**Severity:** Low  
**Files:** `src/context/AuthContext.tsx` (`onAuthStateChanged`), `src/lib/auth/api.ts` (`exchangeAppleIdToken`)

### Current behavior

Non-password Firebase users are posted as `auth_provider: "google"`, including Apple custom-token sessions.

`exchangeAppleIdToken` calls `setAppJwt` **before** `signInWithCustomToken`. If custom-token sign-in throws, a backend JWT exists with no stable Firebase session.

### Required change

1. If `providerData` includes `apple.com`, send `auth_provider: "apple"`.
2. Wrap custom-token sign-in:

```ts
try {
  await signInWithCustomToken(auth, firebaseToken);
} catch (e) {
  clearAppJwt();
  throw e;
}
```

Or move `setAppJwt` to **after** `signInWithCustomToken` succeeds (then `loginWithApple` should set the JWT, not `exchangeAppleIdToken`).

### Test

1. Apple login: `/user` (or subsequent profile) stores `apple`, not `google`.
2. Force `signInWithCustomToken` to throw: `getAppJwt()` is null.

### Done when

- [ ] Apple users are not labeled Google in the backend payload.
- [ ] Failed custom-token sign-in does not leave an app JWT in memory.

---

# Sprint 2 — search / compare / CTA

---

## N6 — SSR search failure looks like “No results”; `?view=` ignored

**Severity:** Medium (regresses original **M3** / **M4** skip)  
**Files:**  
- `src/lib/search/searchServer.ts`  
- `src/components/search/useSearchResults.ts`

### Current behavior

On `!res.ok`, `fetchServerSearchResults` returns `{ results: [], totalCount: null, ... }` with **no error flag**. The client `usedInitial` skip then never fetches, so a down backend renders **“No results found.”**

`viewMode` state always starts as `"list"` and ignores `?view=grid`. SSR may have used 12-per-page grid data; the client hydrates list chrome.

### Required change

1. Add `error?: boolean` to `ServerSearchBundle`.
2. On SSR `!res.ok` or thrown fetch, return `error: true` (still empty results).
3. In `useSearchResults`:

```ts
const [error, setError] = useState(Boolean(initialData?.error));
const usedInitial = useRef(Boolean(initialData) && !initialData?.error);
const [viewMode, setViewMode] = useState<ViewMode>(
  () => (searchParams.get("view") === "grid" ? "grid" : "list"),
);
```

4. If `initialData.error`, show the existing “Search failed. Try again.” + Retry (Retry already bumps `retryNonce`).

### Test

1. Point `API_URL` at a dead host (or mock 500). Open `/search`. Must say **Search failed**, not **No results found.** Retry works when the API is back.
2. Open `/search?view=grid`: grid layout and 12-per-page, no flash of list then grid.

### Done when

- [ ] SSR failure surfaces the error UI.
- [ ] `?view=grid` is the initial client view mode.

---

## N8 — Apply Now uses `href="#"` when the school URL is missing or unsafe

**Severity:** Medium  
**Files:** `src/components/university/CourseSummarySideCard.tsx`  
**Pattern to copy:** `src/components/compare/shared/ActionButtons.tsx`

### Current behavior

```tsx
<a href={toSafeHttpUrl(schoolUrl) ?? "#"} onClick={handleApplyClick} ...>
  Apply Now
</a>
```

Compare correctly **disables** Visit Website when sanitization fails. Apply Now still links to `#`, opens a new tab to the same app, and still fires apply analytics.

### Required change

```tsx
const safeUrl = toSafeHttpUrl(schoolUrl);

{safeUrl ? (
  <a href={safeUrl} onClick={handleApplyClick} target="_blank" rel="noopener noreferrer" className={...}>
    Apply Now
  </a>
) : (
  <button type="button" disabled className={...}>
    Apply Now
  </button>
)}
```

Do not call `trackApplyClick` / `trackEvent` when there is no URL.

### Test

1. University with `https://www.csuchico.edu/` → Apply Now opens that host.
2. Temporarily pass `javascript:alert(1)` or `null` → button disabled, no `#` navigation, no analytics POST.

### Done when

- [ ] No Apply Now control has `href="#"`.
- [ ] Unsafe/missing URLs do not fire apply tracking.

---

## N9 — `buildCollegeRow` throws on partial compare API rows

**Severity:** Medium  
**Files:** `src/components/compare/buildCollegeRow.ts`

### Current behavior

Optional chaining stops at `base`, not nested objects:

```ts
tuitionOutOfState: base?.cost.tuitionOutState ?? null,  // throws if cost is missing
satMin: base?.academics.satRangeLow ?? null,
graduationRate: base ? toFraction(base.academics.graduationRate) : null,
medianSalary: resolveSalaryValue(base?.outcomes.avgSalary) ?? null,
studentPopulation: base?.students.size ?? null,
```

One incomplete college object crashes the whole compare table.

### Required change

```ts
tuitionOutOfState: base?.cost?.tuitionOutState ?? null,
satMin: base?.academics?.satRangeLow ?? null,
satMax: base?.academics?.satRangeHigh ?? null,
graduationRate: toFraction(base?.academics?.graduationRate),
medianSalary:
  resolveSalaryValue(selectedProgram?.earnings) ??
  resolveSalaryValue(base?.outcomes?.avgSalary) ??
  null,
studentPopulation: base?.students?.size ?? null,
```

Confirm `toFraction` accepts `undefined`. Add a unit test with a `base` that has `name` but no `cost` / `academics`.

### Test

1. Compare two schools; if details JSON omits `cost`, the page still renders (null cells, not a white screen).
2. `npm test` covers the partial-row case.

### Done when

- [ ] No unguarded `base.cost.` / `base.academics.` / `base.outcomes.` / `base.students.` access.
- [ ] Compare does not crash on sparse API data.

---

## N11 — Search result cards mount desktop and mobile trees

**Severity:** Low (same class of bug as original **L2**, still on Vercel)  
**Files:** `src/components/search/ResultCard.tsx` (~line 453 `hidden md:block`, ~line 670 `md:hidden`)

### Current behavior

On https://us-degree-web.vercel.app/search, each college appears **twice** in the accessibility tree (20 `h2`s for 10 unique schools). Both layouts are in the DOM; CSS hides one. Fit-score / compare state is duplicated work (and can interact badly with keys).

This predates `68f35dd` but showed up in the live pass. Fix it the same way as compare: `useSyncExternalStore` + `matchMedia('(min-width: 768px)')`, SSR default desktop.

### Test

1. `/search`: React DevTools / accessibility snapshot shows **one** heading per school.
2. Resize across `md`: layout swaps without a crash.
3. Compare/save on a card still works after pagination (keys from **M5** remain).

### Done when

- [ ] Only one ResultCard layout is mounted at a time.
- [ ] No visual regression on list view desktop and mobile.

---

# Suggested implementation order inside Sprint 1

Do this sequence inside `AuthContext` so you do not fight yourself:

1. **N4** — `try/finally` around Google popup (clears the ref).
2. **N2** — sign out inside `login()` on `/user` failure.
3. **N1** — `setLoading(false)` on listener early-return.
4. **N7** — await sync before `loginWithGoogle` resolves (may use `authActionInProgress`; N1 makes that safe).
5. **N5** — `deleteUser` on failed signup.
6. **N3** + Apple body omit — UI + `exchangeAppleIdToken`.
7. **N10** — provider string + JWT timing.

---

# QA checklist

- [ ] Email login → `/profile` loads (N1).
- [ ] Forced `/user` 500 on email login: signed out, error visible (N2).
- [ ] Welcome Back: cannot complete Google/Apple without 18+ (N3) — already failing on Vercel today.
- [ ] Cancel Google popup, then email login: `/user` has no stray `age_consent` (N4).
- [ ] Failed signup retry is not `email-already-in-use` (N5).
- [ ] Google success only after navbar shows the user (N7).
- [ ] `/search` with backend down: “Search failed. Try again.” (N6).
- [ ] Apply Now never `href="#"` (N8).
- [ ] Compare with sparse details does not crash (N9).
- [ ] `/search` a11y tree: one heading per school (N11).
- [ ] `npm test`, `npm run typecheck`, `npm run lint` green.

---

# What this guide does not reopen

Already verified **fixed** on Vercel (do not redo unless a ticket above regresses them):

- C1 email-only remember-me
- H1 Firebase missing-keys no longer 500s the site
- H5 no full-catalog fetch on university pages
- M2 `toSafeHttpUrl` on search/compare/hero
- M4 no duplicate client search fetch on first `/search` load
- M6 dialog + university tablist (Close still takes initial focus — optional polish, not N1–N11)

Original leftovers that are **not** new findings (still in [`FRONTEND_FIX_GUIDE.md`](./FRONTEND_FIX_GUIDE.md)): H4 allowlist without edge auth, M1 `err.message` fallback, M7 `NEXT_PUBLIC_API_URL`.
