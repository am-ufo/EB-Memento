---
name: code-standards
description: Code-quality standards for TypeScript front-end code — a defect catalog plus engineering principles. Use when reviewing a diff or PR, or when writing/refactoring non-trivial code, to check correctness, architecture, performance, security, and testing.
metadata:
  author: am0wa.it@gmail.com
---

Use these standards two ways: as a **review checklist** when assessing a diff, and as **authoring
guidance** when writing or refactoring. Correctness first; be concise (one clear issue per finding);
defer to the repo's existing patterns and its agent rules over personal preference.

## Before applying

1. **Read the repo's agent rules** (`.cursor/rules`, `AGENTS.md`, `CLAUDE.md`) — their conventions (naming, layering, module boundaries, DI
   tooling checks) override the generic guidance here.
2. **Match the repo shape:**
   - **App** — everything applies.
   - **UI-less package** (business-logic engine, protocol layer) — skip React/component and app-lifecycle
     criteria; having no view bindings is correct here, not a defect. Everything else still applies.
   - **Published package** — anything reshaping the built public surface is a **breaking change for
     external consumers**; flag it as such.

Severity is deliberately **not** baked into the categories — map them to your own scale. Rule of
thumb: **Correctness and Security first; Architecture, Error handling, and Performance next; Testing
and minor style last.**

## What NOT to flag

Anything already handled by tooling (linter, formatter, type-checker, pre-commit hooks): formatting,
import ordering, unused imports, quote style, trivial type annotations, line length.

## Correctness & Defects

- **Null/undefined dereferences** — especially optional chaining that yields `undefined` then gets used without a guard.
- **Async race conditions** — two calls to the same method whose responses can arrive out of order; suggest cancellation (`AbortController`, latest-request token) or guards.
- **Unsynchronized mutable state** shared across async boundaries.
- **Circular imports** between modules.
- **Self-barrel imports** — a module importing from its own `./index.ts` or `../index.ts` (circular deps at runtime).
- **Dead code / unreachable branches** introduced by the change.
- **Type escape hatches** — `as any`, `@ts-ignore`/`@ts-expect-error`, and non-null `!` assertions that mask a real type error.

## Architecture & Design

- **Imports**: within a module, import from the file directly, not from its own barrel — barrels risk circular deps and drag in unrelated code. Across modules, use the public entrypoint.
- **Barrels**: the problem is `export *`, not barrels — a curated barrel is the isolation boundary. A contract barrel (types/store/service) must not also re-export view components; it leaks view code into lazy chunks; import views from their own file. Don't `export *` internal plumbing (e.g. DTO↔domain mappers) — it promotes internals to the public surface and hides where a symbol came from. If the repo ships a barrel checker, run it and fold in the violations.
- **Lookups**: a keyed lookup or registry is a typed `ReadonlyMap<K, V>`, not a plain object/record — `.get()` is honest about a miss. Data stays an object (DTOs, props, config).
- **Namespaces & tree-shaking**: `export namespace X` with runtime members emits an IIFE — one binding, nothing inside shakes (type-only namespaces are erased and fine). An object-literal export (`export const xMap = { a, b }`) is likewise a single binding, so its properties aren't individually eliminable. Prefer top-level named exports for new code; at call sites `import * as X` shakes the same as named imports, so don't flag it for size. Flattening existing namespaces/objects only pays when some members are dead app-wide — webpack/Rollup compute used-exports per module across the whole build, not per chunk. To get a heavy module out of a chunk, split the file or import it lazily.
- **Layer boundary**: business logic and UI stay separated — no UI in a logic package, no business logic in components. Respect the repo's layer/import rules.
- **Naming**: follow the repo's file-suffix and identifier conventions.
- **Lifecycle-scoped state** (session, user, per-route stores or containers): changes need extra scrutiny for setup/teardown and leaks across scopes.
- **Feature flags**: used correctly against the repo's flag provider; stale flags removed.
- **Breaking changes** to public APIs or contracts — flag changed signatures that ripple to consumers.

## Error Handling

- Silently discarded errors (`catch(() => {})`, empty `catch`) — at minimum, log them.
- Fire-and-forget promises and unhandled rejections.
- Network/RPC calls without error and status handling.
- Inconsistent error handling across similar code paths.

## Performance

- A new stream, subscription, or expensive object created per call/render instead of shared or memoized.
- Large synchronous data transformations without batching.
- Nested loops with async calls inside.

## Security

- Secrets, tokens, or credentials in code (even as defaults or examples).
- User input interpolated into queries, RPC calls, or dynamic keys without validation.
- **XSS / unsafe rendering** — untrusted data reaching `innerHTML`/`dangerouslySetInnerHTML`, `href`/`src`, or other DOM sinks without sanitization.
- **Auth / authorization bypass** — missing or weakened guards on protected flows.

## Testing

- New business logic without corresponding tests.
- Tests that mock so much they don't exercise real behavior.
- Overly loose assertions (`toBeDefined()` where a specific value can be checked).

## Engineering Principles

- **Single Responsibility** — one clear reason to change; flag god-components and bloated stores.
- **Immutability & Pure Functions** — prefer pure transformations; flag mutation of props, derived state, or shared data outside the state library's sanctioned path (actions, reducers).
- **Separation of Concerns** — business logic lives in stores/services, not components or event handlers.
- **Composition over Inheritance** — composition (functions, hooks, injected dependencies) over class hierarchies.
- **Explicit over Implicit** — flag magic strings, implicit coercions, undocumented side effects, hidden coupling.
- **Testability** — flag tightly coupled code that is hard to test in isolation; prefer injectable dependencies over hard imports for side-effectful code.
- **YAGNI** — flag premature abstractions, needless indirection, feature flags for hypothetical scenarios, configurability with no current use case.
- **DRY with Judgment** — flag duplicated non-trivial logic, not trivial repetition an abstraction would complicate.

## Golden Rules

1. **Small, simple, verifiable changes** — smallest diff that fixes the root cause; no hacks; add or extend a test when practical (util or product behaviour changes).
2. **Make invariants machine-enforced** — encode rules in types, lint, and tests so feedback is fast and objective instead of relying on convention.
3. **Respect module boundaries** — use public APIs, not another module's internals, to keep blast radius small.
