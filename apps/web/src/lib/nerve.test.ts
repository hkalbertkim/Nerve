import assert from "node:assert/strict";
import test from "node:test";
import { demoEvents } from "./demo-scenario";
import { requiresHuman, routeAttention, type AgentEvent } from "./nerve";

test("demo contains exactly 42 events and two human decisions", () => {
  assert.equal(demoEvents.length, 42);
  const routed = demoEvents.map(routeAttention);
  assert.equal(routed.filter(requiresHuman).length, 2);
});

test("medium reversible ambiguity becomes ASK on mobile", () => {
  const event: AgentEvent = {
    id: "ask-1",
    index: 1,
    agent: "Research Agent",
    taskId: "task",
    title: "Two valid prices",
    detail: "Need judgment",
    risk: "medium",
    urgency: "medium",
    reversible: true,
    requiresJudgment: true,
  };

  const decision = routeAttention(event);
  assert.equal(decision.class, "ASK");
  assert.equal(decision.pauseWorkflow, true);
  assert.equal(decision.recommendedSurface, "mobile");
});

test("irreversible high-urgency action becomes approval on voice", () => {
  const event: AgentEvent = {
    id: "approve-1",
    index: 1,
    agent: "Release Agent",
    taskId: "task",
    title: "Publish now",
    detail: "Consequential public action",
    risk: "high",
    urgency: "high",
    reversible: false,
    requiresJudgment: true,
  };

  const decision = routeAttention(event);
  assert.equal(decision.class, "APPROVE");
  assert.equal(decision.pauseWorkflow, true);
  assert.equal(decision.recommendedSurface, "voice");
});

test("routine low-risk event remains LOG", () => {
  const event: AgentEvent = {
    id: "log-1",
    index: 1,
    agent: "QC Agent",
    taskId: "task",
    title: "Resize image",
    detail: "Routine work",
    risk: "low",
    urgency: "low",
    reversible: true,
    requiresJudgment: false,
  };

  const decision = routeAttention(event);
  assert.equal(decision.class, "LOG");
  assert.equal(decision.pauseWorkflow, false);
});
