export type AttentionClass =
  | "LOG"
  | "INFORM"
  | "ASK"
  | "APPROVE"
  | "INTERRUPT";

export type RiskLevel = "low" | "medium" | "high";
export type UrgencyLevel = "low" | "medium" | "high";
export type Surface = "web" | "mobile" | "voice";

export type AgentEvent = {
  id: string;
  index: number;
  agent: string;
  taskId: string;
  title: string;
  detail: string;
  risk: RiskLevel;
  urgency: UrgencyLevel;
  reversible: boolean;
  requiresJudgment: boolean;
  noteworthy?: boolean;
};

export type AttentionDecision = {
  eventId: string;
  class: AttentionClass;
  reason: string;
  pauseWorkflow: boolean;
  recommendedSurface: Surface;
};

export type DecisionOption = {
  id: string;
  label: string;
  detail: string;
};

export function routeAttention(event: AgentEvent): AttentionDecision {
  if (event.requiresJudgment) {
    if (!event.reversible || event.risk === "high") {
      return {
        eventId: event.id,
        class: "APPROVE",
        reason: "Consequential action requires explicit human permission.",
        pauseWorkflow: true,
        recommendedSurface: event.urgency === "high" ? "voice" : "mobile",
      };
    }

    return {
      eventId: event.id,
      class: "ASK",
      reason: "The agent has multiple valid paths and needs human judgment.",
      pauseWorkflow: true,
      recommendedSurface: "mobile",
    };
  }

  if (event.risk === "high" && event.urgency === "high") {
    return {
      eventId: event.id,
      class: "INTERRUPT",
      reason: "High-risk, time-sensitive event requires immediate human awareness.",
      pauseWorkflow: true,
      recommendedSurface: "voice",
    };
  }

  if (event.noteworthy || event.risk === "medium" || event.urgency === "high") {
    return {
      eventId: event.id,
      class: "INFORM",
      reason: "Useful context, but no human action is required.",
      pauseWorkflow: false,
      recommendedSurface: "web",
    };
  }

  return {
    eventId: event.id,
    class: "LOG",
    reason: "Routine, low-risk work can stay out of the human attention path.",
    pauseWorkflow: false,
    recommendedSurface: "web",
  };
}

export function requiresHuman(decision: AttentionDecision): boolean {
  return decision.class === "ASK" || decision.class === "APPROVE" || decision.class === "INTERRUPT";
}
