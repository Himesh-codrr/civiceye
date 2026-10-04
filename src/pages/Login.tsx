import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import {
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  MailWarning,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/** 2FA enforcement at sign-in is paused for now. Flip to true to re-enable
 *  the compulsory enroll/code step on this page. */
const ENFORCE_2FA_AT_LOGIN = false;
import { useToast } from '@/hooks/useToast';
import { useBrand } from '@/hooks/useBrand';
import { isAmritaEmail } from '@/utils/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';

const emailSchema = z.string().email('Enter a valid email (e.g. name@gmail.com).');
const emailValid = (v: string) => emailSchema.safeParse(v).success;

type Mode = 'signin' | 'signup';

/**
 * Login / sign up screen with Google OAuth and email+password.
 *
 * Navigation after sign-in uses window.location.replace (a full page
 * reload) instead of React Router's navigate. This is intentional:
 * Supabase flushes the session cookie during sign-in and a hard reload
 * re-mounts the entire app from a clean state, so RequireAuth always
 * sees the saved session on the very first frame — no React state/effect
 * race can leave you stuck on /login.
 */
export function Login() {
  const { configured, loading, user, signInWithPassword, signUp, resendConfirmation, resetPassword } =
    useAuth();
  const { isAmrita, setPreviewBrand, meta } = useBrand();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Sanitise `next` so we never end up in a /login → /login?next=/login loop
  // (happens if RequireAuth fires from /login itself or if someone bookmarks
  // a stale URL). Auth pages, external URLs and empty strings all go to /.
  const rawNext = params.get('next') ?? '/';
  const blocked = ['/login', '/auth/callback', '/reset', '/auth'];
  const next =
    !rawNext ||
    rawNext.startsWith('//') ||
    rawNext.startsWith('http:') ||
    rawNext.startsWith('https:') ||
    blocked.some((p) => rawNext === p || rawNext.startsWith(p + '/') || rawNext.startsWith(p + '?'))
      ? '/'
      : rawNext;

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [mfaStage, setMfaStage] = useState<{
    kind: 'verify' | 'enroll';
    factorId: string;
    challengeId?: string;
    qr?: string;
    secret?: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChecking, setMfaChecking] = useState(false);
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentReset, setSentReset] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* --- Auto-redirect if already signed in (hard-reload style) -------- */
  useEffect(() => {
    if (configured && !loading && user && !mfaStage && !mfaChecking) {
      // Already signed in (e.g. landed on /login via back button) — take
      // them home using a full reload so we don't race any half-mounted
      // state.
      window.location.replace(next);
    }
  }, [configured, loading, user, next, mfaStage, mfaChecking]);

  /* --- Instant brand preview while the user types -------------------- */
  useEffect(() => {
    const trimmed = email.trim();
    if (trimmed && emailValid(trimmed)) {
      setPreviewBrand(isAmritaEmail(trimmed) ? 'amrita' : 'civiceye');
    } else {
      setPreviewBrand(null);
    }
  }, [email, setPreviewBrand]);
  useEffect(() => () => setPreviewBrand(null), [setPreviewBrand]);

  /* --- Pre-fill last-used email ------------------------------------- */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('civiceye:lastEmail');
      if (saved && emailValid(saved) && !email) setEmail(saved);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = () => {
    if (!emailValid(email)) {
      setError('Enter a valid email address (e.g. name@gmail.com).');
      return false;
    }
    if (mode === 'signin' && password.length < 6) {
      setError('Enter your password.');
      return false;
    }
    if (mode === 'signup') {
      if (fullName.trim().length < 2) {
        setError('Enter your name.');
        return false;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return false;
      }
    }
    setError(null);
    return true;
  };

  /** Navigate via full page reload so the app re-mounts with the fresh
   *  session cookie and RequireAuth never races. */
  const hardRedirect = (to: string) => {
    // Small delay so the signing-in overlay is visible for feedback.
    window.setTimeout(() => {
      window.location.replace(to);
    }, 450);
  };


  const resetMfa = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      for (const f of factors.data?.totp ?? []) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
        if (error) throw error;
      }
      // Factors removed — let them in; the compulsory flow re-enrolls next sign-in.
      hardRedirect(next);
    } catch {
      setError('Automatic reset was blocked by the server. Use the "Magic link" tab to sign in via your email, or ask an admin to remove the factor in the Supabase dashboard.');
      setBusy(false);
    }
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !mfaStage || busy) return;
    setBusy(true);
    setError(null);
    try {
      let challengeId = mfaStage.challengeId;
      if (mfaStage.kind === 'enroll' || !challengeId) {
        const ch = await supabase.auth.mfa.challenge({ factorId: mfaStage.factorId });
        if (ch.error) throw ch.error;
        challengeId = ch.data.id;
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaStage.factorId,
        challengeId,
        code: mfaCode.trim(),
      });
      if (error) throw error;
      hardRedirect(next);
    } catch {
      setError('Wrong code — open your authenticator app and try the current 6-digit code.');
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    setError(null);
    try {
      sessionStorage.setItem('civiceye:lastEmail', email.trim());
    } catch {
      // ignore
    }
    try {
      if (mode === 'signin') {
        setMfaChecking(true);
        await signInWithPassword(email, password);
        // 2FA at sign-in (currently paused — see ENFORCE_2FA_AT_LOGIN).
        if (ENFORCE_2FA_AT_LOGIN && supabase) {
          const factors = await supabase.auth.mfa.listFactors();
          const totp = factors.data?.totp.find((f) => f.status === 'verified');
          if (totp) {
            const ch = await supabase.auth.mfa.challenge({ factorId: totp.id });
            if (!ch.error) {
              setMfaStage({ kind: 'verify', factorId: totp.id, challengeId: ch.data.id });
              setMfaCode('');
              setBusy(false);
              return;
            }
          } else {
            const en = await supabase.auth.mfa.enroll({
              factorType: 'totp',
              friendlyName: 'Authenticator app',
            });
            if (!en.error) {
              setMfaStage({
                kind: 'enroll',
                factorId: en.data.id,
                qr: en.data.totp?.qr_code ?? '',
                secret: en.data.totp?.secret ?? '',
              });
              setMfaCode('');
              setBusy(false);
              return;
            }
          }
        }
        hardRedirect(next);
      } else {
        const { session } = await signUp(email, password, fullName);
        if (session) {
          hardRedirect(next);
        } else {
          setConfirmSent(true);
          setMode('signin');
          setPassword('');
          setBusy(false);
        }
      }
    } catch (err) {
      console.error('[CivicEye] auth error:', err);
      setError(prettyAuthError(err));
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (busy || !supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // If no error the browser is now navigating to Google — no further
    // action needed; /auth/callback will finish the sign-in on return.
  };

  const handleResend = async () => {
    if (!emailValid(email)) {
      setError('Enter your email first, then resend.');
      return;
    }
    setBusy(true);
    try {
      await resendConfirmation(email);
      toast.success('Confirmation resent', 'Check your inbox — and your spam folder!');
    } catch (err) {
      setError(prettyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!emailValid(email)) {
      setError('Enter your email first, then request a reset.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email);
      setSentReset(true);
      toast.info('Reset link sent', 'Check your inbox for the password-reset email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  const continueAsEmail = (() => {
    try {
      const saved = sessionStorage.getItem('civiceye:lastEmail');
      if (saved && emailValid(saved) && saved !== email.trim()) return saved;
    } catch {
      // ignore
    }
    return null;
  })();

  if (!configured) {
    // Fallback UI only shown if the backend env is missing (should never
    // happen in production). Gives a graceful way to tour the public pages
    // without showing developer wording.
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-slate-900">
          <Logo to="/" className="justify-center" />
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Welcome to {meta?.appName || 'CivicEye'}</h1>
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign-in is temporarily unavailable. You can still explore reports and the public map,
            or try again shortly.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => navigate('/')} className="btn-primary w-full">
              Browse public map
            </button>
            <a href="mailto:info@civiceye.co.in" className="text-sm text-slate-500 underline">
              Report the issue
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-16 pt-24">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 via-white to-white dark:from-primary-950/30 dark:via-slate-950 dark:to-slate-950" />
        <div className="brand-glow-a absolute -left-24 top-24 h-72 w-72 rounded-full blur-3xl" />
        <div className="brand-glow-b absolute -right-20 bottom-10 h-80 w-80 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo to="/" className="justify-center" />
          <h1 className="mt-6 text-2xl font-extrabold text-slate-900 dark:text-white">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Sign in with Google or use email — your <strong>@…amrita.edu</strong> address unlocks
            the Amrita Eye campus portal.
          </p>
        </div>

        <div className="card relative overflow-hidden p-6 sm:p-8">
          {/* SIGNING-IN OVERLAY (covers everything, no exit animation races) */}
          <AnimatePresence>
            {busy ? (
              <motion.div
                key="busy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center backdrop-blur-sm dark:bg-slate-900/90"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Signing you in…
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hang tight — taking you to CivicEye.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Continue-as remembered-email chip */}
          {continueAsEmail ? (
            <button
              type="button"
              onClick={() => {
                setEmail(continueAsEmail);
                setError(null);
                setTimeout(() => document.getElementById('password')?.focus(), 0);
              }}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary-500/20 bg-primary-500/5 px-4 py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-500/10 dark:text-primary-300"
            >
              <LogIn className="h-4 w-4" />
              Continue as <span className="underline">{continueAsEmail}</span>
            </button>
          ) : null}

          {/* GOOGLE BUTTON — hidden for Amrita Eye (institutional email only) */}
          {!isAmrita ? (
            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={busy}
              className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          ) : (
            <div className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <ShieldCheck className="h-4 w-4" />
              Use your @amrita.edu email to sign in
            </div>
          )}

          {!isAmrita ? (
            <div className="my-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              or
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            </div>
          ) : null}

          {/* Mode tabs (Sign in / Sign up only — no magic link) */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/10">
            {([
              ['signin', 'Sign in', LogIn],
              ['signup', 'Sign up', UserPlus],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setError(null);
                  setConfirmSent(false);
                  setSentReset(false);
                }}
                className={
                  mode === key
                    ? 'flex items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-xs font-bold text-primary-700 shadow-softer dark:bg-slate-800 dark:text-white'
                    : 'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-slate-500 dark:text-slate-400'
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          ) : null}

          {confirmSent ? (
            <div className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-bold">
                    Confirmation email sent to {email} — check your inbox{' '}
                    <span className="underline">and your spam folder</span>.
                  </p>
                  <p className="mt-1.5 text-amber-700 dark:text-amber-300">
                    Amrita mail sometimes flags these as spam. Look for a message from{' '}
                    <strong>Supabase</strong> and click the confirmation link.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleResend()}
                      disabled={busy}
                      className="rounded-lg bg-amber-500 px-2.5 py-1 font-bold text-white transition-colors hover:bg-amber-600"
                    >
                      Resend confirmation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {mfaStage ? (
              <div className="mb-4 border-[3px] border-[#172b44] bg-[#fff8e7] p-4 shadow-[3px_3px_0_#172b44]">
                {mfaStage.kind === 'enroll' ? (
                  <>
                    <p className="inline-block border-2 border-[#172b44] bg-[#ef6b59] px-2 py-1 text-[10px] font-black tracking-wide text-[#172b44]">2FA SETUP — REQUIRED</p>
                    <h2 className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">Secure your account first</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      2FA is compulsory. Scan this QR with Google Authenticator / Authy (or type the
                      secret), then enter the 6-digit code to finish signing in.
                    </p>
                    {mfaStage.qr ? (
                      <img src={mfaStage.qr} alt="Scan with your authenticator app" className="mt-3 h-36 w-36 border-[3px] border-[#172b44] bg-white p-2" />
                    ) : null}
                    <code className="mt-2 block break-all text-[10px] font-bold text-slate-500 dark:text-slate-400">{mfaStage.secret}</code>
                  </>
                ) : (
                  <>
                    <p className="inline-block border-2 border-[#172b44] bg-[#ffd630] px-2 py-1 text-[10px] font-black tracking-wide text-[#172b44]">STEP 2 OF 2</p>
                    <h2 className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">Authenticator code</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Password accepted. Now enter the 6-digit code from your authenticator app.
                    </p>
                  </>
                )}
                <form onSubmit={verifyMfa} className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="••••••"
                    autoFocus
                    className="input-base w-32 text-center text-xl font-black tracking-[.3em]"
                    aria-label="6-digit authenticator code"
                  />
                  <button type="submit" disabled={busy || mfaCode.length !== 6} className="btn-primary">
                    Verify & sign in
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => void resetMfa()}
                  className="mt-2 text-xs font-bold text-primary-600 underline hover:text-primary-700 dark:text-primary-400"
                >
                  Lost your authenticator? Reset 2FA
                </button>
              </div>
            ) : null}
            <form onSubmit={submit} style={mfaStage ? { display: 'none' } : undefined} className="space-y-4">
            {mode === 'signup' ? (
              <div>
                <label htmlFor="name" className="label-base">
                  Full name
                </label>
                <input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ananya Rao"
                  className="input-base"
                  autoComplete="name"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="label-base">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="input-base"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="label-base">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                  className="input-base pr-10"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  title={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-primary-600 dark:text-slate-300 dark:hover:text-white"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              2FA available — enable it from your Dashboard after signing in.
            </p>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'signin' ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {busy
                ? 'Signing you in…'
                : mode === 'signin'
                  ? 'Sign in with email'
                  : 'Create account'}
            </button>

            {mode === 'signin' ? (
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => void handleForgot()}
                  disabled={busy}
                  className="font-semibold text-primary-600 hover:underline dark:text-primary-400"
                >
                  <KeyRound className="mr-1 inline h-3 w-3" />
                  Forgot password?
                </button>
                {sentReset ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Reset link sent ✓</span>
                ) : null}
              </div>
            ) : null}
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-bold text-primary-600 hover:underline dark:text-primary-400"
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
          <span className="mx-2">·</span>
          <Link to="/" className="font-semibold hover:underline">
            Back to home
          </Link>
        </p>

        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <span>
            Amrita students &amp; staff: signing in with your <strong>@…amrita.edu</strong> email
            switches the app to <strong>Amrita Eye</strong> — reports go to campus staff.
          </span>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong>Confirmation emails</strong> come from Supabase. If you don&apos;t see one
            after signing up, check <strong>spam / junk</strong> (Amrita mail often flags these).
            Look for <strong>Supabase</strong> and click the link.
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* Inline Google "G" logo so we don't add another icon dependency. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.8 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-7.8 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-4.9C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39 16.2 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6 4.9c-.4.4 6.5-4.7 6.5-14.5 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function prettyAuthError(err: unknown): string {
  let raw = '';
  if (typeof err === 'string') raw = err;
  else if (err instanceof Error) raw = err.message;
  else if (err && typeof err === 'object') {
    const maybe = (err as { message?: unknown }).message;
    raw = typeof maybe === 'string' ? maybe : JSON.stringify(err);
  }

  const text = raw.trim().toLowerCase();
  if (!text || text === '{}' || text === 'null' || text === 'undefined') {
    return 'Sign-in could not be completed — please try again in a moment.';
  }
  if (text.includes('invalid login') || text.includes('invalid credential')) {
    return 'Invalid email or password. Double-check and try again, or use "Forgot password?"';
  }
  if (text.includes('email not confirmed')) {
    return 'Please confirm your email first (check your inbox/spam), or tap Resend.';
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return 'Too many attempts — please wait a minute and try again.';
  }
  return raw;
}

// re-export for TypeScript: isSupabaseConfigured imported above to make the
// `configured` check stay single-source. (Silence unused-var warnings from
// linters in case configured becomes the only read.)
void isSupabaseConfigured;
