# Mixed competition scoring — review policy

Each enabled game has **10 scored tasks, max 11,000 points per round**. A quiz selects one of four options (15 seconds); a map selects one of four locations using a marker or equivalent list (25 seconds); a timeline orders four distinct events with up/down buttons and confirms once (40 seconds). Each has the same five-second reveal and three-second round countdown. Exact full timeline order is required; there is no undisclosed partial-credit rule.

Correct: `1000 + floor(100 × remaining_seconds / configured_seconds)`, clamped to 0–100 speed points. Wrong/unanswered: zero accuracy and speed. Receipt time after server serialization decides acceptance and speed; browser clocks and client scores are never trusted. Comparing the fraction of the available window gives the same 50-point speed bonus at halfway in all three kinds. Different task difficulty is addressed with longer map/ordering windows; equal maxima do not claim psychometric equivalence.

Aggregate **correct task counts first, normalized speed sums second** across all rounds, equal weights per round. Displayed raw points remain `1000 × correct + speed`; rank is explicitly lexicographic, not a sort of raw points. An extra correct answer always beats speed. Exact ties share competition rank (1,1,3). Max three rounds: 30 correct, 3,000 speed, 33,000 raw points. This stays separate from private practice /100. Existing earned scores/ranks/history are not rewritten or rescaled.

The host still starts every round and publishes final results explicitly. Players see no intermediate table, no final standings before publication, then only top-three places (including ties) plus their own result. The host sees the full table.

## Early timeout

`end_live_question(room, session, question)` is admin-only and names an immutable question target. It follows room → competition → session locking, rechecks server phase/deadline, persists the exact remaining time discarded on that snapshot, and invokes normal phase synchronization. Existing accepted answers/speed remain unchanged; unanswered players get normal zero scores. Submissions close immediately on commit and clients observe the normal five-second reveal through their next update. No networked UI can promise simultaneous zero-latency rendering.

Saved cut times shorten only that question. The next opens after the reveal and gets its full configured duration (standard quiz: 15 seconds). Natural expiry, double-clicks, timed-out retries, old session/question IDs and concurrent Cron/submissions cannot cut a later question or double-score an answer. A stale valid target returns `closed:false`, not “close whichever is current.” Buttons disappear outside the accepting phase or while the local server-derived timer is zero/unavailable.

## Uniqueness and capacity

Before first start, **every round** gets ten stored snapshots in the same locked transaction. The private room reservation primary key is `(room_id, content_key)`; content keys normalize case/outer and repeated whitespace, so copying identical prompts to new question IDs/bank versions cannot bypass uniqueness. Different authored challenges may teach the same sourced event; this is question uniqueness, not a ban on revisiting a historical topic in different activities.

Reservations survive refresh, start retries and later round starts. Questions can be reused in another room. Configuration checks per-kind distinct capacity; start also performs the entire real draw, so overlap across bank versions fails closed with a clear capacity error and rolls back **all** reservations/roster/locks. There is no repeat-filling fallback. The new immutable bank contains 30 quiz + 10 map + 10 timeline tasks. Supported lineups: one to three ordered rounds, at most one map and one timeline; three quiz rounds are supported. UI suggests quiz → map → timeline and permits custom supported order. Older 10/20-item banks cannot support three unique quiz rounds and are rejected accordingly.
