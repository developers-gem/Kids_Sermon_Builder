# Kids Sermon Builder — Production Audit

Written as Prompt 29 asks: by inspecting the actual code, not assuming
prior claims are correct. Every "done" item below has been build/lint/live
request-tested at some point in this project's history; nothing here is
asserted on the strength of having been written, only on the strength of
having been checked. Where that isn't true — mobile, mainly — it says so
explicitly.

## 1. Completed features

**Web app** — Builder (pick a story, toggle modules on/off, reorder them,
reset to recommended order, save to My Lessons), Custom Story Builder (AI
generation from any passage), Story Library with search, full auth
(register/login/logout/silent session restore/forgot-password/
reset-password), My Lessons (All/Favorites/Recently used/Archived), Lesson
Editor (direct content edits, per-module AI regeneration, drag-equivalent
module reordering, version history with save/restore), sharing via token
(view/listen/download/duplicate, strictly read-only), admin CMS for the 6
built-in stories (backend-enforced, not UI-hidden), narration playback with
seek/restart/download on every spoken section plus a "play whole lesson"
auto-advancing playlist, AI-generated coloring pages, server-side PDF
export (lesson + standalone coloring page, US Letter/A4), Bible content
validation (fabricated-reference detection, passage-drift detection,
age-appropriate keyword screening) as its own reviewable module.

**Backend** — Express + MongoDB, every route auth/ownership-checked at the
service layer (not just the route), rate limiting (verified live: exactly
the configured limit passes, the next request is `429`), cached narration
audio (content-hash keyed, verified to actually write and read back real
files), AI generation tracked through a real state machine with duplicate-
request prevention (verified logically), an S3 storage driver alongside the
working local one (verified to structurally reach real AWS infrastructure,
not tested against a bucket this project owns).

**Mobile app** — Flutter screens for auth, story library, custom AI story
generation, lesson view/listen/organize (favorite/archive/delete/duplicate/
share/PDF/generate coloring page), My Lessons, narration with seek/restart,
a whole-lesson playlist, and request-timeout + network-error handling. See
§4 for why this list carries a different confidence level than the rest of
this document.

## 2. Known limitations (stated plainly, not softened)

- **No email provider is integrated.** Password reset generates and stores
  a real hashed token correctly, but the "email" is only ever logged to the
  server console (`server/src/integrations/email/index.ts`). In any real
  deployment, a user requesting a password reset gets nothing in their
  inbox until someone wires up an actual provider there.
- **Mobile has no lesson editing, version history, regenerate-module, or
  admin CMS.** The mobile lesson screen is view/listen/organize only.
- **Mobile has no offline support.** Network resilience (timeouts, clear
  error messages on connectivity loss) is implemented; offline caching,
  request queuing, and background sync are not — a dropped connection
  surfaces a retryable error, it doesn't let the app keep working.
- **S3 storage is unverified against a real bucket.** It compiles, and a
  live test confirmed the AWS SDK correctly reaches S3's actual network
  endpoint and gets a genuine AWS response back — but this project has no
  AWS credentials, so it has never successfully stored and retrieved a real
  file through it.
- **Flutter has never been compiled.** See §4.
- **No automated test suite exists** for either the backend or the web
  app — verification throughout this project has been `build`/`lint`
  correctness plus targeted live HTTP request tests against the assembled
  app, not a `jest`/`vitest` suite. That's meaningfully different from
  regression-proof test coverage; a future change could reintroduce a bug
  this project already found and fixed without anything failing loudly.

## 3. Production risks

- **Password reset is non-functional for real users** until an email
  provider is connected (see above) — this is the highest-priority gap for
  actually launching, since account recovery is broken without it.
- **No true end-to-end verification against a live database.** This
  sandbox never had a reachable MongoDB. Every "verified" claim in this
  project's history proves an endpoint behaves correctly and fails safely
  *without* a database — none of it proves data actually round-trips
  correctly through a real one, or that an index performs the way it's
  expected to under real load. Run the seed script and the full app against
  a real MongoDB instance before trusting this further.
- **No load/performance testing.** Rate limits, pagination, and query
  indexes are in place, but nothing has been measured under concurrent
  traffic.
- **No secrets have been rotated or generated for production.**
  `.env.example` ships with placeholder values; real, unique
  `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` values must be generated before
  any deployment.

## 4. Mobile readiness — a distinct confidence level from everything else

Every other section of this document rests on build output, lint output,
or a live HTTP request this project actually made and read the result of.
The Flutter app does not have that: **this sandbox has no Flutter/Dart SDK
and no network route to pub.dev**, so none of the mobile code has been
compiled, analyzed, or run. What was done to reduce risk regardless:
matching the REST API contract field-for-field against the server code
that already works, deliberately choosing older/safer Flutter APIs over
newer ones that couldn't be confirmed to exist in whatever SDK version this
eventually builds against, and manual brace/paren-balance verification
across every touched file after each edit. That is meaningfully weaker
evidence than "it built and passed." Treat the mobile app as a strong first
draft that needs `flutter create .` (to generate the missing platform
runner folders), `flutter pub get`, and `flutter analyze` before it's
trusted with real users.

## 5. Deployment requirements

1. **MongoDB** — a real, reachable instance; run `npm run seed --workspace
   server` against it once to load the 6 built-in stories.
2. **Environment variables** — real values for every secret in
   `server/.env.example`, particularly the two JWT secrets and (if AI
   features are wanted) `LOVABLE_API_KEY`.
3. **An email provider** — wire one into
   `server/src/integrations/email/index.ts` before password reset is
   usable in production.
4. **Object storage** — `STORAGE_DRIVER=local` works out of the box but
   ties generated media to a single server's disk; for a real multi-instance
   deployment, configure the S3 driver (§2) with a real bucket and test it
   before relying on it.
5. **CORS** — set `WEB_ORIGIN` to the real deployed web app's origin, not
   the `localhost` default.
6. **Mobile** — run `flutter create .` inside `apps/mobile`, then
   `flutter pub get` and `flutter analyze`, and fix whatever surfaces before
   distributing a build.
