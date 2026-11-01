# Ел жады: Қазақстан, 1939–1953 — project specification

## Scope and current stage

Current work is Stage 2 on a review branch: Supabase Auth, profiles and waiting-room infrastructure are implemented for review; external setup and hosted acceptance remain pending. No Stage 2 merge/deployment is authorised.

A Kazakh-language university learning site about «Ұлы Отан соғысы және соғыстан кейінгі Қазақстан (1939–1953 жж.)». Stage one delivers the application shell, identity, navigation, layouts, editorial schemas and honest empty states. This is not a finished history resource. There are **zero verified historical entries**, no playable historical activities and no checked historical media. Planning titles are not factual assertions or completed theses.

Audience: laptop/HDMI classroom presentation and independent iPhone Safari / Android Chrome use. Public content stays static and free to visitors. Stage 2 adds optional Supabase Auth/PostgreSQL/Realtime for profiles and waiting rooms; it does not add gameplay or scores.

## Architecture

React 19 + TypeScript + Vite. `src/data/types.ts` defines sourced editorial entities and a five-way activity discriminated union. `src/data/content.ts` separates empty historical collections from editorial plans and navigation. UI lives in `src/App.tsx` and `src/components/`; styling in `src/styles.css`; URL validation, editorial validation and browser storage in `src/lib/`.

Hash navigation (`#/timeline`, etc.) keeps every request at the deployment root; refreshing a section never requests a server route. Unknown sections show a recovery link. Vite `base: './'` produces relative bundled assets for both domain-root and `/repository-name/` deployments. Fonts are bundled, including Kazakh Cyrillic characters. No external font/CDN requirement.

The existing GitHub Pages foundation URL supplied by the owner is `https://owen1night.github.io/el-zhady/`. Stage 2 remains a review branch, not deployed. Share/room QR URLs use `VITE_PUBLIC_SITE_URL` or that exact owner-provided URL, never the development origin. QR generation happens locally. The existing main-branch Pages workflow is retained and accepts only public backend configuration.

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

The 1939–1953 scope includes pre-1941 context, war and postwar themes. Distinguishing the Second World War from the Great Patriotic War is explicitly a research task; source-backed definitions and dates remain to be added. Ten thesis themes reserve three distinct fact entries each; facts must be distinct and independently sourced. At least 11 heroes plus 4 relevant postwar figures are planned, exceeding the overall minimum of 10 figures. No historical images, maps, video URLs or quotations are invented. The cover is an original typographic illustration labelled “not a historical document”.

Draft entities require an editorial note and may have empty source references. Verified entities require nonempty references and reviewer metadata. A reference contains a source ID and exact locator. Runtime checks reject missing references, unknown sources, unchecked cited sources and duplicate entity IDs. These checks validate structure, not historical truth. Human research and review are required. Future UI renderers must only show verified material as finished content; the current shell renders planning data only.

## Interaction and result plan

1. Quiz: select one answer, submit; explain correct answer and source.
2. Person–achievement matching: select person then achievement; no drag dependency.
3. Chronology: move items using up/down buttons; no drag dependency.
4. Map identification: clickable marker and equivalent keyboard-accessible text list.
5. Classification: category buttons for майдан / тыл / соғыстан кейін.

Future scoring: award 1 point per correct atomic item (quiz answer, pair, ordered position, map answer, classification item). Show earned/possible, correct answer, explanation and references after every activity. Combined result sums earned and possible across completed activities, explicitly labels incomplete work, and only calls a final result complete after all five activities finish. No grade thresholds or percentages are claimed now.

Stage 2 supersedes the original device-local result plan: permanent-account practice results belong in PostgreSQL for cross-device use, five slots worth 20 points each. The browser cannot write scores. Existing local preferences and visited-section history remain cosmetic and never count as achievement. Reset affects only those preferences, not Auth or database records. Game result submission, retakes and authoritative scoring remain future work.

## Design and devices

Warm ivory, charcoal, restrained red and muted brass. Noto Serif/Sans, archival labels, open spacing, respectful remembrance. No automatic audio. Short entrance animations respect reduced motion. Native modal dialogs provide focus containment, Escape and focus return. Visible keyboard focus, skip link, labelled navigation, semantic controls. Touch targets generally at least 44px. All essential actions use touch/mouse/keyboard; no hover-only or drag-only actions.

Presentation mode increases key text sizes and persists locally; it does not invoke fullscreen or promise to control HDMI output. Responsive maps and historical map animation remain planned. Media integration must use user-initiated playback, controls, inline video, captions/transcripts and mobile checks. Actual iOS/Android device testing remains necessary even after browser emulation.


## Stage 2 architecture and routes

Baseline: latest remote main `3dbcde5`, reviewed in branch `codex/stage-2-auth-lobbies`. No merge or deployment is authorised for this stage. Historical data and the museum identity remain intact.

New hash routes: `#/auth?next=...`, `#/profile`, `#/join?code=...`, `#/lobby?room=<uuid>`, `#/admin`. All 11 historical sections remain public. Planning descriptions of games may be read publicly; actual practice requires a permanent account and is not implemented yet. Live waiting rooms accept both registered users and genuine Supabase anonymous users. Guests do not depend on Google/email and do not get private profiles.

`src/backend/` separates public config validation, the Supabase client, typed DTOs, error/timeout rules and RPC calls. `src/auth/` verifies persisted sessions through Auth, uses redirect-based Google PKCE and whitelisted intended destinations, asks new accounts for a display name, and signs out locally. SDK refresh does not run inside its auth-state callback lock. Auth/request loads have 12-second bounds. Backend failures do not redirect public readers to login.

`src/features/` contains account/profile forms, guest entry, lobby subscription/polling, share QR and protected admin controls. The UI never substitutes local fake users/rooms/results. PGlite is a dev-only test tool. A future private practice snapshot is five capped scores and a separate competition history, never a guest result joined by a display-name match. No earned score is shown without a stored result; zero completed activities displays `— / 100`.

The initial migration creates five RLS-protected exposed tables (`profiles`, `rooms`, `room_participants`, `practice_results`, `competition_results`) and five RLS/default-deny private tables (admin grants, identity memberships, idempotency requests, join limits and future answer keys). Lobby projections contain display names/suffixes and relevant status/results only. Auth emails/UUIDs stay outside the public lobby tables. Policies permit own permanent profile/practice reads and room-scoped safe reads. Clients have no table-mutation or score-write grants.

Protected, fixed-search-path SQL functions save the caller's profile, validate joining, fetch an authorised lobby, update the caller's heartbeat and perform admin room actions. Admin authority comes from a private grant tied to a permanent Auth UID, not metadata. Room joins use per-user advisory locks, per-room row locks, a unique membership and quotas. Room creation reuses an admin-scoped request UUID saved before the network call. Display-name suffixes distinguish homonyms; guest membership kind is immutable and excluded from later permanent history even if the Auth identity changes.

Realtime publishes only safe room tables. Events trigger a fresh authorised read; 15-second visible-page polling and online/focus recovery supplement it. Heartbeat updates are server-throttled and labelled as recent activity, not proof of online presence. Admins can prepare, lock/unlock, remove and close rooms. Existing active membership may reconnect while joining is locked/full; closed rooms reject joins. No Start control or simulated multiplayer is present. Actual Supabase/Google/Realtime setup and hosted two-session verification are pending; see SECURITY.md and SUPABASE_SETUP.md.
