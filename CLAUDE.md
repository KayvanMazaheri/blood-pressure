# CLAUDE.md

Project-specific guidelines for the Blood Pressure Tracker. All agents and AI tools working in this repo must follow these rules without exception.

---

## Project Overview

A privacy-first blood pressure tracking application. Users' health data never leaves their device — no server-side storage, no SaaS databases. Data lives in the browser; users can optionally back up and restore via Google Drive for cross-device access.

---

## Tech Stack

| Layer         | Choice                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| Framework     | Next.js (latest stable LTS)                                                                 |
| Runtime       | Node.js (latest LTS)                                                                        |
| Language      | TypeScript — strict mode, no `any`                                                          |
| UI Components | shadcn/ui                                                                                   |
| Styling       | Tailwind CSS (via shadcn/ui)                                                                |
| Storage       | Browser-native: IndexedDB primary, localStorage for small config                            |
| Backup / Sync | Google Drive API — opt-in, user-initiated only                                              |
| Deployment    | GitHub Pages (static export). Vercel only if a server-side feature is strictly unavoidable. |
| CI/CD         | GitHub Actions                                                                              |

---

## Architecture Principles

Design and structure code the way a senior software engineer maintains a small application — readability and long-term maintainability are first-class concerns.

- **Feature-based folder structure.** Group files by domain/feature, not by file type.
- **Layered dependency direction.** UI → logic → storage. No lower layer imports from a higher layer.
- **Clear separation of concerns.** UI components, business logic, data access, and utilities each occupy their own layer with explicit interfaces between them.
- **No premature abstractions.** Don't create shared utilities or generic components until there are at least three concrete use cases for them.
- **Small, focused files.** A file that grows large is doing too much. Split at natural seams.
- **Typed everything.** TypeScript strict mode. No `any`. No type assertions (`as`) without a comment explaining why it's safe.
- **Colocate tests with the code they test.** A `__tests__` folder next to the module, or a `.test.ts` sibling file.

---

## Privacy and Data Principles

These are non-negotiable hard constraints — not preferences or guidelines.

- **No server-side storage.** User health data must never be sent to or stored on any server.
- **No third-party analytics or tracking SDKs** that transmit user data off-device.
- **Browser-first storage.** Use IndexedDB (via a well-maintained library such as Dexie.js) as the primary data store. Use localStorage only for small non-sensitive config values.
- **Encrypt sensitive data at rest.** Use the Web Crypto API to encrypt health records before writing to IndexedDB.
- **Google Drive sync is strictly opt-in.** The app must be fully functional without any Google account. The user must explicitly initiate any sync, backup, or restore action. No background sync.
- **No plaintext export of raw health data** without explicit user acknowledgment and action.
- **Minimal permissions.** Request only the Google Drive scopes necessary (e.g., `drive.appdata` for the app-specific hidden folder).

---

## UI/UX Guidelines

When implementing the frontend, reason and act as a senior frontend engineer and UI/UX expert. These are not suggestions.

- **Mobile-first.** Design for small screens first; enhance for larger viewports. Test every UI change at 375px width before considering it done.
- **Fully responsive.** The app must be visually correct and fully functional at all common breakpoints: 375px, 768px, 1024px, 1440px.
- **shadcn/ui is the component foundation.** Use shadcn/ui components. Do not install competing UI libraries (MUI, Chakra, Mantine, etc.).
- **Accessibility is required, not optional.** All interactive elements must be keyboard-navigable. Use semantic HTML. Provide ARIA attributes where native semantics are insufficient. Color must not be the sole means of conveying information.
- **Performance.** Minimize client-side JavaScript. Prefer React Server Components where Next.js allows. Lazy-load heavy components. Keep Lighthouse Performance score above 90 on mobile.
- **No layout shifts.** Use skeleton states and loading placeholders. CLS must be near zero.
- **Design token discipline.** Use shadcn/ui design tokens and Tailwind's config. Do not introduce ad-hoc hex colors or hard-coded spacing values outside of `tailwind.config`.
- **Animations must be purposeful.** Use motion to communicate state changes (success, error, loading). No decorative animation that slows the user down.

---

## Deployment

- **Primary:** GitHub Pages via Next.js static export (`output: 'export'` in `next.config`). This means no server-side runtime features (no API routes, no SSR).
- **Fallback:** Vercel — only if a specific feature is proven to require a server runtime and cannot be achieved statically. This decision must be made explicitly, not by default.
- All production deploys happen exclusively through GitHub Actions. No `vercel --prod` or manual pushes to the deploy branch.

---

## GitHub Actions

Follow these best practices in every workflow file:

- **Pin action versions** to a specific version tag or SHA. Do not use `@main` or floating branches.
- **Separate jobs** for lint, type-check, test, build, and deploy. Lint/test/build jobs run in parallel; deploy is gated on all passing.
- **Cache dependencies** using the caching built into `actions/setup-node` (`cache: 'npm'` or `cache: 'pnpm'`).
- **Fail fast.** Any lint, type, or test failure blocks the deploy job. Never skip the gate.
- **Deploy on `main` only.** The deploy job is triggered only on push to `main`, never on PRs.
- **Use GitHub Actions secrets** for all tokens and API keys. Never hardcode credentials.
- **Minimal job permissions.** Each job declares only the GitHub token permissions it needs (e.g., `contents: read`, `pages: write`).
- **Workflow files are versioned and reviewed** like application code. Do not bypass CI.

---

## Git Commit Rules

- **No AI attribution.** Never add `Co-authored-by: Claude`, `Co-authored-by: GitHub Copilot`, or any similar co-author trailer. Never reference AI, Claude, Copilot, or any coding agent in commit messages, PR descriptions, or code comments.
- **Do not modify git config.** Never run `git config` commands.
- **Commit message format.** Use imperative mood for the subject line (≤72 characters). Optionally follow with a blank line and a body that explains _why_, not _what_. Example:

  ```
  Add systolic range validation on entry form

  Rejects values outside the clinically plausible range (60–250 mmHg)
  to prevent accidental data corruption.
  ```

- **No WIP commits to `main`.** Every commit merged to `main` must leave the codebase in a buildable, test-passing state.
- **Atomic commits.** Each commit addresses one logical change. Do not bundle unrelated changes.

---

## Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Sourced from [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Pre-Push CI Gate

**Before every `git push`, run all CI checks locally in this exact order:**

```bash
npm test && npx tsc --noEmit && npm run lint && npx prettier --check .
```

All four must pass. If Prettier fails, run `npx prettier --write .` then re-check before pushing. This mirrors the CI workflow exactly (`lint` job runs ESLint then Prettier; `typecheck` runs tsc; `test` runs Vitest). Never push when any of these fail locally.
