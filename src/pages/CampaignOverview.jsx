import { Link, useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Gauge,
  Link2,
  PenLine,
  Search,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { campaigns } from '../api/endpoints.js';
import { fmtRelative } from '../lib/format.js';
import { Badge, Button, Card, CardHeader, HealthRing, StatTile } from '../components/ui/index.jsx';
import { Term } from '../components/ui/Term.jsx';

const PHASE_ORDER = [
  'onboarding',
  'keyword_pending',
  'keyword_confirmed',
  'onpage_in_progress',
  'onpage_done',
  'active',
];

const PHASE_LABEL = {
  onboarding: 'Onboarding',
  keyword_pending: 'Keywords',
  keyword_confirmed: 'Confirmed',
  onpage_in_progress: 'On-page',
  onpage_done: 'Published',
  active: 'Running',
};

const CATEGORY_TONE = {
  onpage: 'primary',
  technical: 'warning',
  offpage: 'success',
  rank: 'neutral',
  report: 'primary',
  system: 'neutral',
};

const PhaseRail = ({ status }) => {
  const current = PHASE_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {PHASE_ORDER.map((phase, i) => {
        const done = current > i;
        const active = current === i;
        return (
          <div key={phase} className="flex items-center gap-1 shrink-0">
            <div
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                active
                  ? 'bg-primary-soft text-primary'
                  : done
                    ? 'bg-success-soft text-success'
                    : 'bg-surface-2 text-muted',
              ].join(' ')}
            >
              {done && <CheckCircle2 className="w-3 h-3" />}
              {PHASE_LABEL[phase]}
            </div>
            {i < PHASE_ORDER.length - 1 && <div className="w-4 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
};

export default function CampaignOverview() {
  const { campaign, overview, refetchOverview } = useOutletContext();
  const queryClient = useQueryClient();

  const advance = useMutation({
    mutationFn: () => campaigns.setPhase(campaign.id),
    onSuccess: ({ campaign: updated }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Moved to ${updated.current_phase}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const { keywords, suggestions, ranks, offpage, audit, report, activity } = overview;

  const nextSteps = [
    keywords.suggested > 0 && {
      to: 'keywords',
      icon: BarChart3,
      title: `${keywords.suggested} keywords waiting for confirmation`,
      body: 'Send the list to the client, then lock in whatever they approve.',
    },
    suggestions.pending > 0 && {
      to: 'onpage',
      icon: PenLine,
      title: `${suggestions.pending} on-page changes to review`,
      body: 'Each one tells you exactly where to paste it on this website.',
    },
    offpage.pending > 0 && {
      to: 'offpage',
      icon: Link2,
      title: `${offpage.pending} off-page submission(s) ready`,
      body: 'Packages are pre-filled - copy, paste, mark done.',
    },
    !audit && {
      to: 'audit',
      icon: Search,
      title: 'No audit yet',
      body: 'Check the website first, so the AI knows the starting point.',
    },
    keywords.confirmed === 0 &&
      keywords.suggested === 0 && {
        to: 'keywords',
        icon: BarChart3,
        title: 'No keywords yet',
        body: 'Find the search phrases worth targeting, one main phrase per page.',
      },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card className="px-6 py-5" data-tour="phase-rail">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PhaseRail status={campaign.status} />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => advance.mutate()}
            loading={advance.isPending}
            disabled={campaign.status === 'completed'}
          >
            Advance phase <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Search phrases"
          value={keywords.confirmed}
          hint={keywords.suggested ? `${keywords.suggested} awaiting review` : `${keywords.rejected} rejected`}
          icon={BarChart3}
        />
        <StatTile
          label="In top 10"
          value={ranks.top10 ?? 0}
          hint={ranks.tracked ? `of ${ranks.tracked} tracked · avg ${ranks.avg_rank ?? '—'}` : 'No rank data yet'}
          tone={ranks.top10 ? 'success' : 'neutral'}
          icon={Gauge}
        />
        <StatTile
          label="Website changes done"
          value={suggestions.applied}
          hint={`${suggestions.pending} pending · ${suggestions.approved} approved`}
          tone={suggestions.pending ? 'warning' : 'neutral'}
          icon={PenLine}
        />
        <StatTile
          label="Listings this week"
          value={offpage.done_this_week}
          hint={offpage.pending ? `${offpage.pending} waiting on you` : 'Queue clear'}
          tone={offpage.pending ? 'warning' : 'success'}
          icon={Link2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {nextSteps.length > 0 && (
            <Card data-tour="next-steps">
              <CardHeader title="What to do next" icon={Sparkles} />
              <div className="divide-y divide-border">
                {nextSteps.map((step) => (
                  <Link
                    key={step.title}
                    to={step.to}
                    className="flex items-start gap-3 px-6 py-4 hover:bg-surface-2/60 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-soft grid place-items-center shrink-0">
                      <step.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{step.title}</p>
                      <p className="text-xs text-muted mt-0.5">{step.body}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-ink transition-colors mt-1" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card data-tour="memory">
            <CardHeader
              title={<Term k="memory">Campaign memory</Term>}
              subtitle="Everything done so far. The AI reads this before writing anything new, so it never repeats work."
              action={
                <Link to="../ask">
                  <Button size="sm" variant="ghost">
                    Ask a question
                  </Button>
                </Link>
              }
            />
            <div className="px-6 py-4 space-y-4">
              {activity.length === 0 ? (
                <p className="text-sm text-muted">Nothing recorded yet.</p>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border-strong shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-strong leading-snug">{a.description}</p>
                      {a.result && <p className="text-xs text-muted mt-0.5 line-clamp-2">{a.result}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone={CATEGORY_TONE[a.category]}>{a.category}</Badge>
                        {a.is_automated && <Badge tone="neutral">auto</Badge>}
                        <span className="text-[11px] text-muted">{fmtRelative(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card data-tour="health">
            <CardHeader title="Website health" icon={Gauge} />
            <div className="card-pad">
              {audit ? (
                <>
                  <div className="flex items-center gap-4">
                    <HealthRing score={audit.health_score} />
                    <div className="text-sm">
                      <div className="text-muted-strong">
                        PageSpeed mobile <span className="text-ink tabular-nums">{audit.pagespeed_mobile ?? '—'}</span>
                      </div>
                      <div className="text-muted-strong">
                        desktop <span className="text-ink tabular-nums">{audit.pagespeed_desktop ?? '—'}</span>
                      </div>
                      <div className="text-xs text-muted mt-1">Audited {fmtRelative(audit.created_at)}</div>
                    </div>
                  </div>
                  <Link to="audit">
                    <Button size="sm" className="w-full mt-4">
                      Open audit
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted mb-3">The website has not been checked yet.</p>
                  <Link to="audit">
                    <Button size="sm" variant="primary" icon={Search}>
                      Check the website
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Latest report" icon={FileText} />
            <div className="card-pad">
              {report ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink">
                      {report.period_from} → {report.period_to}
                    </span>
                    <Badge tone={report.status === 'sent' ? 'success' : 'warning'}>{report.status}</Badge>
                  </div>
                  {report.sent_at && <p className="text-xs text-muted mt-1">Sent {fmtRelative(report.sent_at)}</p>}
                </>
              ) : (
                <p className="text-sm text-muted">No report drafted yet.</p>
              )}
              <Link to="reports">
                <Button size="sm" className="w-full mt-4">
                  {report ? 'Open reports' : 'Draft a report'}
                </Button>
              </Link>
            </div>
          </Card>

          {campaign.blockers && (
            <Card className="border-warning/30">
              <CardHeader title="Blockers" />
              <div className="card-pad text-sm text-warning">{campaign.blockers}</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
