# Memento

Offline PWA: syllabus-exact maths formulas for European Baccalaureate students. Open, search, take one answer, close. No login, no backend.

The catalog covers the five EB syllabi in `docs/eb-curriculumn/`. Course tags exist on every formula; there is no course picker yet.

## Commands

```bash
npm install
npm run dev      # Vite, usually http://localhost:5173
npm run build    # tsc -b && vite build → dist/
```

Production: Cloudflare Pages, output `dist`.

## Layout

| Path | Role |
| --- | --- |
| `src/data/formulas.json` | All content. Prefer adding formulas here. |
| `src/types.ts` | `Formula` / `Variable` shape |
| `src/lib/search.ts` | Client-side search |
| `src/App.tsx` | Search → list → tap for variable meanings |
| `src/components/Katex.tsx` | Renders `katex` strings |
| `vite.config.ts` | PWA / offline cache |

## Formulas

Set `courses` to the year-programme tags in [docs/curriculum/README.md](docs/curriculum/README.md). Each entry needs a stable `id`, `topic`, `title`, search `aliases`, KaTeX in `katex`, and `variables` with symbol + meaning. Match the EB syllabus; do not invent “helpful” extras. Use syllabus topic names (Algebra, Geometry, Fields, …), not invented ones.

Stay client-only. Do not add auth, APIs, or a database.

## Docs

Read these instead of inventing scope or syllabus:

- [README.md](README.md) — run, build, first content change
- [docs/EB-Memento-Plan-v7.md](docs/EB-Memento-Plan-v7.md) — product vision, usage, v1–v4 ladder
- [docs/eb-curriculumn/s4-s5 6p Maths.pdf](docs/eb-curriculumn/s4-s5%206p%20Maths.pdf) — official S5 6P source; other PDFs in `docs/eb-curriculumn/` are later programmes
- [`.cursor/plans/`](.cursor/plans/README.md) — current implementation workstreams (notations tab, fill S5 catalog)

Do not transcribe syllabus PDFs verbatim. Seed short original meanings.
