# EB Memento — Plan v7

*Sun 6 Sep 2026 — made by Artem & Andrii*

## VISION

The formula notepad every EB student builds by hand, made searchable and always in your pocket. Every maths and physics formula on the syllabus, in your language section, in under two seconds, on any device, online or off. What IB and A-Level students have and EB students never got.

## TARGET

- **v1:** S5 Maths 6P — covers the full S5 maths cohort (6P ⊃ 4P)
- **v2:** S6/S7 Maths 5P — covers the 3P cohort too (5P ⊃ 3P)
- **v3:** Physics 4P — covers the 2P cohort too
- **later:** Advanced Maths (S6/S7 complementary) — outside the 5P superset, its own tag

Keep `courses[]` in the data from day one; no picker UI until it earns one.

## VALUE

- **vs. the paper memento** — searchable, complete, never lost, never left at home
- **vs. the PDF booklet** — instant, no pinch-zoom, usable one-handed
- **vs. ChatGPT** — syllabus-exact, no hallucinated formulas, offline, zero typing
- **vs. anything else** — multilingual search across EN/FR/DE section vocabulary. Nothing does this. This is the moat.

## WHEN — real usage moments

**Blocked (design around it, not for it)**

- In class, S1–S3 — phones banned outright at most European Schools
- In class, S4–S7 — banned except explicit pedagogical permission (EEB3); Varese bans the full school day under Italian law
- Assume: **never usable during lessons**

**Permitted in school**

- Break and lunch — courtyard, cafeteria (S6/S7 zones at EEB3; S4–S7 outdoor areas at Lux II)
- Library and Cervantes/study rooms — free periods, the best in-school window
- On the school BYOD laptop — permitted all day, S5–S7; the one always-legal device

**Outside school — the primary market**

- Homework at the desk, evenings — highest-volume moment
- Commute, bus, waiting around — pure phone, often no signal → **offline is not optional**
- Group study and friends' houses — also the main discovery channel
- Revision week and pre-Bac cramming — peak usage, peak word-of-mouth

**Design consequences**

- Offline-first, cached at install
- Sub-second search, one-handed, thumb-reachable
- Mobile layout first; laptop follows for free
- No login, no wifi dependency, no loading spinner

## USAGE — behaviour

Not an app you "open to study." A memento you flick open mid-problem, take one answer, and close. Sessions of 5–20 seconds, many times a day. Success is high frequency and low dwell time — the opposite of an engagement app.

## WHAT — scope ladder

- **v1** — search → rendered formula → tap for variable meanings. Topic browse fallback. Offline. Home-screen install. No picker, nothing more.
- **v2** — Maths 5P; worked example per formula; multilingual aliases complete; course picker if the mixed content warrants it
- **v3** — Physics 4P; past-paper index linking to the official eursc.eu archive (no rehosting)
- **v4** — Flashcards generated from existing content; optional Telegram Mini App wrapper

## WHY

- Highest value per unit of effort; bounded enough that a 16-year-old actually finishes it
- No backend → no cost, no maintenance, no personal data, no GDPR exposure
- The content grind doubles as his own 6P revision
- Real users, real artifact — what admissions and competitions actually reward

**Gate before expanding:** 10 classmates using it in one week, unprompted. If that fails, the problem is discovery or search relevance — not missing features.

## IMPLEMENTATION

TypeScript + Vite + React + KaTeX, content as static JSON, PWA via `vite-plugin-pwa`, no backend, free on Cloudflare Pages. *(Details in separate plan.)*
