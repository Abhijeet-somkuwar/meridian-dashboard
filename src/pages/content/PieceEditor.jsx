import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, ExternalLink, PenLine, Send, Sparkles, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { fmtNumber, fmtRelative } from '../../lib/format.js';
import { renderMarkdown, wordCount } from '../../lib/markdown.js';
import { Badge, Button, CopyButton, Field, Input, Loading, Modal, Select, Tabs, Textarea } from '../../components/ui/index.jsx';
import { KIND_LABEL, StatusBadge, targetsFor, useInvalidateContent } from './shared.jsx';

/**
 * One piece, in full: preview, edit, and every action it can take - draft,
 * approve, publish, syndicate, turn into a blog post. Publishing never
 * pretends: a target that is not connected is disabled, and "manual" asks
 * for the URL the manager actually pasted it at.
 */
export default function PieceEditor({ campaign, pieceId, connections, onClose }) {
  const invalidate = useInvalidateContent(campaign.id);
  const [view, setView] = useState('preview');
  const [form, setForm] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [target, setTarget] = useState(null);
  const [remoteStatus, setRemoteStatus] = useState('draft');
  const [url, setUrl] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['content-piece', pieceId],
    queryFn: () => contentApi.piece(campaign.id, pieceId),
    enabled: Boolean(pieceId),
    refetchInterval: (q) => (q.state.data?.piece?.status === 'drafting' ? 4_000 : false),
  });
  const piece = data?.piece;

  useEffect(() => {
    if (piece) {
      setForm({
        title: piece.title ?? '',
        body_markdown: piece.body_markdown ?? '',
        meta_title: piece.meta_title ?? '',
        meta_description: piece.meta_description ?? '',
        slug: piece.slug ?? '',
      });
      const targets = targetsFor(piece, connections);
      setTarget((t) => t ?? targets.find((x) => !x.disabled)?.value ?? targets[0]?.value ?? 'manual');
      if (!piece.body_markdown) setView('details');
    }
  }, [piece, connections]);

  const dirty = useMemo(
    () =>
      piece &&
      form &&
      (form.title !== (piece.title ?? '') ||
        form.body_markdown !== (piece.body_markdown ?? '') ||
        form.meta_title !== (piece.meta_title ?? '') ||
        form.meta_description !== (piece.meta_description ?? '') ||
        form.slug !== (piece.slug ?? '')),
    [piece, form],
  );

  const done = (msg) => {
    invalidate();
    refetch();
    if (msg) toast.success(msg);
  };

  const draft = useMutation({
    mutationFn: () => contentApi.draft(campaign.id, pieceId),
    onSuccess: (res) => {
      done(`Written - ${fmtNumber(res.piece.word_count)} words`);
      setView('preview');
      if (res.warning) toast(`Model fell back to the offline planner: ${res.warning}`, { icon: '⚠️' });
    },
    onError: (err) => {
      done();
      toast.error(err.message);
    },
  });
  const save = useMutation({
    mutationFn: () => contentApi.update(campaign.id, pieceId, form),
    onSuccess: () => done('Saved'),
    onError: (err) => toast.error(err.message),
  });
  const setStatus = useMutation({
    mutationFn: (status) => contentApi.setStatus(campaign.id, pieceId, status),
    onSuccess: (res) => done(`Marked ${res.piece.status}`),
    onError: (err) => toast.error(err.message),
  });
  const publish = useMutation({
    mutationFn: () => contentApi.publish(campaign.id, pieceId, { target, status: remoteStatus, url: url || undefined }),
    onSuccess: (res) => {
      setPublishing(false);
      done(res.outcome.url ? `Published: ${res.outcome.url}` : 'Marked as published');
      if (res.outcome.note) toast(res.outcome.note, { duration: 7000 });
    },
    onError: (err) => toast.error(err.message),
  });
  const syndicate = useMutation({
    mutationFn: () => contentApi.syndicate(campaign.id, pieceId),
    onSuccess: () => done('Medium version created - find it under Quora & Medium'),
    onError: (err) => toast.error(err.message),
  });
  const toBlog = useMutation({
    mutationFn: () => contentApi.toBlog(campaign.id, pieceId),
    onSuccess: () => done('Blog post idea created - find it under Blog'),
    onError: (err) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: () => contentApi.remove(campaign.id, pieceId),
    onSuccess: () => {
      invalidate();
      toast.success('Removed');
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const html = useMemo(() => renderMarkdown(form?.body_markdown ?? ''), [form?.body_markdown]);
  const targets = piece ? targetsFor(piece, connections) : [];
  const needsUrl = ['manual', 'quora'].includes(target);
  const remoteChoice = ['wordpress', 'webflow', 'ghost', 'shopify', 'medium'].includes(target);
  const src = piece?.source ?? {};

  return (
    <Modal
      open={Boolean(pieceId)}
      onClose={onClose}
      wide
      title={piece ? piece.title : 'Loading'}
      subtitle={
        piece && (
          <span className="inline-flex items-center gap-2 flex-wrap">
            <Badge tone="neutral">{KIND_LABEL[piece.kind]}</Badge>
            <StatusBadge status={piece.status} />
            {piece.keyword_targeted && <span>for “{piece.keyword_targeted}”</span>}
            {piece.word_count ? <span>· {fmtNumber(piece.word_count)} words</span> : null}
            {piece.engine && piece.body_markdown && <span>· written by {piece.engine === 'offline' ? 'the offline planner' : piece.engine}</span>}
          </span>
        )
      }
      footer={
        piece && (
          <>
            {piece.status !== 'published' && (
              <Button variant="ghost" icon={Trash2} onClick={() => remove.mutate()} loading={remove.isPending}>
                Remove
              </Button>
            )}
            <div className="flex-1" />
            {dirty && (
              <Button onClick={() => save.mutate()} loading={save.isPending}>
                Save changes
              </Button>
            )}
            {piece.status !== 'published' && (
              <Button icon={PenLine} onClick={() => draft.mutate()} loading={draft.isPending || piece.status === 'drafting'}>
                {piece.body_markdown ? 'Rewrite' : 'Write it'}
              </Button>
            )}
            {piece.status === 'drafted' && (
              <Button variant="success" icon={Check} onClick={() => setStatus.mutate('approved')} loading={setStatus.isPending}>
                Approve
              </Button>
            )}
            {['drafted', 'approved'].includes(piece.status) && (
              <Button variant="ghost" icon={X} onClick={() => setStatus.mutate('rejected')}>
                Reject
              </Button>
            )}
            {piece.body_markdown && piece.status !== 'published' && (
              <Button variant="primary" icon={Send} onClick={() => setPublishing((v) => !v)}>
                Publish…
              </Button>
            )}
          </>
        )
      }
    >
      {isLoading || !piece || !form ? (
        <Loading label="Loading piece" />
      ) : (
        <div className="space-y-4">
          {publishing && (
            <div className="rounded-lg border border-primary/40 bg-primary-soft/40 p-4 space-y-3">
              <p className="text-sm font-medium text-ink">Where does it go?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Destination">
                  <Select value={target ?? ''} onChange={(e) => setTarget(e.target.value)}>
                    {targets.map((t) => (
                      <option key={t.value} value={t.value} disabled={t.disabled}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {remoteChoice && (
                  <Field label="Publish as" hint="Draft lets someone check it in the CMS first">
                    <Select value={remoteStatus} onChange={(e) => setRemoteStatus(e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="publish">Live</option>
                    </Select>
                  </Field>
                )}
                {needsUrl && (
                  <Field label="Where it went" hint="The URL of the page or comment you posted" className="sm:col-span-2">
                    <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
                  </Field>
                )}
              </div>
              {targets.some((t) => t.disabled) && (
                <p className="text-xs text-muted">Connect the client's CMS (WordPress, Webflow, Ghost or Shopify), Medium or Reddit on the client profile to publish without leaving Meridian.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" onClick={() => setPublishing(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" icon={Send} onClick={() => publish.mutate()} loading={publish.isPending} disabled={!target}>
                  {target === 'reddit' ? 'Post reply' : remoteChoice && remoteStatus === 'publish' ? 'Publish live' : remoteChoice ? 'Send as draft' : 'Record'}
                </Button>
              </div>
            </div>
          )}

          {piece.published_url && (
            <a href={piece.published_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="w-4 h-4" /> {piece.published_url}
              {src.remote_status && <Badge tone={src.remote_status === 'draft' ? 'warning' : 'success'}>{src.remote_status} on {piece.publish_target}</Badge>}
            </a>
          )}
          {piece.status === 'unpublished' && (
            <p className="text-xs text-muted">
              Taken down{src.unpublish_note ? ` - ${src.unpublish_note}` : ' - set to draft on the site'}. Rewrite it and publish again, or leave it as the record.
            </p>
          )}

          <Tabs
            value={view}
            onChange={setView}
            tabs={[
              { value: 'preview', label: 'Preview' },
              { value: 'edit', label: 'Edit' },
              { value: 'details', label: 'Details' },
            ]}
          />

          {view === 'preview' &&
            (form.body_markdown ? (
              <div>
                <div className="flex justify-end gap-2 mb-2">
                  <CopyButton text={form.body_markdown} label="Copy markdown" />
                  <CopyButton text={html} label="Copy HTML" />
                </div>
                <h1 className="text-lg font-semibold text-ink mb-3">{form.title}</h1>
                <div className="prose-report max-h-[55vh] overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted mb-3">Not written yet.</p>
                <Button variant="primary" icon={Sparkles} onClick={() => draft.mutate()} loading={draft.isPending || piece.status === 'drafting'}>
                  Write it now
                </Button>
              </div>
            ))}

          {view === 'edit' && (
            <div className="space-y-3">
              <Field label="Title">
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </Field>
              {['blog', 'programmatic', 'medium'].includes(piece.kind) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Slug">
                    <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                  </Field>
                  <Field label="Meta title" hint={`${form.meta_title.length}/60`}>
                    <Input value={form.meta_title} onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))} />
                  </Field>
                  <Field label="Meta description" hint={`${form.meta_description.length}/158`}>
                    <Input value={form.meta_description} onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))} />
                  </Field>
                </div>
              )}
              <Field label="Body (markdown)" hint={`${fmtNumber(wordCount(form.body_markdown))} words`}>
                <Textarea
                  rows={22}
                  className="font-mono text-xs"
                  value={form.body_markdown}
                  onChange={(e) => setForm((f) => ({ ...f, body_markdown: e.target.value }))}
                />
              </Field>
            </div>
          )}

          {view === 'details' && (
            <div className="space-y-4 text-sm">
              {piece.brief && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Brief</div>
                  <p className="text-muted-strong">{piece.brief}</p>
                </div>
              )}
              {piece.outline?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Outline</div>
                  <ol className="list-decimal pl-5 space-y-0.5 text-muted-strong">
                    {piece.outline.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ol>
                </div>
              )}
              {(piece.kind === 'reddit' || piece.kind === 'quora') && src.url && (
                <div className="rounded-lg border border-border p-3 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={src.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      {piece.kind === 'reddit' ? `r/${src.subreddit ?? '?'}` : 'Quora'} thread <ExternalLink className="w-3 h-3" />
                    </a>
                    {src.score != null && <Badge tone="neutral">{src.score} points</Badge>}
                    {src.num_comments != null && <Badge tone="neutral">{src.num_comments} comments</Badge>}
                    {src.created_at && <span className="text-xs text-muted">{fmtRelative(src.created_at)}</span>}
                    {src.source === 'simulated' && <Badge tone="warning">simulated</Badge>}
                  </div>
                  {src.selftext && <p className="text-xs text-muted-strong whitespace-pre-line line-clamp-6">{src.selftext}</p>}
                  {src.snippet && <p className="text-xs text-muted-strong">{src.snippet}</p>}
                  {src.disclosure && <p className="text-xs text-muted">Disclosure: {src.disclosure}</p>}
                  {src.why_this_works && <p className="text-xs text-muted">Why it works: {src.why_this_works}</p>}
                  <Button size="sm" icon={ArrowRight} onClick={() => toBlog.mutate()} loading={toBlog.isPending}>
                    Turn into a blog post
                  </Button>
                </div>
              )}
              {piece.kind === 'programmatic' && Object.keys(piece.variables ?? {}).length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Variables</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(piece.variables).map(([k, v]) => (
                      <span key={k} className="kbd">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {piece.kind === 'blog' && piece.body_markdown && (
                <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-strong">
                    Syndicate to Medium with a canonical link back to the site, so it builds the brand without competing with the original.
                  </p>
                  <Button size="sm" onClick={() => syndicate.mutate()} loading={syndicate.isPending}>
                    Create Medium version
                  </Button>
                </div>
              )}
              {src.faq?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mb-1">FAQ schema ready</div>
                  <p className="text-xs text-muted">{src.faq.length} question(s) returned with the article for FAQPage markup.</p>
                </div>
              )}
              {src.image_prompts?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Suggested images</div>
                  <ul className="list-disc pl-5 text-xs text-muted-strong">
                    {src.image_prompts.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {piece.error && <p className="text-xs text-danger">Last error: {piece.error}</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
