# Playtest slice 1

Public typed learning data in src/data/learning.ts renders without Auth. New `sourced` editorial state means sources were compared, while academic/Kazakh editorial review remains outstanding. Twelve readings, twelve timeline entries and four people are the first collection, not the full assessment. Join navigation reuses #/join. PlayerName uses a participant UUID identity tag, never a join ordinal; earnedPlace labels actual server ranks. No backend/schema changes in this slice.

---

# Ел жады: Қазақстан, 1939–1953 — project specification

## Scope and current stage

Stage 3 is deployed at main `f291792`; the owner reports its migrations/Cron and physical iPhone full-quiz/late-join/final-refresh checks. Current work is the competition lifecycle update on `codex/live-competition-lifecycle`, review-only with two new migrations not applied remotely. No merge/deploy or hosted Supabase mutation is authorised for this update. Stage-specific architecture notes below remain as implementation history; the competition amendment at the end describes the new contract.

A Kazakh-language university learning site about «Ұлы Отан соғысы және соғыстан кейінгі Қазақстан (1939–1953 жж.)». Stage one delivers the application shell, identity, navigation, layouts, editorial schemas and honest empty states. This is not a finished history resource. The public narrative collections remain empty and no historical media is checked. Stage 3 separately adds ten sourced backend-only live quiz questions; this does not complete the narrative assessment. Planning titles are not factual assertions or completed theses.

Audience: laptop/HDMI classroom presentation and independent iPhone Safari / Android Chrome use. Public content stays static and free to visitors. Supabase Auth/PostgreSQL/Realtime supplies profiles/rooms. Stage 3 adds only live quiz scoring; practice and four other game types remain unfinished.

## Architecture

React 19 + TypeScript + Vite. `src/data/types.ts` defines sourced editorial entities and a five-way activity discriminated union. `src/data/content.ts` separates empty historical collections from editorial plans and navigation. UI lives in `src/App.tsx` and `src/components/`; styling in `src/styles.css`; URL validation, editorial validation and browser storage in `src/lib/`.

Hash navigation (`#/timeline`, etc.) keeps every request at the deployment root; refreshing a section never requests a server route. Unknown sections show a recovery link. Vite `base: './'` produces relative bundled assets for both domain-root and `/repository-name/` deployments. Fonts are bundled, including Kazakh Cyrillic characters. No external font/CDN requirement.

The existing GitHub Pages foundation URL supplied by the owner is `https://owen1night.github.io/el-zhady/`. Stage 2 is the existing deployed baseline; Stage 3 remains a review branch. Share/room QR URLs use `VITE_PUBLIC_SITE_URL` or that exact owner-provided URL, never the development origin. QR generation happens locally. The existing main-branch Pages workflow is retained and accepts only public backend configuration.

## Page structure

| Section | Route | Stage-one layout / future content |
| --- | --- | --- |
| Басты бет | `#/home` | Typographic museum cover, three learning steps, period selector, editorial note |
| Хронология | `#/timeline` | Three period buttons and planned map; future sourced events and animated geography |
| Майдан | `#/front` | Research outline, empty archive panel |
| Батырлар | `#/heroes` | Gallery outline for at least 11 war heroes; no invented names or portraits |
| Тыл | `#/homefront` | Industry, evacuation and daily-life research outline |
| Соғыстан кейін | `#/postwar` | Reconstruction, Academy of Sciences, literature, art, persecution of scholars; at least 4 additional postwar figures planned |
| Деректер | `#/facts` | 10 thesis planning slots, 30 facts planned, real verified counters currently zero |
| Бейнебөлім | `#/videos` | Three explicitly empty media slots, no empty/broken players |
| Ойындар | `#/games` | Five distinct activity plans with explanation dialogs; no scoring |
| Нәтиже | `#/results` | Honest empty results, five pending activity rows, storage/reset control |
| Дереккөздер | `#/sources` | Empty bibliography and attribution standards |

## Editorial and assessment decisions

The 1939–1953 scope includes pre-1941 context, war and postwar themes. Distinguishing the Second World War from the Great Patriotic War is explicitly a research task; source-backed narrative definitions remain pending; the live quiz distinguishes the date ranges. Ten thesis themes reserve three distinct fact entries each; facts must be distinct and independently sourced. At least 11 heroes plus 4 relevant postwar figures are planned, exceeding the overall minimum of 10 figures. No historical images, maps, video URLs or quotations are invented. The cover is an original typographic illustration labelled “not a historical document”.

