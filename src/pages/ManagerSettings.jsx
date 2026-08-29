import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyRound, Plug, Terminal, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth as authApi, system } from '../api/endpoints.js';
import { useAuth } from '../store/auth.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CopyButton,
  Field,
  PageHeader,
  PasswordInput,
} from '../components/ui/index.jsx';

/**
 * Answers "what actually works right now?" without reading the .env file.
 * Each row says what happens when that service is not connected, because the
 * platform never simply stops - it falls back and labels the fallback.
 */
const SERVICES = [
  {
    key: 'ai',
    name: 'Writing (AI)',
    live: 'Keyword maps, page text, listings, reports and answers are written by the model.',
    off: 'A built-in planner writes them from templates instead. Usable, but generic.',
  },
  {
    key: 'embeddings',
    name: 'Campaign memory',
    live: 'Past work is understood by meaning, so the AI reliably avoids repeating itself.',
    off: 'Falls back to word matching. Still works, just less precise.',
  },
  {
    key: 'dataforseo',
    name: 'Google position data',
    live: 'Real daily positions and real search volumes.',
    off: 'Positions and volumes are simulated. Charts look right but the numbers are not real.',
  },
  {
    key: 'gsc',
    name: 'Search Console',
    live: 'Real clicks and click rates from Google.',
    off: 'Clicks are estimated from position. Connect per client for real numbers.',
  },
  {
    key: 'pagespeed',
    name: 'Speed testing',
    live: 'Full quota for site speed checks.',
    off: 'Still runs - Google allows it without a key at a lower rate.',
  },
  {
    key: 'smtp',
    name: 'Sending email',
    live: 'Reports are emailed to the client with the PDF attached.',
    off: 'Reports are marked sent and you share the PDF yourself.',
  },
];

const ConnectedServices = () => {
  const { data } = useQuery({ queryKey: ['health'], queryFn: system.health, staleTime: 60_000 });
  if (!data) return null;

  const status = (key) => (key === 'ai' ? data.ai !== 'Offline planner' : data.providers[key]);

  return (
    <Card>
      <CardHeader
        title="What's connected"
        subtitle="Nothing here stops the platform working - anything not connected falls back to an estimate, and says so"
        icon={Plug}
      />
      <div className="card-pad space-y-3">
        {SERVICES.map((s) => {
          const on = status(s.key);
          return (
            <div key={s.key} className="flex items-start gap-3">
              <Badge tone={on ? 'success' : 'warning'} className="mt-0.5 shrink-0">
                {on ? 'live' : 'estimated'}
              </Badge>
              <div className="min-w-0">
                <p className="text-sm text-ink">
                  {s.name}
                  {s.key === 'ai' && <span className="text-muted"> · {data.ai}</span>}
                </p>
                <p className="text-xs text-muted mt-0.5">{on ? s.live : s.off}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/**
 * The dashboard keeps its access token in memory and its refresh token in a
 * cookie the browser will not reveal to scripts - deliberately, but it makes
 * "try the API in Postman" hard. This surfaces the caller's own token.
 */
const ApiAccess = () => {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ['api-token'],
    queryFn: authApi.token,
    enabled: open,
    staleTime: 0,
    retry: false,
  });

  return (
    <Card>
      <CardHeader
        title="API access"
        subtitle="For Postman, curl or scripts. Development only."
        icon={Terminal}
        action={
          <Button size="sm" onClick={() => setOpen((v) => !v)} loading={isFetching}>
            {open ? 'Hide' : 'Show my token'}
          </Button>
        }
      />
      <div className="card-pad space-y-4">
        <ol className="text-sm text-muted-strong space-y-1.5 list-decimal pl-5">
          <li>
            {/* Derived, never hard-coded: the dashboard's own origin proxies /api to
                the backend in development and is the backend in production, so this
                URL stays correct whatever ports the .env files are set to. */}
            <code className="kbd">POST {window.location.origin}/api/auth/login</code> with your email and
            password.
          </li>
          <li>
            Copy <code className="kbd">accessToken</code> from the response.
          </li>
          <li>
            Send it on every other request as{' '}
            <code className="kbd">Authorization: Bearer &lt;token&gt;</code>.
          </li>
        </ol>
        <p className="text-xs text-muted">
          The token lasts 15 minutes on purpose. <code className="kbd">POST /api/auth/refresh</code> issues a new
          one, and needs the <code className="kbd">x-csrf-token</code> header to match the{' '}
          <code className="kbd">meridian_csrf</code> cookie. A ready-made Postman collection is in{' '}
          <code className="kbd">docs/meridian.postman_collection.json</code>.
        </p>

        {open && data && (
          <div className="space-y-2">
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] uppercase tracking-wide text-muted">Authorization header</span>
                <CopyButton text={data.usage.value} label="Copy" />
              </div>
              <p className="font-mono text-[11px] text-muted-strong break-all">{data.usage.value}</p>
            </div>
            <p className="text-xs text-muted">Expires in {data.usage.expiresIn}. {data.usage.note}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default function ManagerSettings() {
  const { manager, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const change = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    onSuccess: async () => {
      toast.success('Password changed - signing you in again');
      await logout();
      navigate('/login');
    },
    onError: (err) => toast.error(err.message),
  });

  const mismatch = form.newPassword && form.confirm && form.newPassword !== form.confirm;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Your account" />

      <div className="space-y-6">
        <ConnectedServices />
        <ApiAccess />

        <Card>
          <CardHeader title="Profile" icon={User} />
          <div className="card-pad space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span className="text-ink">{manager?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Email</span>
              <span className="text-ink">{manager?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Role</span>
              <Badge tone={manager?.role === 'admin' ? 'primary' : 'neutral'}>{manager?.role}</Badge>
            </div>
          </div>
        </Card>

        <Card data-tour="settings-password">
          <CardHeader
            title="Change password"
            subtitle="Every other session is signed out when you change it"
            icon={KeyRound}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              change.mutate();
            }}
          >
            <div className="card-pad space-y-4">
              <Field label="Current password">
                <PasswordInput
                  value={form.currentPassword}
                  onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <PasswordInput
                  value={form.newPassword}
                  onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm new password" error={mismatch ? 'Passwords do not match' : undefined}>
                <PasswordInput
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button type="submit" variant="primary" loading={change.isPending} disabled={mismatch}>
                Change password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
