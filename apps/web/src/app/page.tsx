"use client";

import { useEffect, useMemo, useState } from "react";
import { demoEvents, decisionOptionsFor } from "@/lib/demo-scenario";
import {
  requiresHuman,
  routeAttention,
  type AgentEvent,
  type AttentionDecision,
} from "@/lib/nerve";

type RunStatus = "idle" | "running" | "paused" | "complete";

type ProcessedEvent = {
  event: AgentEvent;
  decision: AttentionDecision;
  resolution?: string;
};

type PendingDecision = {
  event: AgentEvent;
  decision: AttentionDecision;
};

const EVENT_INTERVAL_MS = 170;

export default function Home() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [cursor, setCursor] = useState(0);
  const [processed, setProcessed] = useState<ProcessedEvent[]>([]);
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [outcome, setOutcome] = useState("Waiting to start launch workflow.");

  const humanRequired = useMemo(
    () => processed.filter((item) => requiresHuman(item.decision)).length,
    [processed],
  );
  const autoHandled = processed.length - humanRequired;
  const humanResolved = useMemo(
    () => processed.filter((item) => requiresHuman(item.decision) && item.resolution).length,
    [processed],
  );

  useEffect(() => {
    if (status !== "running") return;
    if (cursor >= demoEvents.length) {
      setStatus("complete");
      return;
    }

    const timer = window.setTimeout(() => {
      const event = demoEvents[cursor];
      const decision = routeAttention(event);
      const item: ProcessedEvent = { event, decision };

      setProcessed((current) => [...current, item]);

      if (requiresHuman(decision)) {
        setPending({ event, decision });
        setStatus("paused");
        setOutcome(`Paused for human judgment: ${event.title}`);
        return;
      }

      const next = cursor + 1;
      setCursor(next);
      setOutcome(`${event.agent}: ${event.title}`);
      if (next >= demoEvents.length) setStatus("complete");
    }, EVENT_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [cursor, status]);

  function startDemo() {
    setStatus("running");
    setCursor(0);
    setProcessed([]);
    setPending(null);
    setOutcome("Agents are working. Nerve is filtering the noise.");
  }

  function resolvePending(optionId: string, label: string) {
    if (!pending) return;

    setProcessed((current) =>
      current.map((item) =>
        item.event.id === pending.event.id ? { ...item, resolution: label } : item,
      ),
    );

    if (pending.event.id === "evt-14") {
      setOutcome(optionId === "price-49" ? "Price locked at €49. Workflow resumed." : "Price locked at €39. Workflow resumed.");
    } else if (pending.event.id === "evt-35") {
      setOutcome(
        optionId === "publish-us"
          ? "U.S. launch approved. Europe is held for legal review."
          : "Entire launch held pending legal review.",
      );
    }

    const next = cursor + 1;
    setPending(null);
    setCursor(next);
    setStatus(next >= demoEvents.length ? "complete" : "running");
  }

  const recent = processed.slice(-10).reverse();
  const progress = Math.round((processed.length / demoEvents.length) * 100);
  const options = pending ? decisionOptionsFor(pending.event) : [];

  return (
    <main className="nerve-shell">
      <header className="nerve-hero">
        <div>
          <p className="nerve-kicker">Agents, Everywhere · AI Tinkerers Paris</p>
          <h1>Nerve</h1>
          <p className="nerve-tagline">One Human, Many Agents.</p>
          <p className="nerve-subtitle">The Attention Router for AI Agents</p>
        </div>
        <div className="nerve-hero-actions">
          <span className="nerve-state" data-state={status}>{status}</span>
          <button className="nerve-button nerve-button-primary" onClick={startDemo}>
            {status === "idle" ? "Run demo" : "Restart demo"}
          </button>
        </div>
      </header>

      <section className="nerve-taskbar" aria-label="Launch task status">
        <div>
          <span className="nerve-label">ACTIVE WORK</span>
          <strong>Launch Nerve Beta</strong>
          <p>{outcome}</p>
        </div>
        <div className="nerve-progress-wrap">
          <span>{processed.length} / {demoEvents.length} events</span>
          <div className="nerve-progress" aria-label={`${progress}% complete`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <section className="nerve-metrics" aria-label="Attention metrics">
        <Metric label="Agent events" value={processed.length} suffix="/42" />
        <Metric label="Auto-handled" value={autoHandled} />
        <Metric label="Needed human" value={humanRequired} />
        <Metric label="Human resolved" value={humanResolved} />
      </section>

      <section className="nerve-grid">
        <div className="nerve-panel">
          <div className="nerve-panel-head">
            <div>
              <span className="nerve-label">AGENT ACTIVITY</span>
              <h2>Everything happening in the background</h2>
            </div>
            <span className="nerve-muted">Routine work stays quiet</span>
          </div>

          <div className="nerve-stream" aria-live="polite">
            {recent.length === 0 ? (
              <div className="nerve-empty">
                <strong>No events yet.</strong>
                <p>Run the demo to watch four agents work while Nerve protects human attention.</p>
              </div>
            ) : (
              recent.map(({ event, decision, resolution }) => (
                <article className="nerve-event" key={event.id} data-class={decision.class}>
                  <div className="nerve-event-topline">
                    <span className="nerve-class">{decision.class}</span>
                    <span>#{String(event.index).padStart(2, "0")}</span>
                    <span>{event.agent}</span>
                  </div>
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                  {resolution ? <div className="nerve-resolution">Human: {resolution}</div> : null}
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="nerve-panel nerve-attention">
          <div className="nerve-panel-head">
            <div>
              <span className="nerve-label">HUMAN ATTENTION</span>
              <h2>Only what actually needs you</h2>
            </div>
          </div>

          {pending ? (
            <div className="nerve-decision-card" data-class={pending.decision.class}>
              <div className="nerve-route-line">
                <span className="nerve-class nerve-class-large">{pending.decision.class}</span>
                <span className="nerve-route">ROUTE → {pending.decision.recommendedSurface.toUpperCase()}</span>
              </div>
              <h3>{pending.event.title}</h3>
              <p>{pending.event.detail}</p>

              <dl className="nerve-facts">
                <div><dt>Risk</dt><dd>{pending.event.risk}</dd></div>
                <div><dt>Urgency</dt><dd>{pending.event.urgency}</dd></div>
                <div><dt>Reversible</dt><dd>{pending.event.reversible ? "yes" : "no"}</dd></div>
                <div><dt>Workflow</dt><dd>paused</dd></div>
              </dl>

              <p className="nerve-reason">{pending.decision.reason}</p>

              <div className="nerve-option-list">
                {options.map((option) => (
                  <button
                    key={option.id}
                    className="nerve-option"
                    onClick={() => resolvePending(option.id, option.label)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : status === "complete" ? (
            <div className="nerve-finale">
              <span className="nerve-label">DEMO COMPLETE</span>
              <div className="nerve-finale-number">42</div>
              <p>agent actions</p>
              <div className="nerve-finale-grid">
                <div><strong>40</strong><span>handled autonomously</span></div>
                <div><strong>2</strong><span>needed me</span></div>
              </div>
              <blockquote>Nerve knew which two.</blockquote>
            </div>
          ) : status === "running" ? (
            <div className="nerve-quiet">
              <div className="nerve-pulse" />
              <strong>Nerve is quiet.</strong>
              <p>Agents are working. No human judgment is needed right now.</p>
            </div>
          ) : (
            <div className="nerve-quiet">
              <strong>One human. Many agents.</strong>
              <p>Run the demo. Nerve will stay silent until a decision genuinely requires you.</p>
            </div>
          )}
        </aside>
      </section>

      <footer className="nerve-footer">
        <strong>The conversation follows the work — not the app.</strong>
        <span>One human. Many agents. Only the interruptions that matter.</span>
      </footer>
    </main>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="nerve-metric">
      <span>{label}</span>
      <strong>{value}{suffix}</strong>
    </div>
  );
}
