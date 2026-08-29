import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './store/auth.js';
import { Loading } from './components/ui/index.jsx';
import { Shell } from './components/layout/Shell.jsx';
import { CampaignShell } from './components/layout/CampaignShell.jsx';
import { TourProvider } from './components/tour/Tour.jsx';

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

const RequireAuth = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loading label="Signing you in" />;
  if (status === 'anon') return <Navigate to="/login" state={{ from: location }} replace />;
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
