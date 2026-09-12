# OpenAI live verification readiness

- Rechecked MP access: `krako_mp.exec_command` still returns MCP internal error. Its project environment is unknown.
- Rechecked isolated execution environment: no OPENAI_API_KEY and no project root .env. Only presence was inspected; no credential values were read or printed.
- GitHub CI for implementation/QC commit 4dc8ecbdf94e2730a365df748c8b77a11d690232 succeeded (verify run 34690030325).
- Added `npm run check:missions:live --workspace web` to exercise a real bounded OpenAI mission with synthetic inputs, inspectable specialist outputs, explicit test-artifact approval, persistence, and pathway promotion.
- The missing-key path was executed: exits 2 before mission creation or network calls. This is not a successful live OpenAI check.
- The normal application/runtime was not changed in this checkpoint.

## Required next inputs

A working OpenAI API key must be configured privately in the project root .env (`OPENAI_API_KEY=...`). A currently valid existing key is sufficient; creating a new key is optional. `NERVE_MODEL` can explicitly select the account's available model.

MP connectivity must also be restored before this Work can inspect or modify the user's Mac checkout. A new API key does not resolve the MCP connection failure. Once connected, preserve existing .env settings, inspect actual Git state, synchronize the implementation safely, and execute the live check. Do not paste credentials into tracked files or test evidence.
