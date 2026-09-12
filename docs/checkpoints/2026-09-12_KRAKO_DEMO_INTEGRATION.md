# Krako demo integration

Branch: `feat/mission-runtime-work`.
Verified starting GitHub/checkout HEAD: `5f55be18c0cf0534715bbe8070d20e964c4d76ce`; clean checkout.
Implementation HEAD: `28d03387774921cc40ba5719b0474ae987ee97f9`.
GitHub Git Data tools published the implementation because shell git push has no credentials. Its tree SHA exactly matches the tested local tree (`9cb053444c0b90249102c8825e578b940dc3f723`). The documentation commit follows this implementation commit. Use `git rev-parse HEAD` for the current branch tip.

Read the four requested checkpoints and repository instructions. MP exec and run-script both return connector internal errors; its actual worktree, HEAD, environment and running server could not be inspected. MSM2-1 has no Nerve checkout at the expected project path and no OpenAI key in the connector environment. No Mac files or environment were changed.

## Shipped

- `/missions?demo=krako` ignores a previous localStorage mission and opens the actual supplied PNG, `krako.wtf`, exact requested goal and creative brief. Preset enforces OpenAI, fresh planning and one final review. A missing server key disables launch with an explanation.
- Active missions recognize the persisted brief and retain Krako identity after refresh. The graph uses actual planned specialist capabilities; no prescribed/fake count or topology.
- The existing finalization gate is presented as one founder judgment: back the proposed brand direction and Drop 001, balancing mystery with product clarity. Actual model judgment and draft remain inspectable.
- Krako approval controls appear on `/attention?id=<mission-id>`; workspace links there. Approval posts to the existing endpoint with the same ID and an explicit creative-package-only decision record. Decline cancels. No publication or manufacturing authorization is implied.
- Final presentation: actual counts, supplied-logo apparel/Instagram/landing visual studies, five requested Markdown section cards, founder judgment and decision record. Visual studies are labeled app-rendered concepts, not model-created photo assets. Original Markdown/source/download remain available. Missing section headings are surfaced, never fabricated. Independently normalize fenced model drafts before displaying the runtime-appended decision record.
- Generic runtime, API handlers, persistence schema, graph logic and existing Markdown renderer are unchanged. No integrations, upload system or refactor.

## Verification and evidence

- 110 tests passed: existing 108 plus two Krako tests (37 core + 22 channel + 51 web). Tests use the inherited offline provider mocks; telemetry disabled.
- Workspace typecheck and production build passed. Inherited CopilotKit/Google Vertex dynamic-dependency build warnings remain.
- Existing browser suite: all 12 checks passed, including P0, graph gestures, Markdown, persisted approval/resume and fresh-input pathway reuse.
- Krako browser QC: actual HTTP attention approval resumes the same persisted mission, 3 scripted specialists, exactly 1 request/decision and 1 artifact, five sections, valid PNG, refresh persistence and matching download. Desktop and 390px mobile have no horizontal overflow or JavaScript page errors.
- `docs/qc/krako-demo/result.json` and adjacent PNGs are **offline QC fixtures**, not live OpenAI evidence. The composer create request is inspected/intercepted in QC to avoid another run; attention GET/POST, runtime finalization, polling and downloads are real.
- agent-browser could not start its daemon; Playwright/Chromium verified both browser flows, followed by screenshot inspection.

**Still blocked:** no live Krako OpenAI run and no MP deployment could be performed from this session. The earlier generic live pass remains historical evidence only. Do not call this an end-to-end live Krako success or record the QC fixture as the live demo.

## Recording on MP

After stopping the existing Nerve server in its own terminal, inspect/preserve local changes and `.env`/`.nerve-data`, then from the canonical checkout:

```bash
cd /Users/albertkim/02_PROJECTS/68_Nerve
git status --short
git branch --show-current
git pull --ff-only origin feat/mission-runtime-work
npm run dev
```

Expected branch is `feat/mission-runtime-work`. Stop if the branch differs or pull reports conflicts. Dependencies did not change in this milestone. Default `npm run dev` uses port 3100 and loads the existing root `.env`.

1. Open `http://127.0.0.1:3100/missions?demo=krako`. Show PNG/domain/goal.
2. Click **Launch Krako mission** once. The button requires the existing server OpenAI key. Let planning/production reach the single pause; do not start another run.
3. Show actual specialist graph; click **Open mobile attention surface ↗**. Its generated URL is `http://127.0.0.1:3100/attention?id=<the same UUID>`.
4. Use Chrome responsive viewport 390 × 844 in that tab for the mobile attention demonstration. The loopback-only surface is not a remote phone/WhatsApp integration.
5. Review the proposed direction/drop and actual draft; click **Approve direction & finalize**.
6. Return to the original workspace tab (`/missions?id=<same UUID>`); it polls and resumes. Show **Mission result**, actual counts, visual studies, five creative sections and Markdown download. Optionally save the successful pathway; do not run another live test.

Optional preparation instead of step 2: run `node --env-file=.env --import tsx apps/web/scripts/prepare-krako-demo.ts` from the repo root with the **same absolute `NERVE_DATA_DIR` as the demo server**. It performs one live run and leaves it paused, printing the ID; it does not approve. `--fixture` is explicitly offline QC only. Do not execute preparation and the UI launch for the same recording.

Milestone stops here. No WhatsApp/Instagram calls, account creation, posting, public deployment, main merge or hackathon submission.
