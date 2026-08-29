import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Download, RefreshCw, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ranks as ranksApi } from '../api/endpoints.js';
import { fmtDate, fmtNumber, fmtPercent, rankDelta } from '../lib/format.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Loading,
  RankArrow,
  Select,
  Tabs,
} from '../components/ui/index.jsx';
import { Term } from '../components/ui/Term.jsx';

// Validated categorical palette (dark surface). Assigned in fixed order per
// keyword, never cycled - a filter change must not repaint the survivors.
const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];
const MAX_SERIES = SERIES_COLORS.length;

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].filter((p) => p.value != null).sort((a, b) => a.value - b.value);
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lift">
      <div className="text-[11px] text-muted mb-1.5">{fmtDate(label)}</div>
      {sorted.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.stroke }} />
          <span className="text-muted-strong flex-1 truncate max-w-[180px]">{p.dataKey}</span>
          <span className="text-ink tabular-nums font-medium">#{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function RankTracker() {
  const { campaign } = useOutletContext();
  const queryClient = useQueryClient();
  const [device, setDevice] = useState('desktop');
  const [days, setDays] = useState(30);
  const [view, setView] = useState('chart');
  const [hidden, setHidden] = useState(new Set());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ranks', campaign.id, device, days],
    queryFn: () => ranksApi.get(campaign.id, { device, days }),
  });

  const check = useMutation({
    mutationFn: () => ranksApi.check(campaign.id, device),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ranks', campaign.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      toast.success(
        `Checked ${res.checked} keywords · ${res.improvements.length} up, ${res.drops.length} down`,
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const syncGsc = useMutation({
    mutationFn: () => ranksApi.syncGsc(campaign.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ranks', campaign.id] });
      toast.success(`Search Console data merged into ${res.updated} rows`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Top keywords by current position get the fixed colour slots; the rest stay
  // in the table so the chart never grows past what is readable.
  const { chartData, series } = useMemo(() => {
    if (!data) return { chartData: [], series: [] };
    const tracked = data.table.filter((r) => r.today != null).slice(0, MAX_SERIES);
    const names = tracked.map((r) => r.keyword);
    const byDate = new Map();
    data.series
      .filter((p) => names.includes(p.keyword))
      .forEach((p) => {
        const row = byDate.get(p.snapped_at) ?? { date: p.snapped_at };
        row[p.keyword] = p.rank_position;
        byDate.set(p.snapped_at, row);
      });
    return {
      chartData: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      series: names.map((keyword, i) => ({ keyword, color: SERIES_COLORS[i] })),
    };
  }, [data]);

  if (isLoading) return <Loading label="Loading rank history" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const table = data.table;
  const visibleSeries = series.filter((s) => !hidden.has(s.keyword));
  const maxRank = Math.max(10, ...chartData.flatMap((row) => series.map((s) => row[s.keyword] ?? 0)));

  const exportCsv = () => {
    const header = ['keyword', 'type', 'target_page', 'today', 'd7', 'd15', 'd30', 'volume', 'difficulty', 'clicks', 'impressions'];
    const body = table.map((r) =>
      [r.keyword, r.keyword_type, r.target_page, r.today, r.d7, r.d15, r.d30, r.search_volume, r.difficulty, r.clicks, r.impressions]
        .map((v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`))
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...body].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.domain}-ranks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSeries = (keyword) => {
    const next = new Set(hidden);
    next.has(keyword) ? next.delete(keyword) : next.add(keyword);
    setHidden(next);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Google positions"
          subtitle={
            data.lastChecked
              ? `Last checked ${fmtDate(data.lastChecked)} · position 1 is the top of Google`
              : 'Not tracked yet'
          }
          icon={BarChart3}
          action={
            <div className="flex flex-wrap gap-2" data-tour="rank-controls">
              <Select value={device} onChange={(e) => setDevice(e.target.value)} className="w-32 h-8 text-xs py-0">
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </Select>
              <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-28 h-8 text-xs py-0">
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </Select>
              <Button size="sm" icon={Download} onClick={exportCsv} disabled={!table.length}>
                CSV
              </Button>
              <Button size="sm" onClick={() => syncGsc.mutate()} loading={syncGsc.isPending}>
                Sync GSC
              </Button>
              <Button size="sm" variant="primary" icon={RefreshCw} data-tour="rank-check" onClick={() => check.mutate()} loading={check.isPending}>
                Check now
              </Button>
            </div>
          }
        />

        {table.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Nothing being tracked yet"
            description="Agree the list of search phrases first. After that we check Google every night at midnight."
          />
        ) : (
          <>
            <div className="px-6 pt-3">
              <Tabs
                value={view}
                onChange={setView}
                tabs={[
                  { value: 'chart', label: 'Chart' },
                  { value: 'table', label: 'Table', count: table.length },
                ]}
              />
            </div>

            {view === 'chart' ? (
              <div className="card-pad">
                {chartData.length < 2 ? (
                  <p className="text-sm text-muted text-center py-12">
                    Not enough history to draw a line yet - check positions on a couple of days first.
                  </p>
                ) : (
                  <>
                    <div className="h-80 -ml-2" data-tour="rank-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                          <CartesianGrid stroke="#2A2D3A" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d) => fmtDate(d, 'd MMM')}
                            stroke="#2A2D3A"
                            tick={{ fill: '#64748B', fontSize: 11 }}
                            tickLine={false}
                            minTickGap={28}
                          />
                          <YAxis
                            reversed
                            domain={[1, Math.min(100, maxRank + 4)]}
                            tickCount={6}
                            allowDecimals={false}
                            stroke="#2A2D3A"
                            tick={{ fill: '#64748B', fontSize: 11 }}
                            tickLine={false}
                            width={40}
                            label={{
                              value: 'Position',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#64748B',
                              fontSize: 11,
                              dy: 30,
                            }}
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3A3F52', strokeWidth: 1 }} />
                          {visibleSeries.map((s) => (
                            <Line
                              key={s.keyword}
                              type="monotone"
                              dataKey={s.keyword}
                              stroke={s.color}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4, strokeWidth: 2, stroke: '#0F1117' }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-border">
                      {series.map((s) => {
                        const row = table.find((r) => r.keyword === s.keyword);
                        const off = hidden.has(s.keyword);
                        return (
                          <button
                            key={s.keyword}
                            onClick={() => toggleSeries(s.keyword)}
                            className={`flex items-center gap-2 text-xs transition-opacity ${off ? 'opacity-35' : ''}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="text-muted-strong">{s.keyword}</span>
                            <span className="text-ink tabular-nums font-medium">#{row?.today ?? '—'}</span>
                          </button>
                        );
                      })}
                      {table.length > MAX_SERIES && (
                        <span className="text-xs text-muted">
                          +{table.length - MAX_SERIES} more in the table view
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <Term k="keyword">Search phrase</Term>
                      </th>
                      <th>Page</th>
                      <th className="text-right">Today</th>
                      <th className="text-right">7d</th>
                      <th className="text-right">15d</th>
                      <th className="text-right">30d</th>
                      <th className="text-right">Trend</th>
                      <th className="text-right">
                        <Term k="gsc">Clicks</Term>
                      </th>
                      <th className="text-right">
                        <Term k="ctr">Click rate</Term>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((r) => {
                      const delta = rankDelta(r.today, r.d30);
                      const ctr = r.impressions ? r.clicks / r.impressions : null;
                      return (
                        <tr key={r.id} className="hover:bg-surface-2/40">
                          <td>
                            <div className="text-ink">{r.keyword}</div>
                            <Badge tone="neutral" className="mt-1">
                              {r.keyword_type}
                            </Badge>
                          </td>
                          <td className="font-mono text-xs text-muted">{r.target_page}</td>
                          <td className="text-right tabular-nums text-ink font-medium">{r.today ?? '—'}</td>
                          <td className="text-right tabular-nums text-muted-strong">{r.d7 ?? '—'}</td>
                          <td className="text-right tabular-nums text-muted-strong">{r.d15 ?? '—'}</td>
                          <td className="text-right tabular-nums text-muted-strong">{r.d30 ?? '—'}</td>
                          <td className="text-right">
                            <RankArrow value={delta.value} direction={delta.direction} />
                          </td>
                          <td className="text-right tabular-nums text-muted-strong">{fmtNumber(r.clicks)}</td>
                          <td className="text-right tabular-nums text-muted-strong">{fmtPercent(ctr)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="px-6 py-3 text-xs text-muted flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5" />
                  Position 1 is the top of Google, so smaller numbers are better. Clicks come from Google Search Console when it is connected; otherwise they are estimated from the position.
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
