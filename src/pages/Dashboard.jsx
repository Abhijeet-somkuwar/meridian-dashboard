import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  ListTodo,
  Plus,
  TrendingDown,
} from 'lucide-react';
import { dashboard } from '../api/endpoints.js';
import { useAuth } from '../store/auth.js';
import { fmtRelative } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  ClientLogo,
  PlatformBadge,
  StatTile,
} from '../components/ui/index.jsx';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const CATEGORY_TONE = {
  onpage: 'primary',
  technical: 'warning',
  offpage: 'success',
  rank: 'neutral',
  report: 'primary',
  system: 'neutral',
};

export default function Dashboard() {
  const { manager } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboard.get,
    refetchInterval: 120_000,
  });

  if (isLoading) return <Loading label="Loading your day" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { stats, tasks, drops, reportsDue, activity, ai } = data;
  const engine = ai?.engine ?? 'offline';

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${manager?.name?.split(' ')[0] ?? 'there'}.`}
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        actions={
          <Button variant="primary" icon={Plus} onClick={() => navigate('/clients/new')}>
            New client
          </Button>
        }
        badge={
          <Badge
            tone={engine === 'claude' ? 'primary' : engine === 'gemini' ? 'warning' : 'neutral'}
            title={
              engine === 'offline'
                ? 'Add ANTHROPIC_API_KEY or GEMINI_API_KEY in backend/.env for model-written content'
                : `Content is written by ${ai.label}`
            }
          >
            {ai?.label ?? 'Offline planner'}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6" data-tour="stats">
        <StatTile
          label="Active campaigns"
          value={stats.active_campaigns}
          hint={`${stats.total_campaigns} total`}
          icon={Building2}
          onClick={() => navigate('/clients')}
        />
        <StatTile
          label="Positions dropped"
          value={stats.rank_drops}
          hint={stats.rank_drops ? 'Worth a look today' : 'Nothing slipping'}
          tone={stats.rank_drops ? 'danger' : 'success'}
          icon={TrendingDown}
        />
        <StatTile
          label="Pending tasks"
          value={stats.pending_suggestions + stats.pending_offpage}
          hint={`${stats.pending_suggestions} website · ${stats.pending_offpage} listings`}
          tone={stats.pending_suggestions + stats.pending_offpage ? 'warning' : 'neutral'}
          icon={ListTodo}
        />
        <StatTile
          label="Reports due"
          value={stats.reports_due}
          hint={stats.reports_due ? 'Draft ready to review' : 'All sent'}
          tone={stats.reports_due ? 'primary' : 'neutral'}
          icon={FileText}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card data-tour="tasks">
            <CardHeader
              title="Today's priority tasks"
              subtitle="One line per client - the single thing that needs you"
              icon={ListTodo}
            />
            {tasks.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No campaigns yet"
                description="Add your first client and Meridian checks their website straight away."
                action={
                  <Button variant="primary" icon={Plus} onClick={() => navigate('/clients/new')}>
                    Add a client
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {tasks.map((task) => {
                  const idle =
                    !task.keywords_to_review && !task.pending_suggestions && !task.pending_offpage;
                  return (
                    <Link
                      key={task.campaign_id}
                      to={`/campaigns/${task.campaign_id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-surface-2/60 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ClientLogo client={task} size={20} />
                          <span className="text-sm font-medium text-ink">{task.business_name}</span>
                          <PlatformBadge type={task.platform_type} />
                          <Badge tone="neutral">{task.phase}</Badge>
                        </div>
                        <p className="text-sm text-muted mt-1 truncate">{task.headline}</p>
                      </div>
                      {idle ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-muted group-hover:text-ink shrink-0 transition-colors" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {drops.length > 0 && (
            <Card>
              <CardHeader
                title="Search phrases that slipped"
                subtitle="Dropped three or more places since the last check"
                icon={AlertTriangle}
              />
              <div className="divide-y divide-border">
                {drops.map((d, i) => (
                  <Link
                    key={`${d.campaign_id}-${d.keyword}-${i}`}
                    to={`/campaigns/${d.campaign_id}/ranks`}
                    className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-surface-2/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">{d.keyword}</p>
                      <p className="text-xs text-muted">{d.business_name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm shrink-0">
                      <span className="text-muted tabular-nums">{d.previous_rank}</span>
                      <ArrowRight className="w-3 h-3 text-muted" />
                      <span className="text-danger font-medium tabular-nums">{d.rank_position}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {reportsDue.length > 0 && (
            <Card>
              <CardHeader title="Reports due" icon={FileText} />
              <div className="divide-y divide-border">
                {reportsDue.map((r) => (
                  <Link
                    key={r.campaign_id}
                    to={`/campaigns/${r.campaign_id}/reports`}
                    className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-surface-2/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">{r.business_name}</p>
                      <p className="text-xs text-muted">
                        {r.drafts_waiting > 0
                          ? `${r.drafts_waiting} draft waiting`
                          : r.last_sent
                            ? `Last sent ${fmtRelative(r.last_sent)}`
                            : 'Never sent'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card data-tour="activity">
            <CardHeader
              title="Recent activity"
              subtitle="Everything you and the platform have done"
            />
            <div className="px-6 py-4 space-y-4 max-h-[520px] overflow-y-auto">
              {activity.length === 0 ? (
                <p className="text-sm text-muted">Nothing recorded yet.</p>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border-strong shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-strong leading-snug">{a.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone={CATEGORY_TONE[a.category]}>{a.category}</Badge>
                        <span className="text-[11px] text-muted">{a.business_name}</span>
                        <span className="text-[11px] text-muted">· {fmtRelative(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
