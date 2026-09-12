# Nerve Mission runtime — QC checkpoint

The implementation milestone is commit `75ba927cdd6fdf2bc84f5337134caaf0f8d4add5` on `feat/mission-runtime-work`, PR #2.
This follow-up records completed local/browser QC and fixes discovered during verification.

## Passed

- Full workspace typecheck.
- Full regression suite: 105 passed, zero failed (37 agent-core + 22 channel + 46 web).
- Production build: Next.js 15.5.25, exit 0, including `/`, `/missions`, `/attention`, and `/api/missions`.
- Actual browser: local JSON mission produced the correct revenue sum of 920.
- Before approval the mission paused with a draft and zero final artifacts.
- A different page at `/attention?id=...` submitted the decision; the original page resumed and exposed the Markdown artifact.
- Refresh preserved and retrieved the same completed result.
- A successful pathway was saved and used on a fresh mission; its actual result reflected new source data (sum 99) and no previous approvals were inherited.
- A 390px-wide attention surface had no horizontal overflow.
- The existing P0 completed all 42 events after its two decisions.
- No JavaScript page errors or Next error overlays were observed.

## Hardening changes

- P0 and mission routes skip unnecessary CopilotKit chat initialization; other routes retain their existing provider. This prevents unused credential/transport initialization errors on the demo screens.
- The new-mission form has explicit open state, so restoring a mission cannot override the user's form toggle during polling.
- Polling cannot overwrite a newly selected mission with an older response.
- Workflow telemetry is disabled in CI, matching the verified local commands.

## Evidence

- `docs/qc/mission-runtime/browser-result.json`
- `docs/qc/mission-runtime/workspace-paused.png`
- `docs/qc/mission-runtime/workspace-complete.png`
- `docs/qc/mission-runtime/attention-mobile.png`
- Reproducible browser script: `apps/web/scripts/check-missions-browser.mjs`

Browser QC used Playwright Core and Chromium 153 from a temporary install. The primary agent-browser daemon could not start in the execution environment. The alternative Chromium package initially disabled web security, suppressing the Origin header; that test-browser flag was removed, and the app's same-origin boundary was preserved. Only local page requests were allowed during browser QC. Screenshots use fallback fonts because third-party font requests were blocked.

## Remaining blockers / claims not made

- MP connector still returns MCP internal errors. No changes have been applied to `/Users/albertkim/02_PROJECTS/68_Nerve`, and its worktree, credentials, and running server remain unverified.
- No live OpenAI API call was made. The adapter and planner are implemented and tested with injected provider responses; local browser QC uses actual deterministic tools.
- No Slack/Telegram/voice/push integration. The second screen is a separate browser page connected to the real server state.
- Single process, loopback-only, sequential task execution. See the quickstart for the exact limitations and deployment requirements.
- Submission, public hosting, and merging into main have not been performed. This is a tested implementation branch, not a claim that the live submission environment is ready.

## Next execution step

After MP connectivity is restored: inspect its branch/HEAD/status and applicable instructions, preserve existing changes, bring in `feat/mission-runtime-work` safely, run the verification commands, start the app, and exercise one real OpenAI mission against the configured account. Do not print or commit `.env` contents. A real external messaging surface would require its own configured and verified integration.
