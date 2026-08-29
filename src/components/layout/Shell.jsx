import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../store/auth.js';
import { useTour } from '../tour/Tour.jsx';
import { stepsForPath } from '../../lib/tourSteps.js';
import { dashboard } from '../../api/endpoints.js';
import { fmtRelative } from '../../lib/format.js';
import { Badge, Button, EmptyState } from '../ui/index.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const NavItem = ({ item, onNavigate }) => (
  <NavLink
    to={item.to}
    end={item.end}
    onClick={onNavigate}
    className={({ isActive }) =>
      clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive ? 'bg-primary-soft text-primary' : 'text-muted-strong hover:text-ink hover:bg-surface-2',
      )
    }
  >
    <item.icon className="w-4 h-4" />
    {item.label}
  </NavLink>
);

/**
 * Starts the walkthrough for whatever screen the user is on. Steps whose target
 * is not rendered right now are skipped, so this is always safe to press.
 */
const HelpButton = () => {
  const { start } = useTour();
  const { pathname } = useLocation();

  return (
    <button
      data-tour="help"
      onClick={() => {
        if (!start(stepsForPath(pathname))) toast('Nothing to explain on this screen yet.');
      }}
      title="Show me around this screen"
      className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-sm text-muted-strong hover:text-ink hover:bg-surface-2 transition-colors"
    >
      <CircleHelp className="w-4 h-4" />
      <span className="hidden sm:block">Help</span>
    </button>
  );
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => dashboard.notifications(),
    refetchInterval: 60_000,
  });
  const items = data?.notifications ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  const openPanel = async () => {
    setOpen((v) => !v);
    if (!open && unread) {
      await dashboard.markRead();
      refetch();
    }
  };

  return (
    <div className="relative" data-tour="notifications">
      <button
        onClick={openPanel}
        className="relative w-9 h-9 grid place-items-center rounded-lg text-muted-strong hover:text-ink hover:bg-surface-2 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-bg" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 card shadow-lift z-20 max-h-[70vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-border text-sm font-medium">Notifications</div>
            {items.length === 0 ? (
              <EmptyState icon={Bell} title="All clear" description="Rank drops and job failures show up here." />
            ) : (
              items.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-border last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-ink">{n.title}</p>
                    <Badge tone={n.severity === 'danger' ? 'danger' : n.severity === 'warning' ? 'warning' : 'neutral'}>
                      {n.severity}
                    </Badge>
                  </div>
                  {n.body && <p className="text-xs text-muted mt-1 whitespace-pre-line">{n.body}</p>}
                  <p className="text-[11px] text-muted mt-1.5">{fmtRelative(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

const AccountMenu = () => {
  const [open, setOpen] = useState(false);
  const { manager, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-2.5 h-9 rounded-lg text-sm text-muted-strong hover:text-ink hover:bg-surface-2 transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary grid place-items-center text-[11px] font-semibold">
          {manager?.name?.[0]?.toUpperCase() ?? '?'}
        </span>
        <span className="hidden sm:block max-w-[120px] truncate">{manager?.name}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 card shadow-lift z-20 p-1.5">
            <div className="px-2.5 py-2 border-b border-border mb-1">
              <p className="text-sm text-ink truncate">{manager?.email}</p>
              <p className="text-[11px] text-muted capitalize mt-0.5">{manager?.role}</p>
            </div>
            {manager?.role === 'admin' && (
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/admin');
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-strong hover:text-ink hover:bg-surface-2"
              >
                <Shield className="w-4 h-4" /> Admin
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-strong hover:text-ink hover:bg-surface-2"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-danger hover:bg-danger/10"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const Shell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { manager } = useAuth();

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 px-3 h-16">
        <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center">
          <Compass className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">Meridian</div>
          <div className="text-[11px] text-muted -mt-0.5">SEO operations</div>
        </div>
      </div>
      <nav className="space-y-1 px-2 mt-2" data-tour="nav">
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={() => setMobileOpen(false)} />
        ))}
        {manager?.role === 'admin' && (
          <NavItem
            item={{ to: '/admin', label: 'Admin', icon: Shield }}
            onNavigate={() => setMobileOpen(false)}
          />
        )}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-surface/40 shrink-0 sticky top-0 h-screen overflow-y-auto">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-surface border-r border-border flex flex-col">
            <button
              className="absolute top-5 right-3 text-muted hover:text-ink"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 gap-3 sticky top-0 bg-bg/85 backdrop-blur z-30">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            icon={Menu}
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          />
          <div className="flex-1" />
          <HelpButton />
          <NotificationBell />
          <AccountMenu />
        </header>
        <main className="flex-1 px-4 lg:px-6 py-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
