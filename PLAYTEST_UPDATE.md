# Playtest update — draft slices, production unchanged

Baseline: PR #4 merge `e60d7d483ad6e4f518c81329527e3382170b02e2`.

## Slice 1: navigation, identities and first learning materials

Branch `codex/learning-and-player-labels`. No migration, Cron or deployment change. Existing host starts, between-round waiting and private host-controlled final reveal are preserved.

- Desktop and touch menu: «Ойынға қосылу» → existing `#/join` room-code flow.
- UUID identity tags explicitly say ID and cannot represent join order or earned place. Full IDs prevent truncation collisions even for identical names. Server ranks are labelled «2-орын»; no `#1` suffix remains in player result/lobby/history/podium rendering.
- 12 concise original Kazakh readings, 12 dated events, 2 war figures and 2 postwar figures. All are `sourced`, not academically verified. War contexts, rear care/evacuation, film, recovery, Academy, books, persecution, Semey and 1953 are covered. Thesis/fact/hero totals and videos remain incomplete.
- Sources actually opened 2026-11-03: USHMM key dates; e-history.kz /50000239, /8822, /8825; Academy official history; CSDF museum /418; CTBTO nuclear-tests day; Commons Mәметова stamp description/rights. Previously cited government pages could not be reopened; no new reading depends on them. The old SCORM /431 URL currently shows later material, so the new recovery reading cites /8822 instead.
- The credited 1995 stamp is linked as a later commemorative artifact; it is not shown as a wartime photograph. No copied NMS/ABMC media or invented archive scan is used.
- Visual reference: [ABMC WWII timeline](https://www.abmc.gov/interactives/WW2/index.html) (year/area/legend/credits structure opened; live JS canvas not visually inspected) and [NMS Maps exhibition](https://www.nms.ac.uk/past-exhibitions/maps-memories-from-the-second-world-war) (map/personal-story context opened). Original restrained date stamps, grid and captions suit the existing ivory/charcoal/red/brass design.

## Preview

Checkout this branch, `npm ci`, `npm run build`, `npm run preview -- --port 4173`. Open the URL printed by Vite on the same computer; this is not a public cloud preview. Public Pages remains production and does not preview PRs. No additional hosting provider is introduced.

## Checks

Run `npm run check`, `npm test`, `npm run build`, and `node --import tsx scripts/testing/learning-browser.ts`. Actual run outcomes are recorded in the PR. Chromium 360px touch emulation and 1920px desktop are not physical iPhone Safari or Android tests. External source-link inspection does not establish physical gameplay acceptance.

## Following slice

Room-wide persisted draws/capacity validation; map and timeline live games with common-scale scoring; target-specific admin early timeout; mobile/projector interaction and privacy/reconnection tests. Requires separate reviewed additive SQL. Do not apply any SQL from a draft or rerun applied migrations/Cron.
