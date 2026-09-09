# EB Memento

Syllabus-exact maths formulas for European Baccalaureate students. Flick it open mid-homework, take one answer, close. Offline, no login, no backend.

Catalog: syllabus-exact formulas from the five EB programmes in `docs/eb-curriculumn/`, each tagged with a course. There is no course picker yet — search by title, topic, or course tag (e.g. `S5`, `physics`).

## Run locally

Needs [Node.js](https://nodejs.org/) 20+ (`node` and `npm` on your PATH).

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). On a phone, use the same Wi-Fi address Vite shows, then “Add to Home Screen”.

## Production build (Cloudflare Pages)

Build command: `npm run build`  
Output directory: `dist`

## Layout

| Path | Role |
| --- | --- |
| `src/data/formulas.json` | All content. Add formulas here. |
| `src/types.ts` | Shape of a formula (`courses[]`, title, aliases, KaTeX, variables) |
| `src/lib/search.ts` | Client-side search |
| `src/App.tsx` | Search → list → tap for variable meanings |
| `src/components/Katex.tsx` | Renders `katex` strings |
| `vite.config.ts` | PWA / offline cache |

## First useful change

Open `src/data/formulas.json` and add a formula from the syllabus. Set `courses` to the year-programme tag in [docs/curriculum/README.md](docs/curriculum/README.md), add a title, aliases, KaTeX, and variable meanings, then search for it.
