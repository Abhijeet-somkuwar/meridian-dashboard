import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart3, Newspaper, PenLine, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { fmtNumber } from '../../lib/format.js';
import { Badge, Button, Card, CardHeader, Select } from '../../components/ui/index.jsx';
import { Term } from '../../components/ui/Term.jsx';
import PieceList from './PieceList.jsx';
import { useInvalidateContent } from './shared.jsx';

const BUCKET = {
  striking_distance: { tone: 'success', label: 'page 2, striking distance' },
  page_two_plus: { tone: 'neutral', label: 'page 3+' },
};

/**
 * What Search Console says people already search for, that the site has no
 * page for. Each row can become a suggested keyword; planning uses the top
 * of this list on its own.
 */
const OpportunitiesCard = ({ campaign, connected }) => {
  const invalidate = useInvalidateContent(campaign.id);
  const [selected, setSelected] = useState(new Set());
  const { data, isLoading } = useQuery({
    queryKey: ['content-opportunities', campaign.id],
    queryFn: () => contentApi.opportunities(campaign.id),
    enabled: connected,
    staleTime: 10 * 60_000,
  });

  const adopt = useMutation({
    mutationFn: (queries) => contentApi.adoptQueries(campaign.id, queries),
    onSuccess: (res) => {
      invalidate();
      setSelected(new Set());
      toast.success(`${res.keywords.length} added to the keyword list as suggestions - confirm them on the Keywords tab`);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggle = (q) => {
    const next = new Set(selected);
    next.has(q) ? next.delete(q) : next.add(q);
    setSelected(next);
  };

  const rows = data?.queries ?? [];

  return (
    <Card data-tour="content-gsc">
      <CardHeader
        title="Search Console opportunities"
        subtitle={
          connected
            ? `Searches Google already shows ${campaign.domain} for, with no keyword and no page behind them. Planning uses the top of this list automatically.`
            : 'Connect Search Console on the client profile and this fills with the searches the site already appears for - the cheapest topics there are.'
        }
        icon={BarChart3}
        action={
          connected && selected.size > 0 ? (
            <Button size="sm" variant="primary" icon={Plus} onClick={() => adopt.mutate([...selected])} loading={adopt.isPending}>
              Add {selected.size} as keyword{selected.size === 1 ? '' : 's'}
            </Button>
          ) : connected ? (
            <span className="text-xs text-muted">{data ? `${data.total_queries} queries, ${data.days} days` : ''}</span>
          ) : (
            <Link to={`/clients/${campaign.client_id}`} className="link text-xs">
              Connect Search Console
            </Link>
          )
        }
      />
      {!connected ? null : isLoading ? (
        <div className="px-6 py-4 text-xs text-muted">Reading the last 90 days…</div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-4 text-xs text-muted">Nothing outstanding - every query with impressions already has a keyword or a page.</div>
      ) : (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-8" />
                <th>Search</th>
                <th className="text-right">Impressions</th>
                <th className="text-right">Clicks</th>
                <th className="text-right">Position</th>
                <th>Lands on</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((r) => (
                <tr key={r.query} className="hover:bg-surface-2/40">
                  <td>
                    <input type="checkbox" checked={selected.has(r.query)} onChange={() => toggle(r.query)} />
                  </td>
                  <td className="text-ink">{r.query}</td>
                  <td className="text-right tabular-nums">{fmtNumber(r.impressions)}</td>
                  <td className="text-right tabular-nums text-muted-strong">{fmtNumber(r.clicks)}</td>
                  <td className="text-right tabular-nums text-muted-strong">{r.position}</td>
                  <td className="text-xs text-muted font-mono">{r.on_homepage ? 'homepage' : r.page_path}</td>
                  <td>
                    <Badge tone={BUCKET[r.bucket]?.tone ?? 'neutral'}>{BUCKET[r.bucket]?.label ?? r.bucket}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 15 && <p className="px-6 py-2 text-[11px] text-muted">Showing 15 of {rows.length}.</p>}
        </div>
      )}
    </Card>
  );
};

export default function BlogTab({ campaign, summary, onOpen }) {
  const invalidate = useInvalidateContent(campaign.id);
  const [count, setCount] = useState(10);
  const [draftCount, setDraftCount] = useState(3);
  const hasKeywords = Boolean(summary?.counts) || true;

  const plan = useMutation({
    mutationFn: () => contentApi.plan(campaign.id, { kind: 'blog', count }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.pieces.length} ideas planned`);
      if (res.warning) toast(`Model fell back to the offline planner: ${res.warning}`, { icon: '⚠️' });
    },
    onError: (err) => toast.error(err.message),
  });

  const draftNext = useMutation({
    mutationFn: () => contentApi.bulkDraft(campaign.id, { kind: 'blog', count: draftCount }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.drafted} drafted${res.failed ? `, ${res.failed} failed` : ''}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const ideas = summary?.counts?.blog?.idea ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Blog posts at scale"
          subtitle="Ideas are planned from the confirmed keywords, the phrases where a competitor is ahead, and what Search Console shows the site already appears for. Each one is written to rank for exactly one search."
          icon={Newspaper}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24 h-8 text-xs py-0">
                {[5, 10, 20, 30, 40].map((n) => (
                  <option key={n} value={n}>
                    {n} ideas
                  </option>
                ))}
              </Select>
              <Button size="sm" icon={Sparkles} onClick={() => plan.mutate()} loading={plan.isPending} disabled={!hasKeywords} data-tour="content-plan">
                Plan ideas
              </Button>
              <Select value={draftCount} onChange={(e) => setDraftCount(Number(e.target.value))} className="w-24 h-8 text-xs py-0">
                {[1, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    write {n}
                  </option>
                ))}
              </Select>
              <Button size="sm" variant="primary" icon={PenLine} onClick={() => draftNext.mutate()} loading={draftNext.isPending} disabled={!ideas} data-tour="content-write">
                Write the next {Math.min(draftCount, ideas || draftCount)}
              </Button>
            </div>
          }
        />
        <div className="px-6 py-3 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
          <span>{ideas} idea{ideas === 1 ? '' : 's'} queued</span>
          <span>{summary?.counts?.blog?.drafted ?? 0} waiting for review</span>
          <span>{summary?.counts?.blog?.published ?? 0} published</span>
          <span>
            Switch on the <Term k="autopilot">autopilot</Term> to plan, write and publish a daily quota without clicking.
          </span>
        </div>
      </Card>

      <OpportunitiesCard campaign={campaign} connected={Boolean(summary?.connections?.gsc)} />

      <PieceList
        campaign={campaign}
        kind="blog"
        onOpen={onOpen}
        emptyTitle="No blog posts planned yet"
        emptyDescription="Plan a batch of ideas from the confirmed keywords. Each idea carries its keyword, an angle and an outline, and is written on demand or by the autopilot."
        emptyAction={
          <Button variant="primary" icon={Sparkles} onClick={() => plan.mutate()} loading={plan.isPending}>
            Plan {count} ideas
          </Button>
        }
      />
    </div>
  );
}
