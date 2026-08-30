import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth.js';
import { Loading } from './components/ui/index.jsx';
import { Shell } from './components/layout/Shell.jsx';
import { CampaignShell } from './components/layout/CampaignShell.jsx';
import { TourProvider } from './components/tour/Tour.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import ClientNew from './pages/ClientNew.jsx';
import ClientProfile from './pages/ClientProfile.jsx';
import CampaignOverview from './pages/CampaignOverview.jsx';
import AuditResults from './pages/AuditResults.jsx';
import Keywords from './pages/Keywords.jsx';
import OnPage from './pages/OnPage.jsx';
import OffPage from './pages/OffPage.jsx';
import RankTracker from './pages/RankTracker.jsx';
import Reports from './pages/Reports.jsx';
import Ask from './pages/Ask.jsx';
import ManagerSettings from './pages/ManagerSettings.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * A synchronous, cheap "is anyone signed in on this browser?" hint.
 *
 * The refresh token's cookie is httpOnly and unreadable. The CSRF cookie is
 * deliberately readable, is set beside it on sign-in and cleared on sign-out,
 * and grants nothing on its own - so this is only ever a hint, and the server
 * still decides. It is here for one reason: without it the root path waits on
 * bootstrap(), which calls /api/auth/refresh, which on a free host that has
 * gone to sleep takes the better part of a minute. A first-time visitor would
 * spend that staring at "Signing you in" on what is supposed to be a front
 * door. With it, the door paints immediately and only the owner waits.
 */
const looksSignedIn = () => document.cookie.includes('meridian_csrf=');

/**
 * What you see while the session is being restored. Almost always a flicker.
 * The exception is the first visit after the free API instance has gone to
 * sleep, when the refresh call is answered only once the server has woken -
 * up to a minute. A spinner with no explanation for that long reads as
 * "broken", so after a few seconds it says what is happening, and after a few
 * more it offers a way out.
 */
const BootScreen = () => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setPhase(1), 3500);
    const b = setTimeout(() => setPhase(2), 12_000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Loading label={phase === 0 ? 'Signing you in' : 'Waking the server'} />
      {phase >= 1 && (
        <p className="text-sm text-muted max-w-sm leading-relaxed animate-fade-in">
          The server sleeps when nobody has used it for a while. First visits can take up to a
          minute; after that it is instant.
        </p>
      )}
      {phase >= 2 && (
        <Link to="/login" className="text-sm text-muted-strong hover:text-ink underline underline-offset-4 animate-fade-in">
          Still waiting? Go to sign in
        </Link>
      )}
    </div>
  );
};

const RequireAuth = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    if (location.pathname === '/' && !looksSignedIn()) return <Landing />;
    return <BootScreen />;
  }
  if (status === 'anon') {
    // The front door lives at the root: someone who is not signed in and lands
    // there gets the landing page, not a form. Every other path still bounces
    // to /login carrying `from`, so they arrive where they meant to.
    if (location.pathname === '/') return <Landing />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

export default function App() {
  const { status, bootstrap } = useAuth();

  useEffect(() => {
    if (status === 'loading') bootstrap();
  }, [status, bootstrap]);

  return (
    <TourProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/new" element={<ClientNew />} />
          <Route path="clients/:id" element={<ClientProfile />} />
          <Route path="settings" element={<ManagerSettings />} />
          <Route path="admin" element={<Admin />} />

          <Route path="campaigns/:campaignId" element={<CampaignShell />}>
            <Route index element={<CampaignOverview />} />
            <Route path="audit" element={<AuditResults />} />
            <Route path="keywords" element={<Keywords />} />
            <Route path="onpage" element={<OnPage />} />
            <Route path="offpage" element={<OffPage />} />
            <Route path="ranks" element={<RankTracker />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ask" element={<Ask />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </TourProvider>
  );
}
