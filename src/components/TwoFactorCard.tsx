import { useCallback, useEffect, useState } from 'react';
import { KeyRound, QrCode, ShieldCheck, ShieldOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

/**
 * TOTP two-factor authentication via authenticator apps (Google Authenticator,
 * Authy, 1Password…). Uses Supabase Auth MFA: the server and the app share a
 * secret and derive the same 6-digit code from the current time.
 */
export function TwoFactorCard() {
  const { user, configured } = useAuth();
  const toast = useToast();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<{ qr: string; secret: string; id: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp.find((f) => f.status === 'verified');
    setFactorId(verified?.id ?? null);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!configured || !user) return null;

  const startEnroll = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
      });
      if (error) throw error;
      setEnrolling({
        qr: data.totp?.qr_code ?? '',
        secret: data.totp?.secret ?? '',
        id: data.id,
      });
      setCode('');
    } catch (err) {
      toast.error('Could not start 2FA setup', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyEnroll = async () => {
    if (!supabase || !enrolling) return;
    setBusy(true);
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
      if (ch.error) throw ch.error;
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrolling.id,
        challengeId: ch.data.id,
        code: code.trim(),
      });
      if (error) throw error;
      toast.success('2FA enabled', 'Enter a 6-digit code from your app at every login.');
      setEnrolling(null);
      setCode('');
      await refresh();
    } catch (err) {
      toast.error('Wrong code', err instanceof Error ? err.message : 'Check your authenticator app.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!supabase || !factorId) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.info('2FA disabled', 'You now sign in with just your password.');
      setFactorId(null);
    } catch (err) {
      toast.error('Could not disable 2FA', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-4 border-[#172b44] bg-[#fffdf4] p-5 shadow-[4px_4px_0_#172b44]" aria-label="Two-factor authentication">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#28627a]" />
          <h2 className="font-serif text-lg font-black uppercase text-[#172b44]">Two-factor authentication</h2>
        </div>
        {factorId ? (
          <span className="border-2 border-[#172b44] bg-[#91dcc4] px-2 py-1 text-[10px] font-black tracking-wide text-[#172b44]">ENABLED</span>
        ) : (
          <span className="border-2 border-[#172b44] bg-[#ffd630] px-2 py-1 text-[10px] font-black tracking-wide text-[#172b44]">OFF</span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-[#52606a]">
        Add an authenticator app (Google Authenticator, Authy, 1Password). After your password, you type the
        app&apos;s 6-digit code — a new one is generated every 30 seconds.
      </p>

      {!enrolling ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {factorId ? (
            <button onClick={() => void disable()} disabled={busy} className="border-[3px] border-[#172b44] bg-[#ef6b59] px-4 py-2 text-sm font-black text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:-translate-y-0.5 disabled:opacity-50">
              <span className="inline-flex items-center gap-1.5"><ShieldOff className="h-4 w-4" /> Disable 2FA</span>
            </button>
          ) : (
            <button onClick={() => void startEnroll()} disabled={busy} className="border-[3px] border-[#172b44] bg-[#ffd630] px-4 py-2 text-sm font-black text-[#172b44] shadow-[3px_3px_0_#172b44] transition hover:-translate-y-0.5 disabled:opacity-50">
              <span className="inline-flex items-center gap-1.5"><KeyRound className="h-4 w-4" /> Enable with authenticator app</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
          {enrolling.qr ? (
            <img src={enrolling.qr} alt="Scan this QR code with your authenticator app" className="h-40 w-40 border-[3px] border-[#172b44] bg-white p-2 shadow-[3px_3px_0_#172b44]" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center border-[3px] border-[#172b44] bg-white text-[#172b44]"><QrCode className="h-10 w-10" /></div>
          )}
          <div>
            <p className="text-xs font-black tracking-wide text-[#172b44]">1 · SCAN OR TYPE THE SECRET</p>
            <code className="mt-1 block break-all border-2 border-[#172b44] bg-[#fff8e7] p-2 text-xs font-bold text-[#172b44]">{enrolling.secret}</code>
            <p className="mt-3 text-xs font-black tracking-wide text-[#172b44]">2 · ENTER THE 6-DIGIT CODE</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                className="w-28 border-[3px] border-[#172b44] bg-white p-2 text-center text-lg font-black tracking-[.3em] text-[#172b44]"
                aria-label="6-digit code from authenticator app"
              />
              <button onClick={() => void verifyEnroll()} disabled={busy || code.length !== 6} className="border-[3px] border-[#172b44] bg-[#91dcc4] px-4 py-2 text-sm font-black text-[#172b44] shadow-[3px_3px_0_#172b44] disabled:opacity-50">
                Verify & enable
              </button>
              <button onClick={() => setEnrolling(null)} className="border-[3px] border-[#172b44] bg-[#fff8e7] px-3 py-2 text-sm font-black text-[#172b44]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
