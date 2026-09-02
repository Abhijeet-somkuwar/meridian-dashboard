import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Loader2, Plus, ScanSearch, Search, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { audit, clients, geo } from '../api/endpoints.js';
import { hasErrors, rules, stripProtocol, validateForm } from '../lib/validation.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../components/ui/index.jsx';
import { CityPicker } from '../components/ui/CityPicker.jsx';
import { Term } from '../components/ui/Term.jsx';

const MAX_COMPETITORS = 10;

const EMPTY = {
  business_name: '',
  domain: '',
  platform_type: 'wordpress',
  country: 'India',
  target_cities: [],
  languages: 'English',
  niche: '',
  whatsapp_number: '',
  contact_name: '',
  contact_email: '',
  nap_address: '',
};

const SCHEMA = {
  business_name: [rules.required('Business name'), rules.minLength(2, 'Business name')],
  domain: [rules.required('Website address'), rules.domain],
  niche: [rules.required('What the business does')],
  contact_email: [rules.email],
  whatsapp_number: [rules.phone],
  nap_address: [rules.maxLength(500, 'Address block')],
};

export default function ClientNew() {
  const [form, setForm] = useState(EMPTY);
  const [competitors, setCompetitors] = useState([]);
  const [competitorInput, setCompetitorInput] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [runAudit, setRunAudit] = useState(true);
  // What the website itself says about how it is built. Fills the platform
  // field unless the manager has already chosen one by hand.
  const [detection, setDetection] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const platformTouched = useRef(false);
  const detectAbort = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detectPlatform = async (domainValue) => {
    const domain = stripProtocol(domainValue);
    if (!domain || rules.domain(domain)) return;
    if (detection?.domain === domain) return;
    detectAbort.current?.abort();
    const controller = new AbortController();
    detectAbort.current = controller;
    setDetecting(true);
    try {
      const res = await clients.detect(domain, controller.signal);
      if (controller.signal.aborted) return;
      const found = res.detection ? { ...res.detection, domain } : { domain, reachable: false };
      setDetection(found);
      if (res.detection && !platformTouched.current) {
        setForm((f) => ({ ...f, platform_type: res.detection.platform_type }));
      }
    } catch {
      if (!controller.signal.aborted) setDetection({ domain, reachable: false });
    } finally {
      if (!controller.signal.aborted) setDetecting(false);
    }
  };

  const { data: countryData } = useQuery({
    queryKey: ['countries'],
    queryFn: geo.countries,
    staleTime: 60 * 60_000,
  });

  const geoTarget = useMemo(
    () => [form.target_cities[0], form.country].filter(Boolean).join(', '),
    [form.target_cities, form.country],
  );

  const setField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (touched[key]) setErrors(validateForm({ ...form, [key]: value }, SCHEMA));
  };

  const blur = (key) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validateForm(form, SCHEMA));
  };

  const errorFor = (key) => (touched[key] ? errors[key] : undefined);

  // --- competitors ----------------------------------------------------------

  const addCompetitor = (value) => {
    const domain = stripProtocol(value);
    if (!domain) return;
    if (rules.domain(domain)) {
      toast.error('That does not look like a web address. Use the form example.com');
      return;
    }
    if (competitors.some((c) => c.domain === domain)) {
      toast('Already in the list');
      return;
    }
    if (competitors.length >= MAX_COMPETITORS) {
      toast.error(`You can add up to ${MAX_COMPETITORS} competitors`);
      return;
    }
    setCompetitors((list) => [...list, { domain, name: domain, reason: 'Added by you', verified: true }]);
    setCompetitorInput('');
  };

  const suggest = useMutation({
    mutationFn: () =>
      geo.suggestCompetitors({
        domain: form.domain,
        niche: form.niche,
        city: form.target_cities[0],
        country: form.country,
      }),
    onSuccess: (res) => {
      const fresh = res.competitors.filter((c) => !competitors.some((x) => x.domain === c.domain));
      const room = MAX_COMPETITORS - competitors.length;
      setCompetitors((list) => [...list, ...fresh.slice(0, room)]);
      if (!fresh.length) toast(res.note || 'No new suggestions', { duration: 6000 });
      else toast.success(`${Math.min(fresh.length, room)} suggested - open each one to check it`);
    },
    onError: (err) => toast.error(err.message),
  });

  // --- submit ---------------------------------------------------------------

  const create = useMutation({
    mutationFn: async () => {
      const { client, campaign } = await clients.create({
        business_name: form.business_name.trim(),
        domain: stripProtocol(form.domain),
        platform_type: form.platform_type,
        tech_stack: detection?.tech_stack || undefined,
        hosting: detection?.hosting || undefined,
        logo_url: /^https?:\/\//i.test(detection?.logo_url ?? '') ? detection.logo_url : undefined,
        geo_target: geoTarget || undefined,
        target_cities: form.target_cities,
        languages: form.languages.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        niche: form.niche.trim() || undefined,
        whatsapp_number: form.whatsapp_number.trim() || undefined,
        contact_name: form.contact_name.trim() || undefined,
        contact_email: form.contact_email.trim() || undefined,
        nap_address: form.nap_address.trim() || undefined,
        competitor_urls: competitors.map((c) => `https://${c.domain}`),
      });

      if (runAudit) {
        // The audit visits a live website, so a failure there must not lose the
        // client record we just created.
        try {
          await audit.run(campaign.id);
          toast.success('Website checked');
        } catch (err) {
          toast.error(`Client saved, but we could not check the website: ${err.message}`, { duration: 8000 });
        }
      }
      return { client, campaign };
    },
    onSuccess: ({ campaign }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Client added');
      navigate(`/campaigns/${campaign.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    const found = validateForm(form, SCHEMA);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(SCHEMA).map((k) => [k, true])));
    if (hasErrors(found)) {
      toast.error('Please fix the highlighted fields');
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    create.mutate();
  };

  const canSuggest = form.niche.trim().length > 1 && form.target_cities.length > 0;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Clients
      </button>

      <PageHeader
        title="Add a client"
        subtitle="Fill this in after the first call. Everything here shapes the work the platform does later, so be specific."
      />

      <form onSubmit={submit} className="space-y-6" noValidate>
        <Card data-tour="new-business">
          <CardHeader title="The business" subtitle="Who they are and where they sell" />
          <div className="card-pad grid gap-4 sm:grid-cols-2">
            <Field label="Business name" error={errorFor('business_name')} className="sm:col-span-2">
              <Input
                value={form.business_name}
                onChange={setField('business_name')}
                onBlur={blur('business_name')}
                data-invalid={Boolean(errorFor('business_name'))}
                placeholder="Rajesh Plumbers"
              />
            </Field>

            <Field
              label="Website address"
              hint="Just the address - no https:// needed"
              error={errorFor('domain')}
            >
              <Input
                value={form.domain}
                onChange={setField('domain')}
                onBlur={(e) => {
                  blur('domain')();
                  detectPlatform(e.target.value);
                }}
                data-invalid={Boolean(errorFor('domain'))}
                placeholder="rajeshplumbers.com"
              />
            </Field>

            <Field
              label="Website is built with"
              hint={
                form.platform_type === 'custom'
                  ? 'Changes will be written as a handoff for the client’s developer'
                  : 'Decides how we write the step-by-step instructions'
              }
            >
              <Select
                value={form.platform_type}
                onChange={(e) => {
                  platformTouched.current = true;
                  setField('platform_type')(e);
                }}
              >
                <option value="wordpress">WordPress</option>
                <option value="php">Hand-coded PHP / cPanel</option>
                <option value="shopify">Shopify</option>
                <option value="wix">Wix</option>
                <option value="custom">Custom-built app (React, Next.js, Vue…) — has a developer</option>
                <option value="other">Something else / not sure</option>
              </Select>
            </Field>

            {(detecting || detection) && (
              <div
                className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-border bg-surface-2/60 px-4 py-3"
                data-tour="new-detect"
              >
                {detecting ? (
                  <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin text-muted" />
                ) : detection?.logo_url ? (
                  <img
                    src={detection.logo_url}
                    alt=""
                    className="w-8 h-8 mt-0.5 shrink-0 rounded-lg object-contain bg-surface-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <ScanSearch className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                )}
                <div className="min-w-0 text-sm">
                  {detecting ? (
                    <p className="text-muted">Looking at {detection?.domain || stripProtocol(form.domain)} to see how it is built…</p>
                  ) : detection.reachable === false ? (
                    <p className="text-muted">
                      Could not open <span className="font-mono">{detection.domain}</span> — pick the platform yourself.
                    </p>
                  ) : (
                    <>
                      <p className="text-ink">
                        <span className="font-mono">{detection.domain}</span> looks like{' '}
                        <b>{detection.tech_stack || 'a site we could not identify'}</b>
                        {detection.confidence !== 'high' && detection.tech_stack ? ' (probably)' : ''}.
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {detection.editable_by === 'developer'
                          ? 'The page is built from source code, so changes go to whoever owns that code — we will write them as a developer handoff.'
                          : detection.editable_by === 'admin_panel'
                            ? 'Changes are made in its admin panel — instructions will name the exact screen.'
                            : detection.editable_by === 'file_manager'
                              ? 'Pages are plain files on the server — instructions will name the file and line.'
                              : 'Instructions will describe the exact HTML element to change.'}
                        {detection.reasons?.length ? ` Clue: ${detection.reasons[0]}.` : ''}
                      </p>
                      {form.platform_type !== detection.platform_type && (
                        <button
                          type="button"
                          className="mt-1.5 text-xs font-medium text-primary hover:underline"
                          onClick={() => {
                            platformTouched.current = true;
                            setForm((f) => ({ ...f, platform_type: detection.platform_type }));
                          }}
                        >
                          Use this
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <Field
              label="What the business does"
              hint="In plain words - this is where we start looking for search phrases"
              error={errorFor('niche')}
              className="sm:col-span-2"
            >
              <Input
                value={form.niche}
                onChange={setField('niche')}
                onBlur={blur('niche')}
                data-invalid={Boolean(errorFor('niche'))}
                placeholder="plumbing services"
              />
            </Field>

            <Field label="Country">
              <Select
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, target_cities: [] }))}
              >
                {(countryData?.countries ?? ['India']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Languages the site uses" hint="Separate with commas">
              <Input value={form.languages} onChange={setField('languages')} placeholder="English, Hindi, Gujarati" />
            </Field>

            <Field
              label="Cities they sell in"
              hint={
                form.target_cities.length
                  ? `Search area: ${geoTarget}. The first city is the main one.`
                  : 'Pick from the list. We search Google as if we were standing in these cities.'
              }
              className="sm:col-span-2"
            >
              <CityPicker
                country={form.country}
                value={form.target_cities}
                onChange={(cities) => setForm((f) => ({ ...f, target_cities: cities }))}
              />
            </Field>
          </div>
        </Card>

        <Card data-tour="new-nap">
          <CardHeader
            title="Contact details"
            subtitle="The address block gets reused word for word in every business listing"
          />
          <div className="card-pad grid gap-4 sm:grid-cols-2">
            <Field label="Contact person">
              <Input value={form.contact_name} onChange={setField('contact_name')} placeholder="Rajesh Patel" />
            </Field>
            <Field label="WhatsApp number" error={errorFor('whatsapp_number')}>
              <Input
                value={form.whatsapp_number}
                onChange={setField('whatsapp_number')}
                onBlur={blur('whatsapp_number')}
                data-invalid={Boolean(errorFor('whatsapp_number'))}
                placeholder="+91 98250 11111"
              />
            </Field>
            <Field
              label="Email for reports"
              hint="Where the progress report is sent"
              error={errorFor('contact_email')}
              className="sm:col-span-2"
            >
              <Input
                type="email"
                value={form.contact_email}
                onChange={setField('contact_email')}
                onBlur={blur('contact_email')}
                data-invalid={Boolean(errorFor('contact_email'))}
                placeholder="rajesh@example.com"
              />
            </Field>
            <Field
              label={
                <>
                  Name, address and phone (<Term k="nap">NAP</Term>)
                </>
              }
              hint="Exactly as it should appear on every directory. Google trusts a business more when this matches everywhere."
              error={errorFor('nap_address')}
              className="sm:col-span-2"
            >
              <Textarea
                rows={2}
                value={form.nap_address}
                onChange={setField('nap_address')}
                onBlur={blur('nap_address')}
                placeholder="Rajesh Plumbers, 14 Ring Road, Surat, Gujarat 395002"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Competitors"
            subtitle="Other businesses showing up in Google for the same searches. Optional, but it makes the keyword work sharper."
            action={
              <Button
                type="button"
                size="sm"
                icon={Sparkles}
                onClick={() => suggest.mutate()}
                loading={suggest.isPending}
                disabled={!canSuggest || competitors.length >= MAX_COMPETITORS}
                title={canSuggest ? 'Find likely competitors' : 'Fill in the trade and at least one city first'}
              >
                Find competitors
              </Button>
            }
          />
          <div className="card-pad space-y-3">
            <div className="flex gap-2">
              <Input
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCompetitor(competitorInput);
                  }
                }}
                placeholder="competitor.com"
                disabled={competitors.length >= MAX_COMPETITORS}
              />
              <Button
                type="button"
                icon={Plus}
                onClick={() => addCompetitor(competitorInput)}
                disabled={!competitorInput.trim() || competitors.length >= MAX_COMPETITORS}
              >
                Add
              </Button>
            </div>

            {competitors.length === 0 ? (
              <p className="text-xs text-muted">
                Not sure who they are? Search Google for “{form.niche || 'your trade'}
                {form.target_cities[0] ? ` in ${form.target_cities[0]}` : ''}” and copy the first few business
                websites — skip Justdial, IndiaMart and Facebook, those are directories rather than competitors.
              </p>
            ) : (
              <div className="space-y-2">
                {competitors.map((c) => (
                  <div
                    key={c.domain}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-ink truncate">{c.domain}</span>
                        {!c.verified && (
                          <Badge tone="warning" icon={TriangleAlert}>
                            check this
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate">{c.reason}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={`https://${c.domain}`} target="_blank" rel="noreferrer" title="Open in a new tab">
                        <Button type="button" variant="ghost" size="sm" icon={ExternalLink} />
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => setCompetitors((list) => list.filter((x) => x.domain !== c.domain))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted">
              {competitors.length} of {MAX_COMPETITORS} added.
              {suggest.data?.source && suggest.data.source !== 'serp' && competitors.some((c) => !c.verified) && (
                <span className="text-warning"> Suggested ones are guesses — open each and confirm it is real.</span>
              )}
            </p>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label data-tour="new-audit" className="flex items-center gap-2 text-sm text-muted-strong cursor-pointer">
            <input type="checkbox" checked={runAudit} onChange={(e) => setRunAudit(e.target.checked)} />
            Check the website now
            <span className="text-xs text-muted">(takes about 20 seconds)</span>
          </label>
          <div className="flex gap-2">
            <Button type="button" onClick={() => navigate('/clients')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Search} loading={create.isPending}>
              {create.isPending && runAudit ? 'Checking the website' : 'Add client'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
