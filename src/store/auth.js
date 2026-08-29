import { create } from 'zustand';
import { auth as authApi } from '../api/endpoints.js';
import { setAccessToken, setAuthLostHandler } from '../api/client.js';

let bootstrapPromise = null;

export const useAuth = create((set, get) => ({
  manager: null,
  status: 'loading', // loading | authed | anon

  /**
   * Tries the refresh cookie once on boot so a reload keeps the session.
   * Deduplicated: StrictMode mounts effects twice in dev, and two rotations of
   * a single-use refresh token would invalidate the session.
   */
  bootstrap: async () => {
    bootstrapPromise ??= authApi
      .refresh()
      .then(({ accessToken, manager }) => {
        setAccessToken(accessToken);
        set({ manager, status: 'authed' });
      })
      .catch(() => set({ manager: null, status: 'anon' }))
      .finally(() => {
        bootstrapPromise = null;
      });
    return bootstrapPromise;
  },

  /**
   * Step one. Returns { mfaRequired: true, ... } when a code has been emailed
   * and no session exists yet - the caller shows the code screen. Only the
   * `false` branch has tokens to store.
   */
  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.mfaRequired) return res;
    setAccessToken(res.accessToken);
    set({ manager: res.manager, status: 'authed' });
    return { mfaRequired: false, manager: res.manager };
  },

  /** Step two. The emailed code in exchange for a real session. */
  verify: async ({ challengeId, code, trustDevice }) => {
    const { accessToken, manager } = await authApi.verify({ challengeId, code, trustDevice });
    setAccessToken(accessToken);
    set({ manager, status: 'authed' });
    return manager;
  },

  logout: async () => {
    await authApi.logout().catch(() => {});
    setAccessToken(null);
    set({ manager: null, status: 'anon' });
  },

  clear: () => {
    setAccessToken(null);
    set({ manager: null, status: 'anon' });
  },

  isAdmin: () => get().manager?.role === 'admin',
}));

setAuthLostHandler(() => useAuth.getState().clear());
