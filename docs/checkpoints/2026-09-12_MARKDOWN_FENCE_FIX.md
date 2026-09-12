# Whole-document Markdown fence display fix

User screenshots from MP confirm OpenAI specialists, approval pause, approval completion (7/7, one artifact), saved pathway selection, fresh input results (Alpha 100/300, Beta 200/1200), and approval pause/completion on a further reused run. These are user-observed UI evidence, not a new automated live API run in Work.

The latest model output appeared as a code block containing an entire Markdown report. Display now unwraps a single complete outer markdown/md fence. Bare fences require a heading plus a list or table. Explicit programming-language fences, mixed documents, incomplete wrappers and inner shorter code fences remain intact. Stored output and downloads are unchanged.

Validation: workspace typecheck and 108 tests passed (37 + 22 + 49). A real react-markdown/remark-gfm server render confirms the fenced fixture produces a heading and table and excludes embedded scripts. No new live OpenAI calls were made.

MP update: stop the existing server, git pull --ff-only origin feat/mission-runtime-work, npm run dev, refresh the existing mission. No dependency change is needed for this fix; npm ci was already needed/completed for the prior Markdown dependency update. Do not delete .nerve-data or .env.

Remaining content limitation: model reports have inferred dollar currency from unitless input; this fix only addresses presentation.

Production build passed; inherited CopilotKit dependency warnings remain.
