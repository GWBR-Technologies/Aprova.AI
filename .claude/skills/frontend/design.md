---
platforms: [ios, android]
orientation: portrait
router: none
---

# Aprova.AI Design Context

## Repository Status

This is an Expo 57 application written in TypeScript and React Native, for studying for the Enem, the Fuvest, and other Brazilian university entrance exams, with AI support and correction (GPT 6.1 - Terra). It targets iOS and Android; `app.json` sets the preferred orientation to portrait and the interface style to light. A `web` script exists, but the web dependencies are not declared.

The application has Expo Router navigation, the visual identity in `docs/DESIGN.md` (tokens in `src/constants/theme.ts`), and the login, essay, and account flows. Screens for questions, routine, mock exams, and performance do not exist because their data contracts are not defined.

Do not turn this limited context into a product specification. Ask for a requirement before adding any screen, question, score, performance chart, essay-correction result, study recommendation, or account behavior.

## Application Structure

The structure follows `docs/ARQUITETURA.md` (§10). Folders appear with their first real use.

| Concern | Location |
| --- | --- |
| Entry point | `expo-router/entry` (`main` in `package.json`) |
| App composition (providers, navigation) | `src/app/` |
| Business contexts (`questions`, `routine`, `mock-exams`, `essay`, `performance`) | `src/features/<context>/` with `commands/`, `queries/`, `events/`, `ui/` |
| Client infrastructure (HTTP, outbox, storage, events) | `src/core/` |
| Shared UI | `src/components/`, with `*.web.tsx` beside native counterparts |
| Theme hooks | `src/hooks/` |
| Theme tokens | `src/constants/theme.ts` |

## Visual Tokens

No design tokens exist yet. The visual identity (palette, typography, radii, spacing, icons) is not approved (`docs/DESIGN.md`); ask for direction instead of inventing it. When tokens are approved, define them in `src/constants/theme.ts` and reuse them everywhere.

## Interaction and Accessibility Baseline

- Design mobile-first for portrait use, then verify that web layouts, when web is enabled, retain a clear reading order and usable width.
- Use `SafeAreaView` where a screen touches device edges.
- Keep primary actions reachable and make pressed, disabled, loading, empty, error, offline, received, and processing states understandable in text as well as color.
- Provide accessible labels for icon-only controls and preserve visible focus on web.
- Respect reduced-motion preferences where the platform supports them; animation must communicate a state change, not merely decorate the screen.
- Command states (`queued-locally`, `sending`, `received`, `processing`, `completed`, `failed`) and the `asOf` of projected data follow `docs/ARQUITETURA.md` (§9). Show only values supplied by an approved contract and distinguish unavailable, stale, processing, and failed data.

## Visual Acceptance Checklist

- Does the change respect the layers and import rules of `docs/ARQUITETURA.md`?
- Is the intended action clear without relying on color or an icon alone?
- Does it avoid invented study content, scores, or correction results?
- Are asynchronous states (received, processing, completed, failed) honest and understandable?
- Does it remain usable in a narrow portrait viewport?
