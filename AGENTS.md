# Memento

Offline PWA: syllabus-exact maths and physics formulas for European Baccalaureate students. Open, search, take one answer, close. Sign-in is optional. On this device, stars, notes, recent formulas, and class stay under a device id with no email. Sign-in, from Settings, is an email and password. On this device the account is an email plus a password hash, a unique username, the class, and the stars, so the sheet still opens offline. First names can match. Usernames cannot, and matching ignores case. Capitals in a username are kept. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, that same account is stored in Supabase instead. Do not add a second login provider. Never put the Supabase service-role key in the client.

The catalog covers the five EB syllabi in `docs/eb-curriculumn/`. Every formula and notation is tagged with `courses[]`. The sheet opens on a Maths / Physics subject picker. A class, set in Settings or after sign-in, marks matching cards. It does not hide the rest of that subject. Tabs: Formulas | Ask | Notations | Favourites. Light/dark theme (warm charcoal dark); preference in `localStorage` (`memento:theme`).

## Commands

```bash
npm install
npm run dev         # Vite, usually http://localhost:5173
npm run build       # tsc -b && vite build → dist/
npm run preview:cf  # production build + Wrangler (Workers AI binding)
```

Production: Vercel, output `dist` (`vercel.json`). Ask online uses `functions/api/match.ts` (Workers AI) in `npm run preview:cf`; the Vercel site has no Workers AI binding, so Ask falls back to local ranking. Cards always come from `formulas.json`.

## Layout

| Path | Role |
| --- | --- |
| `src/data/formulas.json` | Formula catalog. Prefer adding formulas here. |
| `src/data/notations.json` | Notation / symbol cheatsheet |
| `src/types.ts` | `Formula` / `Notation` / `Variable` shapes (`useWhen` on every formula) |
| `src/lib/search.ts` | Client-side search and problem ranking |
| `src/lib/profile.ts` | Class rules: year, maths period, Advanced, physics, and the offline class cache |
| `src/lib/account.ts` | Email session: sign-in, class save, sign-out, delete |
| `src/lib/local-auth.ts` | On-device email accounts when Supabase keys are absent |
| `src/lib/cloud.ts` | Supabase client. Returns null when the env keys are missing |
| `supabase/schema.sql` | Profiles, favourites, and delete-account SQL. Run once in Supabase |
| `src/lib/subject.ts` | Maths vs physics filtering |
| `src/lib/theme.ts` | Light/dark theme apply + persist |
| `src/lib/favourites.ts` | Starred formulas/notations (`localStorage`) |
| `src/lib/ask.ts` | Ask tab: local match + `/api/match` call |
| `functions/api/match.ts` | Optional online ID rerank (Workers AI) |
| `src/App.tsx` | Subject picker → tabs → search / Ask / notations / saved |
| `src/data/notices.ts` | Privacy, cookies, terms, and the on-device data list |
| `src/components/ClassForm.tsx` | Year, maths course, Advanced, and physics |
| `src/components/SignIn.tsx` | Email sign-in, create account, reset, and the class step |
| `src/components/SettingsScreen.tsx` | Settings, privacy, cookies, and terms |
| `src/components/Katex.tsx` | Renders `katex` strings |
| `src/index.css` | Theme tokens (`:root` / `[data-theme="dark"]`) |
| `vite.config.ts` | PWA / offline cache |
| `vercel.json` | Production build on Vercel |
| `wrangler.toml` | Local Ask preview + AI binding |

## Formulas

Set `courses` to the year-programme tags in [docs/curriculum/README.md](docs/curriculum/README.md). Each entry needs a stable `id`, `topic`, `title`, search `aliases`, KaTeX in `katex`, a one-sentence `useWhen` cue (givens/unknown, not a restatement of the formula), and `variables` with symbol + meaning. Match the EB syllabus; do not invent “helpful” extras. Use syllabus topic names (Algebra, Geometry, Fields, …), not invented ones.

Stay client-first. The sheet opens with no account. Email accounts work on the device with no server. When the Supabase keys from the README are set, accounts are stored there instead. Do not add another backend, and do not send the email to `/api/match`. The other server surface is the optional Cloudflare Pages Function for Ask. The sheet shows every formula in the chosen subject. `onCourse` marks cards from the saved class. Favourites are not filtered by class. 4 period uses the 6P tags and 3 period uses the 5P tags, because those shorter courses have no tags of their own. Advanced is the extra S6/S7 course, on top of 3 or 5 period.

## Notices

Privacy, cookies, and terms render from `src/data/notices.ts`. When a change adds storage, a cookie, analytics, an account, a payment, or a request that sends what the student typed, update that file in the same change and set `SITE.updated`. The checklist is at the top of the file. Theme and text size that must apply before first paint also go in `public/theme-init.js`.

## Docs

Read these instead of inventing scope or syllabus:

- [README.md](README.md) — run, build, Ask, first content change
- [docs/EB-Memento-Plan-v7.md](docs/EB-Memento-Plan-v7.md) — product vision, usage, v1–v4 ladder, next phases
- [docs/eb-curriculumn/s4-s5 6p Maths.pdf](docs/eb-curriculumn/s4-s5%206p%20Maths.pdf) — official S5 6P source; other PDFs in `docs/eb-curriculumn/` are later programmes
- [`.cursor/plans/`](.cursor/plans/README.md) — implementation workstreams (catalog + notations marked done)

Do not transcribe syllabus PDFs verbatim. Seed short original meanings.
