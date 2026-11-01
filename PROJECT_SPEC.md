# Ел жады: Қазақстан, 1939–1953 — project specification

## Scope and current stage

A Kazakh-language university learning site about «Ұлы Отан соғысы және соғыстан кейінгі Қазақстан (1939–1953 жж.)». Stage one delivers the application shell, identity, navigation, layouts, editorial schemas and honest empty states. This is not a finished history resource. There are **zero verified historical entries**, no playable historical activities and no checked historical media. Planning titles are not factual assertions or completed theses.

Audience: laptop/HDMI classroom presentation and independent iPhone Safari / Android Chrome use. Static, free to visitors, without accounts, backend or multiplayer.

## Architecture

React 19 + TypeScript + Vite. `src/data/types.ts` defines sourced editorial entities and a five-way activity discriminated union. `src/data/content.ts` separates empty historical collections from editorial plans and navigation. UI lives in `src/App.tsx` and `src/components/`; styling in `src/styles.css`; URL validation, editorial validation and browser storage in `src/lib/`.

Hash navigation (`#/timeline`, etc.) keeps every request at the deployment root; refreshing a section never requests a server route. Unknown sections show a recovery link. Vite `base: './'` produces relative bundled assets for both domain-root and `/repository-name/` deployments. Fonts are bundled, including Kazakh Cyrillic characters. No external font/CDN requirement.

GitHub Pages is the intended host. A Pages Actions workflow is prepared; no publication is claimed. Share URL comes exclusively from explicit `VITE_PUBLIC_SITE_URL`. It stays blank until a real public deployment is checked, then the site must be rebuilt with that URL. QR generation happens locally. No localhost fallback.

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

Future progress schema: versioned device-local activity results keyed by activity ID and content version; never count a visit as completion. Validate persisted values, invalidate stale versions, tolerate blocked/full storage, support reset and retakes. Current storage contains only presentation preference and visited sections; the UI explicitly says these are not achievement results. Reset confirms before clearing this app's own key.

## Design and devices

Warm ivory, charcoal, restrained red and muted brass. Noto Serif/Sans, archival labels, open spacing, respectful remembrance. No automatic audio. Short entrance animations respect reduced motion. Native modal dialogs provide focus containment, Escape and focus return. Visible keyboard focus, skip link, labelled navigation, semantic controls. Touch targets generally at least 44px. All essential actions use touch/mouse/keyboard; no hover-only or drag-only actions.

Presentation mode increases key text sizes and persists locally; it does not invoke fullscreen or promise to control HDMI output. Responsive maps and historical map animation remain planned. Media integration must use user-initiated playback, controls, inline video, captions/transcripts and mobile checks. Actual iOS/Android device testing remains necessary even after browser emulation.
