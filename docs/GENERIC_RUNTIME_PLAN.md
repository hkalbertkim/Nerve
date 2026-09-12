# Nerve Generic Runtime — implementation plan

This document freezes the generic layer independently from any single hackathon demo scenario.

## Product contract

Nerve takes a **mission outcome**, maintains a persistent **work context**, dynamically composes a **topology of specialist capabilities**, keeps routine agent-to-agent work out of the human attention path, pauses only when human judgment or authorization is required, and records the full execution trace so successful pathways can be reused.

## Generic runtime primitives

1. **Mission** — outcome, constraints, success criteria, source context.
2. **Capability** — an internal agent, external agent, tool, service, human, or memory/template node.
3. **Topology** — active nodes and directed edges used for the current mission.
4. **Work Event** — agent/tool activity, handoff, topology mutation, artifact creation, failure, retry, or decision.
5. **Attention Request** — ASK / APPROVE / INTERRUPT with target surface and resolution state.
6. **Artifact** — any produced result that can be inspected or delivered.
7. **Pathway** — a successful topology + execution pattern promoted for reuse.
8. **Mission Trace** — append-only operational history including topology changes and human decisions.

## Runtime rules

- Human-out-of-the-loop by default.
- Human-in-the-loop by exception.
- Every topology mutation is traceable.
- New capabilities may be attached when a capability gap appears.
- External or higher-risk capability attachment can require human approval.
- Successful mission topologies can be promoted to reusable pathways.
- UI should consume runtime state; demo scenarios should be fixtures/adapters, not hard-coded product logic.

## Hackathon vertical slice

The demo will exercise the generic runtime through one visually strong mission. The final scenario is intentionally kept outside this core so it can still be refined without changing the architecture.
