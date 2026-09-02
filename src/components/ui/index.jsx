import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Minus,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover border-transparent',
  secondary: 'bg-surface-2 text-ink hover:bg-border border-border',
  ghost: 'bg-transparent text-muted-strong hover:text-ink hover:bg-surface-2 border-transparent',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25 border-danger/30',
  success: 'bg-success/15 text-success hover:bg-success/25 border-success/30',
  outline: 'bg-transparent text-ink hover:bg-surface-2 border-border-strong',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export const Button = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...props
}) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center rounded-lg border font-medium transition-colors',
      'disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export const Card = ({ className, children, ...props }) => (
  <div className={clsx('card', className)} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
    <div className="flex items-start gap-3 min-w-0">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-primary-soft grid place-items-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">{action}</div>}
  </div>
);

export const PageHeader = ({ title, subtitle, actions, badge, leading }) => (
  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
    <div className={leading ? 'flex items-start gap-3' : undefined}>
      {leading}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

const TONES = {
  neutral: 'bg-surface-2 text-muted-strong border-border',
  primary: 'bg-primary-soft text-primary border-primary/25',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
};

export const Badge = ({ tone = 'neutral', className, children, icon: Icon }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
      TONES[tone],
      className,
    )}
  >
    {Icon && <Icon className="w-3 h-3" />}
    {children}
  </span>
);

/**
 * The client's own mark: the logo the audit found, falling back to Google's
 * favicon service, falling back to a lettered tile. Never renders broken.
 */
export const ClientLogo = ({ client, size = 28, className }) => {
  const [step, setStep] = useState(0);
  const domain = client?.domain?.replace(/^www\./, '');
  const sources = [
    client?.logo_url,
    domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null,
  ].filter(Boolean);
  const src = sources[step];
  const initial = (client?.business_name ?? '?').trim().charAt(0).toUpperCase() || '?';
  if (!src) {
    return (
      <span
        className={clsx('inline-grid place-items-center rounded-lg bg-primary-soft text-primary font-semibold shrink-0', className)}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setStep(step + 1)}
      className={clsx('rounded-lg object-contain bg-surface-2 shrink-0', className)}
      style={{ width: size, height: size }}
    />
  );
};

export const PlatformBadge = ({ type, stack }) => {
  const labels = { wordpress: 'WP', php: 'PHP', shopify: 'Shopify', wix: 'Wix', custom: 'Dev-built', other: 'Site' };
  const tone = type === 'wordpress' ? 'primary' : type === 'php' ? 'warning' : 'neutral';
  return (
    <span title={stack || undefined}>
      <Badge tone={tone}>{labels[type] ?? type}</Badge>
    </span>
  );
};

export const EngineBadge = ({ engine }) => {
  if (engine === 'claude')
    return (
      <Badge tone="primary" icon={Sparkles}>
        Claude
      </Badge>
    );
  if (engine === 'groq')
    return (
      <Badge tone="primary" icon={Sparkles} title="Groq free tier - OpenAI gpt-oss-120b">
        Groq
      </Badge>
    );
  if (engine === 'gemini')
    return (
      <Badge tone="warning" icon={Sparkles} title="Running on Gemini">
        Gemini
      </Badge>
    );
  return (
    <Badge tone="neutral" title="Offline planner - add an API key for model-written output">
      Offline planner
    </Badge>
  );
};

// ---------------------------------------------------------------------------
// Rank movement
// ---------------------------------------------------------------------------

