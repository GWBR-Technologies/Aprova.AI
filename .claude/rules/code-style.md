---
paths:
  - "**/*.{ts,tsx}"
---

# TypeScript, React Native, and Expo Rules

## TypeScript

- Preserve the established file structure, naming, exports, and import style.
- Prefer explicit types at system boundaries: component props, route parameters, persisted data, and device or network payloads.
- Prefer inference for obvious local values.
- Do not use `any`, `@ts-ignore`, broad type assertions, or disabled lint rules to silence an error.
- Keep functions and components focused on one responsibility.
- Do not create reusable abstractions for a single use case.

## React Native and Expo Router

- Keep route components in `src/app/`, shared components in `src/components/`, hooks in `src/hooks/`, and theme tokens in `src/constants/theme.ts`.
- Preserve Expo Router's file-based routing and existing `.web.tsx` platform overrides.
- Use React Native primitives and `StyleSheet` for shared mobile UI. Keep browser-specific CSS in the existing web-specific files and `src/global.css`.
- Keep data loading, mutations, and rendering responsibilities separated according to existing project patterns.
- Do not introduce state management, form, validation, or styling libraries without approval.
- Group third-party imports, local relative imports, and `@/` imports with a blank line between groups.

## Comments

- Comment decisions, constraints, or non-obvious behavior only.
- Do not write comments that restate the code.
- Do not create TODO comments.

## Visual System

- Reuse `Colors`, `Fonts`, `Spacing`, `MaxContentWidth`, and existing themed components before adding a new visual primitive.
- Keep light and dark color modes working when changing shared components.
- Do not hardcode colors, typography, spacing, or interactive states when an existing token or component variant exists.
- The current product design and measurement requirements are not defined. Ask for direction instead of inventing medical, clinical, or device-specific behavior.

## Types

- Keep a type near its single consumer; move it to a shared location only after a second real use.
- Prefer descriptive type and interface names. Do not add artificial prefixes or suffixes.

## Accessibility

- Use semantic controls and accessible labels.
- Preserve keyboard access, visible focus, disabled states, loading states, and error feedback.
- Use accessible labels, roles, and state descriptions. Add stable test IDs only when accessible queries are insufficient.
