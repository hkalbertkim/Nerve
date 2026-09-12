import type { AgentEvent, DecisionOption } from "./nerve";

const autoSteps = [
  ["Research Agent", "Competitor pricing checked", "Current pricing captured from three public sources."],
  ["Content Agent", "Launch copy drafted", "First-pass announcement copy is ready for review by downstream agents."],
  ["QC Agent", "Broken link detected and fixed", "One stale documentation link was replaced automatically."],
  ["Release Agent", "Preview deployment healthy", "Preview passed health checks and route verification."],
  ["Research Agent", "Source claim verified", "Product claim matched the referenced public source."],
  ["Content Agent", "Image resized", "Hero image was resized for the target surface without changing content."],
  ["QC Agent", "Metadata normalized", "Open Graph metadata and title lengths were normalized."],
  ["Release Agent", "Build retry succeeded", "A transient build failure was retried successfully."],
  ["Research Agent", "Market note added", "A useful competitor note was saved to the work context."],
  ["Content Agent", "CTA shortened", "The CTA was shortened to fit the mobile layout."],
  ["QC Agent", "Accessibility check passed", "The current launch surface passed the automated accessibility gate."],
  ["Release Agent", "Cache warmed", "Launch assets were prefetched and cache warm-up completed."],
] as const;

function autoEvent(index: number): AgentEvent {
  const template = autoSteps[(index - 1) % autoSteps.length];
  const noteworthy = index % 6 === 0;

  return {
    id: `evt-${String(index).padStart(2, "0")}`,
    index,
    agent: template[0],
    taskId: "launch-nerve-beta",
    title: template[1],
    detail: template[2],
    risk: noteworthy ? "medium" : "low",
    urgency: "low",
    reversible: true,
    requiresJudgment: false,
    noteworthy,
  };
}

export const demoEvents: AgentEvent[] = Array.from({ length: 42 }, (_, offset) => {
  const index = offset + 1;

  if (index === 14) {
    return {
      id: "evt-14",
      index,
      agent: "Research Agent",
      taskId: "launch-nerve-beta",
      title: "Pricing sources conflict",
      detail: "The current product page says €49, while an older campaign asset still says €39.",
      risk: "medium",
      urgency: "medium",
      reversible: true,
      requiresJudgment: true,
      noteworthy: true,
    } satisfies AgentEvent;
  }

  if (index === 35) {
    return {
      id: "evt-35",
      index,
      agent: "Release Agent",
      taskId: "launch-nerve-beta",
      title: "EU launch has an unresolved legal flag",
      detail: "Publishing Europe now would make a public, consequential change before legal review is cleared.",
      risk: "high",
      urgency: "high",
      reversible: false,
      requiresJudgment: true,
      noteworthy: true,
    } satisfies AgentEvent;
  }

  return autoEvent(index);
});

export function decisionOptionsFor(event: AgentEvent): DecisionOption[] {
  if (event.id === "evt-14") {
    return [
      {
        id: "price-49",
        label: "Use €49",
        detail: "Use the current verified product-page price.",
      },
      {
        id: "price-39",
        label: "Use €39",
        detail: "Keep the older campaign price for this launch.",
      },
    ];
  }

  if (event.id === "evt-35") {
    return [
      {
        id: "publish-us",
        label: "Publish U.S. only",
        detail: "Ship the cleared U.S. launch and hold Europe for legal review.",
      },
      {
        id: "hold-all",
        label: "Hold entire launch",
        detail: "Pause all publishing until the EU legal flag is resolved.",
      },
    ];
  }

  return [];
}
