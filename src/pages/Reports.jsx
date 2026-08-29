import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Pencil, Save, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { reports as reportsApi } from '../api/endpoints.js';
import { fmtDate, fmtRelative, markdownToHtml } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  Textarea,
} from '../components/ui/index.jsx';

const STATUS_TONE = { draft: 'warning', reviewed: 'primary', sent: 'success' };

export default function Reports() {
  const { campaign } = useOutletContext();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [sendOpen, setSendOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', campaign.id],
    queryFn: () => reportsApi.list(campaign.id),
  });

  const list = data?.reports ?? [];
  const activeId = selectedId ?? list[0]?.id ?? null;

  const { data: reportData } = useQuery({
    queryKey: ['report', campaign.id, activeId],
    queryFn: () => reportsApi.get(campaign.id, activeId),
    enabled: Boolean(activeId),
  });

  const report = reportData?.report;

  useEffect(() => {
    if (report) setContent(report.final_content || report.draft_content || '');
  }, [report]);

  const generate = useMutation({
    mutationFn: () => reportsApi.generate(campaign.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      setSelectedId(res.report.id);
      setEditing(false);
      toast.success('Draft ready for review');
      if (res.warning) toast(`Model fell back to the offline planner: ${res.warning}`, { icon: '⚠️' });
    },
    onError: (err) => toast.error(err.message),
  });

  const save = useMutation({
    mutationFn: () => reportsApi.save(campaign.id, activeId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', campaign.id, activeId] });
      queryClient.invalidateQueries({ queryKey: ['reports', campaign.id] });
      setEditing(false);
      toast.success('Edits saved');
    },
    onError: (err) => toast.error(err.message),
  });

  const send = useMutation({
    mutationFn: () => reportsApi.send(campaign.id, activeId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['report', campaign.id, activeId] });
      setSendOpen(false);
      if (res.delivery.delivered) toast.success(`Emailed to ${campaign.contact_email}`);
      else toast(`Marked as sent. ${res.delivery.reason} - download the PDF and send it yourself.`, { icon: '📄', duration: 7000 });
    },
    onError: (err) => toast.error(err.message),
  });

  const download = async () => {
    try {
      const blob = await reportsApi.downloadPdf(campaign.id, activeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaign.domain}-report-${report.period_to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <Loading label="Loading reports" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const metrics = report?.metrics ?? {};
  const improved = (metrics.rows ?? []).filter((r) => r.delta > 0).length;
  const dropped = (metrics.rows ?? []).filter((r) => r.delta < 0).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="space-y-3">
        <Button
          variant="primary"
          icon={Sparkles}
          data-tour="report-generate"
          onClick={() => generate.mutate()}
          loading={generate.isPending}
          className="w-full"
        >
          Draft new report
        </Button>

        {list.length === 0 ? (
          <Card className="p-4 text-sm text-muted">No reports yet.</Card>
        ) : (
          <div className="space-y-2" data-tour="report-list">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedId(r.id);
                  setEditing(false);
                }}
                className={[
                  'w-full text-left rounded-lg border p-3 transition-colors',
                  r.id === activeId ? 'border-primary bg-primary-soft' : 'border-border hover:border-border-strong',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink tabular-nums">{fmtDate(r.period_to)}</span>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  {fmtDate(r.period_from)} → {fmtDate(r.period_to)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {!report ? (
          <Card>
            <EmptyState
              icon={FileText}
              title="No report selected"
              description="A report is written for you on the 1st and the 15th, from the position history and everything done in that period. You check it and send it."
              action={
                <Button variant="primary" icon={Sparkles} onClick={() => generate.mutate()} loading={generate.isPending}>
                  Draft one now
                </Button>
              }
            />
          </Card>
        ) : (
          <Card>
            <CardHeader
              title={`${fmtDate(report.period_from)} → ${fmtDate(report.period_to)}`}
              subtitle={
                report.sent_at
                  ? `Sent ${fmtRelative(report.sent_at)}`
                  : `${improved} keywords up · ${dropped} down · avg ${metrics.avgBefore ?? '—'} → ${metrics.avgAfter ?? '—'}`
              }
              icon={FileText}
              action={
                <div className="flex flex-wrap gap-2" data-tour="report-actions">
                  <Button size="sm" icon={Download} onClick={download}>
                    PDF
                  </Button>
                  {editing ? (
                    <Button size="sm" variant="primary" icon={Save} onClick={() => save.mutate()} loading={save.isPending}>
                      Save
                    </Button>
                  ) : (
                    <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  )}
                  {report.status !== 'sent' && (
                    <Button size="sm" variant="primary" icon={Send} onClick={() => setSendOpen(true)}>
                      Send
                    </Button>
                  )}
                </div>
              }
            />

            <div className="card-pad" data-tour="report-body">
              {editing ? (
                <Textarea
                  rows={28}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="font-mono text-xs leading-relaxed"
                />
              ) : (
                <div
                  className="prose-report max-w-none"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
                />
              )}
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send this report"
        subtitle="The PDF goes out attached, and the report is marked as sent"
        footer={
          <>
            <Button onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Send} onClick={() => send.mutate()} loading={send.isPending}>
              Send report
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-strong">
          {campaign.contact_email ? (
            <>
              Sending to <span className="text-ink">{campaign.contact_email}</span>.
            </>
          ) : (
            'This client has no email on file, so the report will be marked as sent for you to share over WhatsApp.'
          )}
        </p>
        <p className="text-xs text-muted mt-3">
          If SMTP is not configured, Meridian still marks the report sent and logs it - download the PDF and send it
          yourself.
        </p>
      </Modal>
    </div>
  );
}
