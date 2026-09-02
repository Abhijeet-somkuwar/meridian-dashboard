import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Gauge,
  Info,
  Link2Off,
  RefreshCw,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { audit as auditApi } from '../api/endpoints.js';
import { fmtDateTime, fmtNumber, fmtRelative } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  HealthRing,
  Loading,
} from '../components/ui/index.jsx';
import { Term } from '../components/ui/Term.jsx';

const SEVERITY = {
  danger: { tone: 'danger', icon: AlertTriangle },
  warning: { tone: 'warning', icon: FileWarning },
  info: { tone: 'primary', icon: Info },
};

const Metric = ({ label, value, hint, good }) => (
  <div className="rounded-lg border border-border p-4">
    <div className="text-xs text-muted">{label}</div>
    <div className={`text-lg font-semibold mt-1 tabular-nums ${good === false ? 'text-warning' : 'text-ink'}`}>
      {value}
    </div>
    {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
  </div>
);

export default function AuditResults() {
  const { campaign } = useOutletContext();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', campaign.id],
    queryFn: () => auditApi.latest(campaign.id),
  });
  const { data: history } = useQuery({
    queryKey: ['audit-history', campaign.id],
    queryFn: () => auditApi.history(campaign.id),
  });

  const run = useMutation({
    mutationFn: () => auditApi.run(campaign.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['audit-history', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      toast.success('Audit complete');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading audit" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const a = data.audit;

  if (!a) {
    return (
      <Card>
        <EmptyState
          icon={Search}
          title="No audit yet"
          description={`We will look at https://${campaign.domain} exactly the way Google does - the finished page, its settings files and how fast it loads. We never touch your source code or hosting.`}
          action={
            <Button variant="primary" icon={Search} onClick={() => run.mutate()} loading={run.isPending}>
              Check the website
            </Button>
          }
        />
      </Card>
    );
  }

  const issues = a.issues ?? [];
  const broken = a.broken_links ?? [];
  const pages = a.pages_crawled ?? [];
  const previous = (history?.history ?? [])[1];
  const delta = previous?.health_score != null ? a.health_score - previous.health_score : null;

  return (
    <div className="space-y-6">
      <Card data-tour="audit-health">
        <CardHeader
          title="Site health"
          subtitle={`Audited ${fmtDateTime(a.created_at)} · ${pages.length} pages crawled`}
          icon={Gauge}
          action={
            <Button size="sm" icon={RefreshCw} data-tour="audit-rerun" onClick={() => run.mutate()} loading={run.isPending}>
              Re-run
            </Button>
          }
        />
        <div className="card-pad flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-4">
            <HealthRing score={a.health_score} size={72} />
            <div>
              <div className="text-sm text-muted-strong">Health score</div>
              <p className="text-xs text-muted mt-0.5 max-w-[200px]">Out of 100, from the checks below</p>
              {delta != null && (
                <div className={`text-xs mt-0.5 ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
                  {delta >= 0 ? '+' : ''}
                  {delta} since last audit
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-[300px]">
            <Metric label="Phone speed" value={a.pagespeed_mobile ?? '—'} good={(a.pagespeed_mobile ?? 0) >= 50} />
            <Metric label="Computer speed" value={a.pagespeed_desktop ?? '—'} good={(a.pagespeed_desktop ?? 0) >= 60} />
            <Metric label="Load time" value={a.lcp_score != null ? `${a.lcp_score}s` : '—'} good={(a.lcp_score ?? 9) <= 2.5} />
            <Metric label="Layout stability" value={a.cls_score ?? '—'} good={(a.cls_score ?? 1) <= 0.1} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card data-tour="audit-issues">
            <CardHeader title={`Issues (${issues.length})`} subtitle="Most damaging first" />
            {issues.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No issues found" description="The site passed every check." />
            ) : (
              <div className="divide-y divide-border">
                {issues.map((issue, i) => {
                  const meta = SEVERITY[issue.severity] ?? SEVERITY.info;
                  return (
                    <div key={i} className="flex gap-3 px-6 py-4">
                      <meta.icon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          issue.severity === 'danger'
                            ? 'text-danger'
                            : issue.severity === 'warning'
                              ? 'text-warning'
                              : 'text-primary'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink">{issue.title}</span>
                          <Badge tone={meta.tone}>{issue.severity}</Badge>
                          {issue.page && <span className="text-xs text-muted font-mono">{issue.page}</span>}
                        </div>
                        <p className="text-sm text-muted mt-1 whitespace-pre-line break-words">{issue.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`Pages crawled (${pages.length})`} />
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Path</th>
                    <th>Words</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.path}>
                      <td className="font-mono text-xs">{p.path}</td>
                      <td className="tabular-nums">{fmtNumber(p.word_count)}</td>
                      <td>
                        {p.has_description ? (
                          <Badge tone="success">present</Badge>
                        ) : (
                          <Badge tone="warning">missing</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card data-tour="audit-files">
            <CardHeader title="Technical files" />
            <div className="card-pad space-y-2.5">
              {[
                ['robots.txt', a.has_robots_txt, 'robots'],
                ['sitemap.xml', a.has_sitemap, 'sitemap'],
                ['llms.txt', a.has_llms_txt, 'llms'],
                ['Business details for Google', a.has_schema, 'schema'],
                ['Preferred web address', Boolean(a.canonical_url), 'canonical'],
                ['Works well on phones', a.is_mobile_friendly, null],
              ].map(([label, present, term]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-strong">
                    {term ? <Term k={term}>{label}</Term> : label}
                  </span>
                  <Badge tone={present ? 'success' : 'warning'}>{present ? 'yes' : 'missing'}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Homepage snapshot" />
            <div className="card-pad space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted mb-1">
                  <Term k="meta-title">Headline in Google</Term>
                </div>
                <p className="text-muted-strong break-words">{a.meta_title || <em className="text-warning">missing</em>}</p>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">
                  <Term k="meta-description">Summary in Google</Term>
                </div>
                <p className="text-muted-strong break-words">
                  {a.meta_description || <em className="text-warning">missing</em>}
                </p>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">
                  <Term k="h1">Main headline on the page</Term>
                </div>
                <p className="text-muted-strong break-words">
                  {(a.h1_tags ?? []).join(' / ') || <em className="text-warning">missing</em>}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs text-muted">
                <span>{fmtNumber(a.word_count)} words total</span>
                <span>
                  {a.images_missing_alt}/{a.images_total} images need <Term k="alt-text">alt text</Term>
                </span>
                <span>
                  {a.internal_links} <Term k="internal-link">internal links</Term>
                </span>
                <span>{a.external_links} external links</span>
              </div>
            </div>
          </Card>

          {broken.length > 0 && (
            <Card className="border-danger/30">
              <CardHeader title={`Broken links (${broken.length})`} icon={Link2Off} />
              <div className="card-pad space-y-2">
                {broken.slice(0, 10).map((b, i) => (
                  <a
                    key={i}
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs font-mono text-danger hover:underline break-all"
                  >
                    {b.url}
                  </a>
                ))}
              </div>
            </Card>
          )}

          {(history?.history ?? []).length > 1 && (
            <Card>
              <CardHeader title="Audit history" />
              <div className="card-pad space-y-2">
                {history.history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-strong capitalize">{h.audit_type}</span>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-ink">{h.health_score}</span>
                      <span className="text-xs text-muted">{fmtRelative(h.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
