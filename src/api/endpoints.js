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
  suggestCompetitors: (body) => unwrap(api.post('/geo/competitors', body)),
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
  check: (campaignId, device) => unwrap(api.post(`/ranks/${campaignId}/check`, { device })),
  syncGsc: (campaignId) => unwrap(api.post(`/ranks/${campaignId}/sync-gsc`)),
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
