import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ExternalLink, MessageSquare, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { fmtRelative } from '../../lib/format.js';
import { Badge, Button, Card, CardHeader, Input } from '../../components/ui/index.jsx';
import PieceList from './PieceList.jsx';
import { useInvalidateContent } from './shared.jsx';

export default function RedditTab({ campaign, summary, onOpen }) {
  const invalidate = useInvalidateContent(campaign.id);
  const [keywords, setKeywords] = useState('');

  const discover = useMutation({
    mutationFn: () =>
      contentApi.discoverReddit(campaign.id, {
        keywords: keywords.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6),
        limit: 12,
      }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.pieces.length} new thread(s) found (searched: ${res.searched.join(', ')})`);
      if (res.source === 'simulated') toast('Reddit was unreachable and no search provider is set - these threads are simulated.', { icon: '⚠️', duration: 7000 });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Converting Reddit threads"
          subtitle="Find the threads where people are asking about the client's trade, answer them properly, and turn the best questions into blog posts that rank for the same search."
          icon={MessageSquare}
          action={
            <div className="flex items-center gap-2">
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Optional: your own search words, comma separated"
                className="w-72 h-8 text-xs py-0"
              />
              <Button size="sm" variant="primary" icon={Search} onClick={() => discover.mutate()} loading={discover.isPending} data-tour="content-discover">
                Find threads
              </Button>
            </div>
          }
        />
        <div className="px-6 py-3 text-xs text-muted space-y-1">
          <p>
            How a reply converts: it answers the question first, gives checks that help whoever the reader picks, and discloses the affiliation
            in one line. That is what stays up - and what gets read for years, because Google ranks the thread.
          </p>
          <p>
            {summary?.connections?.reddit
              ? 'Reddit is connected for this client - approved replies can be posted from here.'
              : 'Reddit is not connected - replies are copied and posted by hand, then the comment URL is recorded. Connect it on the client profile to post directly.'}
          </p>
        </div>
      </Card>

      <PieceList
        campaign={campaign}
        kind="reddit"
        onOpen={onOpen}
        emptyTitle="No threads yet"
        emptyDescription="Search for the conversations already happening about this trade. Each thread becomes a reply to write, and can become a blog post."
        emptyAction={
          <Button variant="primary" icon={Search} onClick={() => discover.mutate()} loading={discover.isPending}>
            Find threads
          </Button>
        }
        extra={{
          header: <th>Thread</th>,
          cell: (p) => (
            <td className="whitespace-nowrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {p.source?.subreddit && <Badge tone="neutral">r/{p.source.subreddit}</Badge>}
                {p.source?.score != null && <span className="text-xs text-muted">{p.source.score} pts</span>}
                {p.source?.num_comments != null && <span className="text-xs text-muted">{p.source.num_comments} comments</span>}
                {p.source?.created_at && <span className="text-xs text-muted">{fmtRelative(p.source.created_at)}</span>}
                {p.source?.source === 'simulated' && <Badge tone="warning">simulated</Badge>}
                {p.source?.url && (
                  <a href={p.source.url} target="_blank" rel="noreferrer" className="text-muted hover:text-ink" title="Open the thread">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </td>
          ),
        }}
      />
    </div>
  );
}