Draft entities require an editorial note and may have empty source references. Verified entities require nonempty references and reviewer metadata. A reference contains a source ID and exact locator. Runtime checks reject missing references, unknown sources, unchecked cited sources and duplicate entity IDs. These checks validate structure, not historical truth. Human research and review are required. Future UI renderers must only show verified material as finished content; the current shell renders planning data only.

## Interaction and result plan

1. Quiz: select one answer, submit; explain correct answer and source.
2. Person–achievement matching: select person then achievement; no drag dependency.
3. Chronology: move items using up/down buttons; no drag dependency.
4. Map identification: clickable marker and equivalent keyboard-accessible text list.
5. Classification: category buttons for майдан / тыл / соғыстан кейін.

Future scoring: award 1 point per correct atomic item (quiz answer, pair, ordered position, map answer, classification item). Show earned/possible, correct answer, explanation and references after every activity. Combined result sums earned and possible across completed activities, explicitly labels incomplete work, and only calls a final result complete after all five activities finish. No grade thresholds or percentages are claimed now.

Stage 2 supersedes the original device-local result plan: permanent-account practice results belong in PostgreSQL for cross-device use, five slots worth 20 points each. The browser cannot write scores. Existing local preferences and visited-section history remain cosmetic and never count as achievement. Reset affects only those preferences, not Auth or database records. Independent practice result submission/retakes remain future work. Live competition uses the separate raw score model below.

## Design and devices

Warm ivory, charcoal, restrained red and muted brass. Noto Serif/Sans, archival labels, open spacing, respectful remembrance. No automatic audio. Short entrance animations respect reduced motion. Native modal dialogs provide focus containment, Escape and focus return. Visible keyboard focus, skip link, labelled navigation, semantic controls. Touch targets generally at least 44px. All essential actions use touch/mouse/keyboard; no hover-only or drag-only actions.

Presentation mode increases key text sizes and persists locally; it does not invoke fullscreen or promise to control HDMI output. Responsive maps and historical map animation remain planned. Media integration must use user-initiated playback, controls, inline video, captions/transcripts and mobile checks. Actual iOS/Android device testing remains necessary even after browser emulation.


## Stage 2 architecture and routes

Stage 2 was merged/deployed before this task. Stage 3 baseline is remote main `b30452e`; branch `codex/stage-3-live-quiz` is for review only. Historical data and the museum identity remain intact.

New hash routes: `#/auth?next=...`, `#/profile`, `#/join?code=...`, `#/lobby?room=<uuid>`, `#/admin`. All 11 historical sections remain public. Planning descriptions of games may be read publicly; actual practice requires a permanent account and is not implemented yet. Live waiting rooms accept both registered users and genuine Supabase anonymous users. Guests do not depend on Google/email and do not get private profiles.

`src/backend/` separates public config validation, the Supabase client, typed DTOs, error/timeout rules and RPC calls. `src/auth/` verifies persisted sessions through Auth, uses redirect-based Google PKCE and whitelisted intended destinations, asks new accounts for a display name, and signs out locally. SDK refresh does not run inside its auth-state callback lock. Auth/request loads have 12-second bounds. Backend failures do not redirect public readers to login.

`src/features/` contains account/profile forms, guest entry, lobby subscription/polling, share QR and protected admin controls. The UI never substitutes local fake users/rooms/results. PGlite is a dev-only test tool. A future private practice snapshot is five capped scores and a separate competition history, never a guest result joined by a display-name match. No earned score is shown without a stored result; zero completed activities displays `— / 100`.

The initial migration creates five RLS-protected exposed tables (`profiles`, `rooms`, `room_participants`, `practice_results`, `competition_results`) and five RLS/default-deny private tables (admin grants, identity memberships, idempotency requests, join limits and future answer keys). Lobby projections contain display names/suffixes and relevant status/results only. Auth emails/UUIDs stay outside the public lobby tables. Policies permit own permanent profile/practice reads and room-scoped safe reads. Clients have no table-mutation or score-write grants.

