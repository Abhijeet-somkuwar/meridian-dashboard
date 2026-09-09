import { useEffect, useRef, useState } from 'react';
import { CheckSquare, CircleHelp, ExternalLink, Loader2, Search, Sparkles, Square, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { geo } from '../../api/endpoints.js';
import { Badge, Button, Input, Modal } from './index.jsx';
import { useTour } from '../tour/Tour.jsx';
import { TOURS } from '../../lib/tourSteps.js';

/**
 * The competitor shortlist.
 *
 * The old flow ran one search and dropped whatever came back into the list.
 * This one runs several phrasings, merges them, opens each site, has the
 * model score how directly it competes, and then hands the manager a
 * shortlist of about ten to choose from. Nothing is added until it is ticked:
 * the four or five that are really the same business in the same city.
 */

const RELATIONSHIP = {
  direct: { tone: 'success', label: 'direct competitor' },
  partial: { tone: 'warning', label: 'partial overlap' },
  unknown: { tone: 'neutral', label: 'unscored' },
  not_competitor: { tone: 'danger', label: 'not a competitor' },
};

const SimilarityBar = ({ value }) => (
  <div className="flex items-center gap-2 w-28 shrink-0" title={`${value}/100 similar`}>
    <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
      <div
        className={`h-full rounded-full ${value >= 60 ? 'bg-success' : value >= 35 ? 'bg-warning' : 'bg-border-strong'}`}
        style={{ width: `${Math.max(4, Math.min(100, value ?? 0))}%` }}
      />
    </div>
    <span className="text-[11px] tabular-nums text-muted w-6 text-right">{value ?? '—'}</span>
  </div>
);

const CandidateRow = ({ c, checked, onToggle }) => {
  const rel = RELATIONSHIP[c.relationship] ?? RELATIONSHIP.unknown;
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={[
        'flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
        checked ? 'border-primary bg-primary-soft' : 'border-border hover:border-border-strong',
      ].join(' ')}
    >
      <span className={`mt-0.5 shrink-0 ${checked ? 'text-primary' : 'text-muted'}`}>
        {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      </span>
      <img
        src={`https://www.google.com/s2/favicons?domain=${c.domain}&sz=32`}
        alt=""
        width={18}
        height={18}
        className="mt-0.5 rounded shrink-0 bg-surface-2"
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-ink font-medium truncate max-w-[220px]">{c.name || c.domain}</span>
          <span className="text-xs text-muted font-mono truncate">{c.domain}</span>
          <Badge tone={rel.tone}>{rel.label}</Badge>
          {c.maps && (
            <Badge tone="primary" title={`Google Maps #${c.maps.position}${c.maps.address ? ` · ${c.maps.address}` : ''}`}>
              Maps #{c.maps.position}{c.maps.rating ? ` · ${c.maps.rating}★ (${c.maps.rating_count ?? 0})` : ''}
            </Badge>
          )}
          {c.reachable === false && (
            <Badge tone="warning" icon={TriangleAlert}>
              site did not load
            </Badge>
          )}
          {!c.verified && <Badge tone="warning">unverified</Badge>}
        </div>
        {c.description && <p className="text-xs text-muted-strong mt-0.5 line-clamp-2">{c.description}</p>}
        <p className="text-xs text-muted mt-0.5">{c.reason}</p>
        {c.matched_queries?.length > 1 && (
          <p className="text-[11px] text-muted mt-0.5 truncate">
            Seen for: {c.matched_queries.slice(0, 3).map((q) => `"${q}"`).join(', ')}
            {c.matched_queries.length > 3 ? ` +${c.matched_queries.length - 3}` : ''}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <SimilarityBar value={c.similarity} />
        <a
          href={c.url || `https://${c.domain}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
          title="Open in a new tab"
        >
          open <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export const CompetitorPicker = ({ open, onClose, seed, existing = [], max = 10, onAdd }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [custom, setCustom] = useState('');
  const abort = useRef(null);

  const room = Math.max(0, max - existing.length);

  const run = async ({ queries, more = false } = {}) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    try {
      const shown = more ? (result?.candidates ?? []).map((c) => c.domain) : [];
      const res = await geo.suggestCompetitors(
        {
          domain: seed.domain,
          business_name: seed.business_name,
          niche: seed.niche,
          city: seed.city,
          country: seed.country,
          queries: queries?.length ? queries : undefined,
          exclude: [...existing, ...shown],
          limit: 10,
          enrich: true,
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setResult((prev) =>
        more && prev
          ? { ...res, candidates: [...prev.candidates, ...res.candidates], queries: [...new Set([...prev.queries, ...res.queries])] }
          : res,
      );
      if (!res.candidates.length) toast(res.note || 'Nothing found - try different words', { duration: 6000 });
    } catch (err) {
      if (!controller.signal.aborted) toast.error(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    setSelected(new Set());
    setResult(null);
    setCustom('');
    run();
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const candidates = (result?.candidates ?? []).filter((c) => !existing.includes(c.domain));

  const toggle = (domain) => {
    const next = new Set(selected);
    if (next.has(domain)) next.delete(domain);
    else if (next.size >= room) {
      toast.error(`You can add ${room} more (${max} in total)`);
      return;
    } else next.add(domain);
    setSelected(next);
  };

  const selectRecommended = () => {
    const rec = (result?.recommended ?? []).filter((d) => candidates.some((c) => c.domain === d)).slice(0, Math.min(5, room));
    if (!rec.length) {
      toast('No clear direct competitors in this list - pick by hand');
      return;
    }
    setSelected(new Set(rec));
  };

  const tour = useTour();

  const add = () => {
    const chosen = candidates.filter((c) => selected.has(c.domain));
    onAdd(
      chosen.map((c) => ({
        domain: c.domain,
        name: c.name || c.domain,
        reason: c.reason,
        similarity: c.similarity,
        relationship: c.relationship,
        verified: Boolean(c.verified),
        description: c.description ?? null,
        url: c.url,
      })),
    );
    onClose();
  };

  const searchCustom = () => {
    const queries = custom.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 6);
    if (!queries.length) return;
    run({ queries });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose the real competitors"
      subtitle="Several searches are merged and every site is opened and scored. Tick the four or five that sell the same thing to the same customers."
      wide
      footer={
        <>
          <span className="text-xs text-muted mr-auto self-center">
            {selected.size} selected · room for {room}
          </span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={add} disabled={!selected.size} data-tour="picker-add">
            Add {selected.size || ''} competitor{selected.size === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2" data-tour="picker-search">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchCustom();
              }
            }}
            placeholder={`Search with your own words, e.g. "${seed.niche || 'trade'}${seed.city ? ` ${seed.city}` : ''}", "${seed.niche || 'trade'} near me" - comma separated`}
            disabled={loading}
          />
          <Button icon={Search} onClick={searchCustom} disabled={loading || !custom.trim()}>
            Search
          </Button>
          <Button variant="ghost" icon={CircleHelp} onClick={() => tour?.start(TOURS.competitorPicker)} title="What am I looking at?" />
        </div>

        {result?.queries?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted">Searched:</span>
            {result.queries.map((q) => (
              <span key={q} className="kbd">
                {q}
              </span>
            ))}
            {result.engine && result.engine !== 'search' && (
              <Badge tone="primary" icon={Sparkles}>
                scored by {result.engine}
              </Badge>
            )}
            {result.source === 'none' && <Badge tone="warning">no search provider</Badge>}
          </div>
        )}

        {loading && !candidates.length ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching, opening each site and scoring… about 20 seconds
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">{result?.note || 'Nothing to show yet.'}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">{result?.note}</p>
              <Button size="sm" variant="ghost" onClick={selectRecommended} disabled={!result?.recommended?.length} data-tour="picker-select">
                Select the direct ones
              </Button>
            </div>
            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1" data-tour="picker-list">
              {candidates.map((c) => (
                <CandidateRow key={c.domain} c={c} checked={selected.has(c.domain)} onToggle={() => toggle(c.domain)} />
              ))}
            </div>
            {result?.maps_only?.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-2/60 px-3 py-2" data-tour="picker-maps">
                <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Also in the Google Maps pack, without a trackable website</p>
                <p className="text-xs text-muted-strong">
                  {result.maps_only
                    .map((m) => `${m.name}${m.rating ? ` (${m.rating}★, ${m.rating_count ?? 0})` : ''}`)
                    .join(' · ')}
                </p>
                <p className="text-[11px] text-muted mt-1">They compete for the same calls; they cannot be tracked on Google positions until they have a site.</p>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-muted">
                {result?.source === 'serp' ? 'Rows come from real search results and the Google Maps local pack.' : 'Rows are model suggestions - confirm each one is real.'}
              </p>
              <Button size="sm" onClick={() => run({ more: true })} loading={loading} icon={Search} data-tour="picker-more">
                Find more
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
