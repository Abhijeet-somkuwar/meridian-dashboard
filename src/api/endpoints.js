import { api, unwrap } from './client.js';

export const auth = {
  bootstrapNeeded: () => unwrap(api.get('/auth/bootstrap')),
  signup: (body) => unwrap(api.post('/auth/signup', body)),
  login: (body) => unwrap(api.post('/auth/login', body)),
  verify: (body) => unwrap(api.post('/auth/verify', body)),
  resendCode: (challengeId) => unwrap(api.post('/auth/verify/resend', { challengeId })),
  forgetDevices: () => unwrap(api.post('/auth/forget-devices')),
  // A refresh against an instance that has gone to sleep can take most of a
  // minute; that is waited for. What is not waited for is forever.
  refresh: () => unwrap(api.post('/auth/refresh', undefined, { timeout: 75_000 })),
  ping: () => api.get('/ping', { timeout: 90_000 }).catch(() => null),
  logout: () => unwrap(api.post('/auth/logout')),
  me: () => unwrap(api.get('/auth/me')),
  token: () => unwrap(api.get('/auth/token')),
  changePassword: (body) => unwrap(api.post('/auth/change-password', body)),
  managers: () => unwrap(api.get('/auth/managers')),
  setManagerActive: (id, is_active) => unwrap(api.patch(`/auth/managers/${id}/active`, { is_active })),
  resetManagerPassword: (id, newPassword) => unwrap(api.post(`/auth/managers/${id}/reset-password`, { newPassword })),
};

export const system = {
  health: () => unwrap(api.get('/health')),
};

export const geo = {
  countries: () => unwrap(api.get('/geo/countries')),
  cities: (country, q, limit = 12) => unwrap(api.get('/geo/cities', { params: { country, q, limit } })),
  // Several searches, merged, then each site opened and scored - slow by design.
  suggestCompetitors: (body, signal) => unwrap(api.post('/geo/competitors', body, { signal, timeout: 120_000 })),
};

export const integrations = {
  list: (clientId) => unwrap(api.get(`/integrations/${clientId}`)),
  connect: (clientId, platform, body) => unwrap(api.post(`/integrations/${clientId}/${platform}`, body)),
  disconnect: (clientId, platform) => unwrap(api.delete(`/integrations/${clientId}/${platform}`)),
};

export const clients = {
  /** `signal` lets a superseded search request be cancelled mid-flight. */
  list: (params, signal) => unwrap(api.get('/clients', { params, signal })),
  get: (id) => unwrap(api.get(`/clients/${id}`)),
  create: (body) => unwrap(api.post('/clients', body)),
  // Reads the public homepage and says how the site is built. Slow sites are
  // waited for; the form is usable meanwhile.
  detect: (domain, signal) => unwrap(api.post('/clients/detect', { domain }, { signal, timeout: 45_000 })),
  update: (id, body) => unwrap(api.patch(`/clients/${id}`, body)),
  assign: (id, manager_id) => unwrap(api.patch(`/clients/${id}/assign`, { manager_id })),
  connectWp: (id, body) => unwrap(api.post(`/clients/${id}/connect-wp`, body)),
  disconnectWp: (id) => unwrap(api.delete(`/clients/${id}/connect-wp`)),
  gscUrl: (id) => unwrap(api.get(`/clients/${id}/connect-gsc`)),
  disconnectGsc: (id) => unwrap(api.delete(`/clients/${id}/connect-gsc`)),
};

export const campaigns = {
  list: () => unwrap(api.get('/campaigns')),
  byClient: (clientId) => unwrap(api.get(`/campaigns/by-client/${clientId}`)),
  overview: (id) => unwrap(api.get(`/campaigns/${id}`)),
  update: (id, body) => unwrap(api.patch(`/campaigns/${id}`, body)),
  setPhase: (id, status) => unwrap(api.patch(`/campaigns/${id}/phase`, status ? { status } : {})),
  timeline: (id) => unwrap(api.get(`/campaigns/${id}/timeline`)),
  ask: (id, question) => unwrap(api.post(`/campaigns/${id}/ask`, { question })),
};

export const audit = {
  run: (campaignId, body = {}) => unwrap(api.post(`/audit/${campaignId}/run`, body)),
  latest: (campaignId) => unwrap(api.get(`/audit/${campaignId}/latest`)),
  history: (campaignId) => unwrap(api.get(`/audit/${campaignId}/history`)),
};

