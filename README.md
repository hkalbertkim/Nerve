# Nerve — One Human, Many Agents

**The Attention Router for AI Agents**

> 42 agent actions. 2 needed me. Nerve knew which two.

## Problem

As AI agents spread across coding tools, the web, messaging, mobile,
voice, email, and other environments, the scarce resource becomes
human attention.

A founder should not become the message bus for every agent.

## What Nerve Does

Nerve classifies agent events by the amount of human attention they require:

- **LOG** — no human attention needed
- **INFORM** — useful information, no action required
- **ASK** — human judgment is needed
- **APPROVE** — consequential action requires explicit permission
- **INTERRUPT** — immediate human attention is required

Nerve then routes the decision to the most appropriate surface while
routine work continues autonomously.

## Core Idea

**The conversation belongs to the work — not to the app.**

The user does not need to continually open an AI dashboard and reconstruct
context. Nerve decides whether the human is needed, when to involve them,
and how best to reach them.

## Hackathon Demo Target

A solo founder launches a product while multiple agents work in parallel.

- Routine issues are automatically handled.
- A medium-risk decision is routed to a lightweight interaction.
- A high-risk irreversible action pauses the workflow and requests explicit approval.
- Once approved, the original workflow resumes and produces a visible result.

### Demo ending

> **42 agent actions.**  
> **40 handled autonomously.**  
> **2 needed me.**  
> **Nerve knew which two.**

## Initial Stack

- OpenAI
- CopilotKit
- Next.js / React / TypeScript
- Human-in-the-loop approval gates

Additional technologies will be listed only if they are actually used
in the final implementation.

## Hackathon

Agents, Everywhere: Bots, Channels, & More — Global Hackathon  
AI Tinkerers Paris — September 12, 2026
