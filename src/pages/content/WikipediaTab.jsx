import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookMarked, Check, ExternalLink, Globe, PenLine, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { fmtRelative } from '../../lib/format.js';
import { Badge, Button, Card, CardHeader, CopyButton, EmptyState, ErrorState, Loading } from '../../components/ui/index.jsx';
import { Term } from '../../components/ui/Term.jsx';
import { useInvalidateContent } from './shared.jsx';

const KIND = {
  citation: { title: 'Articles that cite the site', hint: 'Wikipedia already links to the domain here. Tracked so a removal is noticed.', tone: 'success' },
  mention: { title: 'Articles that mention the name', hint: 'The business name appears in the text, linked or not.', tone: 'primary' },
  opportunity: { title: 'Citation gaps in the niche', hint: 'Sentences tagged “citation needed” in articles about the trade or the city.', tone: 'warning' },
};

const STATUS = {
  new: { tone: 'neutral', label: 'new' },
  drafted: { tone: 'primary', label: 'suggestion ready' },
  requested: { tone: 'warning', label: 'requested on Talk page' },
  accepted: { tone: 'success', label: 'accepted' },
  dismissed: { tone: 'neutral', label: 'dismissed' },
};

const VERDICT = {
  citable: { tone: 'success', label: 'citable' },
  needs_better_source: { tone: 'warning', label: 'needs a better source' },
  not_citable: { tone: 'danger', label: 'not citable yet' },
};

const Row = ({ campaign, row }) => {
  const invalidate = useInvalidateContent(campaign.id);
  const [open, setOpen] = useState(false);
  const s = row.suggestion ?? {};

  const draft = useMutation({
    mutationFn: () => contentApi.wikiDraft(campaign.id, row.id),
    onSuccess: (res) => {
      invalidate();
      setOpen(true);
      toast.success(`Suggestion drafted: ${VERDICT[res.row.suggestion?.verdict]?.label ?? 'done'}`);
    },
    onError: (err) => toast.error(err.message),
  });
  const setStatus = useMutation({
    mutationFn: (status) => contentApi.wikiStatus(campaign.id, row.id, status),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: () => contentApi.wikiRemove(campaign.id, row.id),
    onSuccess: () => invalidate(),
  });

  return (
    <div className="px-6 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <a href={row.article_url} target="_blank" rel="noreferrer" className="text-sm text-ink font-medium hover:text-primary inline-flex items-center gap-1">
              {row.article_title} <ExternalLink className="w-3 h-3" />
            </a>
            {row.section && <Badge tone="neutral">§ {row.section}</Badge>}
            <Badge tone={STATUS[row.status]?.tone}>{STATUS[row.status]?.label}</Badge>
            {s.verdict && <Badge tone={VERDICT[s.verdict]?.tone}>{VERDICT[s.verdict]?.label}</Badge>}
          </div>
          {row.snippet && <p className="text-xs text-muted-strong mt-0.5 line-clamp-2">{row.snippet}</p>}
          <p className="text-[11px] text-muted mt-0.5">seen {fmtRelative(row.last_seen)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {row.kind === 'opportunity' && row.status === 'new' && (
            <Button size="sm" icon={PenLine} onClick={() => draft.mutate()} loading={draft.isPending}>
              Draft suggestion
            </Button>
          )}
          {row.kind === 'opportunity' && s.verdict && (
            <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
              {open ? 'Hide' : 'View'}
            </Button>
          )}
          {row.kind === 'opportunity' && row.status === 'drafted' && (
            <Button size="sm" variant="ghost" icon={Check} title="I posted the request on the Talk page" onClick={() => setStatus.mutate('requested')}>
              Requested
            </Button>
          )}
          {row.status === 'requested' && (
            <Button size="sm" variant="success" icon={Check} onClick={() => setStatus.mutate('accepted')}>
              Accepted
            </Button>
          )}
          {row.kind === 'opportunity' && row.status !== 'dismissed' && (
            <Button size="sm" variant="ghost" icon={X} title="Dismiss" onClick={() => setStatus.mutate('dismissed')} />
          )}
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove.mutate()} />
        </div>
      </div>

      {open && s.verdict && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2/60 p-4 space-y-3 text-sm">
          {s.sentence && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Sentence needing a source ({s.section})</div>
              <p className="text-muted-strong italic">“{s.sentence}”</p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Citation (wikitext)</span>
              <CopyButton text={s.citation_wikitext} label="Copy" variant="ghost" />
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-lg border border-border bg-bg/60 p-3 text-ink">{s.citation_wikitext}</pre>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-wide text-muted">Talk-page request (post this, not an edit)</span>
              <CopyButton text={s.talk_page_request} label="Copy" variant="ghost" />
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-lg border border-border bg-bg/60 p-3 text-ink">{s.talk_page_request}</pre>
            <a
              href={row.article_url.replace('/wiki/', '/wiki/Talk:')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
            >
              Open the article's Talk page <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {s.source_url && (
            <p className="text-xs text-muted">
              Source page: <a href={s.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.source_url}</a>
            </p>
          )}
          {s.policy_notes?.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-muted-strong space-y-0.5">
              {s.policy_notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default function WikipediaTab({ campaign }) {
  const invalidate = useInvalidateContent(campaign.id);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['content-wikipedia', campaign.id],
    queryFn: () => contentApi.wikipedia(campaign.id),
  });

  const scan = useMutation({
    mutationFn: () => contentApi.wikiScan(campaign.id),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Scan done: ${res.citations} citation(s), ${res.mentions} mention(s), ${res.added} new row(s)`);
    },
    onError: (err) => toast.error(err.message),
  });

  const rows = data?.rows ?? [];
  const groups = ['citation', 'mention', 'opportunity'].map((k) => ({ kind: k, ...KIND[k], rows: rows.filter((r) => r.kind === k) }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={<Term k="wiki-citation">Wikipedia mentions</Term>}
          subtitle="Where the business is already cited or named on Wikipedia, and where a neutral, sourced citation would be legitimate. Scanned every Sunday."
          icon={Globe}
          action={
            <Button size="sm" variant="primary" icon={RefreshCw} onClick={() => scan.mutate()} loading={scan.isPending} data-tour="content-wiki">
              Scan now
            </Button>
          }
        />
        <div className="px-6 py-3 flex gap-2.5 text-xs text-muted-strong">
          <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <p>
            Meridian never edits Wikipedia. For each gap it drafts a neutral citation and the Talk-page request a person with a declared{' '}
            <Term k="coi">conflict of interest</Term> would post. A footnote earns a mention; a promotional edit gets reverted and the domain
            blacklisted. If the site has no page that qualifies as a source, the suggestion says so.
          </p>
        </div>
      </Card>

      {isLoading ? (
        <Loading label="Loading Wikipedia data" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookMarked}
            title="Not scanned yet"
            description="The scan looks up every article linking to the domain, every article naming the business, and citation gaps in articles about the trade and the city."
            action={
              <Button variant="primary" icon={RefreshCw} onClick={() => scan.mutate()} loading={scan.isPending}>
                Run the first scan
              </Button>
            }
          />
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.kind}>
            <CardHeader title={g.title} subtitle={g.hint} action={<Badge tone={g.tone}>{g.rows.length}</Badge>} />
            {g.rows.length === 0 ? (
              <div className="px-6 py-6 text-sm text-muted text-center">None found.</div>
            ) : (
              <div className="divide-y divide-border">
                {g.rows.map((r) => (
                  <Row key={r.id} campaign={campaign} row={r} />
                ))}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
