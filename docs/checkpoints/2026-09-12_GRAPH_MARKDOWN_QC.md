# Graph interaction and Markdown checkpoint

User feedback: the graph could not be dragged, four siblings overlapped, and web results displayed raw Markdown.

Implemented:
- Drag nodes with attached edges; pan the background; zoom with controls; reset layout.
- Preserve display positions across runtime polling. These controls change the view, not mission dependencies.
- Space sibling nodes without overlap and retain node selection and keyboard activation.
- Render task output, attention drafts, and final artifacts as Markdown, including GFM tables and fenced code. Final artifacts retain a collapsible source view and download.
- Skip embedded HTML and retain Markdown URL sanitization. Images are links rather than automatic remote loads.

Validation:
- All 105 regression tests and workspace typechecks passed with telemetry disabled.
- Production web build passed.
- Browser check passed all 11 assertions in `docs/qc/mission-runtime/browser-result.json`, including original P0 completion, approval/resume, persistence, pathway reuse, drag/pan/zoom/reset, four sibling layout, and Markdown rendering.
- Screenshot evidence updated in the same directory. Browser run used local analysis; the four-sibling and rich Markdown checks use explicit view fixtures. This is not additional live OpenAI evidence.

Existing user-reported live OpenAI validation remains documented in `2026-09-12_OPENAI_LIVE_PASS.md`. Existing saved mission artifacts can be reformatted without another model call. The user's Mac must fetch this checkpoint and reinstall dependencies before restart.
