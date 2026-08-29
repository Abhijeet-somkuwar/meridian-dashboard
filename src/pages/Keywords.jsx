import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Lock, Plus, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { keywords as keywordsApi } from '../api/endpoints.js';
import { fmtNumber } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  Select,
  Tabs,
} from '../components/ui/index.jsx';
import { Term } from '../components/ui/Term.jsx';

const TYPE_TONE = { primary: 'primary', secondary: 'neutral', local: 'success', lsi: 'warning' };

const difficultyTone = (d) => (d == null ? 'neutral' : d < 25 ? 'success' : d < 50 ? 'warning' : 'danger');

export default function Keywords() {
  const { campaign, overview } = useOutletContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('suggested');
  const [selected, setSelected] = useState(new Set());
  const [seedModal, setSeedModal] = useState(false);
  const [seeds, setSeeds] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [manual, setManual] = useState({ keyword: '', keyword_type: 'secondary', target_page: '/' });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['keywords', campaign.id],
    queryFn: () => keywordsApi.list(campaign.id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['keywords', campaign.id] });
    queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
    setSelected(new Set());
  };

  const research = useMutation({
    mutationFn: () => keywordsApi.research(campaign.id, seeds.split(',').map((s) => s.trim()).filter(Boolean)),
    onSuccess: (res) => {
      setSeedModal(false);
      setSeeds('');
      invalidate();
      toast.success(`${res.keywords.length} keywords mapped across ${res.pages.length} pages`);
      if (res.warning) toast(`Model fell back to the offline planner: ${res.warning}`, { icon: '⚠️' });
    },
    onError: (err) => toast.error(err.message),
  });

  const setStatus = useMutation({
    mutationFn: ({ ids, status }) => keywordsApi.bulkStatus(campaign.id, ids, status),
    onSuccess: (res, vars) => {
      invalidate();
      toast.success(`${res.keywords.length} keywords ${vars.status}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const addManual = useMutation({
    mutationFn: () => keywordsApi.add(campaign.id, manual),
    onSuccess: () => {
      setAddModal(false);
      setManual({ keyword: '', keyword_type: 'secondary', target_page: '/' });
      invalidate();
      toast.success('Keyword added and confirmed');
    },
    onError: (err) => toast.error(err.message),
  });

  const lock = useMutation({
    mutationFn: () => keywordsApi.lock(campaign.id),
    onSuccess: (res) => {
      invalidate();
      toast.success(`List locked with ${res.confirmed} keywords - campaign is live`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <Loading label="Loading keywords" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const all = data.keywords;
  const rows = all.filter((k) => k.status === tab);
  const counts = {
    suggested: all.filter((k) => k.status === 'suggested').length,
    confirmed: all.filter((k) => k.status === 'confirmed').length,
    rejected: all.filter((k) => k.status === 'rejected').length,
  };

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () =>
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));

  const copyForClient = () => {
    const text = all
      .filter((k) => k.status === 'suggested')
      .map((k) => `${k.keyword}  —  ${k.target_page}  (vol ${k.search_volume ?? '?'}, difficulty ${k.difficulty ?? '?'})`)
      .join('\n');
    navigator.clipboard
      .writeText(`Proposed keywords for ${campaign.business_name}\n\n${text}`)
      .then(() => toast.success('Keyword list copied - paste it into WhatsApp'))
      .catch(() => toast.error('Clipboard blocked by the browser'));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Search phrases"
          subtitle="Each phrase is tied to the one page that should show up for it"
          icon={Sparkles}
          action={
            <div className="flex flex-wrap gap-2">
              {counts.suggested > 0 && (
                <Button size="sm" icon={Copy} data-tour="kw-copy" onClick={copyForClient}>
                  Copy for client
                </Button>
              )}
              <Button size="sm" icon={Plus} onClick={() => setAddModal(true)}>
                Add
              </Button>
              <Button size="sm" variant="primary" icon={Sparkles} data-tour="kw-research" onClick={() => setSeedModal(true)}>
                Research
              </Button>
            </div>
          }
        />

        <div className="px-6 pt-3" data-tour="kw-tabs">
          <Tabs
            value={tab}
            onChange={(v) => {
              setTab(v);
              setSelected(new Set());
            }}
            tabs={[
              { value: 'suggested', label: 'Waiting for the client', count: counts.suggested },
              { value: 'confirmed', label: 'Confirmed', count: counts.confirmed },
              { value: 'rejected', label: 'Rejected', count: counts.rejected },
            ]}
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-6 py-3 bg-primary-soft border-b border-border">
            <span className="text-sm text-primary font-medium">{selected.size} selected</span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="success"
              icon={Check}
              onClick={() => setStatus.mutate({ ids: [...selected], status: 'confirmed' })}
              loading={setStatus.isPending}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={X}
              onClick={() => setStatus.mutate({ ids: [...selected], status: 'rejected' })}
            >
              Reject
            </Button>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={tab === 'suggested' ? 'Nothing waiting' : `No ${tab} keywords`}
            description={
              tab === 'suggested'
                ? 'Find the phrases people actually search for, how competitive each one is, and which page should target it.'
                : undefined
            }
            action={
              tab === 'suggested' && (
                <Button variant="primary" icon={Sparkles} onClick={() => setSeedModal(true)}>
                  Find search phrases
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto" data-tour="kw-table">
            <table>
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === rows.length && rows.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Search phrase</th>
                  <th>Type</th>
                  <th>Target page</th>
                  <th className="text-right">
                    <Term k="search-volume">Searches / month</Term>
                  </th>
                  <th className="text-right">
                    <Term k="difficulty">How hard</Term>
                  </th>
                  <th className="text-right">
                    <Term k="rank">Position</Term>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-2/40">
                    <td>
                      <input type="checkbox" checked={selected.has(k.id)} onChange={() => toggle(k.id)} />
                    </td>
                    <td>
                      <div className="text-ink">{k.keyword}</div>
                      {k.rationale && <div className="text-xs text-muted mt-0.5 max-w-md">{k.rationale}</div>}
                    </td>
                    <td>
                      <Badge tone={TYPE_TONE[k.keyword_type]}>{k.keyword_type}</Badge>
                    </td>
                    <td className="font-mono text-xs text-muted-strong">{k.target_page}</td>
                    <td className="text-right tabular-nums">{fmtNumber(k.search_volume)}</td>
                    <td className="text-right">
                      <Badge tone={difficultyTone(k.difficulty)}>{k.difficulty ?? '—'}</Badge>
                    </td>
                    <td className="text-right tabular-nums text-muted-strong">{k.current_rank ?? '—'}</td>
                    <td className="text-right whitespace-nowrap">
                      {k.status !== 'confirmed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Check}
                          onClick={() => setStatus.mutate({ ids: [k.id], status: 'confirmed' })}
                        />
                      )}
                      {k.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={X}
                          onClick={() => setStatus.mutate({ ids: [k.id], status: 'rejected' })}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {counts.confirmed > 0 && overview.campaign.status === 'keyword_pending' && (
        <Card className="border-primary/30" data-tour="kw-lock">
          <div className="card-pad flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Lock the confirmed list</p>
              <p className="text-sm text-muted mt-0.5">
                {counts.confirmed} keywords confirmed. Locking rejects anything still pending and starts the
                content phase.
              </p>
            </div>
            <Button variant="primary" icon={Lock} onClick={() => lock.mutate()} loading={lock.isPending}>
              Lock and start
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={seedModal}
        onClose={() => setSeedModal(false)}
        title="Run keyword research"
        subtitle="Pulls volume and difficulty, then maps each keyword to a page"
        footer={
          <>
            <Button onClick={() => setSeedModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => research.mutate()} loading={research.isPending}>
              {research.isPending ? 'Researching' : 'Run research'}
            </Button>
          </>
        }
      >
        <Field
          label="Extra seed terms"
          hint={`Optional. The niche (${campaign.niche || 'not set'}) and target cities are always used.`}
        >
          <Input
            value={seeds}
            onChange={(e) => setSeeds(e.target.value)}
            placeholder="bathroom fitting, water tank cleaning"
          />
        </Field>
        <p className="text-xs text-muted mt-4">
          Existing keywords are updated rather than duplicated, so it is safe to run this more than once.
        </p>
      </Modal>

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add a keyword manually"
        subtitle="Goes straight into the confirmed list"
        footer={
          <>
            <Button onClick={() => setAddModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => addManual.mutate()} loading={addManual.isPending}>
              Add keyword
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Keyword">
            <Input
              value={manual.keyword}
              onChange={(e) => setManual((m) => ({ ...m, keyword: e.target.value }))}
              placeholder="emergency plumber surat"
            />
          </Field>
          <Field label="Type">
            <Select
              value={manual.keyword_type}
              onChange={(e) => setManual((m) => ({ ...m, keyword_type: e.target.value }))}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="local">Local</option>
              <option value="lsi">LSI</option>
            </Select>
          </Field>
          <Field label="Target page">
            <Input
              value={manual.target_page}
              onChange={(e) => setManual((m) => ({ ...m, target_page: e.target.value }))}
              placeholder="/services"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