export const keywords = {
  list: (campaignId, params) => unwrap(api.get(`/keywords/${campaignId}`, { params })),
  research: (campaignId, seeds) => unwrap(api.post(`/keywords/${campaignId}/research`, { seeds })),
  add: (campaignId, body) => unwrap(api.post(`/keywords/${campaignId}`, body)),
  setStatus: (campaignId, keywordId, status) =>
    unwrap(api.patch(`/keywords/${campaignId}/${keywordId}/status`, { status })),
  bulkStatus: (campaignId, ids, status) => unwrap(api.patch(`/keywords/${campaignId}/bulk-status`, { ids, status })),
  lock: (campaignId) => unwrap(api.post(`/keywords/${campaignId}/lock`)),
  watch: (campaignId, keywordId, is_watched) => unwrap(api.patch(`/keywords/${campaignId}/${keywordId}/watch`, { is_watched })),
};

export const suggestions = {
  list: (campaignId, params) => unwrap(api.get(`/suggestions/${campaignId}`, { params })),
  generate: (campaignId) => unwrap(api.post(`/suggestions/${campaignId}/generate`)),
  setStatus: (campaignId, id, body) => unwrap(api.patch(`/suggestions/${campaignId}/${id}/status`, body)),
  bulkStatus: (campaignId, ids, status) => unwrap(api.patch(`/suggestions/${campaignId}/bulk-status`, { ids, status })),
  deploy: (campaignId, id) => unwrap(api.post(`/suggestions/${campaignId}/${id}/deploy`)),
  deployments: (campaignId) => unwrap(api.get(`/suggestions/${campaignId}/deployments`)),
  // Looks at the live site to see whether the change is really there.
  verify: (campaignId, id) => unwrap(api.post(`/suggestions/${campaignId}/${id}/verify`, undefined, { timeout: 45_000 })),
  // The message the manager forwards to the client's developer.
  handoff: (campaignId, params) => unwrap(api.get(`/suggestions/${campaignId}/handoff`, { params })),
  rollback: (campaignId, deploymentId) =>
    unwrap(api.post(`/suggestions/${campaignId}/deployments/${deploymentId}/rollback`)),
};

export const offpage = {
  board: (campaignId) => unwrap(api.get(`/offpage/${campaignId}`)),
  history: (campaignId) => unwrap(api.get(`/offpage/${campaignId}/history`)),
  generate: (campaignId, body = {}) => unwrap(api.post(`/offpage/${campaignId}/generate`, body)),
  markDone: (campaignId, id, submitted_url) =>
    unwrap(api.post(`/offpage/${campaignId}/${id}/done`, { submitted_url })),
  skip: (campaignId, id, reason) => unwrap(api.post(`/offpage/${campaignId}/${id}/skip`, { reason })),
  platforms: () => unwrap(api.get('/offpage/platforms')),
  upsertPlatform: (body) => unwrap(api.post('/offpage/platforms', body)),
};

export const ranks = {
  get: (campaignId, params) => unwrap(api.get(`/ranks/${campaignId}`, { params })),
  check: (campaignId, device, watched_only = false) =>
    unwrap(api.post(`/ranks/${campaignId}/check`, { device, watched_only }, { timeout: 300_000 })),
  // One keyword, right now - a single results page, so it is quick.
  checkOne: (campaignId, keywordId, device) =>
    unwrap(api.post(`/ranks/${campaignId}/check/${keywordId}`, { device }, { timeout: 90_000 })),
  live: (campaignId, params) => unwrap(api.get(`/ranks/${campaignId}/live`, { params })),
  competitorSeries: (campaignId, keywordId, params) => unwrap(api.get(`/ranks/${campaignId}/live/${keywordId}`, { params })),
  syncGsc: (campaignId) => unwrap(api.post(`/ranks/${campaignId}/sync-gsc`)),
};

// Drafting an article is a long model call; the timeouts below are generous
// on purpose so a slow provider finishes rather than being abandoned mid-write.
const LONG = { timeout: 240_000 };
const VERY_LONG = { timeout: 600_000 };

