# Release essentials

Quick wins first. Each phase is shippable on its own.

Assumption: About credits **Artem Murashko, TES student**. Terms keep `SITE.makers` as "Artem and Andrii" in [src/data/notices.ts](../../src/data/notices.ts). Say if that credit should change too.

Feedback is a direct mailto to `am.ufo@protonmail.com`. No product alias and no Resend. When `ebmemento.eu` is bought, forward that domain address to this Proton mail.

## Phase 1 — Copy

Trailing full stops come off short UI descriptions only. The example is the Ask row in [src/components/SettingsScreen.tsx](../../src/components/SettingsScreen.tsx): "A problem is open in this tab." becomes "A problem is open in this tab". Same for the other `settings-hint` lines, class-form hints in [src/components/ClassForm.tsx](../../src/components/ClassForm.tsx), the sign-in lede in [src/components/SignIn.tsx](../../src/components/SignIn.tsx), and empty states in [src/App.tsx](../../src/App.tsx), [src/components/AskChat.tsx](../../src/components/AskChat.tsx), and [src/components/NotationsTable.tsx](../../src/components/NotationsTable.tsx). An internal stop stays ("No match. Try another word, or a topic").

Leave alone: status toasts ("Class saved."), confirm questions, teacher lines ("Curious."), screen-reader "Done.", formula `useWhen`, and the privacy / cookies / terms paragraphs.

About in Settings becomes a short pitch, still with normal sentence stops:

- Every EB maths and physics formula, searchable and offline. Open it, take one answer, close it.
- Formulas follow the syllabus. Check the official line when a mark depends on it.
- Home-screen line stays (installed vs not).
- Made by Artem Murashko, TES student.

`FEEDBACK_EMAIL` in [src/data/notices.ts](../../src/data/notices.ts) is `am.ufo@protonmail.com`. The contact summary already interpolates it. `SITE.updated` is 17 November 2026. When the domain is bought, forward the domain address to this Proton mail.

## Phase 2 — Mark

[public/favicon.svg](../../public/favicon.svg) is a placeholder (£ on charcoal). Replace it with one mark: rounded square, `#1c1916` / `#f4efe6`, a serif M. Save the same drawing as `public/logo.svg` and `public/favicon.svg`. Show the logo beside the "Memento" wordmark in the header in [src/App.tsx](../../src/App.tsx).

## Phase 3 — Icons and sharing

SVG alone is not enough for iOS home screen or Android install. From the same mark, add:

- `public/apple-touch-icon.png` (180)
- `public/icon-192.png`, `public/icon-512.png`, and a maskable 512

Point [index.html](../../index.html) and the manifest in [vite.config.ts](../../vite.config.ts) at those files (`includeAssets` too).

Add `public/og.png` (1200×630): charcoal ground, the mark, "EB Memento", and the existing meta description ("Every EB syllabus formula, searchable in under two seconds, offline."). In `index.html`, add `og:title`, `og:description`, `og:image`, `og:type`, and `twitter:card` = `summary_large_image`. There is no production URL in the repo, so `og:image` stays root-relative (`/og.png`) until a host is named.

Out of this pass (already later in [docs/EB-Memento-Plan-v7.md](../../docs/EB-Memento-Plan-v7.md)): custom domain, store packaging, analytics, premium.

Verify in the browser: Settings About and the feedback mailto, a few hints without a trailing stop, the header mark, and that `/favicon.svg` plus `/og.png` load.
