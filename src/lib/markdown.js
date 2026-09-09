/**
 * Markdown -> HTML for article previews. Mirrors the backend renderer that
 * produces the WordPress body, so what the manager previews is what gets
 * published: headings, paragraphs, lists (both kinds), tables, quotes, code,
 * bold, italic, links and images.
 */

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s) =>
  escape(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

export const renderMarkdown = (md = '') => {
  const out = [];
  let list = null;
  let table = null;
  let code = null;
  let quote = null;

  const closeList = () => {
    if (list) {
      out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`);
      list = null;
    }
  };
  const closeTable = () => {
    if (table) {
      const [head, ...body] = table;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
      );
      table = null;
    }
  };
  const closeQuote = () => {
    if (quote) {
      out.push(`<blockquote><p>${quote.map(inline).join('<br />')}</p></blockquote>`);
      quote = null;
    }
  };
  const closeAll = () => {
    closeList();
    closeTable();
    closeQuote();
  };

  for (const raw of String(md).replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (code !== null) {
      if (/^```/.test(line)) {
        out.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);
        code = null;
      } else code.push(raw);
      continue;
    }
    if (/^```/.test(line)) {
      closeAll();
      code = [];
      continue;
    }
    if (line.startsWith('|')) {
      const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (/^[\s:-]+$/.test(cells.join(''))) continue;
      closeList();
      closeQuote();
      table = table ?? [];
      table.push(cells);
      continue;
    }
    closeTable();
    if (/^>\s?/.test(line)) {
      closeList();
      quote = quote ?? [];
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }
    closeQuote();

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (list && list.tag !== 'ul') closeList();
      list = list ?? { tag: 'ul', items: [] };
      list.items.push(inline(line.replace(/^[-*]\s+/, '')));
    } else if (/^\d+\.\s+/.test(line)) {
      if (list && list.tag !== 'ol') closeList();
      list = list ?? { tag: 'ol', items: [] };
      list.items.push(inline(line.replace(/^\d+\.\s+/, '')));
    } else if (/^(-{3,}|\*{3,})$/.test(line)) {
      closeList();
      out.push('<hr />');
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  if (code !== null) out.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);
  closeAll();
  return out.join('\n');
};

export const wordCount = (md = '') =>
  String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`|[\]()!-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
