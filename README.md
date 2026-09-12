# EB Memento

Syllabus-exact maths formulas for European Baccalaureate students. Flick it open mid-homework, take one answer, close. Offline, no login, no backend.

Catalog: syllabus-exact formulas from the five EB programmes in `docs/eb-curriculumn/`, each tagged with a course. There is no course picker yet — search by title, topic, or course tag (e.g. `S5`, `physics`).

On the **Ask** tab, describe a problem in chat (e.g. “I need to find the radius of a circle from its area”). Memento replies with which syllabus formula to use and shows those catalog cards. The Formulas search bar stays keyword search. Online, Ask can call a Cloudflare Pages Function (`/api/match`, Workers AI); offline and `npm run dev` fall back to a local suggestion. Cards always come from `formulas.json` — the model only picks IDs.

## Run locally

Needs [Node.js](https://nodejs.org/) 20+ (`node` and `npm` on your PATH).

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). On a phone, use the same Wi-Fi address Vite shows, then “Add to Home Screen”.

To try the online matcher locally (needs a Cloudflare account and the Workers AI binding from `wrangler.toml`):

```bash
npm run preview:cf
```

## Production build (Cloudflare Pages)

Build command: `npm run build`  
Output directory: `dist`

## Layout

| Path | Role |
| --- | --- |
| `src/data/formulas.json` | All content. Add formulas here. |
| `src/types.ts` | Shape of a formula (`courses[]`, title, aliases, KaTeX, `useWhen`, variables) |
| `src/lib/search.ts` | Client-side search and problem ranking |
| `functions/api/match.ts` | Optional online ID rerank (Workers AI) |
| `src/App.tsx` | Search → list → tap for variable meanings |
| `src/components/Katex.tsx` | Renders `katex` strings |
| `vite.config.ts` | PWA / offline cache |

## First useful change

Open `src/data/formulas.json` and add a formula from the syllabus. Set `courses` to the year-programme tag in [docs/curriculum/README.md](docs/curriculum/README.md), add a title, aliases, KaTeX, a one-sentence `useWhen` cue, and variable meanings, then search for it.
