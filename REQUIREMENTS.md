# Requirements and evidence

2026-11-01: Stage 2 is deployed; the owner reports successful Google/profile/admin/registered join and physical-iPhone guest QR/locked-room tests. Stage 3 is implemented on `codex/stage-3-live-quiz`, **not merged or deployed**. “Local checked” means code/SQL/browser evidence in STAGE3_VERIFICATION.md, not hosted service or physical-device certification. A plan/layout is not completed historical content.

## Assessment scope

| Requirement | Section / implementation | Current status |
| --- | --- | --- |
| Title/topic/Kazakh characters | Shared shell, bundled Noto fonts | Implemented; browser checked |
| Whole 1939–1953 scope | Timeline/front/rear/postwar outlines; live quiz | Partial — ten sourced quiz items span scope; narrative still pending |
| WWII / Great Patriotic War distinction | Live questions 1–2; planned timeline | Quiz dates sourced/SQL tested; narrative pending |
| 10 identifiable main theses | Деректер | Pending — ten planning slots, zero completed theses |
| 30 distinct historical facts | Деректер/thematic sections | Pending — zero public fact entities; quiz items are not silently counted as thirty facts |
| ≥10 historical figures | Батырлар / Соғыстан кейін | Pending — public figure collection empty |
| ≥11 war heroes + postwar figures | Батырлар / Соғыстан кейін | Pending — ≥11 heroes + ≥4 postwar figures planned; quiz mentions do not complete biographies |
| Reconstruction | Соғыстан кейін / quiz 7 | Sourced quiz item; narrative pending |
| Academy of Sciences | Соғыстан кейін / quiz 8 | Sourced quiz item; narrative pending |
| Literature/art | Соғыстан кейін / quiz 9 | Sourced literature item; narrative/art pending |
| Persecution of scholars | Соғыстан кейін / quiz 10 | Sourced item; narrative pending |
| Three functioning videos | Бейнебөлім | Pending — 0/3; no broken players represented as content |
| Historical images with captions/credits | Thematic sections | Pending — schemas/empty states; original cover is not an archival image |
| Historical maps | Timeline/front | Pending — placeholder only |
| Five different activity types | Ойындар / live room | Partial — one live MC quiz local checked; four other types and independent practice unfinished |
| Quiz | `#/lobby?room=…` | Implemented live competition, local checked; hosted migration/Cron/device acceptance pending |
| Person–achievement matching | Ойындар | Pending — plan only; no drag-only design |
| Chronology ordering | Ойындар | Pending — up/down plan only |
| Map identification | Ойындар | Pending — marker/text alternative planned |
| Classification | Ойындар | Pending — category-button plan only |
| Result after each activity | Live reveal/final; future four games | Partial — live per-question/result logic checked; others absent |
| Combined final result | Нәтиже / profile | Practice /100 pending; separate live raw totals/ranks implemented and local checked |
| Working navigation/links/buttons/game logic | Shell + live quiz | Shell and live flow local browser/SQL checked; unfinished activities labelled |
| Responsive desktop/mobile | Shared CSS, quiz | 1920px + 360px Chromium checked; Stage 3 physical Safari/Android pending |
| Public published website | GitHub Pages | Stage 2 existing URL; Stage 3 **not** published |
| Thoughtful animation | Cover/countdown/feedback/ranking/podium | Implemented; reduced-motion checked; no audio/flashing |
| Animated historical map | Timeline | Pending |
| Typed data separated from UI | `src/data/`, live DTOs, private versioned SQL | Implemented; type/build checked |
| Sources for factual/scored content | Public source schema; private quiz references | Ten quiz items actually researched; no invented narrative/media references |
| Honest empty states | Public collections, practice/four games | Preserved; no sample production scores |
| Repository-prefix static hosting | Vite relative base + hashes | Preserved; callbacks tested under `/el-zhady/`; Stage 3 build checked |
| No 360px overflow | Shell / quiz / history | Chromium local checks passed for tested states; not physical-device proof |
| ≥44px touch targets, no essential hover/drag | Navigation/forms/options/dialogs | Native controls/options local checked; future map/media pending |
| Readable text / visible keyboard focus | Typography/focus/quiz/status | Keyboard submission/dialog checked; full assistive-technology audit pending |
| Working mobile navigation | Native modal menu + hash guard | Existing shell retained; live leave confirmation checked |
| Controls/inline videos | Future video renderer | Pending — no actual media |
| Responsive maps/dialogs | Native dialogs; map plan | Dialogs checked; map absent |
| Large-screen mode | Header monitor + host quiz | Enlarged CSS retained; host layout checked in Chromium; physical HDMI pending |
| Public share / room QR | RoomShare / configured site URL | URL/QR local checked; Stage 2 physical QR owner-reported; Stage 3 scan acceptance pending |
| Local preferences/reset | Нәтиже | Implemented; reset does not erase server results/Auth |
| Cross-device practice persistence | Supabase permanent-account tables | Foundation only; no practice game scores invented |
| Four required documentation files | Root Markdown files | Updated |

## Preserved Stage 2 foundation

