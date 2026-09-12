'use client';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizeMissionMarkdown } from '../lib/normalize-mission-markdown';

/** Render generated text as Markdown without executing embedded HTML. */
export function MissionMarkdown({ children }: { children: string }) {
  return <div className="mission-markdown"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }) => <div className="mission-table-scroll"><table>{children}</table></div>,
    img: ({ alt, src }) => <a href={typeof src === "string" ? src : undefined} target="_blank" rel="noopener noreferrer">{alt || 'View image'}</a>,
  }}>{normalizeMissionMarkdown(children)}</Markdown></div>;
}
