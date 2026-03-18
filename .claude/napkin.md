# Napkin Runbook

## Curation Rules
1. **[2026-03-18] Keep only reusable repo guidance**
   Do instead: add only recurring gotchas or preferences that will matter in later sessions.

## Execution & Validation (Highest Priority)
1. **[2026-03-18] Verify editor interactions after geometry changes**
   Do instead: run lint and manually retest drag, resize, selection, and grouped-element behavior after touching `EditorCanvas`.
2. **[2026-03-18] Treat account deletion as an authenticated server action**
   Do instead: derive the acting user from the server session/cookies and never trust a client-sent `userId` for destructive account APIs.

## Shell & Command Reliability
1. **[2026-03-18] Prefer targeted `rg` and `sed` reads**
   Do instead: inspect only the relevant files/line ranges before editing large Next.js route or canvas files.

## Domain Behavior Guardrails
1. **[2026-03-18] Group drag alignment must use the selection bounds**
   Do instead: calculate guides and snapping from the combined bounding box of the dragged selection, not from the first element only.
