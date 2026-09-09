import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Bot, Play, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { Badge, Button, Card, CardHeader, Field, Input, Select } from '../../components/ui/index.jsx';
import { Term } from '../../components/ui/Term.jsx';
import { CMS, useInvalidateContent } from './shared.jsx';

const KINDS = [
  ['blog', 'Blog posts', 'planned from keywords, competitor gaps and Search Console'],
  ['medium', 'Medium articles', 'experience-led brand pieces'],
  ['reddit', 'Reddit threads', 'discovered every Monday'],
  ['quora', 'Quora questions', 'discovered every Wednesday'],
];

const CMS_NAME = Object.fromEntries(CMS);

export default function AutopilotTab({ campaign, summary }) {
  const invalidate = useInvalidateContent(campaign.id);
  const [form, setForm] = useState(summary?.settings ?? {});
  useEffect(() => {
    if (summary?.settings) setForm(summary.settings);
  }, [summary?.settings]);

  const save = useMutation({
    mutationFn: () => contentApi.settings(campaign.id, form),
    onSuccess: () => {
      invalidate();
      toast.success('Autopilot settings saved');
    },
    onError: (err) => toast.error(err.message),
  });

  const run = useMutation({
    mutationFn: () => contentApi.runAutopilot(campaign.id),
    onSuccess: (res) => {
      invalidate();
      if (res.skipped) toast(`Skipped: ${res.skipped}`, { duration: 6000 });
      else toast.success(`Planned ${res.planned}, drafted ${res.drafted}, published ${res.published}${res.failed ? `, ${res.failed} failed` : ''}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const toggleKind = (k) => setForm((f) => ({ ...f, kinds: (f.kinds ?? []).includes(k) ? f.kinds.filter((x) => x !== k) : [...(f.kinds ?? []), k] }));
  const perMonth = Number(form.posts_per_day || 0) * 30;
  const conn = summary?.connections ?? {};
  const cmsName = conn.cms ? CMS_NAME[conn.cms] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader
            title={<Term k="autopilot">Content autopilot</Term>}
            subtitle="Runs every morning at 05:00: keeps the idea backlog full, writes the day's quota, and publishes if you allow it. Everything it does is logged as automated."
            icon={Bot}
            action={
              <Badge tone={form.enabled ? 'success' : 'neutral'}>{form.enabled ? `on · ~${perMonth} a month` : 'off'}</Badge>
            }
          />
          <div className="card-pad space-y-5">
            <label className="flex items-center gap-3 cursor-pointer" data-tour="autopilot-toggle">
              <input type="checkbox" checked={Boolean(form.enabled)} onChange={set('enabled')} />
              <span className="text-sm text-ink">Autopilot is on for this campaign</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2" data-tour="autopilot-quota">
              <Field label="Pieces per day" hint={`${perMonth} a month at this rate`}>
                <Input type="number" min={1} max={20} value={form.posts_per_day ?? 3} onChange={(e) => setForm((f) => ({ ...f, posts_per_day: Number(e.target.value) }))} />
              </Field>
              <Field label="Monthly target" hint="0 = no cap. Otherwise it produces only what is still missing this month, then stops.">
                <Input type="number" min={0} max={600} value={form.monthly_target ?? 0} onChange={(e) => setForm((f) => ({ ...f, monthly_target: Number(e.target.value) }))} />
              </Field>
            </div>

            <div>
              <label className="block mb-1.5">What it works on</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {KINDS.map(([k, label, hint]) => (
                  <label key={k} className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2 cursor-pointer hover:border-border-strong">
                    <input type="checkbox" className="mt-0.5" checked={(form.kinds ?? []).includes(k)} onChange={() => toggleKind(k)} />
                    <span>
                      <span className="text-sm text-ink">{label}</span>
                      <span className="block text-xs text-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3" data-tour="autopilot-publish">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={Boolean(form.auto_publish)} onChange={set('auto_publish')} />
                <span className="text-sm text-ink">Publish automatically{cmsName ? ` to ${cmsName}` : ''}</span>
                {form.auto_publish && !conn.cms && <Badge tone="warning">no CMS connected</Badge>}
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Publish as" hint="Draft keeps a human between the model and the live site">
                  <Select value={form.publish_status ?? 'draft'} onChange={set('publish_status')} disabled={!form.auto_publish}>
                    <option value="draft">Draft in the CMS</option>
                    <option value="publish">Live immediately</option>
                  </Select>
                </Field>
                <label className="flex items-center gap-3 cursor-pointer mt-6">
                  <input type="checkbox" checked={Boolean(form.syndicate_medium)} onChange={set('syndicate_medium')} disabled={!form.auto_publish} />
                  <span className="text-sm text-ink">Also syndicate blog posts to Medium</span>
                  {form.syndicate_medium && !conn.medium && <Badge tone="warning">Medium not connected</Badge>}
                </label>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex flex-wrap justify-between gap-2">
            <Button icon={Play} onClick={() => run.mutate()} loading={run.isPending} title="Run one pass now, whatever the schedule" data-tour="autopilot-run">
              Run a pass now
            </Button>
            <Button variant="primary" icon={Save} onClick={() => save.mutate()} loading={save.isPending}>
              Save settings
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Where it can publish" subtitle="Connected on the client profile" />
          <div className="card-pad space-y-3 text-sm">
            {[
              ...CMS.map(([key, name]) => [name, conn[key], 'Blog posts and programmatic pages']),
              ['Medium', conn.medium, 'Medium articles and syndication (tokens issued before 2025 only)'],
              ['Reddit', conn.reddit, 'Replies on discovered threads'],
              ['Search Console', conn.gsc, 'Topic ideas from real impressions; pruning of pages nobody sees'],
            ].map(([name, on, what]) => (
              <div key={name} className="flex items-start gap-3">
                <Badge tone={on ? 'success' : 'neutral'} className="mt-0.5 shrink-0">
                  {on ? 'connected' : 'not connected'}
                </Badge>
                <div>
                  <p className="text-ink">{name}</p>
                  <p className="text-xs text-muted">{what}</p>
                </div>
              </div>
            ))}
            <Link to={`/clients/${campaign.client_id}`} className="link text-xs inline-block mt-1">
              Manage connections on the client profile
            </Link>
          </div>
        </Card>
        <Card>
          <CardHeader title="This month" />
          <div className="card-pad space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Published (30 days)</span>
              <span className="text-ink tabular-nums">{summary?.published_30d ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Waiting for review</span>
              <span className="text-ink tabular-nums">{summary?.awaiting_review ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Ideas queued</span>
              <span className="text-ink tabular-nums">{summary?.ideas ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Words published</span>
              <span className="text-ink tabular-nums">{(summary?.words_published ?? 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
