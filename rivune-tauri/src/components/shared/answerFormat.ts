/**
 * A deliberately small Markdown subset for completed AI answers, not a full
 * CommonMark parser. Supports paragraphs, headings, flat lists, quotes, fenced
 * code, emphasis, inline code and HTTP(S) links. Unsupported syntax stays text.
 * Provider content is never interpreted as HTML. Streaming stays plain text.
 */
export type AnswerInline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong' | 'em'; children: AnswerInline[] }
  | { type: 'link'; href: string; children: AnswerInline[] };

export type AnswerBlock =
  | { type: 'paragraph' | 'quote'; content: AnswerInline[] }
  | { type: 'heading'; level: 2 | 3; content: AnswerInline[] }
  | { type: 'list'; ordered: boolean; start: number; items: AnswerInline[][] }
  | { type: 'code'; language: string; text: string };

/** Reject ambiguous/control-character URLs as well as non-web protocols. */
export function safeAnswerLink(value: string): string | null {
  if (!/^https?:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname ? url.href : null;
  } catch { return null; }
}

export function parseInline(text: string, depth = 0): AnswerInline[] {
  if (depth >= 8) return [{ type: 'text', text }];
  const result: AnswerInline[] = [];
  const appendText = (value: string) => {
    const last = result.at(-1);
    if (last?.type === 'text') last.text += value;
    else result.push({ type: 'text', text: value });
  };
  let index = 0;
  while (index < text.length) {
    if (text[index] === '\\' && /[\\`*_\[\]()]/.test(text[index + 1] ?? '')) {
      appendText(text[index + 1]); index += 2; continue;
    }
    if (text[index] === '`') {
      const marker = text.slice(index).match(/^`+/)![0];
      const end = text.indexOf(marker, index + marker.length);
      if (end > index + marker.length) {
        result.push({ type: 'code', text: text.slice(index + marker.length, end) });
        index = end + marker.length; continue;
      }
    }
    if (text[index] === '[') {
      const labelEnd = text.indexOf('](', index + 1);
      if (labelEnd > index + 1) {
        let end = labelEnd + 2;
        let balance = 1;
        while (end < text.length && balance > 0) {
          if (text[end] === '(') balance++;
          if (text[end] === ')') balance--;
          if (balance > 0) end++;
        }
        if (balance === 0) {
          const href = safeAnswerLink(text.slice(labelEnd + 2, end));
          if (href) {
            // Links cannot contain nested anchors; the label remains literal.
            result.push({ type: 'link', href, children: [{ type: 'text', text: text.slice(index + 1, labelEnd) }] });
          } else appendText(text.slice(index, end + 1));
          index = end + 1; continue;
        }
      }
    }
    const marker = ['**', '__', '*', '_'].find(value => text.startsWith(value, index));
    if (marker && !(marker.includes('_') && /\w/.test(text[index - 1] ?? ''))) {
      const start = index + marker.length;
      const end = text.indexOf(marker, start);
      if (end > start && !/\s/.test(text[start]) && !/\s/.test(text[end - 1])) {
        result.push({ type: marker.length === 2 ? 'strong' : 'em', children: parseInline(text.slice(start, end), depth + 1) });
        index = end + marker.length; continue;
      }
    }
    appendText(text[index]); index++;
  }
  return result;
}

const headingPattern = /^ {0,3}(#{1,6})\s+(.+)$/;
const listPattern = /^ {0,3}(?:([-+*])|([0-9]{1,9})[.)])\s+(.+)$/;
const fencePattern = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/;
const quotePattern = /^ {0,3}> ?(.*)$/;
const beginsBlock = (line: string) => headingPattern.test(line) || listPattern.test(line) || fencePattern.test(line) || quotePattern.test(line);

export function parseAnswer(text: string): AnswerBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: AnswerBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const fence = line.match(fencePattern);
    if (fence) {
      const marker = fence[1];
      const language = fence[2].trim().split(/\s+/)[0].slice(0, 40);
      const code: string[] = [];
      index++;
      while (index < lines.length) {
        const closing = lines[index].trim();
        if (closing.length >= marker.length && [...closing].every(char => char === marker[0])) { index++; break; }
        code.push(lines[index++]);
      }
      blocks.push({ type: 'code', language, text: code.join('\n') });
      continue;
    }
    const heading = line.match(headingPattern);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length <= 2 ? 2 : 3, content: parseInline(heading[2]) });
      index++; continue;
    }
    const list = line.match(listPattern);
    if (list) {
      const ordered = Boolean(list[2]);
      const items: AnswerInline[][] = [];
      while (index < lines.length) {
        const next = lines[index].match(listPattern);
        if (!next || Boolean(next[2]) !== ordered) break;
        items.push(parseInline(next[3])); index++;
      }
      blocks.push({ type: 'list', ordered, start: ordered ? Number(list[2]) : 1, items });
      continue;
    }
    if (quotePattern.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && quotePattern.test(lines[index])) quote.push(lines[index++].replace(quotePattern, '$1'));
      blocks.push({ type: 'quote', content: parseInline(quote.join('\n')) });
      continue;
    }
    const paragraph = [line];
    index++;
    while (index < lines.length && lines[index].trim() && !beginsBlock(lines[index])) paragraph.push(lines[index++]);
    blocks.push({ type: 'paragraph', content: parseInline(paragraph.join('\n')) });
  }
  return blocks;
}

function appendInline(parent: HTMLElement, parts: AnswerInline[]): void {
  for (const part of parts) {
    if (part.type === 'text') { parent.append(document.createTextNode(part.text)); continue; }
    if (part.type === 'code') {
      const code = document.createElement('code'); code.textContent = part.text; parent.append(code); continue;
    }
    if (part.type === 'link') {
      const link = document.createElement('a');
      link.href = part.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
      appendInline(link, part.children); parent.append(link); continue;
    }
    const element = document.createElement(part.type);
    appendInline(element, part.children); parent.append(element);
  }
}

export function renderAnswer(text: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'answer-content';
  for (const block of parseAnswer(text)) {
    if (block.type === 'code') {
      const container = document.createElement('div'); container.className = 'answer-code';
      const header = document.createElement('div'); header.className = 'answer-code-header';
      const label = document.createElement('span'); label.textContent = block.language || 'Code';
      const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'answer-code-copy';
      copy.textContent = 'Copy code'; copy.setAttribute('aria-label', `Copy ${block.language || 'code'} block`);
      const status = document.createElement('span'); status.className = 'answer-code-status'; status.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        copy.disabled = true;
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(block.text);
          copy.textContent = 'Copied'; status.textContent = 'Code copied.';
        } catch { copy.textContent = 'Try again'; status.textContent = 'Could not copy. Select the code to copy it manually.'; }
        finally { copy.disabled = false; }
      });
      const pre = document.createElement('pre'); const code = document.createElement('code');
      code.textContent = block.text; pre.append(code); pre.tabIndex = 0;
      pre.setAttribute('aria-label', `${block.language || 'Code'} block`);
      header.append(label, copy); container.append(header, pre, status); root.append(container); continue;
    }
    if (block.type === 'list') {
      const list = document.createElement(block.ordered ? 'ol' : 'ul');
      if (block.ordered && block.start !== 1) list.setAttribute('start', String(block.start));
      for (const item of block.items) { const li = document.createElement('li'); appendInline(li, item); list.append(li); }
      root.append(list); continue;
    }
    const element = document.createElement(block.type === 'heading' ? `h${block.level}` : block.type === 'quote' ? 'blockquote' : 'p');
    appendInline(element, block.content); root.append(element);
  }
  return root;
}
