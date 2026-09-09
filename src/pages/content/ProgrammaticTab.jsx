import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Layers, Plus, Rocket, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Loading, Modal, Select, Textarea } from '../../components/ui/index.jsx';
import { Term } from '../../components/ui/Term.jsx';
import PieceList from './PieceList.jsx';
import PruneCard from './PruneCard.jsx';
import { useInvalidateContent } from './shared.jsx';

const PAGE_TYPES = [
  ['service_city', 'Service in a city', '"{service} in {city}" - one page per service per city'],
  ['comparison', 'Comparison', '"{option_a} vs {option_b}" - honest pros and cons'],
  ['glossary', 'Glossary', '"What is {term}?" - definitions buyers search for'],
  ['use_case', 'Use case', '"{service} for {situation}" - one page per need'],
  ['custom', 'Custom', 'Any pattern; the instructions decide the shape'],
];

const VARIABLE_RE = /\{(\w+)\}/g;
const variablesIn = (pattern) => [...new Set([...String(pattern).matchAll(VARIABLE_RE)].map((m) => m[1]))];
const splitValues = (s) => String(s ?? '').split(/[\n,]/).map((v) => v.trim()).filter(Boolean);

const EMPTY = { name: '', pattern: '{service} in {city}', page_type: 'service_city', values: {}, path_pattern: '/{service}-in-{city}', instructions: '' };

