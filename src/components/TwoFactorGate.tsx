import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Stage {
  kind: 'verify' | 'enroll';
  factorId: string;
  challengeId?: string;
  qr?: string;
  secret?: string;
}

/**
 * Comic modal that gates publishing a report behind TOTP 2FA.
 * Verified factor -> 6-digit code. No factor -> compulsory QR enrollment
 * right here. Calls onVerified() only after Supabase accepts the code.
 */
export function TwoFactorGate({
  open,
  onVerified,
  onClose,
}: {
  open: boolean;
  onVerified: () => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStage(null);
      setCode('');
      setError(null);
      return;
    }
    if (!supabase) return;
    void (async () => {
      const factors = await supabase.auth.mfa.listFactors();
      const totp = factors.data?.totp.find((f) => f.status === 'verified');
      if (totp) {
        const ch = await supabase.auth.mfa.challenge({ factorId: totp.id });
        if (!ch.error) setStage({ kind: 'verify', factorId: totp.id, challengeId: ch.data.id });
      } else {
        const en = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Authenticator app',
        });
        if (!en.error) {
          setStage({
            kind: 'enroll',
            factorId: en.data.id,
            qr: en.data.totp?.qr_code ?? '',
            secret: en.data.totp?.secret ?? '',
          });
        }
      }
    })();
  }, [open]);

  const verify = async () => {
    if (!supabase || !stage || busy) return;
    setBusy(true);
    setError(null);
    try {
      let challengeId = stage.challengeId;
      if (stage.kind === 'enroll' || !challengeId) {
        const ch = await supabase.auth.mfa.challenge({ factorId: stage.factorId });
        if (ch.error) throw ch.error;
        challengeId = ch.data.id;
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId: stage.factorId,
        challengeId,
        code: code.trim(),
      });
      if (error) throw error;
      onVerified();
    } catch {
      setError('Wrong code — check your authenticator app and try the current 6-digit code.');
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#172b44]/80 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md border-4 border-[#172b44] bg-[#fff8e7] p-5 text-[#172b44] shadow-[8px_8px_0_#ffd630]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Verify with your authenticator to publish"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 border-2 border-[#172b44] bg-[#ffd630] px-2 py-1 text-[10px] font-black tracking-wide">
            <ShieldCheck className="h-3.5 w-3.5" /> 2FA CHECK — REQUIRED TO PUBLISH
          </p>
          <button onClick={onClose} aria-label="Close" className="border-2 border-[#172b44] bg-[#fffdf4] px-2 py-0.5 text-sm font-black shadow-[2px_2px_0_#172b44]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {stage?.kind === 'enroll' ? (
          <>
            <h2 className="mt-3 font-serif text-xl font-black uppercase">First time? Secure your account</h2>
            <p className="mt-1 text-xs font-semibold text-[#52606a]">
              Publishing a report needs 2FA. Scan this QR with Google Authenticator / Authy (or type the
              secret), then enter the 6-digit code.
            </p>
            {stage.qr ? (
              <img src={stage.qr} alt="Scan with your authenticator app" className="mt-3 h-36 w-36 border-[3px] border-[#172b44] bg-white p-2" />
            ) : null}
            <code className="mt-2 block break-all text-[10px] font-bold text-[#52606a]">{stage.secret}</code>
          </>
        ) : (
          <>
            <h2 className="mt-3 font-serif text-xl font-black uppercase">Authenticator code</h2>
            <p className="mt-1 text-xs font-semibold text-[#52606a]">
              Enter the 6-digit code from your authenticator app to publish this report.
            </p>
          </>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="••••••"
            autoFocus
            className="w-32 border-[3px] border-[#172b44] bg-white p-2 text-center text-xl font-black tracking-[.3em]"
            aria-label="6-digit authenticator code"
          />
          <button type="submit" disabled={busy || code.length !== 6} className="border-[3px] border-[#172b44] bg-[#91dcc4] px-4 py-2 text-sm font-black shadow-[3px_3px_0_#172b44] disabled:opacity-50">
            Verify & publish
          </button>
        </form>
        {error ? <p className="mt-2 text-xs font-bold text-[#ef6b59]">{error}</p> : null}
      </div>
    </div>
  );
}
