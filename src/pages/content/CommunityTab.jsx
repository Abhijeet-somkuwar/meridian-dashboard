import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BookOpen, ExternalLink, HelpCircle, Search, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { content as contentApi } from '../../api/endpoints.js';
import { Badge, Button, Card, CardHeader, Input, Select } from '../../components/ui/index.jsx';
import { Term } from '../../components/ui/Term.jsx';
import PieceList from './PieceList.jsx';
import { useInvalidateContent } from './shared.jsx';

export default function CommunityTab({ campaign, summary, onOpen }) {
  const invalidate = useInvalidateContent(campaign.id);
  const [keywords, setKeywords] = useState('');
  const [count, setCount] = useState(5);

  const discover = useMutation({
    mutationFn: () =>
      contentApi.discoverQuora(campaign.id, { keywords: keywords.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6), limit: 10 }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.pieces.length} new question(s) found`);
      if (res.source === 'simulated') toast('No search provider is configured - these questions are simulated.', { icon: '⚠️', duration: 7000 });
    },
    onError: (err) => toast.error(err.message),
  });

  const plan = useMutation({
    mutationFn: () => contentApi.plan(campaign.id, { kind: 'medium', count }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.pieces.length} Medium ideas planned`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Quora answers"
            subtitle="The Quora questions Google itself ranks for the campaign's keywords - so an answer there is seen by the client's own customers."
            icon={HelpCircle}
            action={
              <div className="flex items-center gap-2">
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Optional search words, comma separated" className="w-64 h-8 text-xs py-0" />
                <Button size="sm" variant="primary" icon={Search} onClick={() => discover.mutate()} loading={discover.isPending} data-tour="content-quora">
                  Find questions
                </Button>
              </div>
            }
          />
          <div className="px-6 py-3 text-xs text-muted">
            Quora has no posting API. Answers are written here, pasted by hand, and the answer URL is recorded so it counts in the report.
          </div>
        </Card>
        <PieceList
          campaign={campaign}
          kind="quora"
          onOpen={onOpen}
          emptyTitle="No Quora questions yet"
          emptyDescription="Search for the questions people ask about this trade. Each one becomes a comparison-style answer to write."
          extra={{
            header: <th>Question</th>,
            cell: (p) => (
              <td className="whitespace-nowrap">
                {p.source?.rank && <Badge tone="neutral">Google #{p.source.rank}</Badge>}{' '}
                {p.source?.source === 'simulated' && <Badge tone="warning">simulated</Badge>}{' '}
                {p.source?.url && (
                  <a href={p.source.url} target="_blank" rel="noreferrer" className="text-muted hover:text-ink inline-flex" title="Open on Quora">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </td>
            ),
          }}
        />
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Medium articles"
            subtitle="Experience-led pieces that build the brand, plus published blog posts syndicated with a canonical link home."
            icon={BookOpen}
            action={
              <div className="flex items-center gap-2">
                <Select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24 h-8 text-xs py-0">
                  {[3, 5, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} ideas
                    </option>
                  ))}
                </Select>
                <Button size="sm" variant="primary" icon={Sparkles} onClick={() => plan.mutate()} loading={plan.isPending}>
                  Plan Medium ideas
                </Button>
              </div>
            }
          />
          <div className="px-6 py-3 text-xs text-muted">
            {summary?.connections?.medium
              ? 'Medium is connected - articles publish straight to the client account, as a draft or live.'
              : 'Medium is not connected. Connect an integration token on the client profile, or copy the markdown into Medium by hand.'}{' '}
            To <Term k="syndication">syndicate</Term> a blog post, open it and choose “Create Medium version”.
          </div>
        </Card>
        <PieceList
          campaign={campaign}
          kind="medium"
          onOpen={onOpen}
          emptyTitle="No Medium articles yet"
          emptyDescription="Plan a few first-person pieces, or syndicate a published blog post from the Blog tab."
          extra={{
            header: <th>Origin</th>,
            cell: (p) => (
              <td className="text-xs text-muted whitespace-nowrap">{p.source?.syndicated_from ? 'syndicated from blog' : 'original'}</td>
            ),
          }}
        />
      </div>
    </div>
  );
}
