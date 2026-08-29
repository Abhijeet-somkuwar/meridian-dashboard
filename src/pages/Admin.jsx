import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, KeyRound, Play, Plus, Shield, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth as authApi, jobs as jobsApi, offpage as offpageApi } from '../api/endpoints.js';
import { fmtRelative, titleFromType } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Select,
  Tabs,
} from '../components/ui/index.jsx';

const RUN_TONE = { success: 'success', failed: 'danger', running: 'warning', skipped: 'neutral' };

const Managers = () => {
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['managers'], queryFn: authApi.managers });

  const toggle = useMutation({
    mutationFn: ({ id, active }) => authApi.setManagerActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      toast.success('Updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const reset = useMutation({
    mutationFn: () => authApi.resetManagerPassword(resetting.id, newPassword),
    onSuccess: () => {
      setResetting(null);
      setNewPassword('');
      toast.success('Password reset - they will be asked to change it');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading managers" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <Card>
        {/* No "new manager" button: this install has a single fixed account,
            and the server refuses sign-up outright. */}
        <CardHeader
          title="Account"
          subtitle="This installation has one sign-in. New accounts are disabled."
          icon={UserCog}
        />
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="text-right">Clients</th>
                <th>Last login</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.managers.map((m) => (
                <tr key={m.id}>
                  <td className="text-ink">{m.name}</td>
                  <td className="text-muted-strong">{m.email}</td>
                  <td>
                    <Badge tone={m.role === 'admin' ? 'primary' : 'neutral'}>{m.role}</Badge>
                  </td>
                  <td className="text-right tabular-nums">{m.client_count}</td>
                  <td className="text-muted">{m.last_login_at ? fmtRelative(m.last_login_at) : 'never'}</td>
                  <td className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setResetting(m)} />
                    <Button
                      size="sm"
                      variant={m.is_active ? 'ghost' : 'success'}
                      onClick={() => toggle.mutate({ id: m.id, active: !m.is_active })}
                    >
                      {m.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        title={`Reset password for ${resetting?.name ?? ''}`}
        subtitle="All their sessions are signed out immediately"
        footer={
          <>
            <Button onClick={() => setResetting(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => reset.mutate()} loading={reset.isPending}>
              Reset password
            </Button>
          </>
        }
      >
        <Field label="New temporary password" hint="At least 8 characters">
          <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
        </Field>
      </Modal>
    </>
  );
};

const Jobs = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: jobsApi.list,
    refetchInterval: 30_000,
  });

  const run = useMutation({
    mutationFn: (name) => jobsApi.run(name),
    onSuccess: (res, name) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(res.queued ? `${name} queued` : `${name} ran inline`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading jobs" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Scheduled jobs" subtitle="Server-local times, driven by BullMQ" icon={Clock} />
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Schedule</th>
                <th>Last run</th>
                <th>Result</th>
                <th className="text-right" />
              </tr>
            </thead>
            <tbody>
              {data.schedule.map((s) => (
                <tr key={s.name}>
                  <td>
                    <div className="text-ink">{titleFromType(s.name)}</div>
                    <div className="text-xs text-muted">{s.description}</div>
                  </td>
                  <td className="font-mono text-xs text-muted-strong">{s.cron}</td>
                  <td className="text-muted">{s.last_run ? fmtRelative(s.last_run.started_at) : 'never'}</td>
                  <td>
                    {s.last_run ? (
                      <div className="flex items-center gap-2">
                        <Badge tone={RUN_TONE[s.last_run.status]}>{s.last_run.status}</Badge>
                        <span className="text-xs text-muted line-clamp-1 max-w-[280px]">{s.last_run.detail}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <Button size="sm" icon={Play} onClick={() => run.mutate(s.name)} loading={run.isPending}>
                      Run now
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent runs" />
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table>
            <tbody>
              {data.runs.map((r, i) => (
                <tr key={i}>
                  <td className="text-ink">{titleFromType(r.job_name)}</td>
                  <td>
                    <Badge tone={RUN_TONE[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="text-xs text-muted">{r.detail}</td>
                  <td className="text-xs text-muted whitespace-nowrap">{fmtRelative(r.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Platforms = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    platform: '',
    activity_type: 'listing',
    mode: 'assisted',
    region: 'india',
    submit_url: '',
    cooldown_days: 21,
  });

  const { data, isLoading } = useQuery({ queryKey: ['offpage-platforms'], queryFn: offpageApi.platforms });

  const upsert = useMutation({
    mutationFn: (body) => offpageApi.upsertPlatform(body),
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['offpage-platforms'] });
      toast.success('Platform saved');
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading platforms" />;

  return (
    <>
      <Card>
        <CardHeader
          title="Off-page catalogue"
          subtitle="What the daily rotation draws from. Cooldown is how long before a platform can repeat."
          action={
            <Button size="sm" variant="primary" icon={Plus} onClick={() => setOpen(true)}>
              Add platform
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Type</th>
                <th>Mode</th>
                <th>Region</th>
                <th className="text-right">Cooldown</th>
                <th className="text-right" />
              </tr>
            </thead>
            <tbody>
              {data.platforms.map((p) => (
                <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                  <td className="text-ink">{p.platform}</td>
                  <td className="text-muted-strong">{titleFromType(p.activity_type)}</td>
                  <td>
                    <Badge tone={p.mode === 'auto' ? 'primary' : 'warning'}>{p.mode}</Badge>
                  </td>
                  <td className="text-muted-strong">{p.region}</td>
                  <td className="text-right tabular-nums">{p.cooldown_days}d</td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => upsert.mutate({ ...p, is_active: !p.is_active })}
                    >
                      {p.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add an off-page platform"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => upsert.mutate(form)} loading={upsert.isPending}>
              Save platform
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Platform name">
            <Input value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} />
          </Field>
          <Field label="Activity type" hint="e.g. listing, qa, web2, social_bookmarking, citation">
            <Input
              value={form.activity_type}
              onChange={(e) => setForm((f) => ({ ...f, activity_type: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mode">
              <Select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                <option value="assisted">Assisted (paste)</option>
                <option value="auto">Auto (needs a connector)</option>
              </Select>
            </Field>
            <Field label="Region">
              <Select value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}>
                <option value="india">India</option>
                <option value="global">Global</option>
              </Select>
            </Field>
          </div>
          <Field label="Submit URL">
            <Input value={form.submit_url} onChange={(e) => setForm((f) => ({ ...f, submit_url: e.target.value }))} />
          </Field>
          <Field label="Cooldown days">
            <Input
              type="number"
              value={form.cooldown_days}
              onChange={(e) => setForm((f) => ({ ...f, cooldown_days: Number(e.target.value) }))}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
};

export default function Admin() {
  const [tab, setTab] = useState('managers');

  return (
    <div>
      <PageHeader title="Admin" subtitle="Accounts, automation and the off-page catalogue" badge={<Badge tone="primary" icon={Shield}>admin only</Badge>} />
      <div className="mb-6" data-tour="admin-tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'managers', label: 'Managers' },
            { value: 'jobs', label: 'Jobs' },
            { value: 'platforms', label: 'Off-page catalogue' },
          ]}
        />
      </div>
      <div data-tour="admin-body">
        {tab === 'managers' && <Managers />}
        {tab === 'jobs' && <Jobs />}
        {tab === 'platforms' && <Platforms />}
      </div>
    </div>
  );
}
