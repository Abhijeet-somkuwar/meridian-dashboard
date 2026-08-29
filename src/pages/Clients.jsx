import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, ExternalLink, Loader2, Plus, Search, Settings2, X } from 'lucide-react';
import { clients } from '../api/endpoints.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Loading,
  PageHeader,
  PlatformBadge,
} from '../components/ui/index.jsx';

const PHASE_TONE = {
  active: 'success',
  onpage_done: 'success',
  onpage_in_progress: 'primary',
  keyword_confirmed: 'primary',
  keyword_pending: 'warning',
  onboarding: 'warning',
  paused: 'neutral',
  completed: 'neutral',
};

const phaseLabel = (status) => (status ?? 'no campaign').replace(/_/g, ' ');

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);

  /**
   * Search runs on the server, not in the browser: one request per pause in
   * typing, cancelled if a newer one starts, and the previous results stay on
   * screen while it runs so the list never flashes empty.
   */
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['clients', debounced],
    queryFn: ({ signal }) => clients.list({ q: debounced || undefined }, signal),
    placeholderData: (previous) => previous,
  });

  if (isLoading) return <Loading label="Loading clients" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const rows = data.clients;
  const searching = debounced !== '' ;

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={
          searching
            ? `${data.total} match${data.total === 1 ? '' : 'es'} for “${debounced}”`
            : `${data.total} active`
        }
        actions={
          <>
            <div className="relative" data-tour="client-search">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, website, trade or city"
                aria-label="Search clients"
                className="pl-9 pr-9 w-72"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <Button variant="primary" icon={Plus} data-tour="client-new" onClick={() => navigate('/clients/new')}>
              New client
            </Button>
          </>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={searching ? 'No matches' : 'No clients yet'}
            description={
              searching
                ? 'Nothing matches that name, website, trade or city. Try fewer words.'
                : 'Add a client after the first call and Meridian checks their website straight away.'
            }
            action={
              !searching && (
                <Button variant="primary" icon={Plus} onClick={() => navigate('/clients/new')}>
                  Add a client
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.id} data-tour="client-card" className="p-5 flex flex-col gap-4 hover:border-border-strong transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={c.campaign_id ? `/campaigns/${c.campaign_id}` : `/clients/${c.id}`}
                    className="text-sm font-medium text-ink hover:text-primary transition-colors block truncate"
                  >
                    {c.business_name}
                  </Link>
                  <a
                    href={`https://${c.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 mt-0.5"
                  >
                    {c.domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <PlatformBadge type={c.platform_type} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge tone={PHASE_TONE[c.campaign_status] ?? 'neutral'}>{phaseLabel(c.campaign_status)}</Badge>
                {c.geo_target && <Badge tone="neutral">{c.geo_target.split(',')[0]}</Badge>}
                {c.gsc_connected && <Badge tone="success">GSC</Badge>}
                {c.wp_connected && <Badge tone="success">WP push</Badge>}
              </div>

              <p className="text-xs text-muted line-clamp-2 min-h-[2rem]">
                {c.next_action || c.niche || 'No next action recorded'}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted">
                <span className="tabular-nums">
                  {c.confirmed_keywords ?? 0} keywords
                  {c.pending_suggestions > 0 && (
                    <span className="text-warning"> · {c.pending_suggestions} to review</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Link to={`/clients/${c.id}`} title="Client settings">
                    <Button variant="ghost" size="sm" icon={Settings2} />
                  </Link>
                  {c.campaign_id && (
                    <Link to={`/campaigns/${c.campaign_id}`}>
                      <Button variant="secondary" size="sm">
                        Open
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
