import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ChevronDown, ChevronRight, RefreshCw, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { keywords as keywordsApi, ranks as ranksApi } from '../../api/endpoints.js';
import { fmtRelative } from '../../lib/format.js';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Loading } from '../ui/index.jsx';
import { Term } from '../ui/Term.jsx';

/**
 * Live tracking: every confirmed keyword against every chosen competitor,
 * from the same results page the client's position came from. Watched
 * keywords are re-checked every four hours; any row can be refreshed now.
 */

const Pos = ({ value, best }) => {
  if (value == null) return <span className="text-muted">—</span>;
  return (
    <span className={`tabular-nums font-medium ${best ? 'text-success' : value <= 10 ? 'text-ink' : 'text-muted-strong'}`}>#{value}</span>
  );
};

const short = (domain) => domain.replace(/^www\./, '').replace(/\.(com|in|co\.in|net|org|io|co)$/i, '');

export default function LiveTracking({ campaign, device }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ranks-live', campaign.id, device],
    queryFn: () => ranksApi.live(campaign.id, { device }),
    refetchInterval: 5 * 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ranks-live', campaign.id] });
    queryClient.invalidateQueries({ queryKey: ['ranks', campaign.id] });
    queryClient.invalidateQueries({ queryKey: ['keywords', campaign.id] });
  };

  const checkOne = useMutation({
    mutationFn: (keywordId) => ranksApi.checkOne(campaign.id, keywordId, device),
    onMutate: (id) => setBusy(id),
    onSettled: () => setBusy(null),
    onSuccess: (res) => {
      invalidate();
      const ahead = res.competitors.filter((c) => c.rank_position != null && (res.rank_position == null || c.rank_position < res.rank_position));
      toast.success(`"${res.keyword}": ${res.rank_position ? `#${res.rank_position}` : 'not in the checked depth'}${ahead.length ? ` · ${ahead.length} competitor(s) ahead` : ''}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const pulse = useMutation({
    mutationFn: () => ranksApi.check(campaign.id, device, true),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Pulsed ${res.checked} watched keyword(s) · ${res.improvements.length} up, ${res.drops.length} down`);
    },
    onError: (err) => toast.error(err.message),
  });

  const watch = useMutation({
    mutationFn: ({ id, on }) => keywordsApi.watch(campaign.id, id, on),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.keyword.is_watched ? 'Watched - checked every 4 hours' : 'Back to the nightly check');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading live tracking" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { rows, competitors, ahead, watched, lastPulse, source } = data;

  return (
    <Card data-tour="rank-live">
      <CardHeader
        title={<Term k="live-tracking">Live tracking</Term>}
        subtitle={
          competitors.length
            ? `You against ${competitors.length} competitor${competitors.length === 1 ? '' : 's'} on every keyword. ${watched} watched · ${lastPulse ? `last check ${fmtRelative(lastPulse)}` : 'not checked yet'}`
            : 'Add competitors on the client profile to see who is ahead on each keyword.'
        }
        icon={Activity}
        action={
          <div className="flex items-center gap-2">
            {source === 'simulated' && <Badge tone="warning">simulated positions</Badge>}
            <Button size="sm" variant="primary" icon={RefreshCw} onClick={() => pulse.mutate()} loading={pulse.isPending} disabled={!watched} title="Re-check every watched keyword now">
              Pulse watched
            </Button>
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={Activity} title="No confirmed keywords" description="Confirm the keyword list first; then star the ones to watch closely." />
      ) : (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-8" />
                <th className="w-8" title="Watch: check every 4 hours">
                  <Star className="w-3.5 h-3.5" />
                </th>
                <th>Keyword</th>
                <th className="text-right">You</th>
                {competitors.map((d) => (
                  <th key={d} className="text-right whitespace-nowrap" title={d}>
                    <span>{short(d)}</span>
                    {ahead[d] > 0 && <span className="block text-[10px] text-danger normal-case tracking-normal">ahead on {ahead[d]}</span>}
                  </th>
                ))}
                <th>Checked</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const comp = r.competitors ?? {};
                const best = Math.min(...[r.own, ...Object.values(comp)].filter((v) => v != null), Infinity);
                const open = expanded === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className="hover:bg-surface-2/40">
                      <td>
                        <button type="button" onClick={() => setExpanded(open ? null : r.id)} className="text-muted hover:text-ink" title="Top ten as it looked">
                          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => watch.mutate({ id: r.id, on: !r.is_watched })}
                          className={r.is_watched ? 'text-warning' : 'text-muted hover:text-warning'}
                          title={r.is_watched ? 'Watched - checked every 4 hours' : 'Watch this keyword'}
                        >
                          <Star className="w-4 h-4" fill={r.is_watched ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td>
                        <div className="text-ink">{r.keyword}</div>
                        <div className="text-[11px] text-muted">{r.keyword_type}{r.previous_rank != null && r.own != null && r.previous_rank !== r.own ? ` · was #${r.previous_rank}` : ''}</div>
                      </td>
                      <td className="text-right">
                        <Pos value={r.own} best={r.own != null && r.own === best} />
                      </td>
                      {competitors.map((d) => (
                        <td key={d} className="text-right">
                          <Pos value={comp[d] ?? null} best={comp[d] != null && comp[d] === best && (r.own == null || comp[d] < r.own)} />
                        </td>
                      ))}
                      <td className="text-xs text-muted whitespace-nowrap">{r.checked_at ? fmtRelative(r.checked_at) : 'never'}</td>
                      <td className="text-right">
                        <Button size="sm" variant="ghost" icon={RefreshCw} title="Check now" onClick={() => checkOne.mutate(r.id)} loading={busy === r.id} />
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={5 + competitors.length} className="bg-surface-2/40">
                          {r.serp_top?.length ? (
                            <ol className="text-xs space-y-0.5 py-1">
                              {r.serp_top.map((t) => {
                                const mine = t.domain === campaign.domain.replace(/^www\./, '');
                                const rival = competitors.includes(t.domain);
                                return (
                                  <li key={t.rank} className={`flex items-center gap-2 ${mine ? 'text-success' : rival ? 'text-warning' : 'text-muted-strong'}`}>
                                    <span className="tabular-nums w-6 text-right">{t.rank}.</span>
                                    <a href={t.url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[520px]">
                                      {t.title || t.url}
                                    </a>
                                    <span className="text-muted font-mono truncate">{t.domain}</span>
                                    {mine && <Badge tone="success">you</Badge>}
                                    {rival && <Badge tone="warning">competitor</Badge>}
                                  </li>
                                );
                              })}
                            </ol>
                          ) : (
                            <p className="text-xs text-muted py-2">No results page stored yet - check this keyword to capture one.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <p className="px-6 py-3 text-xs text-muted">
            Star a keyword to have it checked every four hours. Every check reads one results page and records where you and each competitor sit, so competitor tracking costs nothing extra.
          </p>
        </div>
      )}
    </Card>
  );
}
