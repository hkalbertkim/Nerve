import type { AttentionClass, Surface } from "./nerve";

export type MissionStatus = "draft" | "running" | "paused" | "complete" | "failed" | "cancelled";

export type CapabilityKind =
  | "agent"
  | "tool"
  | "service"
  | "human"
  | "memory"
  | "template";

export type CapabilitySource = "internal" | "external" | "spawned" | "human";

export type Capability = {
  id: string;
  name: string;
  kind: CapabilityKind;
  source: CapabilitySource;
  description?: string;
  trusted?: boolean;
  permissions?: string[];
};

export type TopologyNodeStatus = "available" | "working" | "waiting" | "blocked" | "complete" | "failed";

export type TopologyNode = {
  capabilityId: string;
  status: TopologyNodeStatus;
  joinedAt: string;
  reason?: string;
};

export type TopologyEdgeStatus = "candidate" | "active" | "proven" | "abandoned";

export type TopologyEdge = {
  id: string;
  from: string;
  to: string;
  status: TopologyEdgeStatus;
  label?: string;
};

export type Artifact = {
  id: string;
  title: string;
  kind: string;
  createdBy: string;
  createdAt: string;
  summary?: string;
  href?: string;
};

export type AttentionRequest = {
  id: string;
  title: string;
  detail: string;
  class: Extract<AttentionClass, "ASK" | "APPROVE" | "INTERRUPT">;
  surface: Surface;
  createdAt: string;
  status: "pending" | "resolved" | "cancelled";
  resolution?: string;
  resolvedAt?: string;
};

export type CapabilityGap = {
  id: string;
  description: string;
  requiredSkills: string[];
  discoveredAt: string;
  status: "open" | "filled" | "dismissed";
  filledByCapabilityId?: string;
};

export type MissionEventType =
  | "MISSION_STARTED"
  | "MISSION_STATUS_CHANGED"
  | "CAPABILITY_ATTACHED"
  | "CAPABILITY_DETACHED"
  | "TOPOLOGY_EDGE_ADDED"
  | "TOPOLOGY_EDGE_UPDATED"
  | "CAPABILITY_GAP_DETECTED"
  | "CAPABILITY_GAP_FILLED"
  | "ARTIFACT_CREATED"
  | "ATTENTION_REQUESTED"
  | "ATTENTION_RESOLVED"
  | "WORK_NOTE";

