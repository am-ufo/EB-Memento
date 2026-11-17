# Ask

Ask walks one homework problem: which syllabus formulas, in which order, and what to substitute. The student still does the arithmetic. Cards always come from `src/data/formulas.json`. The model only picks ids.

## What a message does

1. On the device, `rankAskCandidates` scores the current subject and keeps the top 15. Maths uses maths cards. Physics also includes maths cards.
2. The app POSTs that shortlist, the latest message, up to 8 earlier turns, and a short problem note to `/api/match`. No name or email is sent.
3. `functions/api/match.ts` asks Cloudflare Workers AI (`@cf/zai-org/glm-4.7-flash`) to return JSON: a short reply, up to 4 steps, and a memory of what is known, still needed, and already found. Ids outside the shortlist are dropped. Output is capped at 900 tokens.
4. If that call fails, `localAdvice` shows the top 3 local hits. Each step is the card title, its `useWhen` line, and the symbol meanings.

The model orders those 15 cards into a method and maps the problem’s quantities onto the symbols. A follow-up stays on the same problem until **New problem**. It cannot see the rest of the catalog, and it does not invent a formula.

Offline, the `/api/match` request fails and the on-device steps are used. The sheet must have been opened once while online so the offline copy exists.

## Who actually calls the model

End users do not. The public site is Vercel, and Vercel does not run `functions/api/match.ts`, so Ask there is always the on-device ranking. A Play install of that same site behaves the same way.

Cloudflare appears only on your computer, through Wrangler (`npx wrangler login`, then `npm run dev` or `npm run preview:cf`). Wrangler is Cloudflare’s CLI. It attaches the Workers AI binding so you can try the model while building. Those calls count against your Cloudflare account.

Workers AI includes 10,000 Neurons a day, resetting at 00:00 UTC. This model is about 30–70 Neurons a message, so the free allowance is roughly 150–300 messages a day. Past that, a free-plan call fails and Ask uses the on-device ranking again. The allowance is shared by every Workers AI model on that account.