export const content = {
  summary: (campaignId) => unwrap(api.get(`/content/${campaignId}`)),
  settings: (campaignId, body) => unwrap(api.patch(`/content/${campaignId}/settings`, body)),
  runAutopilot: (campaignId) => unwrap(api.post(`/content/${campaignId}/autopilot/run`, undefined, VERY_LONG)),
  pieces: (campaignId, params) => unwrap(api.get(`/content/${campaignId}/pieces`, { params })),
  piece: (campaignId, id) => unwrap(api.get(`/content/${campaignId}/pieces/${id}`)),
  plan: (campaignId, body) => unwrap(api.post(`/content/${campaignId}/plan`, body, LONG)),
  bulkDraft: (campaignId, body) => unwrap(api.post(`/content/${campaignId}/bulk-draft`, body, VERY_LONG)),
  bulkStatus: (campaignId, ids, status) => unwrap(api.patch(`/content/${campaignId}/bulk-status`, { ids, status })),
  update: (campaignId, id, body) => unwrap(api.patch(`/content/${campaignId}/pieces/${id}`, body)),
  remove: (campaignId, id) => unwrap(api.delete(`/content/${campaignId}/pieces/${id}`)),
  draft: (campaignId, id) => unwrap(api.post(`/content/${campaignId}/pieces/${id}/draft`, undefined, LONG)),
  setStatus: (campaignId, id, status) => unwrap(api.patch(`/content/${campaignId}/pieces/${id}/status`, { status })),
  publish: (campaignId, id, body) => unwrap(api.post(`/content/${campaignId}/pieces/${id}/publish`, body, LONG)),
  syndicate: (campaignId, id) => unwrap(api.post(`/content/${campaignId}/pieces/${id}/syndicate`)),
  toBlog: (campaignId, id) => unwrap(api.post(`/content/${campaignId}/pieces/${id}/to-blog`)),
  templates: (campaignId) => unwrap(api.get(`/content/${campaignId}/templates`)),
  saveTemplate: (campaignId, body) => unwrap(api.post(`/content/${campaignId}/templates`, body)),
  previewTemplate: (campaignId, body) => unwrap(api.post(`/content/${campaignId}/templates/preview`, body)),
  deleteTemplate: (campaignId, id) => unwrap(api.delete(`/content/${campaignId}/templates/${id}`)),
  generateTemplate: (campaignId, id, body) => unwrap(api.post(`/content/${campaignId}/templates/${id}/generate`, body, VERY_LONG)),
  discoverReddit: (campaignId, body) => unwrap(api.post(`/content/${campaignId}/reddit/discover`, body, LONG)),
  discoverQuora: (campaignId, body) => unwrap(api.post(`/content/${campaignId}/quora/discover`, body, LONG)),
  wikipedia: (campaignId) => unwrap(api.get(`/content/${campaignId}/wikipedia`)),
  wikiScan: (campaignId) => unwrap(api.post(`/content/${campaignId}/wikipedia/scan`, undefined, LONG)),
  wikiDraft: (campaignId, id) => unwrap(api.post(`/content/${campaignId}/wikipedia/${id}/draft`, undefined, LONG)),
  wikiStatus: (campaignId, id, status) => unwrap(api.patch(`/content/${campaignId}/wikipedia/${id}/status`, { status })),
  wikiRemove: (campaignId, id) => unwrap(api.delete(`/content/${campaignId}/wikipedia/${id}`)),
  // Search Console as a topic pool, and the pages it says nobody sees.
  opportunities: (campaignId) => unwrap(api.get(`/content/${campaignId}/opportunities`, { timeout: 60_000 })),
  adoptQueries: (campaignId, queries) => unwrap(api.post(`/content/${campaignId}/opportunities/adopt`, { queries })),
  pruneList: (campaignId) => unwrap(api.get(`/content/${campaignId}/prune`)),
  pruneScan: (campaignId) => unwrap(api.post(`/content/${campaignId}/prune/scan`, undefined, LONG)),
  unpublish: (campaignId, id) => unwrap(api.post(`/content/${campaignId}/pieces/${id}/unpublish`, undefined, LONG)),
  keep: (campaignId, id) => unwrap(api.post(`/content/${campaignId}/pieces/${id}/keep`)),
};

export const reports = {
  list: (campaignId) => unwrap(api.get(`/reports/${campaignId}`)),
  get: (campaignId, id) => unwrap(api.get(`/reports/${campaignId}/${id}`)),
  generate: (campaignId, body = {}) => unwrap(api.post(`/reports/${campaignId}/generate`, body)),
  save: (campaignId, id, final_content) => unwrap(api.patch(`/reports/${campaignId}/${id}`, { final_content })),
  send: (campaignId, id, to) => unwrap(api.post(`/reports/${campaignId}/${id}/send`, to ? { to } : {})),
  pdfUrl: (campaignId, id) => `/api/reports/${campaignId}/${id}/pdf`,
  downloadPdf: (campaignId, id) =>
    api.get(`/reports/${campaignId}/${id}/pdf`, { responseType: 'blob' }).then((r) => r.data),
};

export const dashboard = {
  get: () => unwrap(api.get('/dashboard')),
  notifications: (unread) => unwrap(api.get('/dashboard/notifications', { params: { unread } })),
  markRead: (ids) => unwrap(api.post('/dashboard/notifications/read', { ids })),
};

export const jobs = {
  list: () => unwrap(api.get('/jobs')),
  run: (name) => unwrap(api.post(`/jobs/${name}/run`)),
};