export const RankArrow = ({ value, direction }) => {
  if (direction === 'new') return <span className="text-muted text-xs">new</span>;
  if (direction === 'flat' || value === 0)
    return (
      <span className="inline-flex items-center gap-1 text-muted text-xs">
        <Minus className="w-3 h-3" />0
      </span>
    );
  const up = direction === 'up';
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={clsx('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-success' : 'text-danger')}>
      <Icon className="w-3.5 h-3.5" />
      {Math.abs(value)}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export const Spinner = ({ className }) => <Loader2 className={clsx('w-4 h-4 animate-spin', className)} />;

export const Loading = ({ label = 'Loading' }) => (
  <div className="flex items-center gap-2 text-sm text-muted py-12 justify-center">
    <Spinner />
    {label}…
  </div>
);

export const Skeleton = ({ className }) => <div className={clsx('skeleton', className)} />;

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-14 px-6">
    {Icon && (
      <div className="w-11 h-11 rounded-xl bg-surface-2 grid place-items-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-muted" />
      </div>
    )}
    <p className="text-sm font-medium text-ink">{title}</p>
    {description && <p className="text-sm text-muted mt-1 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="card card-pad border-danger/30 bg-danger/5">
    <p className="text-sm font-medium text-danger">Something went wrong</p>
    <p className="text-sm text-muted-strong mt-1">{error?.message ?? String(error)}</p>
    {onRetry && (
      <Button className="mt-3" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

export const StatTile = ({ label, value, hint, tone = 'neutral', icon: Icon, onClick }) => {
  const toneText = {
    neutral: 'text-ink',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'card px-5 py-4 text-left w-full transition-colors',
        onClick && 'hover:border-border-strong cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        {Icon && <Icon className={clsx('w-4 h-4', toneText)} />}
      </div>
      <div className={clsx('text-2xl font-semibold mt-2 tabular-nums', toneText)}>{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Copy button + diff
// ---------------------------------------------------------------------------

export const CopyButton = ({ text, label = 'Copy', size = 'sm', variant = 'secondary' }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text ?? '');
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Clipboard blocked by the browser - select the text and copy manually');
    }
  };

  return (
    <Button size={size} variant={variant} icon={copied ? Check : Copy} onClick={copy}>
      {copied ? 'Copied' : label}
    </Button>
  );
};

export const DiffBlock = ({ before, after, mono = false }) => (
  <div className="space-y-2">
    {before != null && before !== '' && (
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Before</div>
        <pre
          className={clsx(
            'text-xs whitespace-pre-wrap break-words rounded-lg border border-border bg-bg/60 p-3 text-muted-strong line-through decoration-danger/50',
            mono && 'font-mono',
          )}
        >
          {before}
        </pre>
      </div>
    )}
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted mb-1">
        {before ? 'After' : 'Suggested'}
      </div>
      <pre
        className={clsx(
          'text-xs whitespace-pre-wrap break-words rounded-lg border border-success/30 bg-success/5 p-3 text-ink',
          mono && 'font-mono',
        )}
      >
        {after}
      </pre>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export const Modal = ({ open, onClose, title, subtitle, children, footer, wide = false }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative card shadow-lift w-full animate-fade-in my-auto',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-border flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const Field = ({ label, hint, error, children, className }) => (
  <div className={clsx('space-y-1.5', className)}>
    {label && <label className="block">{label}</label>}
    {children}
    {error ? (
      <p className="text-xs text-danger">{error}</p>
    ) : hint ? (
      <p className="text-xs text-muted">{hint}</p>
    ) : null}
  </div>
);

export const Input = ({ className, ...props }) => <input className={className} {...props} />;

/**
 * Password field with a reveal toggle. Typing a password you cannot see is the
 * single most common cause of a failed sign-in, so every password input in the
 * app uses this rather than a bare `type="password"`.
 */
export const PasswordInput = ({ className, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} className={clsx('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface transition-colors"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
export const Textarea = ({ className, ...props }) => <textarea className={className} {...props} />;
export const Select = ({ className, children, ...props }) => (
  <select className={className} {...props}>
    {children}
  </select>
);

// ---------------------------------------------------------------------------
// Tabs (in-page, not routed)
// ---------------------------------------------------------------------------

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={clsx(
          'px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
          value === tab.value
            ? 'border-primary text-ink'
            : 'border-transparent text-muted hover:text-muted-strong',
        )}
      >
        {tab.label}
        {tab.count != null && (
          <span className="ml-1.5 text-[11px] text-muted tabular-nums">{tab.count}</span>
        )}
      </button>
    ))}
  </div>
);

export const HealthRing = ({ score, size = 56 }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const stroke = pct >= 75 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#7C8698" strokeOpacity="0.25" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
        {score ?? '—'}
      </div>
    </div>
  );
};
