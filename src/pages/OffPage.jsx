import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Check, ExternalLink, Hand, Link2, RefreshCw, SkipForward, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { offpage as offpageApi } from '../api/endpoints.js';
import { fmtRelative, titleFromType } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CopyButton,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
} from '../components/ui/index.jsx';
import { Term } from '../components/ui/Term.jsx';

const PackageField = ({ label, value }) =>
  !value ? null : (
    <div className="rounded-lg border border-border bg-surface-2/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
        <CopyButton text={value} label="" variant="ghost" />
      </div>
      <p className="text-sm text-ink whitespace-pre-line break-words">{value}</p>
    </div>
  );

const TaskCard = ({ task, onDone, onSkip, busy }) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const p = task.payload ?? {};

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-ink">{task.platform}</span>
            <Badge tone="neutral">{titleFromType(task.activity_type)}</Badge>
            {task.is_automated ? (
              <Badge tone="primary" icon={Bot}>
                auto-eligible
              </Badge>
            ) : (
              <Badge tone="warning" icon={Hand}>
                2 min manual
              </Badge>
            )}
          </div>
          {task.anchor_text && (
            <p className="text-xs text-muted mt-1">
              <Term k="anchor">Link text</Term>: “{task.anchor_text}”
            </p>
          )}
          {p.reasoning && <p className="text-xs text-muted mt-1">{p.reasoning}</p>}
          {p.note && <p className="text-xs text-warning mt-1">{p.note}</p>}
        </div>
        <div className="flex gap-2">
          {task.submit_url && (
            <a href={task.submit_url} target="_blank" rel="noreferrer">
              <Button size="sm" icon={ExternalLink}>
                Open {task.platform}
              </Button>
            </a>
          )}
          <Button size="sm" variant={open ? 'secondary' : 'primary'} onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide package' : 'View package'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <PackageField label="Title" value={p.title} />
            <PackageField label="Business name" value={p.business_name} />
            <PackageField label="Category" value={p.category} />
            <PackageField label="City" value={p.city} />
            <PackageField label="NAP" value={p.nap} />
            <PackageField label="Phone" value={p.phone} />
            <PackageField label="Website" value={p.website} />
            <PackageField label="Tags" value={(p.tags ?? []).join(', ')} />
          </div>
          <PackageField label="Body" value={p.body} />

          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
            <Field label="Live URL (optional)" className="flex-1 min-w-[240px]">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </Field>
            <Button
              variant="success"
              icon={Check}
              onClick={() => onDone(task.id, url)}
              loading={busy === task.id}
            >
              Mark done
            </Button>
            <Button variant="ghost" icon={SkipForward} onClick={() => onSkip(task.id)}>
              Skip
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default function OffPage() {
  const { campaign } = useOutletContext();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosen, setChosen] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['offpage', campaign.id],
    queryFn: () => offpageApi.board(campaign.id),
  });
  const { data: platformData } = useQuery({ queryKey: ['offpage-platforms'], queryFn: offpageApi.platforms });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['offpage', campaign.id] });
    queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
  };

  const generate = useMutation({
    mutationFn: (platform) => offpageApi.generate(campaign.id, platform ? { platform } : {}),
    onSuccess: (res) => {
      setPickerOpen(false);
      setChosen('');
      invalidate();
      toast.success(`${res.platform.platform} package ready`);
    },
    onError: (err) => toast.error(err.message),
  });

  const markDone = useMutation({
    mutationFn: ({ id, url }) => offpageApi.markDone(campaign.id, id, url || undefined),
    onMutate: ({ id }) => setBusy(id),
    onSettled: () => setBusy(null),
    onSuccess: () => {
      invalidate();
      toast.success('Logged to campaign memory');
    },
    onError: (err) => toast.error(err.message),
  });

  const skip = useMutation({
    mutationFn: (id) => offpageApi.skip(campaign.id, id),
    onSuccess: () => {
      invalidate();
      toast.success('Task skipped');
    },
  });

  if (isLoading) return <Loading label="Loading off-page board" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { pending, today, week } = data;
  const usedPlatforms = new Set(week.map((w) => w.platform));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Listings and mentions"
          subtitle="We check the last 14 days before picking where to post, so the same site is never used twice in a row"
          icon={Link2}
          action={
            <div className="flex gap-2">
              <Button size="sm" icon={RefreshCw} onClick={() => setPickerOpen(true)}>
                Choose platform
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={Sparkles}
                data-tour="offpage-next"
                onClick={() => generate.mutate(null)}
                loading={generate.isPending && !chosen}
              >
                Next task
              </Button>
            </div>
          }
        />
      </Card>

      <div data-tour="offpage-pending">
        <h3 className="text-sm font-medium text-ink mb-3">
          Waiting on you {pending.length > 0 && <span className="text-muted">({pending.length})</span>}
        </h3>
        {pending.length === 0 ? (
          <Card>
            <EmptyState
              icon={Check}
              title="Queue is clear"
              description="Get the next task, or leave it - one is picked automatically every morning at 6."
              action={
                <Button variant="primary" icon={Sparkles} onClick={() => generate.mutate(null)} loading={generate.isPending}>
                  Get the next task
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={busy}
                onDone={(id, url) => markDone.mutate({ id, url })}
                onSkip={(id) => skip.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Completed today" subtitle={`${today.length} submission(s)`} />
          {today.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted text-center">Nothing completed yet today.</div>
          ) : (
            <div className="divide-y divide-border">
              {today.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <span className="text-sm text-ink">{t.platform}</span>
                    <p className="text-xs text-muted truncate">{t.anchor_text}</p>
                  </div>
                  {t.submitted_url ? (
                    <a
                      href={t.submitted_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline shrink-0 inline-flex items-center gap-1"
                    >
                      view <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <Badge tone="success">done</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card data-tour="offpage-week">
          <CardHeader title="This week" subtitle="Where we have posted recently" />
          {week.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted text-center">No activity in the last 7 days.</div>
          ) : (
            <div className="divide-y divide-border">
              {week.map((w, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-ink truncate">{w.platform}</span>
                    <Badge tone="neutral">{titleFromType(w.activity_type)}</Badge>
                    {w.is_automated && <Badge tone="primary">auto</Badge>}
                  </div>
                  <span className="text-xs text-muted shrink-0">{fmtRelative(w.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pick a platform"
        subtitle="Greyed-out sites were used in the last 7 days. Spreading posts out is what makes them count."
        wide
        footer={
          <>
            <Button onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!chosen}
              onClick={() => generate.mutate(chosen)}
              loading={generate.isPending}
            >
              Generate package
            </Button>
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 max-h-[50vh] overflow-y-auto">
          {(platformData?.platforms ?? [])
            .filter((p) => p.is_active)
            .map((p) => {
              const recentlyUsed = usedPlatforms.has(p.platform);
              return (
                <button
                  key={p.id}
                  onClick={() => setChosen(p.platform)}
                  className={[
                    'text-left rounded-lg border p-3 transition-colors',
                    chosen === p.platform
                      ? 'border-primary bg-primary-soft'
                      : recentlyUsed
                        ? 'border-border bg-surface-2/40 opacity-50'
                        : 'border-border hover:border-border-strong',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink">{p.platform}</span>
                    <Badge tone={p.mode === 'auto' ? 'primary' : 'warning'}>{p.mode}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {titleFromType(p.activity_type)} · {p.region} · {p.cooldown_days}d cooldown
                    {recentlyUsed ? ' · used this week' : ''}
                  </p>
                </button>
              );
            })}
        </div>
      </Modal>
    </div>
  );
}
