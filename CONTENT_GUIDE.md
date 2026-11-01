# Adding sourced historical content

The current historical arrays in `src/data/content.ts` are intentionally empty. Section descriptions, thesis themes and activity plans are editorial placeholders, not finished research. Never replace a blank with a guessed fact, quotation, statistic, URL or image provenance.

## Editorial workflow

1. Locate a real primary source or scholarly publication. Read the relevant pages. Record exact bibliographic details in `sources`; do not invent missing fields. Keep candidates marked `candidate`.
2. Draft a short Kazakh entry in the relevant typed collection. Use a stable unique ID, `status: 'draft'`, an honest `editorialNote` and `sourceRefs`. Empty references are allowed only while drafting. Resolve differences between sources openly.
3. A human reviewer checks the claim against the exact pages, archive IDs or timestamps, checks translation and terminology, then marks the source `checked`. Source quality and historical truth are not established by a passing build.
4. Only after review: set the entry to `verified`, add `reviewedBy`, `reviewedOn` (ISO date), and a nonempty reference list. Delete `editorialNote` when changing to the verified variant. Every source ID must resolve to a checked source and every locator must be precise.
5. Run `npm run check`, `npm test`, `npm run build`. Implement the relevant content renderer before expecting new entries to appear: this first-stage UI deliberately renders plans and empty states, not researched content. Replace corresponding empty-state copy, render source links, test it, and then update REQUIREMENTS.md counts/status.

Do not fabricate reviewer names. Use actual review dates. A source being listed is not proof that every claim citing it is valid. Keep the whole 1939–1953 scope and distinguish the Second World War from the Great Patriotic War using sourced definitions. Avoid triumphalist treatment of suffering, persecution and loss.

## Schemas

All schemas are in `src/data/types.ts`. `Sourced<T>` adds the discriminated editorial state. `SourceReference` is `{ sourceId, locator }`; locator can be a page/range, catalogue reference, passage or video timestamp. Every factual entity and scored answer supports these references.

| Entity | Essential fields / rules |
| --- | --- |
| Thesis | `id`, `title`, `text`, `factIds`, editorial state. Ten distinct arguments, not ten headings. Each should connect to three distinct facts. |
| HistoricalFact | `id`, `title`, `text`, `period`, `figureIds`, editorial state. Thirty distinct facts; repetitions do not increase the count. |
| HistoricalFigure | `id`, `name`, `role: hero/postwar`, `biography`, optional `imageId`, editorial state. At least eleven war heroes and additional relevant postwar figures. |
| TimelineEvent | `id`, `date`, `title`, `description`, `period`, editorial state. Record uncertainty honestly; no invented precision. |
| Source | `id`, `title`, `author`, `publisher`, `publicationDate`, optional actual `url` / `accessedOn`, `status: candidate/checked`, `notes`. A print source need not have a URL. |
| HistoricalImage | `id`, deployment-safe `src`, meaningful `alt`, `caption`, `creator`, `collection`, `catalogueId`, `license`, `credit`, editorial state. Unknown provenance is a reason to hold the image in draft. |
| MapLocation | `id`, `name`, `latitude`, `longitude`, `description`, `eventIds`, `period`, editorial state. Source coordinates and period boundaries; an illustrative map must be labelled as such. |
| Video | `id`, `title`, actual `url`, `provider: file/youtube`, `creator`, `duration`, optional `captionUrl`, `transcript`, optional `checkedOn`, editorial state. Validate playback rather than only URL syntax. |
| Answer | `id`, `text`, `explanation`, editorial state. Every scored answer requires reviewed supporting evidence. |
| ActivityQuestion | Common sourced `id`, `prompt`, `explanation`; `type` chooses one of five payloads below. |

Activity variants:

- `quiz`: nonempty `answers`, `correctAnswerId` matching one option.
- `matching`: nonempty `pairs`, each containing a real `figureId` and sourced `answer`.
- `ordering`: nonempty `events` (sourced answer-like entries), nonempty `correctOrder` containing exactly those IDs once.
- `map`: nonempty sourced `locations`, `correctLocationId` matching one location.
- `classification`: nonempty `items`, each with sourced `answer` and `category: front/homefront/postwar`.

The current structural validator recursively checks source references, editorial metadata and IDs. Future game implementation must additionally validate correct-answer membership, ordering permutations, nested verification, figure/event links and positive score denominators. The type system and current validator alone do not implement these game rules. Only verified questions AND verified nested answers may be scored.

A draft skeleton may use descriptive placeholders such as `id: 'fact-draft-01'`, `title: '[Тақырып қосылады]'`, `text: '[Дерекке негізделген мәтін қосылады]'`, `status: 'draft'`, `sourceRefs: []`, `editorialNote: 'Source and text pending research'`. Do not label this as a finished fact in the UI or completion checklist.