export type MissionEvent = {
  id: string;
  type: MissionEventType;
  at: string;
  message: string;
  actor?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type MissionSpec = {
  id: string;
  title: string;
  goal: string;
  constraints?: string[];
  successCriteria?: string[];
  source?: "direct" | "chatgpt" | "api";
  sourceContext?: string;
};

export type MissionState = {
  spec: MissionSpec;
  status: MissionStatus;
  capabilities: Record<string, Capability>;
  nodes: Record<string, TopologyNode>;
  edges: TopologyEdge[];
  gaps: CapabilityGap[];
  attention: AttentionRequest[];
  artifacts: Artifact[];
  events: MissionEvent[];
  startedAt?: string;
  completedAt?: string;
};

export type NervePathway = {
  id: string;
  name: string;
  sourceMissionId: string;
  createdAt: string;
  capabilities: Capability[];
  edges: TopologyEdge[];
  constraints: string[];
  successCriteria: string[];
};

function eventId(state: MissionState): string {
  return `${state.spec.id}-event-${state.events.length + 1}`;
}

function appendEvent(
  state: MissionState,
  event: Omit<MissionEvent, "id">,
): MissionState {
  return {
    ...state,
    events: [...state.events, { ...event, id: eventId(state) }],
  };
}

export function createMission(spec: MissionSpec, now = new Date().toISOString()): MissionState {
  return {
    spec,
    status: "running",
    capabilities: {},
    nodes: {},
    edges: [],
    gaps: [],
    attention: [],
    artifacts: [],
    startedAt: now,
    events: [
      {
        id: `${spec.id}-event-1`,
        type: "MISSION_STARTED",
        at: now,
        message: `Mission started: ${spec.title}`,
        actor: "Nerve",
      },
    ],
  };
}

export function attachCapability(
  state: MissionState,
  capability: Capability,
  reason: string,
  now = new Date().toISOString(),
): MissionState {
  const next: MissionState = {
    ...state,
    capabilities: { ...state.capabilities, [capability.id]: capability },
    nodes: {
      ...state.nodes,
      [capability.id]: {
        capabilityId: capability.id,
        status: "available",
        joinedAt: now,
        reason,
      },
    },
  };

  return appendEvent(next, {
    type: "CAPABILITY_ATTACHED",
    at: now,
    actor: "Nerve",
    message: `${capability.name} attached: ${reason}`,
    metadata: { capabilityId: capability.id, source: capability.source },
  });
}

export function connectCapabilities(
  state: MissionState,
  edge: Omit<TopologyEdge, "id"> & { id?: string },
  now = new Date().toISOString(),
): MissionState {
  if (!state.nodes[edge.from] || !state.nodes[edge.to]) {
    throw new Error("Both capabilities must be attached before they can be connected.");
  }

  const id = edge.id ?? `${edge.from}->${edge.to}`;
  const existing = state.edges.find((item) => item.id === id);
  const edges = existing
    ? state.edges.map((item) => (item.id === id ? { ...item, ...edge, id } : item))
    : [...state.edges, { ...edge, id }];

  return appendEvent({ ...state, edges }, {
    type: existing ? "TOPOLOGY_EDGE_UPDATED" : "TOPOLOGY_EDGE_ADDED",
    at: now,
    actor: "Nerve",
    message: `${edge.from} → ${edge.to} is ${edge.status}`,
    metadata: { edgeId: id, status: edge.status },
  });
}

export function setCapabilityStatus(
  state: MissionState,
  capabilityId: string,
  status: TopologyNodeStatus,
): MissionState {
  const node = state.nodes[capabilityId];
  if (!node) throw new Error(`Unknown capability: ${capabilityId}`);

  return {
    ...state,
    nodes: { ...state.nodes, [capabilityId]: { ...node, status } },
  };
}

export function detectCapabilityGap(
  state: MissionState,
  gap: Omit<CapabilityGap, "status"> & { status?: CapabilityGap["status"] },
): MissionState {
  const value: CapabilityGap = { ...gap, status: gap.status ?? "open" };
  const next = { ...state, gaps: [...state.gaps, value] };
  return appendEvent(next, {
    type: "CAPABILITY_GAP_DETECTED",
    at: gap.discoveredAt,
    actor: "Nerve",
    message: `Capability gap detected: ${gap.description}`,
    metadata: { gapId: gap.id },
  });
}

export function fillCapabilityGap(
  state: MissionState,
  gapId: string,
  capabilityId: string,
  now = new Date().toISOString(),
): MissionState {
  if (!state.capabilities[capabilityId]) throw new Error(`Unknown capability: ${capabilityId}`);
  const gap = state.gaps.find((item) => item.id === gapId);
  if (!gap) throw new Error(`Unknown capability gap: ${gapId}`);

  const gaps = state.gaps.map((item) =>
    item.id === gapId
      ? { ...item, status: "filled" as const, filledByCapabilityId: capabilityId }
      : item,
  );

  return appendEvent({ ...state, gaps }, {
    type: "CAPABILITY_GAP_FILLED",
    at: now,
    actor: "Nerve",
    message: `Capability gap filled by ${state.capabilities[capabilityId].name}`,
    metadata: { gapId, capabilityId },
  });
}

export function createArtifact(
  state: MissionState,
  artifact: Artifact,
): MissionState {
  return appendEvent({ ...state, artifacts: [...state.artifacts, artifact] }, {
    type: "ARTIFACT_CREATED",
    at: artifact.createdAt,
    actor: artifact.createdBy,
    message: `Artifact created: ${artifact.title}`,
    metadata: { artifactId: artifact.id, kind: artifact.kind },
  });
}

export function requestHumanAttention(
  state: MissionState,
  request: AttentionRequest,
): MissionState {
  const shouldPause = request.class === "ASK" || request.class === "APPROVE" || request.class === "INTERRUPT";
  const next = {
    ...state,
    status: shouldPause ? ("paused" as const) : state.status,
    attention: [...state.attention, request],
  };

  return appendEvent(next, {
    type: "ATTENTION_REQUESTED",
    at: request.createdAt,
    actor: "Nerve",
    message: `${request.class}: ${request.title}`,
    metadata: { attentionId: request.id, surface: request.surface },
  });
}

export function resolveHumanAttention(
  state: MissionState,
  attentionId: string,
  resolution: string,
  now = new Date().toISOString(),
): MissionState {
  const request = state.attention.find((item) => item.id === attentionId);
  if (!request) throw new Error(`Unknown attention request: ${attentionId}`);

  const attention = state.attention.map((item) =>
    item.id === attentionId
      ? { ...item, status: "resolved" as const, resolution, resolvedAt: now }
      : item,
  );
  const hasPending = attention.some((item) => item.status === "pending");
  const next = { ...state, attention, status: hasPending ? state.status : ("running" as const) };

  return appendEvent(next, {
    type: "ATTENTION_RESOLVED",
    at: now,
    actor: "Human",
    message: `Human decision received: ${resolution}`,
    metadata: { attentionId },
  });
}

export function completeMission(
  state: MissionState,
  now = new Date().toISOString(),
): MissionState {
  return appendEvent({ ...state, status: "complete", completedAt: now }, {
    type: "MISSION_STATUS_CHANGED",
    at: now,
    actor: "Nerve",
    message: "Mission completed successfully.",
    metadata: { status: "complete" },
  });
}

export function promoteToPathway(
  state: MissionState,
  pathwayId: string,
  name: string,
  now = new Date().toISOString(),
): NervePathway {
  if (state.status !== "complete") {
    throw new Error("Only completed missions can be promoted to a pathway.");
  }

  return {
    id: pathwayId,
    name,
    sourceMissionId: state.spec.id,
    createdAt: now,
    capabilities: Object.values(state.capabilities),
    edges: state.edges.filter((edge) => edge.status !== "abandoned"),
    constraints: state.spec.constraints ?? [],
    successCriteria: state.spec.successCriteria ?? [],
  };
}

export function missionMetrics(state: MissionState) {
  const resolvedAttention = state.attention.filter((item) => item.status === "resolved").length;
  const topologyChanges = state.events.filter((event) =>
    event.type === "CAPABILITY_ATTACHED" ||
    event.type === "CAPABILITY_DETACHED" ||
    event.type === "TOPOLOGY_EDGE_ADDED" ||
    event.type === "TOPOLOGY_EDGE_UPDATED"
  ).length;

  return {
    totalEvents: state.events.length,
    humanAttentionRequests: state.attention.length,
    resolvedAttention,
    topologyChanges,
    artifacts: state.artifacts.length,
    capabilities: Object.keys(state.capabilities).length,
  };
}
