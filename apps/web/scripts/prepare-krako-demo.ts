// Run once to prepare an actual OpenAI mission at its founder pause.
// Offline fixtures are permitted only with the explicit --fixture flag for browser QC.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MissionRuntime } from '../src/lib/server/mission-runtime';
import { KRAKO_GOAL, KRAKO_SOURCE, KRAKO_SECTIONS, krakoSections } from '../src/lib/krako-demo';

async function main() {
const fixture = process.argv.includes('--fixture');
if (!fixture && !process.env.OPENAI_API_KEY) throw new Error('OpenAI is not configured. No mission was created.');
const directory = resolve(process.env.NERVE_DATA_DIR || '.nerve-data');
const draft = `# Krako / Drop 001

## Brand direction
**QC FIXTURE — scripted creative content, not live model output.**
The Unseen Club. Keep the octopus recognisable, make its appearances rare. Palette: ink, bone and the supplied turquoise. Reveal the garment honestly; keep the next drop secret.

## Drop 001
**Signal 001.** Proposed capsule: one heavyweight boxy tee, individually numbered. Proposed quantity: 100; validate manufacturing before any stock or scarcity claims. Price and release date remain unannounced proposals.

## Apparel concept
Proposed 240 gsm cotton, washed black, relaxed shoulders. Small original Krako mascot on the left chest; large tonal octopus silhouette on the reverse, with turquoise 001 at the hem. Bone care label. Production sampling is still required.

## Instagram launch package
1. **The signal.** Cover: original mascot on ink black. Caption: “Something is taking shape. Krako. krako.wtf.” Alt: “White and turquoise octopus on black.”
2. **The detail.** Crop: turquoise hem marker on washed cotton. Caption: “Quiet from a distance. Different up close. Meet Signal 001.” Alt: “Proposed turquoise 001 hem marker.”
3. **The reveal.** Front and back garment study. Caption: “The first form of Krako. Explore Drop 001 at krako.wtf. Release details to follow.” Alt: “Proposed black boxy tee, small front mascot and tonal back print.”

Reel: 0–2s black frame and logo; 2–5s fabric detail; 5–8s front/back concept; 8–10s domain. These are layout briefs; final garment photography is pending.

## Landing-page concept
Headline: **You found the signal.** Subhead: “The first form of Krako. Mystery in the story. Clarity in the garment.” CTA: **Explore Drop 001**. Sections: hero, front/back product details, materials and fit, release updates. Show stock only when verified.

## Founder judgment
Recommend Signal 001: product transparency with narrative mystery. Approve this as the first public identity? The tradeoff is less theatrical secrecy in exchange for buyer trust. Only the founder can commit the brand to that position. Finalize the creative package only; no manufacturing or publication.`;
const model = async (instruction: string) => instruction.startsWith('Plan specialist') ? JSON.stringify({ specialists: [
  { name: 'Brand strategist', instruction: 'Develop the Krako brand identity and mystery/clarity tradeoff.' },
  { name: 'Apparel designer', instruction: 'Define the first capsule and original mascot placement.' },
  { name: 'Launch creative director', instruction: 'Create the Instagram launch package and landing concept.' },
] }) : draft;
const engine = fixture ? new MissionRuntime(directory, model) : new MissionRuntime(directory);
let run = await engine.create({ goal: KRAKO_GOAL, source: KRAKO_SOURCE, mode: 'openai', requireReview: true });
for (let i = 0; i < 12 && run.state.status === 'running'; i++) run = await engine.step(run.state.spec.id);
assert.equal(run.state.status, 'paused', run.error || 'Expected a founder pause');
assert.equal(run.state.attention.length, 1);
assert.equal(run.state.artifacts.length, 0);
const sections = krakoSections(run.memory.work.draft).map(s => s.title.toLowerCase());
const missing = KRAKO_SECTIONS.filter(s => !sections.includes(s.toLowerCase()));
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, 'krako-demo.json'), JSON.stringify({ id: run.state.spec.id, liveOpenAI: !fixture, missingSections: missing }, null, 2));
console.log(JSON.stringify({ status: 'PAUSED', id: run.state.spec.id, liveOpenAI: !fixture, specialists: run.tasks.filter(t => t.operation === 'analyze').length, humanRequests: 1, missingSections: missing }));

}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });
