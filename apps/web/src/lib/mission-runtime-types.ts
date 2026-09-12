import type { MissionState, NervePathway } from './mission';
export type WorkTask = {
  id: string; name: string; capabilityId: string;
  operation: 'inspect' | 'analyze' | 'draft' | 'validate' | 'finalize';
  dependsOn: string[]; status: 'queued' | 'working' | 'complete' | 'failed';
  instruction: string; output?: string;
};
export type MissionRun = {
  state: MissionState; tasks: WorkTask[];
  mode: 'local' | 'openai'; requireReview: boolean;
  memory: { source: string; work: Record<string, string>; decisions: string[] };
  result?: string; error?: string; revision: number;
  reusedPathwayId?: string;
};
export type LearnedPathway = NervePathway & {
  mode: MissionRun['mode']; tasks: WorkTask[]; requireReview: boolean;
};
