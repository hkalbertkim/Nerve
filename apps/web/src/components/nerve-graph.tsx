'use client';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { MissionState } from '@/lib/mission';

type Point = { x: number; y: number };
export function NerveGraph({ state, select }: { state: MissionState; select: (id: string) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [offsets, setOffsets] = useState<Record<string, Point>>({});
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const gesture = useRef<{ id?: string; start: Point; origin: Point; moved: boolean } | null>(null);
  const nodes = Object.values(state.nodes);
  const depth: Record<string, number> = { memory: 0 };
  for (let pass = 0; pass < nodes.length; pass++) for (const node of nodes) {
    if (node.capabilityId === 'memory') continue;
    const parents = state.edges.filter(e => e.to === node.capabilityId && e.from !== 'memory');
    depth[node.capabilityId] = Math.min(nodes.length, parents.length ? 1 + Math.max(...parents.map(e => depth[e.from] || 0)) : 1);
  }
  const maxSiblings = Math.max(1, ...nodes.map(node => nodes.filter(n => depth[n.capabilityId] === depth[node.capabilityId]).length));
  const width = Math.max(600, (maxSiblings + 1) * 200);
  const height = 90 + Math.max(0, ...Object.values(depth)) * 92;
  const positions: Record<string, Point> = {};
  for (const node of nodes) {
    const level = depth[node.capabilityId] || 0;
    const siblings = nodes.filter(n => (depth[n.capabilityId] || 0) === level);
    const delta = offsets[node.capabilityId] || { x: 0, y: 0 };
    positions[node.capabilityId] = { x: (siblings.findIndex(n => n.capabilityId === node.capabilityId) + 1) * width / (siblings.length + 1) + delta.x, y: 40 + level * 92 + delta.y };
  }
  function point(event: PointerEvent<SVGSVGElement>): Point {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return { x: event.clientX, y: event.clientY };
    const value = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: value.x, y: value.y };
  }
  function down(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || gesture.current) return;
    const id = (event.target as Element).closest('[data-node-id]')?.getAttribute('data-node-id') || undefined;
    gesture.current = { id, start: point(event), origin: id ? offsets[id] || { x: 0, y: 0 } : camera, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current) return;
    const position = point(event), dx = position.x - current.start.x, dy = position.y - current.start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
    if (current.id) setOffsets(previous => ({ ...previous, [current.id!]: { x: current.origin.x + dx / camera.zoom, y: current.origin.y + dy / camera.zoom } }));
    else setCamera(previous => ({ ...previous, x: current.origin.x + dx, y: current.origin.y + dy }));
  }
  function finish(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current; gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.type === 'pointerup' && current?.id && !current.moved) select(current.id);
  }
  function zoom(factor: number) {
    setCamera(previous => {
      const next = Math.min(3, Math.max(.5, previous.zoom * factor));
      const ratio = next / previous.zoom;
      return { zoom: next, x: width / 2 - (width / 2 - previous.x) * ratio, y: height / 2 - (height / 2 - previous.y) * ratio };
    });
  }
  return <div>
    <div className="mission-graph-controls" aria-label="Graph controls">
      <button className="nerve-button" onClick={() => zoom(1 / 1.25)} aria-label="Zoom out">−</button>
      <span aria-live="polite">{Math.round(camera.zoom * 100)}%</span>
      <button className="nerve-button" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
      <button className="nerve-button" onClick={() => { setOffsets({}); setCamera({ x: 0, y: 0, zoom: 1 }); }}>Reset layout</button>
    </div>
    <p className="nerve-muted">Drag nodes to arrange · Drag background to pan · Click a node to inspect</p>
    <svg ref={svg} className="mission-graph mission-graph-interactive" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Live mission capability graph" onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { gesture.current = null; }}>
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
      <g data-graph-camera transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
        {state.edges.map(edge => { const from = positions[edge.from], to = positions[edge.to]; return <path key={edge.id} data-edge-id={edge.id} className={`mission-edge ${edge.status}`} d={`M${from.x},${from.y + 23} C${from.x},${from.y + 55} ${to.x},${to.y - 55} ${to.x},${to.y - 23}`} fill="none" markerEnd="url(#arrow)"><title>{edge.from} → {edge.to}: {edge.label} ({edge.status})</title></path>; })}
        {nodes.map(node => { const position = positions[node.capabilityId], capability = state.capabilities[node.capabilityId]; return <g key={node.capabilityId} data-node-id={node.capabilityId} role="button" tabIndex={0} aria-label={`${capability.name}: ${node.status}`} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(node.capabilityId); } }} className={`mission-graph-node ${node.status}`} transform={`translate(${position.x - 86},${position.y - 23})`}><rect width="172" height="46" rx="10"/><text x="86" y="19" textAnchor="middle">{capability.name.length > 23 ? capability.name.slice(0, 22) + '…' : capability.name}</text><text className="mission-graph-status" x="86" y="35" textAnchor="middle">{capability.kind} · {node.status}</text><title>{capability.name}: {node.reason}</title></g>; })}
      </g>
    </svg>
  </div>;
}
