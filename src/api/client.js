import axios from 'axios';

/**
 * One axios instance for the whole app.
 *
 * The access token lives in memory only (never localStorage - an XSS then can't
 * walk off with it). The refresh token is an httpOnly cookie, so a 401 triggers
 * a single silent refresh and the original request is replayed.
 */
let accessToken = null;
let onAuthLost = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn;
};

export const api = axios.create({ baseURL: '/api', withCredentials: true });

/**
 * The refresh and logout routes authenticate with a cookie, which the browser
 * attaches automatically - so they also require a header echoing a second,
 * readable cookie. A page on another origin can trigger the cookie but cannot
 * read it, so it cannot produce this header.
 */
const readCsrfCookie = () =>
  document.cookie
    .split('; ')
    .find((c) => c.startsWith('meridian_csrf='))
    ?.split('=')[1] ?? null;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  const csrf = readCsrfCookie();
  if (csrf) config.headers['x-csrf-token'] = csrf;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried && !original.url.includes('/auth/')) {
      original._retried = true;
      try {
        refreshing = refreshing ?? api.post('/auth/refresh').finally(() => {
          refreshing = null;
        });
        const { data } = await refreshing;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        onAuthLost();
      }
    }

    // Normalise every failure to a plain Error carrying the server's message.
    const message =
      error.response?.data?.error ||
      (error.code === 'ERR_NETWORK' ? 'Cannot reach the API. Is the backend running?' : error.message);
    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.details = error.response?.data?.details;
    return Promise.reject(wrapped);
  },
);

export const unwrap = (promise) => promise.then((r) => r.data);
