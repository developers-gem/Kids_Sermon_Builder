# Kids Sermon Builder

Monorepo for the production Kids Sermon Builder platform — migrating the
original TanStack Start prototype (`sermon-sparkle-story.lovable.app`) to
React + Vite / Express + MongoDB / Flutter per the architecture in the
prompt package.

```
apps/web       React + Vite + TypeScript + React Router web app
apps/mobile    Flutter mobile app (Phase 6 — not started)
server         Node.js + Express + TypeScript + MongoDB backend
packages/types       Shared TypeScript types (Lesson, Story, User, API envelopes)
packages/validation  Shared Zod schemas used by both server and web
packages/constants   Shared constants (age groups, illustration styles, narration voices)
packages/api-client  Reserved for a generated client (currently apps/web/src/api talks
                     directly to the REST API; not yet extracted into this package)
```

## Status: Phase 1 (architecture) — complete. Phase 2 (core product) — complete. Phase 3 (AI/media) — complete. Phase 4 (audio) — complete. Phase 5 (sharing & admin) — complete. Phase 6 (mobile) — core screens built, unverified. Security/QA sweep — done (see below)

- [x] Monorepo layout, workspaces, shared `@ksb/*` packages (each builds to its own `dist/`)
- [x] Express backend: config, controllers, routes, middleware, models, services,
      repositories, validators, structured error handling, rate limiting
- [x] MongoDB Mongoose models (`User`, `Story`, `Lesson`, `ShareLink`, `GenerationJob`,
      `LessonVersion`, `AudioAsset`) + seed script migrating all 6 built-in stories verbatim
- [x] Auth: register/login/refresh/logout/me with bcrypt + JWT access/refresh rotation,
      wired into the frontend (`AuthProvider`, silent-refresh on load, Login/Register pages,
      `ProtectedRoute`)
- [x] AI generation with a validate -> repair-retry -> fail loop (never trusts raw AI
      output) and a `reviewRequired` flag surfaced to the UI
- [x] React + Vite migration of the prototype — Builder, Custom Story Builder, and
      Story Library pages preserved pixel-for-pixel (same design tokens, same
      component structure), now calling the Express API instead of TanStack
      server functions
- [x] My Lessons: list with All/Favorites/Archived tabs, favorite/archive/restore/delete,
      a Lesson detail page, and a "Save to My Lessons" action from the Builder (Workflow A)
      so both workflows actually persist lessons for signed-in users
- [x] `npm run build` and `npm run lint` succeed with 0 errors across every workspace
      (verified from a clean install)
- [x] Server boots, fails gracefully with a structured log + non-zero exit when
      MongoDB is unreachable; `/health`, unknown routes, and Zod validation all verified
      by hand with no database connected (see note below)
- [x] Fixed two real authorization bugs found while wiring this up:
  1. `GET /api/lessons/:id` previously let *any* unauthenticated request read *any*
     user's private lesson by id (ownership filter silently skipped for anonymous
     requests). Fixed in `lessonService.getById` — owner-or-public only, uniform 404
     otherwise so existence can't be inferred by probing ids.
  2. `PUT /api/lessons/:id/modules` (and every other `updateById`/`deleteById` call)
     had the same pattern one level worse: an anonymous request's `null` owner id
     was skipped from the Mongo filter entirely, so an unauthenticated request could
     **mutate or delete** any lesson by id, not just read it. Fixed at the repository
     level — the owner filter is now always applied, including `null`, so a guest can
     only touch lessons that are themselves unowned.
  Both verified with live request tests (401 on the mutating routes without auth, no
  data leak or write on lesson-by-id access).
- [x] Lesson Editor (Prompt 14): edit title/big idea/story/questions/memory verse/
      motions/games/object lesson/coloring caption/prayer with explicit Save/Cancel
      (no autosave-while-typing, no `window.prompt`), module reordering via move
      up/down (persisted server-side, membership-checked so reorder can't smuggle in
      module changes), and Duplicate Lesson — all gated to the lesson's actual owner
