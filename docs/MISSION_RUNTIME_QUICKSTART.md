# Mission runtime

The original 42-event P0 remains at `/`. The working mission workspace is `/missions`.
The separate decision surface is `/attention?id=<mission-id>`; its real server-side decision resumes the original mission.
This is a separate browser screen, not Slack, Telegram, voice, or a mobile notification integration.

## Run

Use Node 22+ and the repository lockfile:

```bash
npm ci
COPILOTKIT_TELEMETRY_DISABLED=true DO_NOT_TRACK=1 npm run verify
COPILOTKIT_TELEMETRY_DISABLED=true NEXT_TELEMETRY_DISABLED=1 npm run build --workspace web
COPILOTKIT_TELEMETRY_DISABLED=true DO_NOT_TRACK=1 npm run dev:web
```

Open `http://127.0.0.1:3100/missions`.
No credentials are required for local source analysis. It computes real text/JSON statistics and creates a downloadable Markdown report; it is not an LLM agent simulation.

For model-backed missions, configure the existing root `.env` privately:

```dotenv
OPENAI_API_KEY=your-key
NERVE_MODEL=gpt-4.1-mini
COPILOTKIT_TELEMETRY_DISABLED=true
DO_NOT_TRACK=1
```

Restart the server, select OpenAI specialists, describe an outcome, and paste relevant source context. `NERVE_MODEL` takes precedence over `MODEL`; use a model available to the account. This runtime calls the OpenAI Responses API directly; the inherited CopilotKit routes remain available but do not orchestrate this new mission engine.

## Verify the workflow

1. Start a local JSON mission with at least two numeric records. Leave review unchecked: it must finish without interrupting the human.
2. Start a text mission and compare the graph. Text and JSON attach different analyst capabilities; JSON additionally attaches a validator.
3. Enable review for a fresh mission. It must pause with an actual draft and no final artifact.
4. Open the separate attention screen. Approve there; observe the original workspace finish. Download the result, reload, and download the same result again.
5. Repeat and decline. The mission must cancel without creating a final artifact.
6. Save a completed pathway. Start a new mission using it and new source data. Tasks are reused; outputs and previous approvals are not. Review policy is explicitly chosen anew.
7. In OpenAI mode the inspector asks the model to select 1–3 analysis roles based on the mission goal. Their work enters shared memory and a producer synthesizes it. No external browsing or publication tools are exposed.
8. A model error marks the task failed. Retry preserves completed work and retries the failed task.

## Runtime contract and limits

- Source, work outputs, decisions, topology, events, and result are saved atomically in `apps/web/.nerve-data` when launched with the standard workspace scripts. `NERVE_DATA_DIR` can override the directory.
- Treat the directory as private runtime data; it is excluded from Git.
- One self-hosted Node process owns this directory. It serializes writes and executes tasks without depending on a browser timer. Reading a running mission after a process restart restarts its drive loop; a model call interrupted before persistence may be repeated.
- This is not a multi-process/serverless queue. Do not run two writers against one data directory.
- Mission APIs accept loopback hosts and same-origin JSON mutations. Browser tabs share the local mission store. Remote deployment or access from another device requires deliberate authentication and a trusted-origin policy; changing bind address alone is insufficient.
- Approval authorizes local artifact finalization only. It never publishes, spends money, sends a message, or authorizes arbitrary tools.
- Specialists execute sequentially in this first worker. The graph models dependencies, not proof of parallel execution.
- Local mode provides deterministic source analysis. OpenAI mode provides goal-specific synthesis from supplied evidence. Neither mode claims external research.
- Learned pathways store successful execution patterns. They are reusable templates, not model fine-tuning or measured automatic quality optimization.

## Files

- `src/lib/mission.ts`: inherited generic state primitives.
- `src/lib/server/mission-runtime.ts`: worker, context-driven task composition, disk memory, provider call, gates, retry, artifacts and pathways.
- `src/lib/server/mission-http.ts`: validated HTTP commands and local origin boundary.
- `src/app/api/missions/route.ts`: one worker instance per process.
- `src/components/mission-workspace.tsx`: workspace, graph, and separate attention surface.
- `src/lib/server/mission-runtime.test.ts`: outcome and regression tests.

## Browser QC

The optional browser script starts and stops its own local development server, blocks third-party requests, and writes screenshots plus a JSON result under `docs/qc/mission-runtime`. Install `playwright-core` and `@sparticuz/chromium` into a temporary directory, set `NERVE_BROWSER_MODULE_ROOT` to that directory, then run from the repository root:

```bash
NERVE_BROWSER_MODULE_ROOT=/path/to/browser-dependencies node apps/web/scripts/check-missions-browser.mjs
```

See the [QC checkpoint](checkpoints/2026-09-12_MISSION_RUNTIME_QC.md) for evidence and remaining live-environment blockers.

## Live OpenAI readiness check

After the root `.env` contains a working `OPENAI_API_KEY`, run:

```bash
npm run check:missions:live --workspace web
```

This makes up to five real model calls using synthetic project data, verifies specialist planning and output, pauses before artifact finalization, authorizes only that local test artifact, checks persisted read-back, and saves a pathway. It prints no credentials. It creates a real mission and private QC JSON in the normal data directory, which can be opened in the workspace. This is an execution check; inspect the result separately for semantic quality. Without a key it exits with code 2 before creating a mission or making requests.
