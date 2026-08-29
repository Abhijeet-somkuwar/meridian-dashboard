import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Plain-English definitions for the SEO jargon in the interface.
 *
 * Written for someone who has never done SEO: no acronyms inside the
 * explanation, no other jargon, and where it helps, why it matters.
 */
export const GLOSSARY = {
  serp: {
    label: 'search results page',
    body: 'The page of results Google shows after someone searches. Being higher on it means more people click through to the site.',
  },
  rank: {
    label: 'rank / position',
    body: 'Where the site appears in Google results for a search. Position 1 is the top. Lower numbers are better - position 3 beats position 20.',
  },
  keyword: {
    label: 'keyword',
    body: 'A phrase people type into Google, like "plumber in surat". We pick which phrases the site should show up for.',
  },
  'search-volume': {
    label: 'search volume',
    body: 'Roughly how many people search this phrase each month. Higher means more potential customers, but usually more competition too.',
  },
  difficulty: {
    label: 'keyword difficulty',
    body: 'How hard it will be to reach the first page for this phrase, from 0 to 100. Under 25 is realistic quickly; over 50 needs months of work.',
  },
  'meta-title': {
    label: 'meta title',
    body: 'The blue clickable headline Google shows for a page. It is the single biggest influence on whether someone clicks.',
  },
  'meta-description': {
    label: 'meta description',
    body: 'The grey summary text under the headline in Google results. It does not affect ranking directly, but a good one gets more clicks.',
  },
  h1: {
    label: 'H1 heading',
    body: 'The main headline on the page itself. Google reads it to understand what the page is about. Each page should have exactly one.',
  },
  slug: {
    label: 'slug',
    body: 'The readable part of a web address after the domain - the "/services" in example.com/services.',
  },
  'og-tags': {
    label: 'social preview tags',
    body: 'Hidden text that controls the title and image shown when someone shares the page on WhatsApp, Facebook or LinkedIn.',
  },
  schema: {
    label: 'schema markup',
    body: 'Hidden, structured facts about the business - name, phone, address, hours - written in a format Google reads directly. It powers the extra detail you sometimes see in results.',
  },
  robots: {
    label: 'robots.txt',
    body: 'A small file at the top of the site telling search engines which pages they may look at and which to skip.',
  },
  sitemap: {
    label: 'sitemap',
    body: 'A file listing every page on the site so Google can find them all instead of stumbling across them.',
  },
  llms: {
    label: 'llms.txt',
    body: 'A newer, plain-text summary of the business for AI assistants like ChatGPT, so they describe it accurately when asked.',
  },
  canonical: {
    label: 'canonical URL',
    body: 'Tells Google which address is the real one when the same page is reachable through several. Prevents the site competing with itself.',
  },
  'alt-text': {
    label: 'alt text',
    body: 'A short description of an image. Screen readers read it aloud, and Google uses it to understand the picture.',
  },
  'on-page': {
    label: 'on-page work',
    body: 'Everything changed on the website itself: headlines, page text, titles, images and technical files.',
  },
  'off-page': {
    label: 'off-page work',
    body: "Everything done away from the website to build its reputation: business listings, answers on forums, articles on other sites - each one linking back.",
  },
  backlink: {
    label: 'backlink',
    body: "A link to the site from somewhere else. Google treats each one as a vote of confidence, which is why off-page work matters.",
  },
  anchor: {
    label: 'anchor text',
    body: 'The visible words that a link is attached to. Using the target phrase tells Google what the linked page is about.',
  },
  nap: {
    label: 'NAP',
    body: 'Name, Address and Phone. Google trusts a business more when these match exactly everywhere online, so we reuse one block word for word.',
  },
  citation: {
    label: 'citation',
    body: 'A mention of the business name, address and phone on another site - a directory listing, for example - with or without a link.',
  },
  directory: {
    label: 'directory listing',
    body: 'A business profile on a site like Justdial or IndiaMart. Customers find you there, and Google counts the listing as evidence the business is real.',
  },
  ctr: {
    label: 'click-through rate',
    body: 'Of the people who saw the site in Google results, the share who actually clicked. A low rate usually means the headline needs work.',
  },
  impressions: {
    label: 'impressions',
    body: 'How many times the site appeared in someone\'s search results, whether or not they clicked.',
  },
  gsc: {
    label: 'Search Console',
    body: "Google's free tool showing exactly what people searched before landing on the site. Connecting it replaces our estimates with real numbers.",
  },
  pagespeed: {
    label: 'PageSpeed score',
    body: 'How fast the site loads, scored out of 100. Slow sites lose visitors and rank lower, especially on phones.',
  },
  lcp: {
    label: 'LCP (load speed)',
    body: 'How long until the main content of the page appears. Under 2.5 seconds is good; over 4 is a problem.',
  },
  cls: {
    label: 'CLS (layout shift)',
    body: 'How much the page jumps around while loading. Under 0.1 is good - anything more and people tap the wrong thing.',
  },
  audit: {
    label: 'audit',
    body: "A full check of the website exactly as Google sees it: titles, headings, content, speed, broken links and missing files.",
  },
  crawl: {
    label: 'crawl',
    body: 'Visiting each page of a site automatically to read it - the same thing Google does before deciding how to rank it.',
  },
  'internal-link': {
    label: 'internal link',
    body: 'A link from one page of the site to another. It helps visitors get around and helps Google understand which pages matter.',
  },
  memory: {
    label: 'campaign memory',
    body: 'The record of everything done for this client. The AI reads it before writing anything, so it never repeats work or contradicts itself.',
  },
};

export const Tooltip = ({ content, children, className = '' }) => {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 8, left: Math.min(Math.max(12, r.left), window.innerWidth - 300) });
  };

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onFocus={show}
        onBlur={() => setPos(null)}
        className={className}
      >
        {children}
      </span>
      {pos &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: pos.top, left: pos.left, width: 288 }}
            className="fixed z-[70] card shadow-lift px-3 py-2.5 text-xs text-muted-strong leading-relaxed animate-fade-in pointer-events-none"
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
};

/**
 * Wraps a piece of jargon so hovering (or tabbing to it) explains it.
 * `<Term k="serp">search results</Term>` - children override the default label.
 */
export const Term = ({ k, children }) => {
  const entry = GLOSSARY[k];
  if (!entry) return children ?? null;
  return (
    <Tooltip
      className="underline decoration-dotted decoration-muted underline-offset-4 cursor-help focus:outline-none focus:decoration-primary"
      content={
        <>
          <span className="block text-ink font-medium mb-1">{entry.label}</span>
          {entry.body}
        </>
      }
    >
      {children ?? entry.label}
    </Tooltip>
  );
};
