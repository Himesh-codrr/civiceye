import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from './Modal';
import { AuthorityContactCard } from './AuthorityContactCard';
import type { Report } from '@/types';
import {
  escalationAuthorityFor,
  hasEscalationEmail,
  telLink,
} from '@/data/authorities';
import {
  buildEscalationPayload,
  escalationMailToUrl,
  escalationSmsUrl,
  escalationWhatsAppTargets,
  isEmailJSConfigured,
  logEscalation,
  newEscalationRef,
  sendEscalationEmail,
  sendEscalationViaEmailJS,
} from '@/services/authorityService';
import { useReports } from '@/hooks/useReports';
import { useToast } from '@/hooks/useToast';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { getEscalationTarget, formatSLATime } from '@/services/slaService';
import { cn } from '@/utils/cn';

interface EscalateBreachProps {
  report: Report;
  className?: string;
}

const SENDING_STEPS = [
  'Composing SLA-breach notice…',
  'Attaching overdue evidence & SLA history…',
  `Routing to the higher office…`,
  'Bumping escalation level in the record…',
];

type Phase = 'compose' | 'sending' | 'done' | 'fallback' | 'failed';

/**
 * Escalate a SLA-breached report to the NEXT higher government / campus
 * authority. Visible only when the SLA deadline has passed. Mirrors the
 * ReportToAuthority flow (server email → EmailJS → mailto: fallback) but
 * targets the escalation chain (BBMP Commissioner → Chief/Mayor → State
 * UDD for city; Estate → Dean → VC for campus), prefixes the subject with
 * "[SLA BREACH — LEVEL X]", and increments `report.escalation.level` in
 * Supabase on success so it cannot be double-sent to the same level.
 */
