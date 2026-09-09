import { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, Eye, Lightbulb, Newspaper } from 'lucide-react';
import { content as contentApi } from '../../api/endpoints.js';
import { ErrorState, Loading, StatTile, Tabs } from '../../components/ui/index.jsx';
import BlogTab from './BlogTab.jsx';
import ProgrammaticTab from './ProgrammaticTab.jsx';
import RedditTab from './RedditTab.jsx';
import CommunityTab from './CommunityTab.jsx';
import WikipediaTab from './WikipediaTab.jsx';
import AutopilotTab from './AutopilotTab.jsx';
import PieceEditor from './PieceEditor.jsx';

/**
 * The content workspace: blogs at scale, programmatic pages, Reddit and
 * Quora conversations, Medium syndication, Wikipedia mentions - and the
 * autopilot that keeps them moving. One review queue underneath all of it.
 */
export default function Content() {
  const { campaign } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'blog';
  const [openId, setOpenId] = useState(null);

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['content-summary', campaign.id],
    queryFn: () => contentApi.summary(campaign.id),
  });

  if (isLoading) return <Loading label="Loading content" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const setTab = (v) => {
    params.set('tab', v);
    setParams(params, { replace: true });
  };
  const onOpen = (piece) => setOpenId(piece.id);
  const pending = (kind) => summary.counts?.[kind]?.drafted ?? 0;
  const countOf = (kind) => Object.values(summary.counts?.[kind] ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="content-stats">
        <StatTile label="Published, last 30 days" value={summary.published_30d} hint={`${(summary.words_published ?? 0).toLocaleString('en-IN')} words live in total`} icon={Newspaper} tone={summary.published_30d ? 'success' : 'neutral'} />
        <StatTile label="Waiting for review" value={summary.awaiting_review} hint={summary.awaiting_review ? 'Open each one, approve or reject' : 'Queue clear'} icon={Eye} tone={summary.awaiting_review ? 'warning' : 'neutral'} />
        <StatTile label="Ideas queued" value={summary.ideas} hint={summary.ideas_due ? `${summary.ideas_due} due today` : 'Planned, not yet written'} icon={Lightbulb} />
        <StatTile
          label="Autopilot"
          value={summary.settings.enabled ? `${summary.settings.posts_per_day}/day` : 'off'}
          hint={summary.settings.enabled ? `about ${summary.projected_per_month} a month${summary.settings.auto_publish ? ', publishing' : ', drafts only'}` : 'Switch on to write daily without clicking'}
          icon={Bot}
          tone={summary.settings.enabled ? 'primary' : 'neutral'}
          onClick={() => setTab('autopilot')}
        />
      </div>

      <div data-tour="content-tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'blog', label: 'Blog', count: pending('blog') || undefined },
            { value: 'programmatic', label: 'Programmatic', count: countOf('programmatic') || undefined },
            { value: 'reddit', label: 'Reddit', count: countOf('reddit') || undefined },
            { value: 'community', label: 'Quora & Medium', count: countOf('quora') + countOf('medium') || undefined },
            { value: 'wikipedia', label: 'Wikipedia', count: (summary.wiki?.citations ?? 0) + (summary.wiki?.mentions ?? 0) + (summary.wiki?.opportunities ?? 0) || undefined },
            { value: 'autopilot', label: 'Autopilot' },
          ]}
        />
      </div>

      {tab === 'blog' && <BlogTab campaign={campaign} summary={summary} onOpen={onOpen} />}
      {tab === 'programmatic' && <ProgrammaticTab campaign={campaign} summary={summary} onOpen={onOpen} />}
      {tab === 'reddit' && <RedditTab campaign={campaign} summary={summary} onOpen={onOpen} />}
      {tab === 'community' && <CommunityTab campaign={campaign} summary={summary} onOpen={onOpen} />}
      {tab === 'wikipedia' && <WikipediaTab campaign={campaign} summary={summary} />}
      {tab === 'autopilot' && <AutopilotTab campaign={campaign} summary={summary} />}

      {openId && <PieceEditor campaign={campaign} pieceId={openId} connections={summary.connections} onClose={() => setOpenId(null)} />}
    </div>
  );
}