## Images, maps and asset paths

Use local files with documented reuse rights. Prefer importing assets from `src/assets/` so Vite fingerprints and rewrites their paths. For files in `public/`, prefix paths with `import.meta.env.BASE_URL`; never hardcode `/assets/...` or `/images/...`. Do not hotlink an untested image. Provide captions, credits and alt text. A missing asset must render an honest text fallback, not a broken `<img>`. Decorative artwork should be labelled and never counted as a historical image. Do not present the stage-one cover as an archive artifact.

A future historical map needs a sourced base map, period-specific boundaries if shown, source-backed locations, responsive viewBox, accessible labels and a text list equivalent to its markers. Motion must explain a sourced change. Offer pause/step controls and a static reduced-motion version. Do not require dragging, zoom gestures or hover to answer a map question.

## Videos

Add only checked topic-related videos. Record rights/provider, actual duration, transcript and caption availability. Check playback on iPhone Safari and Android Chrome, including fullscreen and inline controls. Self-hosted video: use `controls playsInline preload="metadata"`, captions and no autoplay. YouTube: use a real checked privacy-enhanced embed, descriptive frame title, appropriate permissions, responsive aspect ratio, accessible transcript and a direct link fallback. A decorative preview does not satisfy the three-video requirement. Record check date; external videos may disappear or block embedding.

## Games, results and device-local progress

Implement one activity at a time using native buttons/form controls. Provide a result with explanation and source after each activity. Match by two taps/selections; order with up/down buttons; map with marker OR text list; classify with category buttons. Announce result changes without moving focus unexpectedly. Test keyboard, mouse and touch.

Use `ActivityResult` with content version, earned/possible score and completion date. Persist only validated results in a separate versioned app key; tolerate unavailable storage, support reset, avoid personal data. Sum earned/possible for the combined result and show incomplete activity status. A visited section never counts as a completed task. Current browser storage only holds preferences and visited sections under `el-zhady:foundation:v1`.

## Publication checklist

Source/reviewer metadata present; no placeholder counted as content; all required quantities independently checked; media and links work; five complete and different game loops; results and reset verified; mobile/keyboard/reduced-motion checks; no overflow at 360px; actual Pages URL checked before configuring share/QR. Update REQUIREMENTS.md from evidence, never from intent.


## Stage 2 amendment: public history, private answer keys

Historical texts, images, maps and videos remain public. Their research/verification status has not changed. Do not gate public history behind an account.

The original frontend `ActivityQuestion`/`Answer` types are authoring placeholders, not permission to distribute correct answers. Do not populate and ship answer keys in browser imports or publicly readable database tables. A later server-authoritative scorer must keep correct-answer material and supporting references in a private backend schema (reserved `el_zhady_private.answer_keys`) and expose only an appropriate question projection and reviewed post-answer explanations. Clients cannot submit scores; all score writes belong to protected server logic. Historical source requirements still apply to every scored explanation.

Practice now requires a permanent account and stores authoritative results in PostgreSQL for cross-device access. The original future device-local game-result plan is superseded. Cosmetic visited-section preferences are not progress. Competition results are separate name/participant-ID snapshots: guests have no permanent profile and matching names must never be used to attach results to accounts. Stage 3 adds only the separate server-authoritative live quiz described below; independent practice remains unfinished.


## Stage 3 live question publication

The live authored schema is private SQL, separate from public `ActivityQuestion` placeholders. `live_quiz_sets` holds immutable version/title/published/checked date; each `live_quiz_questions` row has UUID, version, ordinal1–10, Kazakh prompt, four options `{id,text}`, matching `correct_option_id`, short explanation and nonempty `source_refs` objects `{title,url,locator,publisher,checked_on}`. Actual source openings, claim choices and limits are recorded in LIVE_QUIZ_CONTENT.md. The SQL suite checks ten playable questions and runtime option/key membership; a build check ensures the private marker/IDs/all ten prompts are absent from shipped JS. Source opening establishes the stated checked passages, not peer review of every article claim.

Do not put this seed in `src/`, `public/`, frontend imports or public read policies. Create a new version with new stable question/option IDs for future substantive edits; never mutate a published version used by starts. Start copies a private frozen snapshot. Only the current prompt and shuffled full-text options are projected before a deadline; keys/explanations/sources follow in reveal. Public narrative source collections remain unfinished, and no ten-thesis/thirty-fact completion is claimed from the quiz.

Correct raw live score is 1000+0..100 server speed; wrong/unanswered0; rank correct count then speed. It is **not** practice /100. Private schema/API access does not hide source SQL in a public GitHub repository. Never claim cheat-proof testing; for higher-stakes assessment use a separately reviewed private authoring/publication process.
