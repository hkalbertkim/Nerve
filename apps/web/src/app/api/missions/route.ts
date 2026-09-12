import { resolve } from 'node:path';
import { MissionRuntime } from '@/lib/server/mission-runtime';
import { missionHandler } from '@/lib/server/mission-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const globalRuntime = globalThis as unknown as { nerveMissions?: MissionRuntime };
const engine = globalRuntime.nerveMissions ??= new MissionRuntime(resolve(process.env.NERVE_DATA_DIR || '.nerve-data'));
export const GET = missionHandler(engine);
export const POST = GET;
