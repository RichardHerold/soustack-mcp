# AGENTS.md — soustack-mcp

## Prime directive
- Prefer small, safe changes with fast feedback.
- Keep diffs tight and reversible. No drive-by refactors.
- If uncertain about intent, search the repo for precedent and follow existing patterns.

## How to validate
- Always run: npm test
- If tests fail, fix forward (don’t disable tests unless explicitly instructed).

## PR hygiene
- Use clear PR titles: "mcp: <verb> <object>" (e.g., "mcp: fix tool schema validation")
- Include a short checklist in the PR description:
  - [ ] npm test passes
  - [ ] new/updated tests or fixtures (if behavior changed)
  - [ ] docs updated (if public behavior changed)

## Coding conventions
- Match existing style and structure.
- Avoid breaking public interfaces unless the task explicitly says so.
- Prefer adding tests that reproduce the bug before fixing it.

## When work is ambiguous
- Propose 2–3 options with tradeoffs, pick the safest default, and proceed.
