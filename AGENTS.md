# Memento

Offline PWA: syllabus-exact maths and physics formulas for European Baccalaureate students. Open, search, take one answer, close. No login, no database.

The catalog covers the five EB syllabi in `docs/eb-curriculumn/`. Every formula and notation is tagged with `courses[]`. The UI has a Maths / Physics subject picker (not a year/programme picker). Tabs: Formulas | Ask | Notations | Favourites. Light/dark theme (warm charcoal dark); preference in `localStorage` (`memento:theme`).

## Commands

```bash
npm install
npm run dev         # Vite, usually http://localhost:5173
npm run build       # tsc -b && vite build → dist/
npm run preview:cf  # production build + Wrangler (Workers AI binding)
```

Production: Cloudflare Pages, output `dist`. Ask online uses `functions/api/match.ts` (Workers AI); offline falls back to local ranking. Cards always come from `formulas.json`.

## Layout

| Path | Role |
| --- | --- |
| `src/data/formulas.json` | Formula catalog. Prefer adding formulas here. |
| `src/data/notations.json` | Notation / symbol cheatsheet |
| `src/types.ts` | `Formula` / `Notation` / `Variable` shapes (`useWhen` on every formula) |
| `src/lib/search.ts` | Client-side search and problem ranking |
| `src/lib/subject.ts` | Maths vs physics filtering |
| `src/lib/theme.ts` | Light/dark theme apply + persist |
| `src/lib/favourites.ts` | Starred formulas/notations (`localStorage`) |
| `src/lib/ask.ts` | Ask tab: local match + `/api/match` call |
| `functions/api/match.ts` | Optional online ID rerank (Workers AI) |
| `src/App.tsx` | Subject picker → tabs → search / Ask / notations / saved |
| `src/components/Katex.tsx` | Renders `katex` strings |
| `src/index.css` | Theme tokens (`:root` / `[data-theme="dark"]`) |
| `vite.config.ts` | PWA / offline cache |
| `wrangler.toml` | Pages + AI binding |

## Formulas

Set `courses` to the year-programme tags in [docs/curriculum/README.md](docs/curriculum/README.md). Each entry needs a stable `id`, `topic`, `title`, search `aliases`, KaTeX in `katex`, a one-sentence `useWhen` cue (givens/unknown, not a restatement of the formula), and `variables` with symbol + meaning. Match the EB syllabus; do not invent “helpful” extras. Use syllabus topic names (Algebra, Geometry, Fields, …), not invented ones.

Stay client-first. Do not add auth, a database, or a second backend. The only server surface is the optional Cloudflare Pages Function for Ask.

## Docs

Read these instead of inventing scope or syllabus:

- [README.md](README.md) — run, build, Ask, first content change
- [docs/EB-Memento-Plan-v7.md](docs/EB-Memento-Plan-v7.md) — product vision, usage, v1–v4 ladder, next phases
- [docs/eb-curriculumn/s4-s5 6p Maths.pdf](docs/eb-curriculumn/s4-s5%206p%20Maths.pdf) — official S5 6P source; other PDFs in `docs/eb-curriculumn/` are later programmes
- [`.cursor/plans/`](.cursor/plans/README.md) — implementation workstreams (catalog + notations marked done)

Do not transcribe syllabus PDFs verbatim. Seed short original meanings.
