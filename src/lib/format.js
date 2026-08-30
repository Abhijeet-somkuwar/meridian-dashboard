import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

const toDate = (value) => {
  if (!value) return null;
  const d = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
};

export const fmtDate = (value, pattern = 'd MMM yyyy') => {
  const d = toDate(value);
  return d ? format(d, pattern) : '-';
};

export const fmtDateTime = (value) => fmtDate(value, 'd MMM, HH:mm');

export const fmtRelative = (value) => {
  const d = toDate(value);
  return d ? `${formatDistanceToNowStrict(d)} ago` : '-';
};

export const fmtNumber = (n) =>
  n == null ? '-' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export const fmtPercent = (n) => (n == null ? '-' : `${(n * 100).toFixed(1)}%`);

/** Rank 1-100, or a dash for "outside the top 100". */
export const fmtRank = (rank) => (rank == null ? '—' : String(rank));

/** Lower is better, so a negative movement is an improvement. */
export const rankDelta = (current, previous) => {
  if (current == null || previous == null) return { value: null, direction: 'new' };
  const value = previous - current;
  return { value, direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat' };
};

export const titleFromType = (type = '') => type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const truncate = (text, n = 120) =>
  !text ? '' : text.length <= n ? text : `${text.slice(0, n - 1).trimEnd()}…`;

export const platformLabel = {
  wordpress: 'WP',
  php: 'PHP',
  shopify: 'Shopify',
  wix: 'Wix',
  custom: 'Dev-built',
  other: 'Site',
};

export const severityTone = { danger: 'danger', warning: 'warning', info: 'primary' };

/** Minimal markdown -> HTML for report previews (headings, bullets, tables, bold). */
export const markdownToHtml = (md = '') => {
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  const out = [];
  let list = null;
  let table = null;

  const closeList = () => {
    if (list) {
      out.push(`<ul>${list.join('')}</ul>`);
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

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('|')) {
      const cells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (/^[\s:-]+$/.test(cells.join(''))) continue;
      closeList();
      table = table ?? [];
      table.push(cells);
      continue;
    }
    closeTable();

    if (/^###\s+/.test(line)) {
      closeList();
      out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^##\s+/.test(line)) {
      closeList();
      out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
    } else if (/^#\s+/.test(line)) {
      closeList();
      out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`);
    } else if (/^[-*]\s+/.test(line)) {
      list = list ?? [];
      list.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  closeTable();
  return out.join('');
};
