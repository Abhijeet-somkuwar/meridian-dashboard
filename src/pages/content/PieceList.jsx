import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ExternalLink, PenLine, Sparkles, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { fmtDate, fmtNumber, fmtRelative } from '../../lib/format.js';
import { Badge, Button, Card, EmptyState, ErrorState, Loading } from '../../components/ui/index.jsx';
import { StatusBadge, useInvalidateContent } from './shared.jsx';

/**
 * The list every content tab is built on. Select rows, draft or approve them
 * in bulk, open one in the editor. `extra` renders kind-specific cells
 * (subreddit and score for Reddit, variables for programmatic pages).
 */
export default function PieceList({ campaign, kind, onOpen, extra, emptyTitle, emptyDescription, emptyAction }) {
  const invalidate = useInvalidateContent(campaign.id);
  const [selected, setSelected] = useState(new Set());
  const [busyRow, setBusyRow] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['content-pieces', campaign.id, kind],
    queryFn: () => contentApi.pieces(campaign.id, { kind }),
    refetchInterval: (q) => (q.state.data?.pieces?.some((p) => p.status === 'drafting') ? 5_000 : false),
  });

  const draftOne = useMutation({
    mutationFn: (id) => contentApi.draft(campaign.id, id),
    onMutate: (id) => setBusyRow(id),
    onSettled: () => setBusyRow(null),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Drafted "${res.piece.title}" (${fmtNumber(res.piece.word_count)} words)`);
      if (res.warning) toast(`Model fell back to the offline planner: ${res.warning}`, { icon: '⚠️' });
    },
    onError: (err) => {
      invalidate();
      toast.error(err.message);
    },
  });

  const bulkDraft = useMutation({
    mutationFn: (ids) => contentApi.bulkDraft(campaign.id, { ids }),
    onSuccess: (res) => {
      invalidate();
      setSelected(new Set());
      toast.success(`${res.drafted} drafted${res.failed ? `, ${res.failed} failed` : ''}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkStatus = useMutation({
    mutationFn: ({ ids, status }) => contentApi.bulkStatus(campaign.id, ids, status),
    onSuccess: (res, vars) => {
      invalidate();
      setSelected(new Set());
      toast.success(`${res.pieces.length} ${vars.status}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id) => contentApi.remove(campaign.id, id),
    onSuccess: () => {
      invalidate();
      toast.success('Removed');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading content" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const rows = data.pieces;
  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  const chosen = rows.filter((r) => selected.has(r.id));
  const draftable = chosen.filter((r) => ['idea', 'failed'].includes(r.status)).map((r) => r.id);
  const approvable = chosen.filter((r) => r.status === 'drafted').map((r) => r.id);

  if (!rows.length) {
    return (
      <Card>
        <EmptyState icon={Sparkles} title={emptyTitle ?? 'Nothing here yet'} description={emptyDescription} action={emptyAction} />
      </Card>
    );
  }

  return (
    <Card data-tour="content-list">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 bg-primary-soft border-b border-border">
          <span className="text-sm text-primary font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          {draftable.length > 0 && (
            <Button size="sm" variant="primary" icon={PenLine} onClick={() => bulkDraft.mutate(draftable.slice(0, 10))} loading={bulkDraft.isPending}>
              Draft {Math.min(draftable.length, 10)}
            </Button>
          )}
          {approvable.length > 0 && (
            <Button size="sm" variant="success" icon={Check} onClick={() => bulkStatus.mutate({ ids: approvable, status: 'approved' })} loading={bulkStatus.isPending}>
              Approve
            </Button>
          )}
          <Button size="sm" variant="danger" icon={X} onClick={() => bulkStatus.mutate({ ids: [...selected], status: 'rejected' })}>
            Reject
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th className="w-8">
                <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} />
              </th>
              <th>Title</th>
              {extra?.header}
              <th>Status</th>
              <th className="text-right">Words</th>
              <th>When</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2/40">
                <td>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                </td>
                <td className="max-w-[420px]">
                  <button type="button" onClick={() => onOpen(p)} className="text-left text-ink hover:text-primary transition-colors">
                    {p.title}
                  </button>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {p.keyword_targeted && <span className="text-xs text-muted">for “{p.keyword_targeted}”</span>}
                    {p.is_automated && <Badge tone="neutral">auto</Badge>}
                    {p.status === 'published' && p.source?.prune?.flagged && !p.source?.prune?.kept && (
                      <Badge tone="warning" title={`${p.source.prune.impressions} impressions in ${p.source.prune.window_days} days`}>no impressions</Badge>
                    )}
                    {p.source?.from === 'search_console' && <Badge tone="primary">from Search Console</Badge>}
                    {p.engine && p.engine !== 'offline' && p.has_body && <Badge tone="primary">{p.engine}</Badge>}
                    {p.engine === 'offline' && p.has_body && <Badge tone="neutral">offline planner</Badge>}
                    {p.error && <span className="text-xs text-danger truncate max-w-[280px]" title={p.error}>{p.error}</span>}
                  </div>
                </td>
                {extra?.cell?.(p)}
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td className="text-right tabular-nums text-muted-strong">{p.word_count ? fmtNumber(p.word_count) : '—'}</td>
                <td className="text-xs text-muted whitespace-nowrap">
                  {p.published_at ? `published ${fmtRelative(p.published_at)}` : p.scheduled_for ? `due ${fmtDate(p.scheduled_for, 'd MMM')}` : fmtRelative(p.created_at)}
                </td>
                <td className="text-right whitespace-nowrap">
                  {p.published_url && (
                    <a href={p.published_url} target="_blank" rel="noreferrer" title="Open the live page">
                      <Button size="sm" variant="ghost" icon={ExternalLink} />
                    </a>
                  )}
                  {['idea', 'failed', 'unpublished'].includes(p.status) && (
                    <Button size="sm" variant="ghost" icon={PenLine} title="Write it" onClick={() => draftOne.mutate(p.id)} loading={busyRow === p.id} />
                  )}
                  {p.status !== 'published' && (
                    <Button size="sm" variant="ghost" icon={Trash2} title="Remove" onClick={() => remove.mutate(p.id)} />
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onOpen(p)}>
                    Open
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