- [x] Version snapshots (Prompt 14 "Save version" / "Restore version"): `POST/GET
      /api/lessons/:id/versions` and `POST /api/lessons/:id/versions/:versionId/restore`,
      backed by the previously-unused `LessonVersion` model. A snapshot captures every
      field the editor can change (content + active modules + their order). Restoring
      is itself non-destructive — it auto-saves the current state as a "Before restore"
      version first, so a restore can always be undone by restoring again. Wired into
      the Lesson detail page as a collapsible version-history panel with Save/Restore.
      Verified live: all three endpoints correctly 401 without auth.
- [x] Regenerate module (Prompt 10/14): `POST /api/lessons/:id/modules/:moduleId/regenerate`
      re-runs just one panel (story+questions, verse, games, object lesson, coloring
      caption, or prayer) through the AI with the same validate -> repair-retry -> fail
      discipline as full-lesson generation, and an optional free-text instruction (e.g.
      "simpler for younger kids"). It auto-saves a "Before regenerate" version first —
      same undo safety net as Restore — and marks the lesson `reviewRequired` again,
      since regenerated content is never trusted any more than freshly-generated
      content is. This closes out every item in the Phase 2 "Core Product" roadmap.
- [x] AI-generated coloring pages (Prompt 13): `POST /api/lessons/:id/coloring-page/generate`
      (and `/regenerate`, same handler per the Prompt 06 contract) — a dedicated
      image prompt distinct from the storybook illustration prompt (pure black-and-white
      line art, no shading/color, printer-friendly). Never marks the lesson
      `reviewRequired` — an image isn't a Scripture-accuracy concern the way generated
      text is. Auto-saves a version first, same undo safety net as regenerate-module.
      Wired into the Lesson detail page, including the case a lesson has no coloring
      page yet (the panel now always renders, with a "Generate with AI" prompt, instead
      of silently disappearing).
- [x] Server-side PDF export (Prompt 20), replacing `window.print()`-only: `GET
      /api/lessons/:id/pdf` and `GET /api/lessons/:id/coloring-page/pdf`, both
      supporting US Letter and A4, built with `pdfkit`. Actually verified by generating
      real PDFs (not just compiling) — checked the output starts with `%PDF-` for the
      full lesson in both sizes, the standalone coloring page, a data-URL image actually
      embedding, and the "no coloring page yet" fallback. Handles a real architectural
      limit honestly: AI-generated images (data/hosted URLs) embed correctly, but
      built-in story images are Vite-bundled frontend-only assets the backend can't
      reach yet (see "Object storage for media" below) — the PDF renders without the
      image rather than failing. Wired into Lesson detail and Custom Story pages as a
      "Download PDF" button (kept the browser "Print" button too, for a quick print
      without downloading).
- [x] Fixed one more real bug while wiring the PDF download button: a plain `<a href>`
      to a PDF endpoint wouldn't carry the app's `Authorization: Bearer` header (auth
      here is bearer-token-based, not cookie-based, except for the refresh endpoint),
      so an owner downloading their own private lesson's PDF would've been treated as
      anonymous and gotten a 404. Fixed by fetching the PDF as an authenticated Blob
      (same pattern narration audio already used) and triggering the download from
      that, instead of a direct link.
- [x] Bible content validation (Prompt 11), pulled out into its own explicit,
      independently-testable module (`server/src/services/bibleValidationService.ts`)
      instead of a blanket "review this" string stapled onto every AI response.
      Honest about what it can and can't do without an integrated Bible-text API: it
      can't verify a quotation is word-for-word accurate, but it does real mechanical
      checks — a 66-book name/abbreviation table to catch fabricated references (e.g.
      "Corinthios 3:5"), a check that the generated reference's book still matches the
      book the teacher actually requested (catching passage drift), an
      age-group-sensitive keyword pass for graphic/intense wording, and an explicit
      paraphrase-labeling note. A fabricated/unrecognized reference now triggers one
      extra AI repair-retry asking it to correct the reference, the same way a
      malformed JSON response already did — this previously only checked JSON shape,
      never Scripture-reference validity. Wired into both full-lesson generation and
      `regenerateModule` (for the "verse" and "story" modules specifically, since
      those are the only two that touch Scripture wording). Verified with a direct
      test harness (not just compiled) against six real and adversarial inputs —
      correct book matching including multi-word ("Song of Solomon") and numbered
      ("1 Samuel") names, a deliberately fabricated reference, a passage-drift case,
      and an age-inappropriate-keyword case — all produced the expected, specific
      warning.
