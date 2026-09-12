import { normalizeMissionMarkdown } from './normalize-mission-markdown';
import type { MissionRun } from './mission-runtime-types';

export const KRAKO_GOAL = `Turn Krako and krako.wtf into a mystery apparel brand inspired by the scarcity, secrecy, and drop culture of successful streetwear brands.

Create the brand direction, first apparel drop, launch visuals, Instagram launch package, and landing-page concept.

Handle routine decisions autonomously. Ask me only when my judgment or authorization genuinely matters.`;

export const KRAKO_SOURCE = `KRAKO MYSTERY APPAREL · DEMO BRIEF v1
Brand: Krako. Domain: krako.wtf. Supplied logo: /demo/krako-logo.png (displayed by the app; the text-only model must not claim to have inspected the image).
Reference description supplied by the app team: a rounded octopus mascot with turquoise outline and eyes, white body and pale-blue shading. Preserve the supplied logo; reinterpret placement and surrounding art direction, not the logo itself.
Product ambition: an original mystery apparel label, using secrecy, honest limited drops and belonging. No imitation of another brand's identity. No fabricated sellouts, inventory, demand, research or partnerships.
Audience: design-aware streetwear early adopters. No established apparel inventory, pricing, suppliers, account or launch date is asserted. Routine creative decisions are yours; mark commercial quantities, prices and dates as proposals.
Deliverable contract: concise finished Markdown with these exact level-two headings: Brand direction; Drop 001; Apparel concept; Instagram launch package; Landing-page concept; Founder judgment. Aim for 900 words or fewer. Include ready-to-publish captions, three numbered Instagram posts with visual/layout briefs and alt text, a reel storyboard, and actual landing headline, CTA and page structure. Apparel needs silhouette, material proposal, front/back placement and palette. Launch visuals are design briefs and app-rendered concept previews, not claimed photo assets.
The single founder judgment: endorse this proposed brand direction and Drop 001 as Krako's first public identity, accepting the tradeoff between mystery and product clarity. Recommend one direction, identify that tradeoff and explain why only the founder should decide. This is approval to finalize the creative package only. Manufacturing, spending, account creation, posting and public deployment are outside this mission.
All five creative sections must be complete before the runtime's one review gate. After approval the same mission finalizes its package. Do not ask other questions. Select goal-specific specialist roles; the existing runtime chooses their actual number.`;

export const KRAKO_SECTIONS = ['Brand direction', 'Drop 001', 'Apparel concept', 'Instagram launch package', 'Landing-page concept'] as const;
export function isKrakoRun(run: MissionRun | null) {
  return !!run && run.memory.source.startsWith('KRAKO MYSTERY APPAREL · DEMO BRIEF v1');
}

/** Presentation only: preserve all original content, including unrecognized sections. */
export function krakoSections(markdown: string): { title: string; body: string }[] {
  const lines = normalizeMissionMarkdown(markdown).split(/\r?\n/);
  const sections: { title: string; body: string }[] = [];
  let current = { title: 'Launch overview', body: '' };
  let fence = '';
  for (const line of lines) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = '';
      current.body += `${line}\n`;
      continue;
    }
    const heading = !fence && /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
      current = { title: heading[1].replace(/^\d+[.)]\s*/, '').replace(/\*\*/g, ''), body: '' };
    } else current.body += `${line}\n`;
  }
  if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
  return sections;
}

export function krakoSummary(run: MissionRun) {
  return { specialists: run.tasks.filter(t => t.operation === 'analyze' && run.state.capabilities[t.capabilityId]?.kind === 'agent').length,
    requests: run.state.attention.length, decisions: run.memory.decisions.length };
}

export function krakoResultSections(run: MissionRun) {
  // The frozen runtime appends decision text after the model draft. Normalize the
  // draft independently so an outer Markdown fence cannot swallow every card.
  if (!run.memory.work.draft) return krakoSections(run.result || '');
  return [...krakoSections(run.memory.work.draft),
    ...(run.memory.work.validate ? [{ title: 'Validation', body: run.memory.work.validate }] : []),
    { title: 'Decision record', body: run.memory.decisions.join('\n') || 'No human review required by this mission.' }];
}
