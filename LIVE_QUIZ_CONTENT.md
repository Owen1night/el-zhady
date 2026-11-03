# Live quiz content v1 — backend only

Version `kz-1939-1953-v1`, ten Kazakh multiple-choice questions. Correct options, explanations and exact source records are in `supabase/migrations/20261101000300_live_quiz_content_v1.sql`, in the private schema only. No question/answer seed is imported by the frontend. The UI receives the current question from an authorised RPC, and answer-bearing explanation/source data only after its deadline. These ten quiz items do not complete the separate ten-thesis/thirty-fact assessment or the four other activities.

Sources below were actually opened through the web connector on 2026-11-01, with the relevant passages inspected. Questions/explanations are concise original paraphrases, not copied articles. No fabricated quotations, statistics or reviewer identities are used.

| Items | Opened source | Passage checked |
| --- | --- | --- |
| 1–2, war periods | [US Holocaust Memorial Museum, World War II Dates and Timeline](https://encyclopedia.ushmm.org/content/en/article/world-war-ii-key-dates) | FAQ: 1939–1945; beginning 1 September 1939; European victory in May and Pacific end 2 September 1945 |
| 2, Great Patriotic War | [ШҚО мәдениет басқармасы / Пушкин кітапханасы](https://www.gov.kz/memleket/entities/vko-cultura-arhiv/press/news/details/219432) | Title and introduction explicitly use Ұлы Отан соғысы, 1941–1945 |
| 3, front formation | [Қазақстан ІІМ Ұлттық ұланы](https://www.gov.kz/org/kvv/press/news/details/230718) | 316th rifle division and commander Ivan Panfilov; July–August 1941 formation |
| 4, Mәншүк | [e-history.kz, Мәншүк Мәметова](https://e-history.kz/kz/prominent-figures/show/12507) | Machine-gunner role; cross-checked against the next source. Unrelated dates/statistics on the page are not used. |
| 5–6, Әлия/rear work | [e-history.kz, Батыс қазақстандықтардың Ұлы Жеңіске қосқан үлесі](https://e-history.kz/kz/amp/news/show/50000239) | Әлия as sniper; food/clothing sent to the front and rear industry. No casualty/production totals are taken from this article. |
| 7, recovery | [e-history.kz, SCORM оқу материалы](https://e-history.kz/media/scorm/431/text/text.htm) | «Хронология», March 1946 law on the 1946–1950 postwar recovery/development plan |
| 8, academy | [Ұлттық ғылым академиясы, ҚР ҰҒА тарихы](https://qazscience.gov.kz/category/history-of-nas-rk) | Establishment 1 June 1946 and first president Қаныш Сәтбаев |
| 9, literature | [Ғылым және жоғары білім министрлігі](https://www.gov.kz/org/sci/press/news/details/1271394?lang=ru) | Auezov authorship and 1942 early edition in a university rare-book collection. The quiz does not say the whole epic was completed before 1953; the ministry uses the later collective title retrospectively. |
| 10, repression | [e-history.kz, Қоғамдық-саяси және мәдени өмірдегі өзгерістер](https://e-history.kz/kz/amp/history-of-kazakhstan/show/8825) | Bekmakhanov sentenced to 25 years in 1952. The item asks the year/person, avoiding differing exact-day retellings. |

The initial positional seed order is not the phone order: stable IDs are shuffled server-side per participant/question. A future edit must create a new set version; started sessions hold private question snapshots and never change their frozen content. Public repository SQL remains reviewable and can be read by a determined visitor. Private API projections and option shuffling reduce casual answer sharing; they do not make cheating impossible. For high-stakes use, move content publication to a private trusted workflow rather than claiming public-repository seeds are secret.
