# Nerve Hackathon Plan

## Thesis

One human can supervise many autonomous agents only if human attention
is treated as a scarce resource.

Nerve is not another agent inbox.

Nerve decides:

1. Does this event need a human?
2. What exactly must the human decide?
3. How urgent and consequential is it?
4. Which available surface is appropriate?
5. When should the underlying workflow pause or continue?

## Event Classes

LOG
INFORM
ASK
APPROVE
INTERRUPT

## MVP

The MVP must demonstrate one complete end-to-end workflow.

### Required

1. Running task with multiple simulated/real agent events
2. Structured shared task state
3. Attention classification
4. Automatic handling of routine events
5. Human decision gate
6. Workflow pause/resume
7. Visible final side effect/result
8. Attention summary

## Demo KPI

Agent events: 42
Auto-handled: 40
Human decisions: 2
Unnecessary interruptions: 0

These numbers may use deterministic demo fixtures, but all routing,
classification, approval, and workflow behavior shown to judges must
actually function.

## Build Priority

P0:
- Web control surface
- Shared task state
- Attention classifier
- LOG / INFORM / ASK / APPROVE / INTERRUPT
- One functioning human approval
- Resume after approval
- Final outcome

P1:
- Second interaction surface
- Risk / urgency / reversibility signals
- Strong visual timeline
- Failure and cancellation path

P2:
- Voice escalation
- Third surface
- Additional integrations

## Non-goals

- General-purpose multi-agent framework
- Full Slack replacement
- Full WhatsApp implementation
- Large dashboard
- Complex authentication
- Multi-user collaboration
- Many sponsor integrations

## Demo Principle

Show, do not explain.

The audience should understand within 20 seconds:

"Many agents are working, but Nerve only interrupts the human when
human judgment actually matters."
