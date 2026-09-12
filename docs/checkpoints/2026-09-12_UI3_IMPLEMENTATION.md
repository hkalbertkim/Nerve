# UI 3 implementation checkpoint

Source of truth: `feat/mission-runtime-work`, starting HEAD `c7893225574bbf791f59686e5a113384eddb0546`. All five existing checkpoints and root AGENTS instructions were read. The user supplied the dark/orange UI 3 reference and explicitly instructed not to open Mobbin; Mobbin was not used.

## Changes

- Scoped near-black/orange theme for `/`, `/missions`, and `/attention`, with pulse identity and responsive navigation to implemented routes.
- P0 live activity, highlighted decision card, readable risk facts, selectable choices and explicit confirmation. Selecting a choice alone never resumes execution. Restart and subsequent decisions clear selection.
- Mission graph occupies full width when no attention is pending. Pending review appears beside the graph on wide screens and stacks on smaller screens. Node dragging, pan, zoom, reset and inspection remain intact.
- Routine trace is collapsed by default and remains downloadable. P0 context remains expandable. Markdown, code and table surfaces use the dark palette.
- Navigation carries the current mission ID into the attention screen. No fake settings, messaging delivery or agent counts were added.
- Runtime, providers, persisted state schema, server approval boundaries and existing unit tests were not modified.

## Verification

- Workspace typechecks and 105 existing tests passed.
- Initial browser regression passed all prior checks plus selection-before-confirmation assertions.
- Production build passed (Next.js 15.5.25, exit 0). Existing Google Vertex provider-utils dynamic dependency warning remains in the inherited CopilotKit API import chain.
- Final browser regression passed all 12 reported checks, including both explicit P0 confirmations, real total 920, fresh pathway total 99, persistence, graph interactions and sanitized Markdown. Pending and resolved 390px attention screens have no horizontal overflow. No JavaScript page errors.
- Visually inspected desktop mission/decision and mobile pending-attention screenshots. Evidence is in `docs/qc/mission-runtime/`, including `ui3-decision-pricing.png`, `ui3-decision-launch.png` and `ui3-attention-pending-mobile.png`.

Browser script: `apps/web/scripts/check-missions-browser.mjs`. Uses temporary Playwright Core/Chromium dependencies, same-origin requests only and telemetry disabled. The agent-browser executable is unavailable in this environment. Screenshots use system fallback fonts because external page resources are blocked in QC.

## Scope and continuation

These changes are in the GitHub-backed isolated checkout, not the user's Mac checkout. No new live OpenAI calls, external messaging integration, public deployment, main merge or hackathon submission were performed. The earlier user-reported OpenAI evidence remains in `2026-09-12_OPENAI_LIVE_PASS.md`.

To continue on a Mac, first inspect its worktree, branch, HEAD and runtime data directory; preserve local changes and `.env`. Fetch this branch and fast-forward only if safe. Restart the existing demo server from its actual checkout with the existing environment and mission data directory. Do not blindly start a fresh data directory if the live mission must remain visible.
