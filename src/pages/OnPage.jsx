import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  CloudUpload,
  History,
  MapPin,
  PenLine,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { suggestions as suggestionsApi } from '../api/endpoints.js';
import { fmtRelative, titleFromType } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CopyButton,
  DiffBlock,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  Tabs,
} from '../components/ui/index.jsx';

const MONO_TYPES = ['schema_markup', 'robots_txt', 'sitemap_xml', 'llms_txt', 'og_tag'];
const AUTO_DEPLOYABLE = ['meta_title', 'meta_description', 'slug', 'content_paragraph', 'heading_update'];

const STATUS_TONE = { pending: 'warning', approved: 'primary', applied: 'success', rejected: 'neutral' };

const SuggestionCard = ({ suggestion, campaign, onStatus, onDeploy, busy }) => {
  const [open, setOpen] = useState(suggestion.status === 'pending');
  const canDeploy =
    campaign.platform_type === 'wordpress' &&
    campaign.wp_connected &&
    AUTO_DEPLOYABLE.includes(suggestion.suggestion_type) &&
    suggestion.status !== 'applied';

  return (
    <Card className="overflow-hidden" data-tour="onpage-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-surface-2/40 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">{titleFromType(suggestion.suggestion_type)}</span>
            <span className="font-mono text-xs text-muted">{suggestion.target_page}</span>
            <Badge tone={STATUS_TONE[suggestion.status]}>{suggestion.status}</Badge>
            {suggestion.deployment_status === 'deployed' && <Badge tone="success">pushed to WP</Badge>}
            {suggestion.deployment_status === 'rolled_back' && <Badge tone="warning">rolled back</Badge>}
          </div>
          {suggestion.keyword_targeted && (
            <p className="text-xs text-muted mt-1">targeting “{suggestion.keyword_targeted}”</p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <DiffBlock
            before={suggestion.content_before}
            after={suggestion.content_after}
            mono={MONO_TYPES.includes(suggestion.suggestion_type)}
          />

          <div className="rounded-lg border border-border bg-surface-2/60 p-4" data-tour="onpage-paste">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-strong mb-2">
              <MapPin className="w-3.5 h-3.5" />
              Where this goes
            </div>
            <p className="text-sm text-ink whitespace-pre-line leading-relaxed">{suggestion.where_to_paste}</p>
            {suggestion.target_component && (
              <p className="text-xs text-muted mt-2">Component: {suggestion.target_component}</p>
            )}
            {suggestion.file_path && (
              <div className="flex items-center gap-2 mt-2">
                <code className="font-mono text-xs text-warning">{suggestion.file_path}</code>
                {suggestion.line_hint && <span className="text-xs text-muted">· {suggestion.line_hint}</span>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2" data-tour="onpage-actions">
            <CopyButton text={suggestion.content_after} label="Copy text" />
            {canDeploy && (
              <Button
                size="sm"
                variant="primary"
                icon={CloudUpload}
                onClick={() => onDeploy(suggestion)}
                loading={busy === suggestion.id}
              >
                Push to WordPress
              </Button>
            )}
            {suggestion.status !== 'applied' && (
              <Button
                size="sm"
                variant="success"
                icon={Check}
                onClick={() => onStatus(suggestion.id, 'applied')}
              >
                Mark as applied
              </Button>
            )}
            {suggestion.status === 'pending' && (
              <Button size="sm" variant="danger" icon={X} onClick={() => onStatus(suggestion.id, 'rejected')}>
                Reject
              </Button>
            )}
            {suggestion.applied_at && (
              <span className="text-xs text-muted ml-auto">Applied {fmtRelative(suggestion.applied_at)}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default function OnPage() {
  const { campaign } = useOutletContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['suggestions', campaign.id],
    queryFn: () => suggestionsApi.list(campaign.id),
  });
  const { data: deployData } = useQuery({
    queryKey: ['deployments', campaign.id],
    queryFn: () => suggestionsApi.deployments(campaign.id),
    enabled: historyOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['suggestions', campaign.id] });
    queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
    queryClient.invalidateQueries({ queryKey: ['deployments', campaign.id] });
  };

  const generate = useMutation({
    mutationFn: () => suggestionsApi.generate(campaign.id),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.suggestions.length} suggestions generated`);
      if (res.warning) toast(`Model fell back to the offline planner: ${res.warning}`, { icon: '⚠️' });
    },
    onError: (err) => toast.error(err.message),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => suggestionsApi.setStatus(campaign.id, id, { status }),
    onSuccess: (_res, vars) => {
      invalidate();
      toast.success(`Marked ${vars.status}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deploy = useMutation({
    mutationFn: (id) => suggestionsApi.deploy(campaign.id, id),
    onMutate: (id) => setBusy(id),
    onSettled: () => setBusy(null),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.skipped ? `Skipped: ${res.skipped}` : 'Pushed to WordPress');
    },
    onError: (err) => toast.error(err.message),
  });

  const rollback = useMutation({
    mutationFn: (deploymentId) => suggestionsApi.rollback(campaign.id, deploymentId),
    onSuccess: () => {
      invalidate();
      toast.success('Change rolled back from the snapshot');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading suggestions" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const all = data.suggestions;
  const counts = {
    pending: all.filter((s) => s.status === 'pending').length,
    applied: all.filter((s) => s.status === 'applied').length,
    rejected: all.filter((s) => s.status === 'rejected').length,
  };
  const rows = all.filter((s) => (tab === 'pending' ? s.status === 'pending' || s.status === 'approved' : s.status === tab));

  const byPage = rows.reduce((acc, s) => {
    (acc[s.target_page] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Website changes"
          subtitle={
            campaign.platform_type === 'wordpress'
              ? campaign.wp_connected
                ? 'WordPress is connected, so most changes can be applied for you - and undone'
                : 'Connect WordPress on the client page and we can apply changes for you'
              : `Written for this ${campaign.platform_type === 'php' ? 'hand-coded' : campaign.platform_type} site - each one names the exact file and place`
          }
          icon={PenLine}
          action={
            <div className="flex gap-2">
              <Button size="sm" icon={History} onClick={() => setHistoryOpen(true)}>
                Deployments
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Sparkles}
                data-tour="onpage-generate"
                onClick={() => generate.mutate()}
                loading={generate.isPending}
              >
                Generate
              </Button>
            </div>
          }
        />
        <div className="px-6 py-3">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'pending', label: 'To review', count: counts.pending },
              { value: 'applied', label: 'Applied', count: counts.applied },
              { value: 'rejected', label: 'Rejected', count: counts.rejected },
            ]}
          />
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={PenLine}
            title={tab === 'pending' ? 'Nothing to review' : `No ${tab} suggestions`}
            description={
              tab === 'pending'
                ? 'Write the page text from the agreed search phrases: headlines, the text Google shows in results, paragraphs, business details and the technical files.'
                : undefined
            }
            action={
              tab === 'pending' && (
                <Button variant="primary" icon={Sparkles} onClick={() => generate.mutate()} loading={generate.isPending}>
                  Write the content
                </Button>
              )
            }
          />
        </Card>
      ) : (
        Object.entries(byPage).map(([page, items]) => (
          <div key={page} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-strong">{page}</span>
              <span className="text-xs text-muted">{items.length} item(s)</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {items.map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                campaign={campaign}
                busy={busy}
                onStatus={(id, status) => setStatus.mutate({ id, status })}
                onDeploy={(sg) => deploy.mutate(sg.id)}
              />
            ))}
          </div>
        ))
      )}

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="WordPress deployments"
        subtitle="Every change is saved before it is applied, so it can be undone"
        wide
      >
        {(deployData?.deployments ?? []).length === 0 ? (
          <p className="text-sm text-muted">Nothing has been pushed to WordPress for this campaign yet.</p>
        ) : (
          <div className="space-y-3">
            {deployData.deployments.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-ink">{titleFromType(d.suggestion_type ?? 'change')}</span>
                    <span className="font-mono text-xs text-muted">{d.target_page}</span>
                    <Badge
                      tone={
                        d.status === 'deployed'
                          ? 'success'
                          : d.status === 'failed'
                            ? 'danger'
                            : d.status === 'rolled_back'
                              ? 'warning'
                              : 'neutral'
                      }
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {d.deployed_at ? fmtRelative(d.deployed_at) : fmtRelative(d.created_at)}
                    {d.error_message ? ` · ${d.error_message}` : ''}
                  </p>
                </div>
                {d.status === 'deployed' && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={RotateCcw}
                    onClick={() => rollback.mutate(d.id)}
                    loading={rollback.isPending}
                  >
                    Roll back
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
