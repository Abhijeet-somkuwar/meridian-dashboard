import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '../../components/ui/index.jsx';

/** Everything the content screens share: status colours, kind labels, cache invalidation. */

export const STATUS_TONE = {
  idea: 'neutral',
  drafting: 'warning',
  drafted: 'primary',
  approved: 'success',
  published: 'success',
  unpublished: 'neutral',
  rejected: 'danger',
  failed: 'danger',
};

export const STATUS_LABEL = {
  idea: 'idea',
  drafting: 'writing…',
  drafted: 'ready to review',
  approved: 'approved',
  published: 'published',
  unpublished: 'taken down',
  rejected: 'rejected',
  failed: 'failed',
};

export const KIND_LABEL = {
  blog: 'Blog post',
  programmatic: 'Programmatic page',
  reddit: 'Reddit reply',
  quora: 'Quora answer',
  medium: 'Medium article',
  wikipedia: 'Wikipedia',
};

/** The client's own sites that articles can be pushed to. */
export const CMS = [
  ['wordpress', 'WordPress'],
  ['webflow', 'Webflow'],
  ['ghost', 'Ghost'],
  ['shopify', 'Shopify'],
];

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Badge>;

export const useInvalidateContent = (campaignId) => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['content-pieces', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['content-summary', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['content-templates', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['content-wikipedia', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['content-prune', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['content-opportunities', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['keywords', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
};

/**
 * Which publishing targets make sense for a piece, given what is connected.
 * Connected CMSs come first; the rest stay visible but disabled so it is
 * obvious what connecting would unlock.
 */
export const targetsFor = (piece, connections = {}) => {
  const list = [];
  if (['blog', 'programmatic'].includes(piece.kind)) {
    const cms = CMS.map(([value, name]) => ({ value, label: connections[value] ? `${name} (connected)` : `${name} (not connected)`, disabled: !connections[value] }));
    list.push(...cms.filter((c) => !c.disabled), ...cms.filter((c) => c.disabled));
    list.push({ value: 'manual', label: 'Somewhere else - I will paste it and record the URL' });
  } else if (piece.kind === 'medium') {
    list.push({ value: 'medium', label: connections.medium ? 'Medium (connected)' : 'Medium (no token - paste by hand)', disabled: !connections.medium });
    list.push({ value: 'manual', label: 'Pasted into Medium by hand - record the URL' });
  } else if (piece.kind === 'reddit') {
    list.push({ value: 'reddit', label: connections.reddit ? 'Post on the thread (Reddit connected)' : 'Post on the thread (Reddit not connected)', disabled: !connections.reddit });
    list.push({ value: 'manual', label: 'Posted by hand - record the comment URL' });
  } else if (piece.kind === 'quora') {
    list.push({ value: 'quora', label: 'Posted on Quora by hand - record the answer URL' });
  } else {
    list.push({ value: 'manual', label: 'Record where it went' });
  }
  return list;
};
