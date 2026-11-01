# Assessment requirements and current status

Status rule: **Complete** means the actual stage-one feature exists and was checked. **Partial** means only a foundation exists. **Pending** means the requested final content or function is absent. Historical content has not been marked verified or complete.

| Requirement | Planned section / implementation | Current status |
| --- | --- | --- |
| Title, topic and Kazakh interface | Басты бет; shared header/footer | Complete — shell copy and Kazakh font support |
| Whole 1939–1953 scope | Хронология; all thematic sections | Partial — three editorial period plans; sourced narrative pending |
| Distinguish Second World War / Great Patriotic War | Хронология | Partial — explicit distinction task; source-backed definitions pending |
| 10 clearly identifiable main theses | Деректер | Pending — 10 labelled planning slots, 0 completed theses |
| 30 distinct historical facts | Деректер and thematic sections | Pending — 0/30 verified; three distinct facts per thesis planned |
| At least 10 historical figures | Батырлар; Соғыстан кейін | Pending — 0 verified figures |
| More than 10 war heroes | Батырлар | Pending — at least 11 heroes plus at least 4 postwar figures planned |
| Reconstruction | Соғыстан кейін | Pending — research outline only |
| Academy of Sciences | Соғыстан кейін | Pending — research outline only |
| Literature and art | Соғыстан кейін | Pending — research outline only |
| Persecution of scholars | Соғыстан кейін | Pending — research outline only |
| 3 functioning relevant videos | Бейнебөлім | Pending — 0/3; clearly labelled empty slots, no broken player |
| Historical images with captions and credits | Thematic sections; Батырлар | Pending — schema and empty states only; cover is original design |
| Historical maps | Хронология; Майдан | Pending — explanatory placeholder only |
| Five genuinely different interactive activities | Ойындар | Pending — 5 plans and working planning dialogs; no playable activities |
| Quiz | Ойындар | Pending — typed questions and interaction plan |
| Person–achievement matching | Ойындар | Pending — two-selection plan, no drag requirement |
| Chronology ordering | Ойындар | Pending — up/down control plan |
| Map identification | Ойындар | Pending — markers and text-list alternative planned |
| Classification | Ойындар | Pending — three-category button plan |
| Result after every activity | Ойындар; Нәтиже | Pending — result schema and explanation plan only |
| Combined final result | Нәтиже | Pending — empty state; no fabricated score |
| Working navigation, links and shell buttons | All 11 sections; dialogs; share gating | Complete — checked in browser; activities excluded |
| Working game logic | Ойындар | Pending |
| Responsive desktop/mobile | Shared CSS and layouts | Complete for checked browser sizes including 360px; real-device check pending |
| Public published website | GitHub Pages | Existing foundation URL supplied by owner: https://owen1night.github.io/el-zhady/ ; Stage 2 is not deployed |
| Thoughtful animation | Hero illustration | Complete — subtle entrance motion and reduced-motion override |
| Animated historical map (desired) | Хронология | Pending — no invented geography |
| Typed content separated from UI | `src/data/types.ts`, `src/data/content.ts` | Complete — all requested entity types and source-reference support |
| Sourced factual entries and scored answers | Editorial schemas and runtime validator | Partial — guard exists; collections empty; no historical verification |
| Honest unfinished content states | All sections, videos, games, results | Complete — no historical claim or score marked finished |
| Static hosting under repository prefix | Vite relative base; hash routes | Complete — production assets and refreshed section checked under `/repository-name/` |
| No horizontal overflow at 360px | All pages and dialogs | Complete in Chromium emulation; real Safari/Chrome device check pending |
| Comfortable touch targets | Navigation, controls, buttons | Complete for shell controls checked in browser; future games/media pending |
| No essential hover-only/drag-only interaction | Shell; future game plans | Complete for shell; activity implementation pending |
| Readable text, visible focus, keyboard access | Fonts, focus CSS, dialog/skip link | Complete for shell checks; full manual accessibility audit pending |
| Touch mobile navigation | Native dialog with all sections | Complete in mobile emulation |
| Video controls and inline playback | Future media renderer | Pending — no videos integrated |
| Responsive maps/dialogs | Dialogs; planned map | Partial — dialogs checked; map not implemented |
| Large-screen presentation mode | Header monitor control | Complete — responsive text enlargement and persistence checked |
| Share/QR uses real deployment URL | Public share and host RoomShare | Owner-provided published URL configured as safe fallback; actual room QR scan pending hosted setup |
| Device-local progress and reset | Нәтиже; storage adapter | Partial — preferences/visited sections/reset work; actual game progress planned |
| Original stage-one static-only scope | Static public site + optional Supabase Stage 2 | Superseded for private profiles/rooms by Stage 2; public history still needs no account; no new hosting provider |
| PROJECT_SPEC.md | Repository root | Complete |
| REQUIREMENTS.md | Repository root | Complete |
| CONTENT_GUIDE.md | Repository root | Complete |
| README.md exact local/build/deployment steps | Repository root | Complete |

See `VERIFICATION.md` for the actual checks and limits. The final assessment is not complete merely because its layout or data type exists.


## Stage 2 requirements (review branch only)

**Implemented** below means code/migration exists, not that an external service has been configured. **SQL tested** means isolated PostgreSQL (PGlite) with a test Auth UID boundary, not hosted Supabase. Hosted verification remains pending wherever credentials/project setup are required. No historical-content completion is implied.

