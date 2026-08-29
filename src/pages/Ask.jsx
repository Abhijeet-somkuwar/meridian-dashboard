import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { MessageCircleQuestion, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { campaigns } from '../api/endpoints.js';
import { markdownToHtml } from '../lib/format.js';
import { Button, Card, CardHeader, EngineBadge, Textarea } from '../components/ui/index.jsx';

const SUGGESTED = [
  'Why is our main keyword not ranking in the top 3 yet?',
  'What exactly have we done for this client in the last 15 days?',
  'Which pages still have no content written for them?',
  'What should we do next to move the rankings?',
  'Which off-page platforms have we not used yet?',
];

export default function Ask() {
  const { campaign } = useOutletContext();
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState([]);

  const ask = useMutation({
    mutationFn: (q) => campaigns.ask(campaign.id, q),
    onSuccess: (res, q) => {
      setThread((t) => [...t, { question: q, answer: res.answer, engine: res.engine }]);
      setQuestion('');
    },
    onError: (err) => toast.error(err.message),
  });

  const submit = (q) => {
    const text = (q ?? question).trim();
    if (text.length < 4) return;
    ask.mutate(text);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader
          title="Ask the campaign"
          subtitle="Answered from this client's own record - every check, phrase, change, listing and position we have logged"
          icon={MessageCircleQuestion}
        />
        <div className="card-pad" data-tour="ask-box">
          <Textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="The client asked why they dropped last week…"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <span className="text-xs text-muted">
              <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> to send
            </span>
            <Button
              variant="primary"
              icon={Send}
              onClick={() => submit()}
              loading={ask.isPending}
              disabled={question.trim().length < 4}
            >
              Ask
            </Button>
          </div>

          {thread.length === 0 && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs text-muted mb-2">Common client questions</p>
              <div className="flex flex-wrap gap-2" data-tour="ask-suggestions">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="text-xs text-muted-strong border border-border rounded-full px-3 py-1.5 hover:border-border-strong hover:text-ink transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {[...thread].reverse().map((item, i) => (
        <Card key={thread.length - i}>
          <CardHeader title={item.question} action={<EngineBadge engine={item.engine} />} />
          <div
            className="card-pad prose-report max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(item.answer) }}
          />
        </Card>
      ))}
    </div>
  );
}
