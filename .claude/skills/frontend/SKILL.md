---
name: frontend
description: Design, implement, review, or fix Expo screens, components, routes, visual states, and responsive web behavior using the local application patterns.
when_to_use: Use for requests involving UI, frontend bugs, screens, components, forms, navigation, responsiveness, accessibility, visual polish, or user flows.
argument-hint: "[feature, screen, component, or UI issue]"
---

# Frontend Implementation Skill

Use this skill for `$ARGUMENTS`.

## Mandatory Context

Before making a frontend decision, read `${CLAUDE_SKILL_DIR}/design.md` and `${CLAUDE_SKILL_DIR}/ai-design-rules.md` completely. Then inspect the affected route, component, hook, and the current theme in `src/constants/theme.ts`.

`design.md` records only decisions supported by this repository. It does not authorize inventing a product domain, sensor protocol, clinical rule, or visual system.

## Discovery Before Implementation

1. Inspect the affected route in `src/app/`, shared components in `src/components/`, supporting hooks, and existing platform-specific files.
2. Reuse the current theme tokens, themed primitives, Expo Router pattern, and `.web.tsx` overrides when applicable.
3. Identify required user-visible states: default, pressed, focus, disabled, loading, empty, success, error, offline, and pending—only when they apply to the requested behavior.
4. Keep the work scoped to the requested UI behavior. Do not add data services, device connections, persistence, or authentication without explicit approval.

## Implementation Rules

- Use React Native primitives and `StyleSheet` for shared native UI. Place browser-only behavior in the existing `.web.tsx` files or `src/global.css`.
- Preserve Expo Router's file-based routes and check both native and web tab implementations before changing navigation.
- Reuse `Colors`, `Fonts`, `Spacing`, `MaxContentWidth`, `ThemedView`, and `ThemedText` before creating a new primitive.
- Keep controls understandable without color, pressed state, or icons alone. Provide clear labels, accessible names, visible focus, and generous touch targets.
- Do not create fictional measurements, ranges, history, units, sensor states, or clinical guidance. Request the missing contract first.
- Avoid decorative dashboards, metrics, or effects that do not support the user's task.
- Do not introduce libraries, generated UI, or a second styling system without approval.

## Validation and Completion

- Run `npm run lint` when it applies.
- Run a relevant local platform command only when a suitable local target is available.
- Report the local design requirements applied, reused patterns, covered states, validation results, and any product or device decision still needed.
