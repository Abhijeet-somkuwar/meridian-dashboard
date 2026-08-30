import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MailCheck, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../store/auth.js';
import { auth as authApi } from '../api/endpoints.js';
import { Button, Field, Input, PasswordInput } from '../components/ui/index.jsx';
import { LogoTile } from '../components/ui/Logo.jsx';

/**
 * Sign-in, in two steps: password, then a six-digit code emailed to the account.
 *
 * Nothing on this screen hints at who may sign in. There is no account list, no
 * sign-up link, and a wrong address fails exactly like a wrong password - the
 * server takes the same time either way, so the page cannot be used to discover
 * whether an address is the real one.
 */

const CODE_LENGTH = 6;

export default function Login() {
  const { status, login, verify } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('password'); // password | code
  const [form, setForm] = useState({ email: '', password: '' });
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  if (status === 'authed') return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  const goHome = () => navigate(location.state?.from?.pathname ?? '/', { replace: true });

  const submitPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await login(form.email.trim(), form.password);
      if (res.mfaRequired) {
        setChallenge(res);
        setCode('');
        setStep('code');
      } else {
        goHome();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await verify({ challengeId: challenge.challengeId, code, trustDevice });
      goHome();
    } catch (err) {
      toast.error(err.message);
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await authApi.resendCode(challenge.challengeId);
      toast.success('New code sent');
      setCode('');
      codeRef.current?.focus();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-bg">
      {/* --- Brand panel ---------------------------------------------------- */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-14 border-r border-border">
        {/* Two soft, offset colour washes rather than a flat panel - it reads as
            depth without competing with the form for attention. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 8% 0%, rgba(99,102,241,0.20) 0%, transparent 55%),' +
              'radial-gradient(90% 80% at 100% 100%, rgba(56,189,248,0.14) 0%, transparent 60%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(80% 60% at 30% 30%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(80% 60% at 30% 30%, black, transparent)',
          }}
        />

        <div className="relative flex items-center gap-3">
          <LogoTile size={40} className="shadow-lift" />
          <div>
            <div className="font-semibold tracking-tight text-[15px]">Meridian</div>
            <div className="text-xs text-muted -mt-0.5">SEO operations</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[32px] leading-[1.15] font-semibold tracking-tight">
            Fifteen minutes a day,
            <br />
            <span className="text-muted">not eight hours.</span>
          </h2>
          <p className="text-sm text-muted mt-5 leading-relaxed">
            The audit, the keyword map, the page copy, the daily off-page rotation and the client report — each one
            informed by everything the platform has already done.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="w-3.5 h-3.5" />
          Private instance. Client data stays on your own infrastructure.
        </div>
      </div>

      {/* --- Form ------------------------------------------------------------ */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <LogoTile size={40} />
            <div className="font-semibold tracking-tight">Meridian</div>
          </div>

          {step === 'password' ? (
            <form onSubmit={submitPassword} key="password" className="login-step">
              <h1 className="text-[22px] font-semibold tracking-tight">Welcome back</h1>
              <h4 className="text-[10px] font-semibold tracking-tight">Contact abhijeetsomkuwar26@gmail.com for a demo/login.</h4>

              <p className="text-sm text-muted mt-1.5 mb-7">Sign in to continue.</p>

              <div className="space-y-4">
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    value={form.password}
                    onChange={set('password')}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••"
                  />
                </Field>
              </div>

              <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full mt-7">
                Continue
                {!busy && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitCode} key="code" className="login-step">
              <div className="w-11 h-11 rounded-xl bg-primary-soft grid place-items-center mb-5">
                <MailCheck className="w-5 h-5 text-primary" />
              </div>

              <h1 className="text-[22px] font-semibold tracking-tight">Check your email</h1>
              <p className="text-sm text-muted mt-1.5 mb-7 leading-relaxed">
                We sent a {CODE_LENGTH}-digit code to <span className="text-muted-strong">{challenge?.sentTo}</span>.
                It expires in a few minutes.
              </p>

              <input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                required
                aria-label="Six-digit sign-in code"
                placeholder="••••••"
                className="w-full text-center font-mono text-[26px] tracking-[0.5em] indent-[0.5em] py-3.5"
              />

              <label className="flex items-center gap-2.5 mt-5 text-sm text-muted-strong cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                />
                Remember this browser for 30 days
              </label>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={busy}
                disabled={code.length !== CODE_LENGTH}
                className="w-full mt-6"
              >
                Sign in
              </Button>

              <div className="flex items-center justify-between mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setStep('password');
                    setForm((f) => ({ ...f, password: '' }));
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={resend}
                  disabled={resending}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Send a new code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