const TemplateModal = ({ campaign, open, onClose, initial }) => {
  const invalidate = useInvalidateContent(campaign.id);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        id: initial.id,
        name: initial.name,
        pattern: initial.pattern,
        page_type: initial.page_type,
        values: Object.fromEntries(Object.entries(initial.variables ?? {}).map(([k, v]) => [k, v.join('\n')])),
        path_pattern: initial.path_pattern ?? '',
        instructions: initial.instructions ?? '',
      });
    } else {
      setForm({ ...EMPTY, values: { service: campaign.niche ?? '', city: (campaign.target_cities ?? []).join('\n') } });
    }
    setPreview(null);
  }, [open, initial, campaign]);

  const vars = useMemo(() => variablesIn(form.pattern), [form.pattern]);
  const body = () => ({
    id: form.id,
    name: form.name,
    pattern: form.pattern,
    page_type: form.page_type,
    variables: Object.fromEntries(vars.map((v) => [v, splitValues(form.values[v])])),
    path_pattern: form.path_pattern || '',
    instructions: form.instructions || '',
  });
  const total = vars.reduce((acc, v) => acc * Math.max(0, splitValues(form.values[v]).length), vars.length ? 1 : 0);

  const doPreview = useMutation({
    mutationFn: () => contentApi.previewTemplate(campaign.id, body()),
    onSuccess: (res) => setPreview(res),
    onError: (err) => toast.error(err.message),
  });
  const save = useMutation({
    mutationFn: () => contentApi.saveTemplate(campaign.id, body()),
    onSuccess: (res) => {
      invalidate();
      toast.success(`Template saved - ${res.total} pages`);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={initial ? 'Edit template' : 'New programmatic template'}
      subtitle="A pattern with {variables}. Every combination becomes its own page, each written separately so no two share their text."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => doPreview.mutate()} loading={doPreview.isPending} disabled={!vars.length}>
            Preview {total ? `(${total})` : ''}
          </Button>
          <Button variant="primary" onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim() || !vars.length || !total}>
            Save template
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Service pages by city" />
          </Field>
          <Field label="Page type">
            <Select value={form.page_type} onChange={(e) => setForm((f) => ({ ...f, page_type: e.target.value }))}>
              {PAGE_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title pattern" hint={PAGE_TYPES.find((p) => p[0] === form.page_type)?.[2]} className="sm:col-span-2">
            <Input value={form.pattern} onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))} placeholder="{service} in {city}" />
          </Field>
        </div>

        {vars.length === 0 ? (
          <p className="text-xs text-warning">Add at least one {'{variable}'} to the pattern.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vars.map((v) => (
              <Field key={v} label={`Values for {${v}}`} hint={`${splitValues(form.values[v]).length} value(s) - one per line or comma separated`}>
                <Textarea
                  rows={5}
                  value={form.values[v] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, values: { ...f.values, [v]: e.target.value } }))}
                  placeholder={v === 'city' ? 'Surat\nAhmedabad\nVadodara' : 'bathroom fitting\npipe repair\nwater tank cleaning'}
                />
              </Field>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Page path pattern" hint="Optional. Same variables, becomes the slug">
            <Input value={form.path_pattern} onChange={(e) => setForm((f) => ({ ...f, path_pattern: e.target.value }))} placeholder="/{service}-in-{city}" />
          </Field>
          <Field label="Extra instructions" hint="Anything every page must include or avoid">
            <Input value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} placeholder="Mention the 24-hour helpline; never quote a fixed price" />
          </Field>
        </div>

        {total > 0 && (
          <p className="text-xs text-muted">
            <b className="text-ink">{total}</b> page{total === 1 ? '' : 's'} from this template{total > 300 ? ' - the first 300 are generated per run' : ''}.
          </p>
        )}
        {preview && (
          <div className="rounded-lg border border-border p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Sample titles ({preview.total} total)</div>
            <ul className="text-sm text-muted-strong space-y-0.5">
              {preview.sample.map((r) => (
                <li key={r.key}>
                  {r.title} <span className="text-xs text-muted font-mono">/{r.slug}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default function ProgrammaticTab({ campaign, summary, onOpen }) {
  const invalidate = useInvalidateContent(campaign.id);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draftNow, setDraftNow] = useState(6);

  const { data, isLoading } = useQuery({ queryKey: ['content-templates', campaign.id], queryFn: () => contentApi.templates(campaign.id) });

  const generate = useMutation({
    mutationFn: (id) => contentApi.generateTemplate(campaign.id, id, { draft_now: draftNow }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.created} new page(s) queued, ${res.drafted} written now${res.failed ? `, ${res.failed} failed` : ''}`);
      if (res.warning) toast(res.warning, { icon: '⚠️', duration: 7000 });
    },
    onError: (err) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: (id) => contentApi.deleteTemplate(campaign.id, id),
    onSuccess: () => {
      invalidate();
      toast.success('Template removed - its pages are kept');
    },
    onError: (err) => toast.error(err.message),
  });

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={<Term k="programmatic">Programmatic pages</Term>}
          subtitle="One pattern, hundreds of pages - each written on its own with local detail, so it is not the same page with the city swapped."
          icon={Layers}
          action={
            <div className="flex items-center gap-2">
              <Select value={draftNow} onChange={(e) => setDraftNow(Number(e.target.value))} className="w-32 h-8 text-xs py-0" title="How many to write immediately; the rest queue for the autopilot">
                {[0, 3, 6, 9, 12].map((n) => (
                  <option key={n} value={n}>
                    write {n} now
                  </option>
                ))}
              </Select>
              <Button size="sm" variant="primary" icon={Plus} onClick={() => { setEditing(null); setModal(true); }} data-tour="content-template">
                New template
              </Button>
            </div>
          }
        />
        {isLoading ? (
          <Loading label="Loading templates" />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No templates yet"
            description={`Start with "{service} in {city}" across ${campaign.target_cities?.length || 'the target'} cities. Pages are queued as ideas and written in batches.`}
            action={
              <Button variant="primary" icon={Plus} onClick={() => { setEditing(null); setModal(true); }}>
                Create the first template
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-ink font-medium">{t.name}</span>
                    <Badge tone="neutral">{PAGE_TYPES.find((p) => p[0] === t.page_type)?.[1] ?? t.page_type}</Badge>
                    {!t.is_active && <Badge tone="warning">paused</Badge>}
                  </div>
                  <p className="text-xs text-muted mt-0.5 font-mono">{t.pattern}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {Object.entries(t.variables ?? {}).map(([k, v]) => `${k}: ${v.length}`).join(' · ')} · {t.pieces} page(s) queued, {t.published} published
                  </p>
                </div>
                <Button size="sm" variant="primary" icon={Rocket} onClick={() => generate.mutate(t.id)} loading={generate.isPending && generate.variables === t.id} data-tour="content-generate">
                  Generate
                </Button>
                <Button size="sm" onClick={() => { setEditing(t); setModal(true); }}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove.mutate(t.id)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <PruneCard campaign={campaign} connected={Boolean(summary?.connections?.gsc)} onOpen={onOpen} />

      <PieceList
        campaign={campaign}
        kind="programmatic"
        onOpen={onOpen}
        emptyTitle="No programmatic pages yet"
        emptyDescription="Create a template and press Generate. Pages arrive as ideas; the ones you asked for are written immediately."
        extra={{
          header: <th>Variables</th>,
          cell: (p) => (
            <td className="text-xs text-muted max-w-[220px] truncate">
              {Object.entries(p.variables ?? {}).map(([k, v]) => `${k}=${v}`).join(', ')}
            </td>
          ),
        }}
      />

      <TemplateModal campaign={campaign} open={modal} onClose={() => setModal(false)} initial={editing} />
    </div>
  );
}