Protected, fixed-search-path SQL functions save the caller's profile, validate joining, fetch an authorised lobby, update the caller's heartbeat and perform admin room actions. Admin authority comes from a private grant tied to a permanent Auth UID, not metadata. Room joins use per-user advisory locks, per-room row locks, a unique membership and quotas. Room creation reuses an admin-scoped request UUID saved before the network call. Display-name suffixes distinguish homonyms; guest membership kind is immutable and excluded from later permanent history even if the Auth identity changes.

Realtime publishes only safe room tables. Events trigger a fresh authorised read; 15-second visible-page polling and online/focus recovery supplement it. Heartbeat updates are server-throttled and labelled as recent activity, not proof of online presence. Admins can prepare, lock/unlock, remove and close rooms. Existing active membership may reconnect while joining is locked/full; closed rooms reject joins. Stage 3 adds a genuine live Start action and the server mechanism below. Existing Stage 2 Google/profile/admin/joins/QR/lock behavior is owner-reported working. Stage 3 hosted acceptance is pending; see SECURITY.md and STAGE3_SETUP.md.


## Stage 3 live quiz architecture

`src/live/` contains typed safe projections, RPC calls, state polling, navigation guard and accessible quiz/report views. The React app never imports seeded questions/keys. Private versioned sets/questions are seeded by `20261101000300`; `20261101000200` adds schema/functions. The Stage 2 migration stays byte-identical. No new routes or hosting service are required; existing room URLs lead into the live game. Host chooses a published set after creating the room.

Private `live_quiz_sets`, `live_quiz_questions`, `live_quiz_snapshot`, `live_quiz_roster`, `live_quiz_answers` are default-deny/RLS and have no browser read/write grants. Safe RLS-protected `live_quiz_sessions` and `live_quiz_results` contain no answer keys/Auth IDs/emails. Fixed-search-path security-definer RPCs authorize every read/mutation. The starting host is excluded even if previously joined; other active memberships are copied at start. One session per room; a new match needs a new room. Display names/kinds/questions/options/keys/explanations/sources are frozen snapshots, so later edits cannot change a started match.

Timing: `starts_at = server clock + 3s`, then for question n, opening = starts_at+(n−1)×20s, deadline = opening+15s, reveal ends = opening+20s. Countdown step0, alternating question/reveal steps1–20, completion step21 at starts_at+200s. Persisted phase is monotonic. A private owner-only tick scheduled every second by **Supabase Cron** advances/finalizes even with no browser open. Authorized state/submission calls repair delayed phases from those timestamps. Clients only draw remaining time from server timestamps using a local monotonic clock/approximate transit adjustment; they never decide acceptance, advance a phase, reveal a key or award points. Mobile suspension does not pause the game. Active state is fetched every second while visible and on reconnection/visibility; safe session Realtime events trigger a fresh read. Public history remains independent of these services.

Start locks room/session, validates configured ten-question version/options, requires a participant and configured scheduler, copies roster/content and locks entry atomically. Repeated/concurrent start returns the same ID/start. Submission locks and checks actual session identity, nonremoved frozen membership, current question/valid stable option and half-open server window `[opening, deadline)`. An existing answer returns the original acknowledgement before rechecking its deadline, never replacing choice/time. Primary keys and serialized operations prevent duplicates. Wrong/unanswered=0; correct=1000+floor(100×remaining-server-seconds/15), clamped0..100. Receipt is measured after lock/validation; network/server queuing affects speed fairness. Browser scores/correctness/times are not RPC inputs.

Current question payload has prompt/options only, stable per-person shuffled ordering and own accepted option/time. Reveal adds correct ID/explanation/sources and own score. Board sums only revealed questions; admin per-question report also stops at the latest reveal. No future keys/questions/other answers can be fetched by browser roles. Public source SQL can still be inspected in this public repository; these controls do not make cheating impossible.

Finalization copies all frozen roster names/suffixes and totals once, with removed competitors retained but excluded from ranking. Rank orders correct count descending then speed sum descending, exact ties share competition rank (`1,1,3`); podium includes every eligible rank1/2/3, including all tied third. Raw live maximum11000 is separate from practice100. Registered history requires both join and frozen roster kinds registered; guest name matches or later Auth upgrades never attach old guest records. Completed rows remain immutable even if a host later removes someone. Cancellation closes/locks the room, preserves answers but creates no completed results/ranks/history. Only already revealed questions appear in its admin report.

