import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ExternalLink, KeyRound, Link2, Plug, Save, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaigns, clients, integrations as integrationsApi } from '../api/endpoints.js';
import { CompetitorPicker } from '../components/ui/CompetitorPicker.jsx';
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
const RELATIONSHIP_TONE = { direct: 'success', partial: 'warning', not_competitor: 'danger' };

const INTEGRATIONS = {
  webflow: {
    name: 'Webflow',
    what: 'Publishes blog posts and programmatic pages into the site\'s CMS collection, as drafts or live.',
    how: 'Webflow → Site settings → Apps & integrations → API access → Generate API token with cms:read, cms:write, sites:read',
    fields: [
      ['token', 'Site API token', 'password'],
      ['collection_id', 'Collection id (optional - found automatically when one collection looks like a blog)', 'text'],
    ],
  },
  ghost: {
    name: 'Ghost',
    what: 'Publishes blog posts and programmatic pages to the Ghost site, with SEO title and description.',
    how: 'Ghost admin → Settings → Integrations → Add custom integration → copy the Admin API key',
    fields: [
      ['url', 'Site URL (https://blog.example.com)', 'text'],
      ['admin_key', 'Admin API key (id:secret)', 'password'],
    ],
  },
  shopify: {
    name: 'Shopify blog',
    what: 'Publishes blog posts and programmatic pages as articles on the store blog.',
    how: 'Shopify admin → Settings → Apps and sales channels → Develop apps → Create app → write_content scope → Install → Admin API access token',
    fields: [
      ['shop', 'Store address (my-store.myshopify.com)', 'text'],
      ['token', 'Admin API access token (shpat_…)', 'password'],
      ['blog_handle', 'Blog handle (optional - "news" or the first blog otherwise)', 'text'],
    ],
  },
  medium: {
    name: 'Medium',
    what: 'Publishes Medium articles and syndicated blog posts. Medium stopped issuing new tokens in January 2025 - only a token created before then works; otherwise articles are pasted by hand.',
    how: 'Medium → Settings → Security and apps → Integration tokens (accounts that had one before 2025)',
    fields: [['token', 'Integration token', 'password']],
  },
  reddit: {
    name: 'Reddit',
    what: 'Posts approved replies on discovered threads, and text posts in the off-page rotation.',
    how: 'reddit.com/prefs/apps → create a "script" app, then the posting account',
    fields: [
      ['client_id', 'App client ID', 'text'],
      ['client_secret', 'App secret', 'password'],
      ['username', 'Reddit username', 'text'],
      ['password', 'Reddit password', 'password'],
    ],
  },
};

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [wpModal, setWpModal] = useState(false);
  const [wpForm, setWpForm] = useState({ site: '', username: '', appPassword: '' });
  const [form, setForm] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [intModal, setIntModal] = useState(null);
  const [intForm, setIntForm] = useState({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clients.get(id),
  });
  const { data: campaignData, refetch: refetchCampaign } = useQuery({
    queryKey: ['campaign-for-client', id],
    queryFn: () => campaigns.byClient(id),
    retry: false,
  });
  const { data: intData, refetch: refetchIntegrations } = useQuery({
    queryKey: ['integrations', id],
    queryFn: () => integrationsApi.list(id),
  });

  const campaign = campaignData?.campaign;
  const competitors = Array.isArray(campaign?.competitors) && campaign.competitors.length
    ? campaign.competitors
    : (campaign?.competitor_urls ?? []).map((u) => ({ domain: u.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, ''), reason: 'Added during onboarding', verified: true }));

  const saveCompetitors = useMutation({
    mutationFn: (next) => campaigns.update(campaign.id, { competitors: next }),
    onSuccess: () => {
      refetchCampaign();
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign?.id] });
      queryClient.invalidateQueries({ queryKey: ['ranks-live', campaign?.id] });
      toast.success('Competitors updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const connectIntegration = useMutation({
    mutationFn: () => integrationsApi.connect(id, intModal, intForm),
    onSuccess: (res) => {
      setIntModal(null);
      setIntForm({});
      refetchIntegrations();
      toast.success(`${INTEGRATIONS[res.platform].name} connected as ${res.username}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectIntegration = useMutation({
    mutationFn: (platform) => integrationsApi.disconnect(id, platform),
    onSuccess: () => {
      refetchIntegrations();
      toast.success('Disconnected');
    },
    onError: (err) => toast.error(err.message),
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
    if (gsc === 'connected' && params.get('property') === 'none') {
      toast('Search Console connected, but no property matched the domain. Set the property URL under Business details.', { icon: '⚠️', duration: 9000 });
    } else if (gsc === 'connected') toast.success('Search Console connected - topic ideas and pruning are on');
    else toast.error(`Search Console failed: ${params.get('reason') ?? 'unknown error'}`);
    params.delete('gsc');
    params.delete('reason');
    params.delete('property');
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
        <Card data-tour="profile-integrations">
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
                Read-only OAuth. Unlocks real clicks and CTR, topic ideas from the searches the site already shows for, and a weekly check for published pages nobody sees.
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

            {Object.entries(INTEGRATIONS).map(([platform, meta]) => {
              const row = intData?.integrations?.find((i) => i.platform === platform);
              return (
                <div key={platform} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium">{meta.name}</span>
                    <Badge tone={row ? 'success' : 'neutral'}>{row ? `Connected · ${row.username}` : 'Not connected'}</Badge>
                  </div>
                  <p className="text-xs text-muted mb-3">{meta.what}</p>
                  {row?.meta?.collection_name && (
                    <p className="text-xs text-muted-strong -mt-2 mb-3">Collection “{row.meta.collection_name}” on {row.meta.domain}</p>
                  )}
                  {row?.meta?.blog_title && <p className="text-xs text-muted-strong -mt-2 mb-3">Blog “{row.meta.blog_title}” on {row.meta.domain}</p>}
                  {row?.meta?.url && !row?.meta?.blog_title && <p className="text-xs text-muted-strong -mt-2 mb-3">{row.meta.url}</p>}
                  {row ? (
                    <Button size="sm" variant="danger" onClick={() => disconnectIntegration.mutate(platform)} loading={disconnectIntegration.isPending}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" icon={KeyRound} onClick={() => { setIntForm({}); setIntModal(platform); }}>
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {campaign && (
          <Card data-tour="profile-competitors">
            <CardHeader
              title="Competitors"
              subtitle="Tracked on every keyword next to the client. Four or five direct competitors beat ten loose ones."
              icon={Users}
              action={
                <Button size="sm" icon={Sparkles} onClick={() => setPickerOpen(true)} disabled={competitors.length >= 10}>
                  Find competitors
                </Button>
              }
            />
            {competitors.length === 0 ? (
              <div className="px-6 py-6 text-sm text-muted">None chosen yet. Press Find competitors to search, open each site and pick the real ones.</div>
            ) : (
              <div className="divide-y divide-border">
                {competitors.map((c) => (
                  <div key={c.domain} className="flex items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.name && c.name !== c.domain && <span className="text-sm text-ink font-medium">{c.name}</span>}
                        <span className={`${c.name && c.name !== c.domain ? 'text-xs text-muted font-mono' : 'text-sm text-ink'}`}>{c.domain}</span>
                        {c.relationship && RELATIONSHIP_TONE[c.relationship] && <Badge tone={RELATIONSHIP_TONE[c.relationship]}>{c.relationship.replace('_', ' ')}</Badge>}
                        {c.similarity != null && <span className="text-[11px] text-muted tabular-nums">{c.similarity}/100</span>}
                      </div>
                      {c.reason && <p className="text-xs text-muted truncate">{c.reason}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={`https://${c.domain}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" icon={ExternalLink} />
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => saveCompetitors.mutate(competitors.filter((x) => x.domain !== c.domain))}
                        loading={saveCompetitors.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card data-tour="profile-details">
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

      <Modal
        open={Boolean(intModal)}
        onClose={() => setIntModal(null)}
        title={`Connect ${INTEGRATIONS[intModal]?.name ?? ''}`}
        subtitle={INTEGRATIONS[intModal]?.how}
        footer={
          <>
            <Button onClick={() => setIntModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => connectIntegration.mutate()} loading={connectIntegration.isPending}>
              Verify and save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2.5 rounded-lg border border-border bg-surface-2 p-3">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-xs text-muted-strong">
              Credentials are checked against the platform before they are stored, encrypted at rest, and never shown again. Revoke them on the platform at any time.
            </p>
          </div>
          {(INTEGRATIONS[intModal]?.fields ?? []).map(([key, label, type]) => (
            <Field key={key} label={label}>
              {type === 'password' ? (
                <PasswordInput value={intForm[key] ?? ''} onChange={(e) => setIntForm((f) => ({ ...f, [key]: e.target.value }))} />
              ) : (
                <Input value={intForm[key] ?? ''} onChange={(e) => setIntForm((f) => ({ ...f, [key]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
      </Modal>

      {campaign && (
        <CompetitorPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          seed={{
            domain: client.domain,
            business_name: client.business_name,
            niche: form.niche || client.niche,
            city: splitList(form.target_cities)[0] || client.target_cities?.[0],
            country: (client.geo_target || '').split(',').pop()?.trim() || 'India',
          }}
          existing={competitors.map((c) => c.domain)}
          max={10}
          onAdd={(chosen) => saveCompetitors.mutate([...competitors, ...chosen].slice(0, 10))}
        />
      )}
    </div>
  );
}
