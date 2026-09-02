import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  FileText,
  Gauge,
  Link2,
  MessageCircleQuestion,
  PenLine,
  Search,
} from 'lucide-react';
import { campaigns } from '../../api/endpoints.js';
import { Badge, ClientLogo, ErrorState, Loading, PlatformBadge } from '../ui/index.jsx';

const TABS = [
  { to: '.', label: 'Overview', icon: Gauge, end: true },
  { to: 'audit', label: 'Audit', icon: Search },
  { to: 'keywords', label: 'Keywords', icon: BarChart3, badge: (d) => d?.keywords?.suggested },
  { to: 'onpage', label: 'On-page', icon: PenLine, badge: (d) => d?.suggestions?.pending },
  { to: 'offpage', label: 'Off-page', icon: Link2, badge: (d) => d?.offpage?.pending },
  { to: 'ranks', label: 'Ranks', icon: BarChart3 },
  { to: 'reports', label: 'Reports', icon: FileText },
  { to: 'ask', label: 'Ask', icon: MessageCircleQuestion },
];

export const useCampaignOverview = (campaignId) =>
  useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => campaigns.overview(campaignId),
    enabled: Boolean(campaignId),
  });

export const CampaignShell = () => {
  const { campaignId } = useParams();
  const { data, isLoading, error, refetch } = useCampaignOverview(campaignId);

  if (isLoading) return <Loading label="Loading campaign" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { campaign, phase } = data;

  return (
    <div>
      <div className="mb-5">
        <NavLink to="/clients" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> All clients
        </NavLink>

        <div className="flex flex-wrap items-center gap-3">
          <ClientLogo client={campaign} size={32} />
          <h1 className="text-xl font-semibold">{campaign.business_name}</h1>
          <PlatformBadge type={campaign.platform_type} stack={campaign.tech_stack} />
          <Badge tone={campaign.status === 'active' ? 'success' : 'primary'}>{phase.label}</Badge>
          <a
            href={`https://${campaign.domain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
          >
            {campaign.domain}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {campaign.next_action && (
          <p className="text-sm text-muted mt-1.5">
            <span className="text-muted-strong">Next:</span> {campaign.next_action}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto" data-tour="campaign-tabs">
        {TABS.map((tab) => {
          const count = tab.badge?.(data);
          return (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  isActive ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-muted-strong',
                )
              }
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary/20 text-primary text-[10px] font-semibold grid place-items-center tabular-nums">
                  {count}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      <Outlet context={{ campaign, overview: data, refetchOverview: refetch }} />
    </div>
  );
};
