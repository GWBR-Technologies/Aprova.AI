---
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript, React Native, and Expo Rules

## TypeScript

- Preserve the established file structure, naming, exports, and import style.
- Prefer explicit types at system boundaries: component props, route parameters, commands, queries, events, persisted data, and network or AI payloads.
- Prefer inference for obvious local values.
- Do not use `any`, `@ts-ignore`, broad type assertions, or disabled lint rules to silence an error.
- Keep functions and components focused on one responsibility.
- Do not create reusable abstractions for a single use case.

## React Native and Layers

- Keep code in the layers defined by `docs/ARQUITETURA.md` (§10): composition in `src/app/`, contexts in `src/features/`, client infrastructure in `src/core/`, shared UI in `src/components/`, hooks in `src/hooks/`, theme tokens in `src/constants/theme.ts`, shared contracts in `contracts/`, the backend in `backend/src/`, and deployment in `infra/` and `.github/workflows/` (configuration and scripts only, never secrets). Subfolders and files appear with their first real use.
- Respect the import rules in each layer's `README.md`; a feature never imports another feature.
- Keep the entry point in `index.ts` at the repository root. Expo Router is not installed; if it is approved, `src/app/` holds only routes (`docs/ARQUITETURA.md`, §10.4). Preserve existing `.web.tsx` platform overrides.
- Use React Native primitives and `StyleSheet` for shared mobile UI. Keep browser-specific CSS in web-specific files.
- Do not create a generic command or query bus; call handlers directly.
- Keep data loading, mutations, and rendering responsibilities separated according to existing project patterns.
- Do not introduce state management, form, validation, or styling libraries without approval.
- Group third-party imports, local relative imports, and `@/` imports with a blank line between groups.

## Comments

- Comment decisions, constraints, or non-obvious behavior only.
- Do not write comments that restate the code.
- Do not create TODO comments.

## Visual System

- Reuse the tokens in `src/constants/theme.ts` and existing shared components, once they exist, before adding a new visual primitive.
- Respect `userInterfaceStyle` in `app.json` (currently `light`); cover both modes if dark mode is introduced.
- Do not hardcode colors, typography, spacing, or interactive states when an existing token or component variant exists.
- The visual identity, study content, and essay-correction criteria are not defined (`docs/DESIGN.md`). Ask for direction instead of inventing them.

## Types

- Keep a type near its single consumer; move it to a shared location only after a second real use. A type used by both the app and the backend lives in `contracts/`.
- Prefer descriptive type and interface names. Do not add artificial prefixes or suffixes.

## Accessibility

- Use semantic controls and accessible labels.
- Preserve keyboard access, visible focus, disabled states, loading states, and error feedback.
- Use accessible labels, roles, and state descriptions. Add stable test IDs only when accessible queries are insufficient.
