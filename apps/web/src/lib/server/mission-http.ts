import { z } from 'zod';
import { MissionError, MissionRuntime } from './mission-runtime';
const id = z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);
const command = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('create'), goal: z.string().trim().min(3).max(1000), source: z.string().trim().min(1).max(24000), mode: z.enum(['local', 'openai']), requireReview: z.boolean(), pathwayId: id.optional() }).strict(),
  z.object({ operation: z.literal('decide'), id, attentionId: id, approved: z.boolean(), comment: z.string().max(2000).default('') }).strict(),
  z.object({ operation: z.literal('retry'), id }).strict(),
  z.object({ operation: z.literal('promote'), id }).strict(),
]);
export function missionHandler(runtime: MissionRuntime) {
  return async (request: Request) => {
    const url = new URL(request.url);
    const host = request.headers.get('host') || url.host;
    const origin = `${url.protocol}//${host}`;
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
    // This self-hosted demo intentionally shares missions across local tabs/surfaces.
    // Keep loopback binding; remote multi-user deployment requires authentication.
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) return reply({ error: 'Mission demo accepts loopback hosts only.' }, 403);
    if (request.method === 'POST' && (request.headers.get('origin') !== origin || !request.headers.get('content-type')?.startsWith('application/json'))) return reply({ error: 'Use this app’s own mission controls.' }, 403);
    try {
      if (request.method === 'GET') {
        const missionId = url.searchParams.get('id');
        if (!missionId) return reply({ pathways: await runtime.pathways(), openai: !!process.env.OPENAI_API_KEY });
        const run = await runtime.get(id.parse(missionId));
        if (url.searchParams.has('artifact')) {
          if (run.state.status !== 'complete' || !run.result) throw new MissionError('No completed artifact is available.');
          return new Response(run.result, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="nerve-${missionId}.md"`, 'Cache-Control': 'no-store' } });
        }
        if (url.searchParams.has('trace')) return new Response(JSON.stringify(run, null, 2), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="nerve-${missionId}-trace.json"`, 'Cache-Control': 'no-store' } });
        if (run.state.status === 'running') runtime.drive(missionId);
        return reply({ run });
      }
      if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
      const body = await request.text();
      if (body.length > 32000) return reply({ error: 'Mission input is too large.' }, 413);
      const input = command.parse(JSON.parse(body));
      if (input.operation === 'promote') return reply({ pathway: await runtime.promote(input.id) });
      const run = input.operation === 'create' ? await runtime.create(input)
        : input.operation === 'retry' ? await runtime.retry(input.id)
        : await runtime.decide(input.id, input.attentionId, input.approved, input.comment);
      if (run.state.status === 'running') runtime.drive(run.state.spec.id);
      return reply({ run }, input.operation === 'create' ? 201 : 200);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) return reply({ error: 'Invalid mission request.' }, 400);
      if (error instanceof MissionError) return reply({ error: error.message }, 409);
      return reply({ error: 'Mission storage is unavailable. Check server logs and disk access.' }, 500);
    }
  };
}