| Requirement | Implementation and evidence | Current status |
| --- | --- | --- |
| Latest main; preserve design/Pages | Branch from main `3dbcde5`; relative Vite base, hash routes, existing deploy workflow | Implemented; Stage 2 unmerged/undeployed |
| Public historical content/maps/videos | Original 11 routes without auth gates | Browser checked with backend absent; content itself still unfinished |
| Permanent accounts for practice | Account gate/message; private profile and practice RLS | Code + SQL tested; gameplay absent |
| Google primary; redirect/mobile flow | Supabase Google PKCE to `/el-zhady/` index; no popup | Unit callback tests; real OAuth pending |
| First profile name; reuse; edit | `save_profile` upsert by Auth UID; first-login form, profile read | SQL creation/reuse/privacy tested; hosted UI pending |
| Sign-out and finite auth failures | Local-scope sign-out, 12s bounds, retry/error messages | Timeout unit tested; live sign-out pending |
| No email/password signup UI | No email/password fields/buttons | Browser checked; remote provider disabling is setup work |
| Guest joins without Google/email | Genuine `signInAnonymously`, room code/name form | Implemented; hosted anonymous Auth pending |
| Signed-in join uses current identity | Existing verified session reused; no new anonymous call | Code reviewed; real Auth integration pending |
| Profiles: 5 × 20, total 100 | Private score slots, empty state, separate history | Schema/constraints tested; live private layout/scoring pending |
| No invented games/results | No Start control; no sample production inserts or scores | Implemented and unconfigured UI checked |
| Guest name snapshots, no permanent profile | Results snapshots and guest membership kind; no name matching | SQL tested, including identity-upgrade isolation; actual gameplay absent |
| RLS on exposed tables | All five exposed tables RLS + SELECT-only restricted grants | SQL tested |
| Own private profile/practice results | Permanent UID RLS; no email field | SQL tested with multiple identities |
| Room-scoped public data only | Safe lobby tables/RPC, private identity mapping | SQL outsider/member visibility tested |
| No email in lobby/ranking | No email/Auth UUID in safe tables/RPC projection | SQL payload checked; hosted network audit pending |
| Admin-only create/control/dashboard | Private SQL grant + permanent check + protected RPCs | SQL tested; real admin UI pending setup |
| No self-assigned admin | No profile role field; metadata ignored; private grants denied | SQL attacks tested |
| Anonymous != registered privileges | Explicit permanent checks in policies/functions | SQL tested, even with an accidental anonymous admin row |
| No frontend privileged credentials | Public-key config allowlist; server-side Google secrets | Unit tests reject service-role/secret keys; no credentials found |
| Server-authoritative scoring foundation | Browser score writes denied; no score/answer-key public RPC | SQL tested; scoring itself intentionally absent |
| Validation and abuse controls | Name/code rules, capacity, removed/closed/locked checks, UID quotas | Unit + SQL tested; hosted CAPTCHA/IP limits pending |
| Reject invalid/closed/locked rooms | Backend `join_room` validation | SQL tested |
| No duplicate join/room on retry | Membership unique key/locks; admin request idempotency | SQL retry tests; true multi-connection race test pending |
| Homonyms distinguished internally/visibly | Participant UUID and stable per-room numeric suffix | SQL tested; real two-client display pending |
| Refresh recovery | Persisted Auth session; lobby read restores membership, no rejoin on mount | SQL membership recovery + code-prefill browser refresh; hosted Auth refresh pending |
| Guest recovery limitations explained | Join page warns about clearing data/device changes | Browser checked |
| Working waiting lobby | Code/list/recent activity/wait state, safe reads, Realtime + poll | Implemented; two hosted clients cannot run without project |
| Prepare rooms in advance | Admin create/list; actual room join URL/QR | SQL creation tested; host UI/QR scan pending |
| Lock/unlock/remove/close | Backend-checked idempotent actions, close/remove confirmations | SQL tested; hosted UI pending |
| No fake Start or simulated multiplayer | Waiting-only text | Code/UI checked; gameplay absent |
| Understandable failed requests + Retry | Error mapping, time bounds, retry controls | Unit + failure-browser checks; full provider scenarios pending |
| Google failure leaves guest route open | Independent join route, callback errors stripped, no provider dependence | Error-route browser check; genuine cancelled consent pending |
| Unconfigured/unreachable service keeps public site | No backend needed for public routes; explicit service notices | Browser checked for absent config; request-failure checks recorded in VERIFICATION.md |
| Versioned migrations | `20261101000100_stage2_foundation.sql` | Executed in isolated PostgreSQL; not applied remotely |
| Desktop/mobile layouts | 1440px/360px emulation, public/account unavailable screens | Browser tested; physical iPhone/Android and live private screens pending |
| Two-session lobby updates | Real Supabase Auth and Realtime required | Blocked by missing project/config; no simulated success claimed |
| Setup/admin/security documentation | SUPABASE_SETUP.md, SECURITY.md and updated existing docs | Created |
| Commit, push, PR; no merge/deploy | `codex/stage-2-auth-lobbies` | Complete — pushed, draft PR #2 opened; Stage 2 stays unmerged/undeployed |
