# EB Memento

Syllabus-exact maths formulas for European Baccalaureate students. Flick it open mid-homework, take one answer, close. Offline, no login, no backend.

v1 target: **S5 Maths 6P** (covers the 4P cohort too). Course tags live on every formula; there is no course picker yet.

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

Open `src/data/formulas.json` and add one formula you actually needed this week. Keep `courses: ["S5-Maths-6P"]`, add a title, aliases, KaTeX, and variable meanings, then search for it.
