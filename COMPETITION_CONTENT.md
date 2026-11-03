# Private 20-question bank and draw evidence

Version `kz-1939-1953-bank-v2`, migration `20261103000200_question_bank_v2.sql`. Ten Stage 3 questions are copied into new immutable bank rows with their original explanations/source references and original check dates; see LIVE_QUIZ_CONTENT.md for their research record. Ten additional questions were checked against pages actually opened through the web connector on **2026-11-03**. No old migration is edited. This bank is separate from the still-unfinished public narrative/thesis/fact/media collections.

| New item | Claim checked | Actually opened source / passage |
| --- | --- | --- |
| 11 | WWII starts 1 September 1939 | [USHMM, World War II Dates and Timeline](https://encyclopedia.ushmm.org/content/en/article/world-war-ii-key-dates), September 1, 1939 timeline entry and FAQ |
| 12 | European war ends May 1945, distinct from global September end | Same USHMM source, FAQ on European/Pacific end |
| 13 | German invasion of USSR begins 22 June 1941 | Same USHMM source, June 22, 1941–November 1941 timeline entry |
| 14 | Kazakh SSR Academy founded 1 June 1946 | [Academy's official history](https://qazscience.gov.kz/category/history-of-nas-rk), 1946 section's explicit founding date (not the separate 31 May heading) |
| 15 | Moscow counteroffensive in December 1941 (year question) | USHMM source, December 6, 1941 timeline entry |
| 16 | Bekmakhanov monograph published 1947 | [e-history.kz, Қоғамдық-саяси және мәдени өмірдегі өзгерістер](https://e-history.kz/kz/amp/history-of-kazakhstan/show/8825), paragraph naming the 1947 monograph |
| 17 | Collective Kazakh SSR history published 1943 | Same e-history article, wartime historians/1943 publication paragraph |
| 18 | Stalin died 1953; repression did not instantly become full freedom | Same e-history article, 1953 discussion and limits of subsequent change |
| 19 | 1946 Zvezda/Leningrad decree illustrates ideological control | Same article, paragraph on the 14 August 1946 decree; no quotation reproduced |
| 20 | 1947 monograph studies nineteenth-century 1820s–1840s | Same article, exact title «Қазақстан XIX ғасырдың 20–40 жылдарында»; publication date is distinguished from studied period |

These are concise original Kazakh paraphrases of checked claims. Opening a source is not a scholarly peer review of its whole article. The Moscow item asks only the year, avoiding differing December5/6 start-day conventions. No disputed precise Bekmakhanov sentencing day, invented quote/statistic/image or unchecked new media is introduced. One older government link was unavailable on this later web attempt; no new claim relies on that page, and the retained Stage 3 citation keeps its earlier check date rather than claiming a fresh check.

The private reusable `draw_quiz_round` helper samples ten distinct bank rows, independently shuffles their order, and writes them into that session's private snapshot once inside start's locked transaction. Repeated/concurrent start returns the same session/start without redrawing. All participants read the same ordinal/question ID, with per-person option shuffling. Future questions/keys stay in private tables and never enter frontend imports. The build guard checks all twenty prompt literals, both seed markers and both UUID prefixes against built JS.

New rounds can overlap previous rounds; no claim of non-overlap between sessions is made. This is not a cryptographic anti-cheating system. The public repository's reviewed SQL can be inspected; private API access and option shuffling do not make its authored answers secret from determined readers.
