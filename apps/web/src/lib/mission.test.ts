import assert from "node:assert/strict";
import test from "node:test";
import {
  attachCapability,
  completeMission,
  connectCapabilities,
  createArtifact,
  createMission,
  detectCapabilityGap,
  fillCapabilityGap,
  missionMetrics,
  promoteToPathway,
  requestHumanAttention,
  resolveHumanAttention,
} from "./mission";

const NOW = "2026-09-12T12:30:00.000Z";

test("generic mission runtime supports plastic topology, human attention, artifacts, and pathway promotion", () => {
  let state = createMission({
    id: "mission-1",
    title: "Visual demo mission",
    goal: "Produce a finished artifact with minimal human interruption.",
    constraints: ["Human-out-of-loop by default"],
    successCriteria: ["Visible final artifact", "At most one required decision"],
    source: "direct",
  }, NOW);

  state = attachCapability(state, {
    id: "research",
    name: "Research Agent",
    kind: "agent",
    source: "internal",
    trusted: true,
  }, "Mission requires external research", NOW);

  state = attachCapability(state, {
    id: "producer",
    name: "Producer Agent",
    kind: "agent",
    source: "internal",
    trusted: true,
  }, "Mission requires a visible final artifact", NOW);

  state = connectCapabilities(state, {
    from: "research",
    to: "producer",
    status: "active",
    label: "evidence handoff",
  }, NOW);

  state = detectCapabilityGap(state, {
    id: "gap-1",
    description: "Missing visual specialist",
    requiredSkills: ["visual-design"],
    discoveredAt: NOW,
  });

  state = attachCapability(state, {
    id: "visual",
    name: "Visual Specialist",
    kind: "agent",
    source: "spawned",
    trusted: true,
  }, "Filled a capability gap discovered during execution", NOW);

  state = fillCapabilityGap(state, "gap-1", "visual", NOW);
  state = connectCapabilities(state, {
    from: "producer",
    to: "visual",
    status: "proven",
    label: "production refinement",
  }, NOW);

  state = requestHumanAttention(state, {
    id: "attention-1",
    title: "Choose final direction",
    detail: "Two valid high-level outcomes remain.",
    class: "ASK",
    surface: "mobile",
    createdAt: NOW,
    status: "pending",
  });

  assert.equal(state.status, "paused");
  state = resolveHumanAttention(state, "attention-1", "Use option A", NOW);
  assert.equal(state.status, "running");

  state = createArtifact(state, {
    id: "artifact-1",
    title: "Final visual package",
    kind: "deliverable",
    createdBy: "visual",
    createdAt: NOW,
  });
  state = completeMission(state, NOW);

  const pathway = promoteToPathway(state, "pathway-1", "Visual Production v1", NOW);
  const metrics = missionMetrics(state);

  assert.equal(pathway.capabilities.length, 3);
  assert.equal(pathway.edges.length, 2);
  assert.equal(metrics.humanAttentionRequests, 1);
  assert.equal(metrics.resolvedAttention, 1);
  assert.equal(metrics.artifacts, 1);
  assert.equal(metrics.capabilities, 3);
  assert.ok(metrics.topologyChanges >= 5);
});

test("cannot promote an unfinished mission", () => {
  const state = createMission({ id: "mission-2", title: "Incomplete", goal: "Do work" }, NOW);
  assert.throws(() => promoteToPathway(state, "p", "Bad pathway", NOW));
});
