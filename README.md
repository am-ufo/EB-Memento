# EB Memento

Syllabus-exact maths formulas for European Baccalaureate students. Flick it open mid-homework, take one answer, close. The sheet opens with no account, and it still opens offline.

Catalog: syllabus-exact formulas from the five EB programmes in `docs/eb-curriculumn/`, each tagged with a course. A class, set in Settings, marks that year and maths course. You can still search by title, topic, or course tag (e.g. `S5`, `physics`).

On the **Ask** tab, describe a problem in chat (e.g. “I know the area of a circle and need the circumference”). Memento walks through which syllabus formulas to use, in order, and what to substitute. Follow-up messages stay on the same problem until you start a new one. You still do the arithmetic. The Formulas search bar stays keyword search. Online, Ask calls a Cloudflare Pages Function (`/api/match`, Workers AI). `npm run dev` uses that same model when Wrangler is logged in (`npx wrangler login`); those local calls count as Workers AI usage. Offline, or if the model is unavailable, Ask falls back to a local suggestion. Cards always come from `formulas.json` — the model only picks IDs.

## Run locally

Needs [Node.js](https://nodejs.org/) 20+ (`node` and `npm` on your PATH).

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). On a phone, use the same Wi-Fi address Vite shows, then “Add to Home Screen”.

To run the production build locally (needs a Cloudflare account and the Workers AI binding from `wrangler.toml`):

```bash
npm run preview:cf
```

## Production (Vercel)

Build command: `npm run build`  
Output directory: `dist`

Ask on the deployed site uses the on-device suggestion. The Workers AI path still runs locally with `npm run preview:cf`.

## Accounts

The sheet opens with no account. Stars, formula notes, recent formulas, and class stay on this device. Sign-in is optional, from Settings. With no extra setup the email and a hash of the password stay on the device, with the name, a unique username, the class, and the stars. First names can match. Usernames cannot, and matching ignores case. Capitals in a username are kept. Sign out returns to this device's copy and leaves the account in place.

To open that same login on another device, connect Supabase. What syncs: name, username, year, maths course, Advanced, physics, starred ids, and formula notes. What stays on each device: theme, text size, the last five formulas, and Ask.

1. Create a project at [supabase.com](https://supabase.com). Authentication → Providers → Email stays on.
2. Authentication → URL configuration: add `http://localhost:5173` and the Vercel site URL so password-reset links can return.
3. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) once. That creates `profiles`, `favourites`, and `card_notes` with row-level policies, plus `delete_own_account`.
4. Project Settings → API: copy the project URL and the **anon** key into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see [`.env.example`](.env.example)). Never put the service-role key in the client or in Vercel.
5. Add the same two variables on the Vercel project, then redeploy. Vite bakes them in at build time, so a deploy from before the variables will still be local-only.
6. On the phone: Settings → Sign in with the same email. Class, stars, and formula notes from an empty account upload. An account that already has cloud data opens that copy. After that, the sheet still opens offline from the on-device cache.

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
| `vercel.json` | Vercel build (`dist`) |

## First useful change

Open `src/data/formulas.json` and add a formula from the syllabus. Set `courses` to the year-programme tag in [docs/curriculum/README.md](docs/curriculum/README.md), add a title, aliases, KaTeX, a one-sentence `useWhen` cue, and variable meanings, then search for it.
