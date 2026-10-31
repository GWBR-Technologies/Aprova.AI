# Design Quality Rules for Aprova.AI

Use these rules with `design.md` and the current source tree. They keep the starter application coherent while its product requirements are still being defined.

## Start From Evidence

- Inspect the actual feature, components, theme, hooks, and platform override before designing a change.
- Preserve the React Native patterns and the layer structure already present in the repository.
- Treat the current Home, tab labels, Expo assets, and placeholder components as starter content, not approved product copy or information architecture.
- Do not borrow domain language, palettes, workflows, or interface structures from unrelated projects or templates.

## Keep the Interface Purposeful

- Give each screen one clear primary task and a visible hierarchy.
- Prefer a small number of well-labelled controls over decorative cards, badges, gradients, floating controls, glass effects, or generic dashboard tiles.
- Add a component only when it serves a concrete interaction or content need.
- Use the existing theme tokens and spacing scale. Extend them semantically only when an approved feature requires it.
- Keep text concise, localized when localization is introduced, and appropriate to the product requirement rather than generic starter copy.

## Study Data and AI Output Safety

- Show scores, performance, essay corrections, and recommendations only when they come from an approved contract, and show when the data was last projected (`asOf`).
- Never fabricate questions, answer keys, scores, performance trends, essay corrections, or pedagogical advice.
- Never show raw AI output or provider error details; show a clear message and a recovery action.
- Make unavailable, pending, processing, stale, and failed states explicit. Do not make an unfinished action appear complete: a received command is not a completed one.
- Confirm destructive actions when data deletion or another irreversible action is later implemented.

## States and Accessibility

- Cover normal, pressed, focus, disabled, loading, empty, error, recovery, offline, received, and processing states when the feature makes them relevant.
- Do not rely on color, motion, an icon, or gesture alone to communicate meaning.
- Use native controls where possible, accessible labels for icon-only actions, readable text contrast, and touch targets appropriate to mobile use.
- Keep keyboard focus and logical reading order usable on the web implementation.
- Respect user motion preferences and avoid animation that obscures state or delays the main task.

## Cross-Platform Checks

- Prefer shared React Native code; isolate browser-specific behavior in `.web.tsx` files.
- Check safe areas, narrow portrait layouts, text scaling, overflow, and dark mode (when it exists) for UI changes.
- Check the web route when navigation or a shared component has changed.

## Review Questions

1. Is every visible element supported by the requested task or existing source?
2. Are the user-visible states honest and understandable?
3. Does the change reuse the existing tokens and components where appropriate?
4. Does the interface remain usable on a small portrait screen and the web implementation?
5. Has the design avoided inventing study data, correction criteria, or AI behavior?