- [x] Fixed one more real gap while building this: `validationWarnings` was being
      computed and saved to every AI-generated lesson since Phase 1, but nothing in
      the UI ever displayed it — only the generic "should be reviewed" line showed,
      the specific reasons were invisible. Now rendered as a list under that banner
      on both the Custom Story result and the Lesson detail page.
- [x] Persisted/cached narration audio (Phase 4 / Prompt 12), replacing "generate
      fresh audio on every call": a new `AudioAsset` model + `saveMedia` local-disk
      storage integration (the `STORAGE_DRIVER`/`STORAGE_LOCAL_DIR` env config existed
      since Phase 1 but nothing used it until now). Audio is cached by
      (lessonId, moduleId, contentHash, voice, style) — contentHash (sha256 of the
      narrated text) stands in for "contentVersion," so an edited section naturally
      gets fresh audio next time without needing an explicit version counter, while
      an unchanged section reuses its cached clip. Verified the storage layer by
      actually writing a file and reading the bytes back, not just compiling it.
      `GET /api/lessons/:id/audio` lists a lesson's cached clips for the playlist.
      Narration now also covers games, object lesson, and closing prayer — sections
      that previously had no "Listen" button at all — and a new "Play whole lesson"
      component sequences through every narratable active module automatically,
      advancing to the next section when one finishes (Prompt 12 "complete lesson
      audio playlist"), on both the Lesson detail and Custom Story pages.
- [x] Fixed two more real bugs found while building this:
  1. `audio.routes.ts`'s `Router()` was missing `{ mergeParams: true }`, so
     `req.params.lessonId` from the parent mount (`/api/lessons/:lessonId/audio`)
     was silently `undefined` inside every audio route. Confirmed fixed with a live
     request that reaches the database layer using the real lessonId, rather than
     failing on a missing param.
  2. `STORY_IMAGES[s.id]` / `COLORING_IMAGES[s.id]` across `BuilderPage.tsx` and
     `LibraryPage.tsx` were keyed on the wrong field — `Story.id` is the Mongo
     ObjectId, but the image map is keyed by `Story.slug` ("noah", "david", etc.).
     This silently fell through to a broken relative-path fallback every time,
     meaning **the six built-in stories' images have likely been broken in the
     actual running app since Phase 1**. Fixed all 5 call sites.

- [x] Sharing via token (Prompt 19): `POST`/`DELETE /api/lessons/:id/share` (owner-only,
      idempotent — calling create again returns the existing active token instead of
      making a new one) and public `GET`/`POST /api/shared/:token[/duplicate]`. A shared
      lesson is strictly read-only — there is no update/delete route that accepts a
      token, only owner-scoped id routes, so read-only-ness is structural rather than
      a checked flag. "Duplicate to My Lessons" creates an independent copy owned by
      whoever duplicates it, not tied to the original owner. Verified live: all four
      routes enforce auth/ownership correctly with no database connected.
- [x] Fixed a real privacy leak found while building this: `GET /api/lessons/:id` was
      returning the *raw* Mongoose document to any viewer, including `ownerId`,
      `isFavorite`, and `isArchived` — a non-owner viewing a public or shared lesson
      could see the actual owner's private organizational state and identity, not just
      the lesson content. Fixed with a `toPublicLessonView()` util that strips those
      fields for anyone who isn't the owner, applied consistently to both the
      lesson-by-id route and the new share-token route. Also gated the
      Favorite/Archive/Delete buttons on the Lesson detail page behind actual
      ownership — they previously rendered (and would always fail) for any viewer.
- [x] Admin CMS for the 6 built-in stories (Prompt 21): full create/edit/publish/
      unpublish/archive/delete under `/api/admin/stories/*`, every route gated by
      `requireAuth` + `requireAdmin` **on the backend** — the frontend `AdminRoute`
      guard and the nav link only ever hide the UI, they are not the enforcement
      (Prompt 21's own explicit rule: "Do not rely on hiding UI buttons"). Verified
      live with a real regular-user JWT and a real admin JWT: unauthenticated → 401,
      authenticated non-admin → 403 Forbidden (confirmed *before* reaching the
      database or any business logic), admin → passes through correctly. Global
      content (`Story`) stays completely separate from user content (`Lesson`) —
      no shared model, no shared authorization path.

- [x] Flutter mobile app (Phase 6) — auth, story library, custom AI story
      builder, lesson view/listen/organize (favorite/archive/delete/duplicate/
      share/download PDF/generate coloring page), My Lessons with the same
      tabs as web. Consumes the identical REST API, same architectural rule as
      everywhere else in this project: no separate backend logic, no direct
      MongoDB access. **Important caveat, unlike everything else in this repo:
      this code has not been compiled, analyzed, or run** — the sandbox this
      was built in has no Flutter/Dart SDK and no network access to pub.dev,
      so it didn't get the same build/lint/live-request verification every
      other phase did. See `apps/mobile/README.md` for the full, honest
      accounting of what that means and what's still missing (lesson editing,
      version history, regenerate-module, admin CMS, and offline support all
      have no mobile screens yet).
- [x] Security/QA sweep — found and closed real gaps rather than just
      reviewing what already existed:
  1. **Forgot/reset password was entirely missing**, despite being explicit
     in the original spec (Prompt 06/07). Built `POST /api/auth/forgot-password`
     and `/reset-password`: reset tokens are only ever stored hashed (never
     the raw value, same principle as passwords), expire after an hour, and
     a successful reset bumps `refreshTokenVersion` to log out every existing
     session — including one an attacker may have been using. The
     forgot-password response is identical whether or not the email is
     registered, so it can't be used to enumerate accounts. **Honest gap
     left in place rather than faked**: no email provider is integrated (no
     SMTP/API credentials were available to wire up and test), so
     `integrations/email/index.ts` is a clearly-marked seam that currently
     only logs the reset link server-side — meaning password reset doesn't
     actually notify a user anywhere in a real deployment yet.
  2. Verified rate limiting is *actually enforced*, not just defined and
     unused (a gap the same shape as two of the earlier bugs in this
     project) — fired 25 requests at a limit of 20 and confirmed exactly the
     21st through 25th came back `429`.
  3. Found two genuinely unbounded MongoDB queries — `LessonVersion.find()`
     and `AudioAsset.find()` had no `.limit()`, meaning a lesson with a long
     edit history could return an ever-growing, un-paginated result set.
     Capped both.
  4. Reviewed CORS (single configured origin + credentials, not a wildcard),
     Helmet, and icon-only-button accessibility labeling — no further gaps
     found in this pass.
- [x] Deep gap-closing pass against all 29 original prompts (not just the
      phase-level summary above) — see `docs/PRODUCTION_AUDIT.md` for the
      full picture. Found and closed:
  1. **Prompt 10** — `GenerationJob` was dead scaffolding with the right
     state machine but nothing writing to it. Wired into AI generation:
     real duplicate-request prevention and a generation history, not just a
     model that existed on paper.
  2. **Prompt 09** — Builder had no reordering at all, not even the
     underlying data structure — panels were hardcoded fixed-order JSX.
     Refactored to order-driven rendering with move controls and "Reset
     recommended order."
  3. **Prompt 12** — added a real seek bar and restart button to narration
     playback (web and mobile), and a "play whole lesson" playlist widget
     on mobile (the web one already existed).
  4. **Prompt 18** — added the one missing tab that's actually meaningful
     (Recently used). Found and left out Drafts/Completed on purpose:
     `Lesson.status` is always `"ready"` in this app — no code path ever
     produces a draft lesson, so those tabs would be permanently empty or a
     duplicate of "All." Documented in a code comment rather than building
     hollow UI for checkbox compliance.
  5. **Prompt 24** — built a real S3 storage driver (previously threw
     "not implemented"). Verified boot-time validation both ways (missing
     fields correctly rejected, complete fields correctly pass), and a live
     call confirmed the AWS SDK genuinely reaches S3's network endpoint —
     stronger evidence than "it compiles."
  6. **Prompt 23** — built a client-side error-code → friendly-message
     translation layer and wired it into all 18 raw-error-message sites on
     web and the equivalent sites on mobile, closing a gap present since
     Phase 2. Caught and fixed my own mistake mid-edit: a scripted
     multi-file replacement briefly broke 4 files by inserting an import
     line inside a multi-line `import {...}` block — found via the next
     `npm run build`, fixed, reverified.
  7. **Prompt 26** — audited every `<img>` (all have `alt`), every click
     handler (none on non-semantic `div`/`span`), and found the Lesson
     Editor's 16 form fields had zero `aria-label`s or associated
     `<label>` elements — a real gap for a screen-reader user in edit mode.
     Fixed all 16.
  8. **Prompt 25** — mobile `ApiClient` now applies request timeouts and
     translates `SocketException`/`TimeoutException` into a single
     catchable, friendly error instead of letting raw exceptions reach a
     screen. This is graceful degradation, not full offline support — no
     request queue, no local cache, no background sync.
  9. **Prompt 29** — the formal audit itself: `docs/PRODUCTION_AUDIT.md`.
- [x] Fresh adversarial testing pass across the whole scope (not re-confirming
      previous work — actively hunting for what recent large edits might have
      broken). Cross-checked the admin story frontend/backend types
      field-for-field, verified seed data against the new `CreateStoryInput`
      validation constraints, confirmed the S3 cross-field boot check doesn't
      wrongly fire for the default local driver, and live-tested 8 more
      validation/authorization boundaries across admin/sharing/auth together
      (all correct). Found one genuine bug this way: the `GenerationJob`
      duplicate-request check queried `{ ownerId: null }` for guest users —
      but every guest shares `ownerId: null`, so two *unrelated* anonymous
      people generating lessons within two minutes of each other would
      incorrectly block the second one with "a lesson is already being
      generated for you." There's no per-guest session identifier in this
      app to key the check on instead, so the fix is to only run
      duplicate-detection for authenticated users, where `ownerId` is a real,
      distinguishing value — guests simply don't get that protection until a
      real per-device identifier exists. Verified live: two back-to-back
      "different guest" requests now fail identically instead of the second
      one being wrongly rejected. Also swept every other repository query in
      the codebase for the same pattern (matching on a nullable field with no
      other distinguishing scope) — found none.

## Not yet built (later phases)

- [ ] Mobile: lesson editing, version history, regenerate-module, admin CMS,
      offline caching/sync — see `apps/mobile/README.md`
- [ ] A real email provider for password reset — see
      `server/src/integrations/email/index.ts`
- [ ] An automated test suite (`jest`/`vitest`) — verification throughout
      this project has been build/lint correctness plus live HTTP request
      tests, not regression-proof test coverage; see
      `docs/PRODUCTION_AUDIT.md` §2 for what that does and doesn't prove
- [ ] True end-to-end verification against a live MongoDB — this sandbox
      never had one reachable; see `docs/PRODUCTION_AUDIT.md` §3

## Getting started

```bash
npm install                 # installs and links all workspaces
npm run build:packages      # builds @ksb/types, @ksb/validation, @ksb/constants
                             # (build:web / build:server do this automatically)

cp server/.env.example server/.env
# edit server/.env: set real JWT secrets, a real MONGODB_URI, and LOVABLE_API_KEY
# if you want AI generation/narration to work (both fail gracefully without it)

npm run seed --workspace server   # loads the 6 built-in stories into MongoDB

npm run dev:server          # http://localhost:4000
npm run dev:web             # http://localhost:5173 (proxies /api to :4000)
```

**Note on verification:** this environment has no MongoDB reachable (no local
`mongod`, and MongoDB's download servers aren't on the sandbox's network
allowlist), so end-to-end behavior against a real database hasn't been run
here. What *has* been verified directly: a full `npm install` from scratch, a
full `npm run build` and `npm run lint` across every workspace with zero
errors, and the compiled server booting and correctly handling `/health`, an
unknown route, and a Zod-rejected `/api/auth/register` request with the
database intentionally unreachable. Run the seed script and the two dev
servers against a real MongoDB instance before treating this as fully proven.
