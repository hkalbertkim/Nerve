/** Unwrap a model's whole-document Markdown fence for display only. */
export function normalizeMissionMarkdown(source: string): string {
  const lines = source.trim().split(/\r?\n/);
  const opening = /^( {0,3})(`{3,}|~{3,})[ \t]*(markdown|md)?[ \t]*$/i.exec(lines[0] || '');
  if (!opening || lines.length < 3) return source;
  const fence = opening[2];
  const closing = new RegExp('^ {0,3}' + fence[0] + '{' + fence.length + ',}[ \\t]*$');
  // The first matching close must terminate the entire document.
  const closeIndex = lines.findIndex((line, index) => index > 0 && closing.test(line));
  if (closeIndex !== lines.length - 1) return source;
  const body = lines.slice(1, -1).join('\n');
  // Bare fences are ambiguous: require a heading and another document structure.
  if (!opening[3] && !(/^ {0,3}#{1,6}\s+\S/m.test(body) &&
    /^(?: {0,3}[-*+]\s+|\|.*\|[ \t]*$)/m.test(body))) return source;
  return body;
}