| Requirement | Evidence / current state |
| --- | --- |
| Public history accessible without account | Public routes ungated, independent of Supabase; content still unfinished |
| Permanent practice accounts; Google primary; no email signup | Existing PKCE/account/profile flows retained; owner reports login/refresh/logout/login success |
| Correct repository callback + destination | Existing `/el-zhady/?code=…` flow and whitelist tests retained |
| Display name creation/reuse/edit/sign-out/finite errors | Existing implementation and isolated SQL tests; owner reports profile persistence |
| Five practice slots ×20 and separate competition history | Preserved; live history now labels raw points/correct count/speed/rank; practice unchanged |
| Guest without Google/email | Genuine anonymous Auth integration retained; owner reports physical-iPhone entry; browser integration uses explicit Auth fixtures |
| Duplicate joins / homonyms / refresh | Unique UID membership + suffix/locks; SQL/browser checks; no name-based result linking |
| RLS / privacy / registered vs anonymous | Stage 2 tests retained; new live permissions checked on real PostgreSQL |
| No self-admin or frontend secrets | Private permanent admin grant; metadata ignored; public-key allowlist; tests retained |
| Protected create/lock/unlock/remove/close | Preserved before start; running game uses confirmed cancellation instead of silent close/unlock |
| UID join quotas/capacity/CAPTCHA | Existing validation retained; hosted CAPTCHA working is owner-reported setup, not independently tested here |
| Realtime + polling/recent activity | Safe tables only; 15s lobby polling, 25s heartbeat retained; real hosted WebSocket acceptance not repeated |
| Public URL/code/QR and advance room preparation | Existing flows retained; owner reports admin/QR/locked rejection working |
| Versioned migration/manual application | Initial SQL unchanged and not rerun remotely; reported one-time application recorded |
| Unconfigured/unreachable backend | Public shell works; bounded errors/retry; no local persistence mock |

## Stage 3 requirements

| Requirement | Implementation / actual evidence | Remaining |
| --- | --- | --- |
| Select quiz; genuine enabled Start with ≥1 other participant | Admin lobby setup, exact configured version, host exclusion; SQL/browser checked | Hosted setup/acceptance |
| Atomic roster/version freeze; lock joining | Room/session locks, private snapshots; concurrent-start/author-edit/new-entry tests | Hosted acceptance |
| 3s + 10×(15s+5s), automatic completion | Persisted start/phase; owner Cron tick + RPC repair; SQL boundary/browser flow checked | Real one-second Supabase Cron execution |
| Host independent/readable; phones full text | Host cannot answer merely by hosting; active stage scrolled into view; host tab closed/reopened in browser test | Physical HDMI/iPhone/Android |
| Identity/membership/question/option/deadline checks | Protected submission RPC; real SQL invalid/late/removed/outsider tests | Hosted JWT/PostgREST boundary |
| Exactly one answer + stable retry ack | Primary key + locks + original-ack return; first-submission races/late retry tests | Hosted latency exercise |
| Score only server: 1000 +0..100 speed | Receipt-time calculation; raw writes/extra-score calls rejected | Network/queue delay remains a fairness limitation |
| Correct count first, then speed; shared exact ranks/all tied third | SQL `rank()`; 1/2/3/3 test; podium renders every eligible rank≤3 | Hosted visual tie acceptance |
| No future questions/keys/others' answers before reveal | Private schema/revoked grants, current/reveal projections, masked board/admin review; SQL/bundle tests | Public repo seed is reviewable; not cheat-proof |
| Stable per-person shuffled options | Server permutation by participant/question/stable option IDs; SQL checked | None locally |
| Immediate save/refresh/reconnect/no host tab | SQL persisted answers + one-second state fetch, saved-answer transport-failure/browser refresh test | Actual mobile suspend/network conditions |
| Finalize once + snapshots + registered history | Serialized completion/unique result keys; concurrent finalization + guest-upgrade/no-name-link tests | Hosted acceptance |
| Admin per-question results | Reveal-gated report, answered/unanswered detail; SQL/browser checked | Hosted acceptance |
| Removed access stays revoked | Membership/RLS check on reads/submits; existing results retained; SQL checked | Hosted event timing |
| Confirmed cancellation excluded from completed ranks/history | Cancel RPC + dialog, no final rows for cancelled; SQL/browser checked | Hosted acceptance |
| Correct Kazakh leave warning; saved points/no timer reset | Hash guard + optional unload warning; browser stay/leave/return checked | Mobile unload warning is browser-dependent |
| Ten verified concise Kazakh questions/explanations/sources | Backend-only content version; actually opened sources in LIVE_QUIZ_CONTENT.md | Teacher review recommended; no full-assessment claim |
| Museum style, staged podium, reduced motion, no audio | CSS/native controls; visual/touch/keyboard/reduced-motion checks | Physical/assistive-technology audit |
| New migration(s); old immutable | Two new SQL files + separate owner Cron script; old SHA unchanged | Owner applies ONLY new files once |
| Build/type/security/multi-client tests | Local checks/build + real PostgreSQL suite + three Chromium contexts passed | Hosted/physical tests explicitly not run |
| New branch/push/PR; no merge/deploy | `codex/stage-3-live-quiz`; PR delivery in final response | Later separate release approval |

No content or function is marked complete from a plan alone. See STAGE3_VERIFICATION.md and STAGE3_SETUP.md for reproducible evidence and exact external tasks.
