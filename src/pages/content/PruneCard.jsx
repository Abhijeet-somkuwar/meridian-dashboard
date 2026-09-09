import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { EyeOff, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { fmtDate, fmtRelative } from '../../lib/format.js';
import { Badge, Button, Card, CardHeader } from '../../components/ui/index.jsx';
import { KIND_LABEL, useInvalidateContent } from './shared.jsx';

/**
 * Published pages Search Console has not shown to anyone. A page that has
 * been live two months and earned under five impressions in four weeks is
 * not helping; it is thinning the site. Keep it, or take it down - back to
 * draft on the CMS, recorded here as taken down.
 */
export default function PruneCard({ campaign, connected, onOpen }) {
  const invalidate = useInvalidateContent(campaign.id);
  const { data, isLoading } = useQuery({
    queryKey: ['content-prune', campaign.id],
    queryFn: () => contentApi.pruneList(campaign.id),
  });

  const scan = useMutation({
    mutationFn: () => contentApi.pruneScan(campaign.id),
    onSuccess: (res) => {
      invalidate();
      if (!res.connected) toast('Search Console is not connected for this client', { icon: '⚠️' });
      else toast.success(`${res.checked} page(s) checked, ${res.candidates.length} with no impressions`);
    },
    onError: (err) => toast.error(err.message),
  });
  const unpublish = useMutation({
    mutationFn: (id) => contentApi.unpublish(campaign.id, id),
    onSuccess: (res) => {
      invalidate();
      if (res.note) toast(res.note, { icon: '⚠️', duration: 8000 });
      else toast.success('Taken down - set to draft on the site');
    },
    onError: (err) => toast.error(err.message),
  });
  const keep = useMutation({
    mutationFn: (id) => contentApi.keep(campaign.id, id),
    onSuccess: () => {
      invalidate();
      toast.success('Kept - it will not be flagged again');
    },
    onError: (err) => toast.error(err.message),
  });

  const rows = data?.candidates ?? [];

  return (
    <Card data-tour="content-prune">
      <CardHeader
        title="Pages nobody is seeing"
        subtitle={
          connected
            ? 'Published over 60 days ago, under 5 impressions in the last 28 days. Checked every Sunday; keep the ones you believe in and take down the rest.'
            : 'Connect Search Console on the client profile and every Sunday this lists the published pages Google is not showing to anyone.'
        }
        icon={EyeOff}
        action={
          connected ? (
            <div className="flex items-center gap-2">
              {data?.last_checked && <span className="text-xs text-muted">checked {fmtRelative(data.last_checked)}</span>}
              <Button size="sm" icon={RefreshCw} onClick={() => scan.mutate()} loading={scan.isPending}>
                Check now
              </Button>
            </div>
          ) : (
            <Link to={`/clients/${campaign.client_id}`} className="link text-xs">
              Connect Search Console
            </Link>
          )
        }
      />
      {!connected ? null : isLoading ? (
        <div className="px-6 py-4 text-xs text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-4 text-xs text-muted">
          {data?.checked ? `All ${data.checked} checked page(s) are being shown in search.` : 'Nothing checked yet - press Check now, or wait for Sunday.'}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onOpen?.(p)} className="text-left text-sm text-ink hover:text-primary transition-colors">
                  {p.title}
                </button>
                <p className="text-xs text-muted mt-0.5">
                  <Badge tone="neutral">{KIND_LABEL[p.kind]}</Badge>{' '}
                  published {fmtDate(p.published_at, 'd MMM yyyy')} · {p.source?.prune?.impressions ?? 0} impression{p.source?.prune?.impressions === 1 ? '' : 's'}, {p.source?.prune?.clicks ?? 0} click
                  {p.source?.prune?.clicks === 1 ? '' : 's'} in {p.source?.prune?.window_days ?? 28} days
                  {p.published_url && (
                    <>
                      {' · '}
                      <a href={p.published_url} target="_blank" rel="noreferrer" className="link font-mono">
                        {p.published_url.replace(/^https?:\/\//, '')}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <Button size="sm" icon={ShieldCheck} onClick={() => keep.mutate(p.id)} loading={keep.isPending && keep.variables === p.id}>
                Keep
              </Button>
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => unpublish.mutate(p.id)} loading={unpublish.isPending && unpublish.variables === p.id}>
                Take down
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
