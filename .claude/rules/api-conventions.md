---
paths:
  - "src/**/*.{ts,tsx}"
  - "contracts/**/*.ts"
  - "backend/**/*.ts"
---

# Data, Contract, and Messaging Boundary Rules

## Current Scope

The architecture (EDA + CQRS, BullMQ + Redis, AI Workers) is defined in `docs/ARQUITETURA.md`. The backend in `backend/` implements milestones B0 to B4 (status in §21 of `docs/IMPLEMENTACAO-BACKEND.md`), and the shared contracts live in `contracts/`. The app in `src/` implements the HTTP client, session, local outbox, and the essay commands and queries against those contracts.

Do not introduce a new network service, queue, persistence layer, account flow, telemetry, or AI integration, or a command, query, or event outside the catalog, without an explicit request and an approved contract in `contracts/`. Follow the layer and import rules in `docs/ARQUITETURA.md` (§10).

## Commands, Queries, and Events

- A command expresses an intent, carries `commandId` (the idempotency key) and `issuedAt`, and is answered with `202 Accepted`. Never wait for the AI or a Worker inside a command.
- A query only reads from read models, returns `asOf`, and never changes state.
- An event is an immutable fact with the envelope defined in the architecture document; every consumer is idempotent by `eventId`.
- Do not create a command, event, or queue that is not listed in the architecture document; add it there first.
- The AI is called only by Workers, behind `AiPort`; its output is validated before it affects state.

## Input and Study Data

- Validate user-entered values and values received at an application boundary (command, query, event, AI output) before they affect UI state or calculations.
- Model timestamps (`occurredAt`, `asOf`), source, and validity explicitly.
- Do not invent questions, answer keys, scores, essay-correction criteria, or pedagogical recommendations.
- Keep displayed data distinct from editable drafts (such as essay text) and from loading, processing, or error states.

## Failures and Tests

- Provide an understandable recovery action for unavailable data, rejected commands, interrupted work, and failed processing.
- Do not expose implementation details, identifiers, tokens, raw AI output, or raw failure payloads to users.
- Test successful, invalid, absent, and failure cases for a newly introduced boundary (see `testing.md`).
