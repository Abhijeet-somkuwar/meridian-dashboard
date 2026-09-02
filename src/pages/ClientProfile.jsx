import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, KeyRound, Link2, Plug, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaigns, clients } from '../api/endpoints.js';
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
  PasswordInput,
  ClientLogo,
  PlatformBadge,
  Select,
  Textarea,
} from '../components/ui/index.jsx';

const listValue = (arr) => (arr ?? []).join(', ');
const splitList = (value) => value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [wpModal, setWpModal] = useState(false);
  const [wpForm, setWpForm] = useState({ site: '', username: '', appPassword: '' });
  const [form, setForm] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clients.get(id),
  });
  const { data: campaignData } = useQuery({
    queryKey: ['campaign-for-client', id],
    queryFn: () => campaigns.byClient(id),
    retry: false,
  });

  useEffect(() => {
    if (data?.client && !form) {
      const c = data.client;
      setForm({
        business_name: c.business_name,
        platform_type: c.platform_type,
        geo_target: c.geo_target ?? '',
        target_cities: listValue(c.target_cities),
        languages: listValue(c.languages),
        niche: c.niche ?? '',
        whatsapp_number: c.whatsapp_number ?? '',
        contact_name: c.contact_name ?? '',
        contact_email: c.contact_email ?? '',
        nap_address: c.nap_address ?? '',
        wp_site_url: c.wp_site_url ?? '',
        wp_username: c.wp_username ?? '',
        gsc_site_url: c.gsc_site_url ?? '',
      });
      setWpForm((f) => ({ ...f, site: c.wp_site_url ?? `https://${c.domain}`, username: c.wp_username ?? '' }));
    }
  }, [data, form]);

  // Google redirects back here after the OAuth dance.
  useEffect(() => {
    const gsc = params.get('gsc');
    if (!gsc) return;
    if (gsc === 'connected') toast.success('Search Console connected');
    else toast.error(`Search Console failed: ${params.get('reason') ?? 'unknown error'}`);
    params.delete('gsc');
    params.delete('reason');
    setParams(params, { replace: true });
    refetch();
  }, [params, setParams, refetch]);

  const save = useMutation({
    mutationFn: () =>
      clients.update(id, {
        ...form,
        target_cities: splitList(form.target_cities),
        languages: splitList(form.languages),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const connectWp = useMutation({
    mutationFn: () => clients.connectWp(id, wpForm),
    onSuccess: (res) => {
      setWpModal(false);
      refetch();
      toast.success(`WordPress connected as ${res.user}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectWp = useMutation({
    mutationFn: () => clients.disconnectWp(id),
    onSuccess: () => {
      refetch();
      toast.success('WordPress disconnected');
    },
  });

  const connectGsc = useMutation({
    mutationFn: () => clients.gscUrl(id),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectGsc = useMutation({
    mutationFn: () => clients.disconnectGsc(id),
    onSuccess: () => {
      refetch();
      toast.success('Search Console disconnected');
    },
  });

  if (isLoading || !form) return <Loading label="Loading client" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const client = data.client;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Clients
      </button>

      <PageHeader
        title={client.business_name}
        subtitle={client.domain}
        badge={<PlatformBadge type={client.platform_type} stack={client.tech_stack} />}
        leading={<ClientLogo client={client} size={40} />}
        actions={
          campaignData?.campaign && (
            <Link to={`/campaigns/${campaignData.campaign.id}`}>
              <Button variant="primary">
                Open campaign <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Integrations"
            subtitle="Only scoped, revocable credentials are ever stored"
            icon={Plug}
          />
          <div className="card-pad grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium">WordPress push</span>
                <Badge tone={client.wp_connected ? 'success' : 'neutral'}>
                  {client.wp_connected ? 'Connected' : 'Not connected'}
                </Badge>
              </div>
              <p className="text-xs text-muted mb-3">
                Application password only. Lets Meridian apply approved changes and roll them back.
              </p>
              {client.wp_connected ? (
                <Button size="sm" variant="danger" onClick={() => disconnectWp.mutate()} loading={disconnectWp.isPending}>
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  icon={KeyRound}
                  onClick={() => setWpModal(true)}
                  disabled={client.platform_type !== 'wordpress'}
                >
                  {client.platform_type === 'wordpress' ? 'Connect' : 'WordPress only'}
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium">Search Console</span>
                <Badge tone={client.gsc_connected ? 'success' : 'neutral'}>
                  {client.gsc_connected ? 'Connected' : 'Simulated'}
                </Badge>
              </div>
              <p className="text-xs text-muted mb-3">
                Read-only OAuth. Without it, clicks and CTR are simulated from rank position.
              </p>
              {client.gsc_connected ? (
                <Button size="sm" variant="danger" onClick={() => disconnectGsc.mutate()} loading={disconnectGsc.isPending}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" icon={Link2} onClick={() => connectGsc.mutate()} loading={connectGsc.isPending}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Business details" subtitle="Feeds every Claude prompt for this campaign" />
          <div className="card-pad grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <Input value={form.business_name} onChange={set('business_name')} />
            </Field>
            <Field label="Platform">
              <Select value={form.platform_type} onChange={set('platform_type')}>
                <option value="wordpress">WordPress</option>
                <option value="php">PHP / cPanel</option>
                <option value="shopify">Shopify</option>
                <option value="wix">Wix</option>
                <option value="custom">Custom-built app (React, Next.js, Vue…)</option>
                <option value="other">Other</option>
              </Select>
              {client.tech_stack && (
                <p className="text-xs text-muted">Detected from the site: {client.tech_stack}</p>
              )}
            </Field>
            <Field label="Niche">
              <Input value={form.niche} onChange={set('niche')} />
            </Field>
            <Field label="Geo target">
              <Input value={form.geo_target} onChange={set('geo_target')} />
            </Field>
            <Field label="Target cities" hint="Comma separated">
              <Input value={form.target_cities} onChange={set('target_cities')} />
            </Field>
            <Field label="Languages" hint="Comma separated">
              <Input value={form.languages} onChange={set('languages')} />
            </Field>
            <Field label="Contact name">
              <Input value={form.contact_name} onChange={set('contact_name')} />
            </Field>
            <Field label="WhatsApp">
              <Input value={form.whatsapp_number} onChange={set('whatsapp_number')} />
            </Field>
            <Field label="Report email">
              <Input type="email" value={form.contact_email} onChange={set('contact_email')} />
            </Field>
            <Field label="Search Console property" hint="e.g. https://example.com/">
              <Input value={form.gsc_site_url} onChange={set('gsc_site_url')} />
            </Field>
            <Field label="NAP block" className="sm:col-span-2">
              <Textarea rows={2} value={form.nap_address} onChange={set('nap_address')} />
            </Field>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end">
            <Button variant="primary" icon={Save} onClick={() => save.mutate()} loading={save.isPending}>
              Save changes
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={wpModal}
        onClose={() => setWpModal(false)}
        title="Connect WordPress"
        subtitle="Users → Profile → Application Passwords in WP Admin"
        footer={
          <>
            <Button onClick={() => setWpModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => connectWp.mutate()} loading={connectWp.isPending}>
              Verify and save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-muted-strong">
              Meridian never asks for the WordPress admin password, FTP, or cPanel credentials. An application
              password is scoped and can be revoked from WP Admin at any time.
            </p>
          </div>
          <Field label="Site URL">
            <Input value={wpForm.site} onChange={(e) => setWpForm((f) => ({ ...f, site: e.target.value }))} />
          </Field>
          <Field label="WordPress username">
            <Input value={wpForm.username} onChange={(e) => setWpForm((f) => ({ ...f, username: e.target.value }))} />
          </Field>
          <Field label="Application password" hint="The 24-character string WordPress shows you once">
            <PasswordInput
              value={wpForm.appPassword}
              onChange={(e) => setWpForm((f) => ({ ...f, appPassword: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