export function EscalateBreach({ report, className }: EscalateBreachProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('compose');
  const [stepIndex, setStepIndex] = useState(0);
  const [escRef, setEscRef] = useState('');
  const [note, setNote] = useState('');
  const toast = useToast();
  const notifications = useNotifications();
  const { user, profile } = useAuth();
  const { escalateReport } = useReports();
  const timerRef = useRef<number | null>(null);

  const currentLevel = report.escalation?.level || 0;
  const scope: 'city' | 'campus' = report.scope || 'city';
  const target = useMemo(
    () => escalationAuthorityFor(scope, currentLevel),
    [scope, currentLevel],
  );

  const overdueHours = Math.max(
    0,
    (Date.now() - new Date(report.date).getTime()) / 3_600_000,
  );

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    [],
  );

  if (!target) return null; // at the top of the chain already

  const reporterEmail = user?.email ?? profile?.email ?? null;
  const reporterId = user?.id ?? null;
  const phoneHref = telLink(target);
  const breachNote = `⚠️ SLA BREACH (Level ${currentLevel + 1}): Report ${report.code || report.id} "${report.title}" (${report.category}, ${report.severity}) was submitted ${formatSLATime(-overdueHours)} ago and the responsible office (${getEscalationTarget({ ...report, escalation: { level: currentLevel, escalatedAt: report.escalation?.escalatedAt || report.date, reason: 'SLA' } as any })}) has not resolved it. Please intervene.`;
  const userNote = note.trim();
  const composedMessage = userNote ? `${breachNote}\n\nCitizen note: ${userNote}` : breachNote;
  const waTargets = escalationWhatsAppTargets(report, target);
  const smsHref = escalationSmsUrl(report, target, { level: currentLevel + 1 });
  const mailToHref = hasEscalationEmail(target)
    ? escalationMailToUrl(report, target, reporterEmail, composedMessage, {
        slaBreach: true,
        level: currentLevel + 1,
      })
    : undefined;

  const logCh = (channel: 'email' | 'whatsapp' | 'phone' | 'sms' | 'mailto') => {
    void logEscalation({
      report,
      authority: target,
      channel,
      reporterId,
      reporterEmail,
      message: composedMessage,
    });
  };

  const finishEscalation = async () => {
    try {
      await escalateReport(
        report.id,
        `SLA breached (${Math.round(overdueHours)}h overdue) — escalated to ${target.name} via email/SMS by ${reporterEmail || 'citizen'}.`,
      );
    } catch (e) {
      console.warn('[escalate] failed to bump level in DB:', e);
    }
  };

  const send = async () => {
    setPhase('sending');
    setStepIndex(0);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i = Math.min(i + 1, SENDING_STEPS.length - 1);
      setStepIndex(i);
    }, 520);

    try {
      const payload = await buildEscalationPayload(report, target, reporterEmail, composedMessage, {
        slaBreach: true,
        level: currentLevel + 1,
      });

      const result = await sendEscalationEmail(payload);

      if (timerRef.current) window.clearInterval(timerRef.current);
      setEscRef(result.ref);

      const handleSuccess = async (channel: 'email' | 'mailto') => {
        await logEscalation({
          report,
          authority: target,
          channel,
          reporterId,
          reporterEmail,
          message: composedMessage,
        });
        await finishEscalation();
        setPhase('done');
        toast.success(
          'Escalated!',
          `${target.name} has been notified of the SLA breach.`,
        );
        notifications.add({
          type: 'report',
          title: `Escalated to ${target.name}`,
          message: `${report.title} — SLA breach notice sent (ref ${result.ref || escRef}).`,
        });
      };

      if (result.status === 'not-configured') {
        if (isEmailJSConfigured) {
          const ref = newEscalationRef();
          try {
            await sendEscalationViaEmailJS(
              report,
              target,
              reporterEmail,
              composedMessage,
              ref,
              { slaBreach: true, level: currentLevel + 1 },
            );
            setEscRef(ref);
            await logEscalation({
              report,
              authority: target,
              channel: 'email',
              reporterId,
              reporterEmail,
              message: composedMessage,
            });
            await finishEscalation();
            setPhase('done');
            toast.success(
              'Escalated!',
              `${target.name} has been notified of the SLA breach.`,
            );
            return;
          } catch {
            /* fall through to mailto */
          }
        }
        setPhase('fallback');
        return;
      }

      await handleSuccess('email');
    } catch (err) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setPhase('failed');
      toast.error(
        'Could not send the escalation',
        err instanceof Error ? err.message : 'Try a direct channel below.',
      );
    }
  };

  const close = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setOpen(false);
    window.setTimeout(() => {
      setPhase('compose');
      setStepIndex(0);
      setEscRef('');
      setNote('');
    }, 250);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:from-rose-500 hover:to-red-600',
          className,
        )}
      >
        <ArrowUpRight className="h-4 w-4" />
        Escalate to higher authority ({getEscalationTarget({
          ...report,
          escalation: {
            level: currentLevel + 1,
            escalatedAt: new Date().toISOString(),
            reason: 'SLA breach',
          },
        })})
      </button>

      <Modal
        open={open}
        onClose={phase === 'sending' ? undefined : close}
        hideClose={phase === 'sending'}
        title={`SLA breach · Escalate to L${currentLevel + 1}`}
      >
        <div className="px-6 py-8">
          <AnimatePresence mode="wait">
            {phase === 'compose' ? (
              <motion.div key="compose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-left dark:border-rose-500/30 dark:bg-rose-500/10">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div className="min-w-0 flex-1 text-xs leading-relaxed text-rose-900 dark:text-rose-100">
                    <p className="font-bold">This report has breached its SLA.</p>
                    <p className="mt-1">
                      It was filed <strong>{formatSLATime(-overdueHours)}</strong> ago. The current
                      office ({getEscalationTarget({
                        ...report,
                        escalation: {
                          level: currentLevel,
                          escalatedAt: report.escalation?.escalatedAt || report.date,
                          reason: 'SLA',
                        },
                      } as any)}){currentLevel === 0 ? ' (initial assignment)' : ` (L${currentLevel})`} hasn't resolved it.
                      You can escalate to <strong>{target.name}</strong> via email or SMS below.
                    </p>
                  </div>
                </div>

                <AuthorityContactCard authority={target} />

                {target.portalUrl ? (
                  <a
                    href={target.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    File on {target.name.split(' ').slice(0, 3).join(' ')} official portal
                  </a>
                ) : null}

                <div className="mt-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Add a personal note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Any additional context for the higher office…"
                    className="input-base mt-2 w-full resize-none text-sm"
                  />
                </div>

                <button onClick={() => void send()} className="btn-primary mt-4 w-full !bg-rose-600 hover:!bg-rose-500">
                  <Send className="h-4 w-4" />
                  Email SLA-breach notice to {target.name.split(' ').slice(0, 3).join(' ')}
                </button>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {phoneHref ? (
                    <a href={phoneHref} onClick={() => logCh('phone')} className="btn-secondary !px-2 text-xs">
                      <Phone className="h-4 w-4" /> Call
                    </a>
                  ) : null}
                  {waTargets.map((t) => (
                    <a
                      key={t.number}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => logCh('whatsapp')}
                      className="btn-secondary !px-2 text-xs"
                      title={`WhatsApp +${t.number}`}
                    >
                      <MessageCircle className="h-4 w-4" /> WA ·{t.number.slice(-5)}
                    </a>
                  ))}
                  {smsHref ? (
                    <a href={smsHref} onClick={() => { logCh('sms'); void finishEscalation(); }} className="btn-secondary !px-2 text-xs">
                      <MessageSquare className="h-4 w-4" /> SMS
                    </a>
                  ) : null}
                  {mailToHref ? (
                    <a href={mailToHref} onClick={() => { logCh('mailto'); void finishEscalation(); }} className="btn-secondary !px-2 text-xs">
                      <Mail className="h-4 w-4" /> Mail app
                    </a>
                  ) : null}
                </div>
              </motion.div>
            ) : null}

            {phase === 'sending' ? (
              <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 text-center">
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/20" />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-glow">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Escalating to {target.name}…</h3>
                <div className="mx-auto mt-6 max-w-xs space-y-3 text-left">
                  {SENDING_STEPS.map((step, idx) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', idx < stepIndex ? 'bg-emerald-500 text-white' : idx === stepIndex ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10')}>
                        {idx < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span className={cn('text-sm', idx <= stepIndex ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400')}>{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}

            {phase === 'done' ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="py-4 text-center">
                <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                  <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow-emerald">
                    <CheckCircle2 className="h-9 w-9" />
                  </motion.span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Escalated ✓</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  The SLA-breach notice was sent to <strong className="text-slate-700 dark:text-slate-200">{target.name}</strong>, and this report's escalation level is now <strong>L{currentLevel + 1}</strong>.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                  <span className="chip">
                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" /> Escalation {escRef}
                  </span>
                  <span className="chip">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> L{currentLevel + 1} of {scope === 'city' ? 3 : 2}
                  </span>
                </div>
                <button onClick={close} className="btn-primary mt-8">Done</button>
              </motion.div>
            ) : null}

            {phase === 'fallback' ? (
              <motion.div key="fallback" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-4 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Mail className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Send via your mail / SMS app</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  The direct email gateway isn't configured on this deployment — we've pre-filled an SLA-breach message to <strong>{target.email || target.name}</strong>. Send it from your mail app or use SMS/WhatsApp below; the escalation level will still be bumped.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  {mailToHref ? (
                    <a href={mailToHref} onClick={() => { logCh('mailto'); void finishEscalation(); }} className="btn-primary">
                      <ExternalLink className="h-4 w-4" /> Open pre-filled email
                    </a>
                  ) : null}
                  {smsHref ? (
                    <a href={smsHref} onClick={() => { logCh('sms'); void finishEscalation(); }} className="btn-secondary">
                      <MessageSquare className="h-4 w-4" /> Open pre-filled SMS
                    </a>
                  ) : null}
                </div>
                <button onClick={close} className="btn-ghost mt-4">Close</button>
              </motion.div>
            ) : null}

            {phase === 'failed' ? (
              <motion.div key="failed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-4 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">The escalation didn't go through</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  You can retry, or reach {target.name} directly via the channels below.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <button onClick={() => void send()} className="btn-primary !bg-rose-600">Retry email</button>
                  {phoneHref ? <a href={phoneHref} onClick={() => logCh('phone')} className="btn-secondary"><Phone className="h-4 w-4" /> Call</a> : null}
                  {smsHref ? <a href={smsHref} onClick={() => { logCh('sms'); void finishEscalation(); }} className="btn-secondary"><MessageSquare className="h-4 w-4" /> SMS</a> : null}
                  {mailToHref ? <a href={mailToHref} onClick={() => { logCh('mailto'); void finishEscalation(); }} className="btn-secondary"><Mail className="h-4 w-4" /> Mail app</a> : null}
                </div>
                <button onClick={close} className="btn-ghost mt-4">Close</button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Modal>
    </>
  );
}