The app warns before in-app navigation during a running match: earned points saved, server continues, misses zero. Optional browser unload warnings supplement this; immediate database persistence does not depend on unload events. Full-text native option buttons support touch/mouse/keyboard. Phase changes scroll the active quiz into view; the host sees the same question without competing. Countdown/selection/rank/podium motion is restrained and reduced-motion aware. Admin has confirmed cancellation and per-question details; no fake advance/play button exists. See STAGE3_SETUP.md for one-time manual migration/Cron setup and STAGE3_VERIFICATION.md for local versus hosted limits.


## Competition lifecycle update (review branch, not deployed)

Baseline is deployed Stage 3 main `f291792`; branch `codex/live-competition-lifecycle` remains draft. Two additive versioned migrations extend the schema without editing/rerunning prior SQL. `COMPETITION_SETUP.md` describes the coordinated maintenance requirement because the old frontend cannot exercise the new reveal contract. Hosted Supabase is unchanged by this task.

`public.live_competitions` holds safe persisted competition state/current round/first start/reveal timestamp, RLS-scoped to permitted room access. Existing `live_quiz_sessions` become ordered rounds (one to three quiz rounds); the old one-room/one-session unique constraint becomes `(competition_id,round_number)`. Private competition roster, final totals and durable saved history are separate. First start freezes the host-excluding roster; every round copies that exact roster. Start takes a target ordinal and repeated/concurrent calls return that round's original acknowledgement. The unchanged one-second Cron job calls the replaced private tick; it advances active quiz windows, archives each completed round and moves to `between_rounds` or `awaiting_reveal`. Only an admin explicitly starts the next ordinal or persists the final reveal. No unfinished game type is accepted by SQL or enabled in UI.

The quiz bank has twenty sourced questions. A private draw helper samples ten without replacement and independently permutes their order, persisting a per-round snapshot inside start's locked transaction. Reconnect/refresh/start retry cannot redraw; all people see the same question ordinal with independently shuffled option display. Future prompts/keys are private, and the build excludes all seed prompts/markers/ID prefixes. Public repository SQL remains reviewable, not cheat-proof.

For enabled equal-scale quiz rounds, final rank uses summed correct counts then summed speed; raw total is `1000*correct+speed`, max11000 per round. Practice /100 is unaffected. Mixed-game normalization/weights/speed/ties remain an explicit owner decision; such lineups are rejected until separately specified and tested. Different rounds may overlap question selections.

Raw legacy/live result SELECT policies now permit admin only and both result tables leave Realtime. Player RPCs omit every full leaderboard; before host reveal they omit podium/own final result/history. After reveal they return only shared rank≤3 winners (including ties) and the caller's own result; only host receives the full ranked table. The reveal timestamp is server persisted and idempotent. An observed transition animates third→second→first; a refreshed page renders the final arrangement immediately. Reduced motion skips the sequence. Fewer places and tied groups are retained without choosing an arbitrary winner.

Temporary removal revokes room access until an explicit user join before start. Block additionally bans that identity in that room; names/new guest identities are not a durable ban mechanism. Old removals are backfilled as blocks to preserve Stage 3 semantics. Once started, no removed/new participant can join between rounds; eligible existing membership can reconnect. Close is final, cancels unfinished rounds and makes current/reconnected/refreshed participants return home with the exact Kazakh closure message. Hosts can inspect closed rooms and confirm permanent deletion.

Deletion archives earned completed results before deleting room-scoped answers/snapshots/rosters/results/participants in inspected FK order. Saved private history intentionally has no room/session/participant FK and never assigns ownership by name; guest rows have no registered UID. Completed final history supersedes per-round archive entries; cancelled partial competitions retain completed prior-round history without entering completed competition ranks. Closed/deleted unrevealed history exposes only the owner's points with no rank. Auth users, profiles and practice are untouched. Minimal retired-code tombstones prevent QR reuse; nullable creation request room IDs preserve idempotency/quota without resurrecting deleted rooms.

Frontend lifecycle errors use a shared exit notification and guard-bypassing return home, including initial/reconnected reads. A removed identity is never silently rejoined. One-second game polling and two-second lobby polling supplement safe Realtime events, which trigger fresh authorised reads. Projector QR uses a high-contrast SVG in a full-viewport native dialog with large code, top-right X, Escape and focus return. The expected disabled admin title field and explicit prepare-another-room flow remain intact.
