---
platforms: [ios, android, web]
orientation: portrait
router: expo-router
---

# medidorPressao Design Context

## Repository Status

This is an Expo 57 application written in TypeScript and React Native, with Expo Router. It targets iOS, Android, and a static web build; `app.json` sets the preferred orientation to portrait.

The repository name and history describe a digital pressure and compression sensor project. The application is still at its starter stage: `src/app/index.tsx` contains an empty home screen, and no measurement model, supported sensor, unit, range, user group, storage behavior, or clinical requirement has been implemented.

Do not turn this limited context into a product specification. Ask for a requirement before adding any measurement flow, reading, health claim, threshold, alert, chart, history, device connection, or account behavior.

## Current Application Structure

| Concern | Current location |
| --- | --- |
| File-based routes and application layout | `src/app/` |
| Shared UI | `src/components/` |
| Platform-specific UI | `*.web.tsx` files beside their native counterparts |
| Theme tokens | `src/constants/theme.ts` |
| Theme hooks | `src/hooks/` |
| Browser font variables | `src/global.css` |

The existing navigation and themed components are starter patterns. Reuse them when they fit the request, but do not treat their placeholder labels, assets, or routes as product requirements.

## Existing Visual Tokens

Use the tokens in `src/constants/theme.ts` as the source of truth until a product design is approved.

| Token group | Available values |
| --- | --- |
| Light colors | `text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary` |
| Dark colors | matching values for the same keys |
| Spacing | `2, 4, 8, 16, 24, 32, 64` |
| Content width | `MaxContentWidth = 800` |
| Fonts | platform-selected `sans`, `serif`, `rounded`, and `mono` families |

Keep light and dark themes working. Do not introduce new fixed colors or spacing scales when an existing token fits; propose an extension only when the feature requires a semantic value that does not exist.

## Interaction and Accessibility Baseline

- Design mobile-first for portrait use, then verify that web layouts retain a clear reading order and usable width.
- Use `SafeAreaView` where a screen touches device edges.
- Keep primary actions reachable and make pressed, disabled, loading, empty, error, and unavailable states understandable in text as well as color.
- Provide accessible labels for icon-only controls and preserve visible focus on web.
- Respect reduced-motion preferences where the platform supports them; animation must communicate a state change, not merely decorate the screen.
- If a future screen presents readings, show only values supplied by the approved contract and distinguish unavailable, stale, invalid, and loading data.

## Visual Acceptance Checklist

- Does the change reuse the existing Expo and React Native structure?
- Does it work in both light and dark themes when it touches shared UI?
- Is the intended action clear without relying on color or an icon alone?
- Does it avoid unsupported claims or invented measurement information?
- Does it remain usable in a narrow portrait viewport and on the web override when applicable?
