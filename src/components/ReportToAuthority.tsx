import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
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
  Wrench,
} from 'lucide-react';
import { Modal } from './Modal';
import { AuthorityContactCard } from './AuthorityContactCard';
import type { Authority, Report } from '@/types';
import { authorityForCategory, bbmpGrievanceEmailFor, hasEscalationEmail, telLink } from '@/data/authorities';
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
import { useToast } from '@/hooks/useToast';
import { useNotifications } from '@/hooks/useNotifications';
import { useBrand } from '@/hooks/useBrand';
import { useAuth } from '@/hooks/useAuth';
import { findRoadContract, isUnderWarranty } from '@/services/roadContracts';
import { cn } from '@/utils/cn';

interface ReportToAuthorityProps {
  /** The real report being escalated. Omit for a generic/bulk escalation. */
  report?: Report;
  /** What is being sent (e.g. "your report" or "the selected ward package"). */
  subject?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  onDone?: () => void;
}

const SENDING_STEPS = [
  'Compiling report package…',
  'Attaching evidence photo & coordinates…',
  `Routing to the responsible office…`,
  'Awaiting delivery confirmation…',
];

type Phase = 'compose' | 'sending' | 'done' | 'fallback' | 'failed';

/**
 * Report to Authority — REAL escalation.
 *
 * Shows the authority responsible for the report's category with its public
 * contact channels (call / WhatsApp / email), and emails a formatted report
 * package to the authority's official inbox via /api/report-authority.
 *
 * If SMTP isn't configured on the server, the flow degrades gracefully to a
 * pre-filled email in the citizen's own mail app — nothing breaks.
 */
export function ReportToAuthority({
  report,
  subject = 'your report',
  label = 'Report to authority',
  variant = 'primary',
  className,
  onDone,
}: ReportToAuthorityProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('compose');
  const [stepIndex, setStepIndex] = useState(0);
  const [escRef, setEscRef] = useState<string>('');
  const [note, setNote] = useState('');
  const toast = useToast();
  const notifications = useNotifications();
  const { isAmrita } = useBrand();
  const { user, profile } = useAuth();
  const timerRef = useRef<number | null>(null);

  const scope: 'city' | 'campus' = report?.scope ?? (isAmrita ? 'campus' : 'city');
  const authority: Authority = useMemo(
    () => authorityForCategory(report?.category, scope),
    [report?.category, scope],
  );
  const reporterEmail = user?.email ?? profile?.email ?? null;
  const reporterId = user?.id ?? null;

  // Road-contractor warranty check (city roads only): if the reported road is
  // under a contractor's defect-liability window, the builder must fix it.
  const roadContract = report && scope === 'city' ? findRoadContract(report.locationName) : null;
  const contractWarrantyActive = roadContract ? isUnderWarranty(roadContract) : false;

  const resolvedLabel = isAmrita && !report ? 'Report to staff' : label;
  const phoneHref = telLink(authority);
  const waTargets = report ? escalationWhatsAppTargets(report, authority) : [];
  const smsHref = report ? escalationSmsUrl(report, authority) : undefined;

  // Zone-aware grievance email: BBMP roads are handled zone-wise, so for a
  // city road report we prefer the matching zone's email (East/West/South/
  // Mahadevapura) over the central cell. Others use authority.email.
  const zoneEmail = !isAmrita && report ? bbmpGrievanceEmailFor(report.locationName) : '';
  const emailAvailable = hasEscalationEmail(authority) || Boolean(zoneEmail);
  const mailAuthority = zoneEmail ? { ...authority, email: zoneEmail } : authority;
  const mailToHref = emailAvailable
    ? report
      ? escalationMailToUrl(report, mailAuthority, reporterEmail, note.trim() || undefined)
      : mailAuthority.email
      ? `mailto:${mailAuthority.email}`
      : undefined
    : undefined;

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    [],
  );

  const log = (channel: 'email' | 'whatsapp' | 'phone' | 'sms' | 'mailto') => {
    void logEscalation({
      report: report ?? null,
      authority,
      channel,
      reporterId,
      reporterEmail,
      message: note.trim() || undefined,
    });
  };

  /** Send the escalation through the serverless email gateway. */
  const send = async () => {
    if (!report) return;
    setPhase('sending');
    setStepIndex(0);

    // Drive the progress animation while the request is in flight.
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i = Math.min(i + 1, SENDING_STEPS.length - 1);
      setStepIndex(i);
    }, 520);

    try {
      const payload = await buildEscalationPayload(report, authority, reporterEmail, note.trim() || undefined);
      const result = await sendEscalationEmail(payload);

      if (timerRef.current) window.clearInterval(timerRef.current);
      setEscRef(result.ref);

      if (result.status === 'not-configured') {
        // No SMTP on the server — try the third-party EmailJS sender next.
        if (isEmailJSConfigured) {
          const ref = newEscalationRef();
          try {
            await sendEscalationViaEmailJS(
              report,
              authority,
              reporterEmail,
              note.trim() || undefined,
              ref,
            );
            await logEscalation({
              report,
              authority,
              channel: 'email',
              reporterId,
              reporterEmail,
              message: note.trim() || undefined,
            });
            setEscRef(ref);
            setPhase('done');
            toast.success('Report sent!', `${authority.name} has been emailed your report package.`);
            notifications.add({
              type: 'report',
              title: 'Report sent to authority',
              message: `${report.title} was emailed to ${authority.name} (ref ${ref}).`,
            });
            onDone?.();
            return;
          } catch {
            // EmailJS failed too — fall through to the mail app fallback.
          }
        }
        setPhase('fallback');
        return;
      }

      await logEscalation({
        report,
        authority,
        channel: 'email',
        reporterId,
        reporterEmail,
        message: note.trim() || undefined,
      });
      setPhase('done');
      toast.success('Report sent!', `${authority.name} has been emailed your report package.`);
      notifications.add({
        type: 'report',
        title: 'Report sent to authority',
        message: `${report.title} was emailed to ${authority.name} (ref ${result.ref}).`,
      });
      onDone?.();
    } catch (err) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setPhase('failed');
      toast.error(
        'Could not send the email',
        err instanceof Error ? err.message : 'Please try again or use a direct channel below.',
      );
    }
  };

  const close = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setOpen(false);
    // Reset so reopening starts fresh from the compose view.
    window.setTimeout(() => {
      setPhase('compose');
      setStepIndex(0);
      setEscRef('');
    }, 250);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          variant === 'primary' && 'btn-primary',
          variant === 'secondary' && 'btn-secondary',
          variant === 'ghost' && 'btn-ghost',
          variant === 'danger' && 'btn-danger',
          className,
        )}
      >
        <Send className="h-4 w-4" />
        {resolvedLabel}
      </button>

      <Modal
        open={open}
        onClose={phase === 'sending' ? undefined : close}
        hideClose={phase === 'sending'}
        title={isAmrita ? 'Report to campus staff' : 'Report to authority'}
      >
        <div className="px-6 py-8">
          <AnimatePresence mode="wait">
            {/* ------------------------------ compose ------------------------------ */}
            {phase === 'compose' ? (
              <motion.div
                key="compose"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <AuthorityContactCard authority={authority} />

                {/* Official complaint portal — the most reliable channel */}
                {authority.portalUrl && !isAmrita ? (
                  <a
                    href={authority.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-500"
                  >
                    <ExternalLink className="h-4 w-4" />
                    File on {authority.name.split(' ').slice(0, 2).join(' ')} official portal
                  </a>
                ) : null}

                {/* Contractor / warranty callout (city roads under DLP) */}
                {roadContract ? (
                  <div
                    className={`mt-3 flex items-start gap-3 rounded-2xl border p-4 text-left ${
                      contractWarrantyActive
                        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                        : 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                    }`}
                  >
                    <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {contractWarrantyActive ? (
                        <>
                          <p className="font-bold text-emerald-700 dark:text-emerald-300">
                            This road is under a contractor warranty.
                          </p>
                          <p className="mt-1">
                            {roadContract.corridor} · {roadContract.contractor} · covered until{' '}
                            {roadContract.warrantyUntil}. Mention the contract{' '}
                            {roadContract.contractRef} when you report — the builder (not the
                            taxpayer) should fix it. ({roadContract.source})
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-amber-700 dark:text-amber-300">
                            Possible contractor liability
                          </p>
                          <p className="mt-1">
                            {roadContract.corridor} ({roadContract.contractor}, warranty ended{' '}
                            {roadContract.warrantyUntil}). Ask the ward to confirm — if it failed
                            within the defect-liability window, the contractor must still fix it.
                            ({roadContract.source})
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : report && scope === 'city' ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                    💡 Many new roads carry a contractor warranty — mention{' '}
                    <strong>“please check if this road is under a defect-liability contract”</strong>{' '}
                    in your note and the office can route the fix to the builder for free.
                  </p>
                ) : null}

                {report ? (
                  <div className="mt-4">
                    <label
                      htmlFor="rta-note"
                      className="text-xs font-bold uppercase tracking-widest text-slate-400"
                    >
                      Add a note (optional)
                    </label>
                    <textarea
                      id="rta-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Anything urgent the office should know…"
                      className="input-base mt-2 w-full resize-none text-sm"
                    />
                  </div>
                ) : null}

                {report && emailAvailable ? (
                  <>
                    <button onClick={() => void send()} className="btn-primary mt-4 w-full">
                      <Mail className="h-4 w-4" />
                      Email report package to{' '}
                      {authority.name.split(' ').slice(0, 3).join(' ')}
                      {zoneEmail ? ' (your BBMP zone)' : ''}
                    </button>
                    <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-400">
                      {zoneEmail
                        ? `Goes to ${zoneEmail} — the grievance cell for your zone.`
                        : `The ${isAmrita ? 'campus office' : 'authority'} receives the report details, evidence photo link and GPS coordinates by email.`}
                    </p>
                  </>
                ) : report && !emailAvailable ? (
                  <p className="mt-4 rounded-2xl border border-sky-200/70 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                    This department has no public grievance inbox — the fastest channels are the
                    official portal, the helpline above, or WhatsApp below. Your CivicEye report is
                    still logged so the team can follow up.
                  </p>
                ) : (
                  <p className="mt-4 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Pick how you'd like to reach the {isAmrita ? 'campus office' : 'office'} about{' '}
                    {subject}.
                  </p>
                )}

                {/* Direct channels */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {phoneHref ? (
                    <a href={phoneHref} onClick={() => log('phone')} className="btn-secondary !px-2 text-xs">
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  ) : null}
                  {waTargets.map((t) => (
                    <a
                      key={t.number}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => log('whatsapp')}
                      className="btn-secondary !px-2 text-xs"
                      title={`WhatsApp +${t.number}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WA ·{t.number.slice(-5)}
                    </a>
                  ))}
                  {report && smsHref ? (
                    <a href={smsHref} onClick={() => log('sms')} className="btn-secondary !px-2 text-xs">
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </a>
                  ) : null}
                  {mailToHref ? (
                    <a
                      href={mailToHref}
                      onClick={() => log('mailto')}
                      className="btn-secondary !px-2 text-xs"
                    >
                      <Mail className="h-4 w-4" />
                      Mail app
                    </a>
                  ) : null}
                </div>
              </motion.div>
            ) : null}

            {/* ------------------------------ sending ------------------------------ */}
            {phase === 'sending' ? (
              <motion.div
                key="sending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-4 text-center"
              >
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary-500/20" />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-glow">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Sending to {authority.name}…
                </h3>
                <div className="mx-auto mt-6 max-w-xs space-y-3 text-left">
                  {SENDING_STEPS.map((step, idx) => (
                    <div key={step} className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                          idx < stepIndex
                            ? 'bg-emerald-500 text-white'
                            : idx === stepIndex
                              ? 'bg-primary-500 text-white'
                              : 'bg-slate-100 text-slate-400 dark:bg-white/10',
                        )}
                      >
                        {idx < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                      </span>
                      <span
                        className={cn(
                          'text-sm',
                          idx <= stepIndex
                            ? 'text-slate-700 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-500',
                        )}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}

            {/* ------------------------------- done -------------------------------- */}
            {phase === 'done' ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="py-4 text-center"
              >
                <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                  {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <motion.span
                      key={deg}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Math.cos((deg * Math.PI) / 180) * 64,
                        y: Math.sin((deg * Math.PI) / 180) * 64,
                        opacity: 0,
                        scale: 0.3,
                      }}
                      transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
                      className="absolute h-2.5 w-2.5 rounded-full"
                      style={{ background: `hsl(${deg + 40} 85% 60%)` }}
                    />
                  ))}
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
                    className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow-emerald"
                  >
                    <CheckCircle2 className="h-9 w-9" />
                  </motion.span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Delivered! 🎉
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Your report package — with the evidence photo and GPS coordinates — was emailed to{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{authority.name}</strong>.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                  <span className="chip">
                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />
                    Escalation {escRef}
                  </span>
                  <span className="chip">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    SLA: 7 working days
                  </span>
                </div>
                <button onClick={close} className="btn-primary mt-8">
                  Done
                </button>
              </motion.div>
            ) : null}

            {/* ------------------- fallback: mail not configured ------------------- */}
            {phase === 'fallback' ? (
              <motion.div
                key="fallback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-4 text-center"
              >
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Mail className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  One last step — send it from your mail app
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  The direct email gateway isn't configured on this deployment yet, so we've
                  pre-filled everything for you. Tap below — your mail app opens with the full
                  report addressed to <strong>{authority.email}</strong>.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <a href={mailToHref} onClick={() => log('mailto')} className="btn-primary">
                    <ExternalLink className="h-4 w-4" />
                    Open pre-filled email
                  </a>
                  {escRef ? (
                    <span className="chip text-xs font-semibold">
                      <FileCheck2 className="h-3.5 w-3.5 text-primary-500" />
                      Reference {escRef}
                    </span>
                  ) : null}
                </div>
                <button onClick={close} className="btn-ghost mt-4">
                  Close
                </button>
              </motion.div>
            ) : null}

            {/* ------------------------------- failed ------------------------------ */}
            {phase === 'failed' ? (
              <motion.div
                key="failed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-4 text-center"
              >
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  The email didn't go through
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  You can retry, or reach {authority.name} directly — every channel below includes
                  your report details.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <button onClick={() => void send()} className="btn-primary">
                    Retry email
                  </button>
                  {phoneHref ? (
                    <a href={phoneHref} onClick={() => log('phone')} className="btn-secondary">
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  ) : null}
                  {waTargets.map((t) => (
                    <a
                      key={t.number}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => log('whatsapp')}
                      className="btn-secondary"
                      title={`WhatsApp +${t.number}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp ·{t.number.slice(-5)}
                    </a>
                  ))}
                  <a href={mailToHref} onClick={() => log('mailto')} className="btn-secondary">
                    <Mail className="h-4 w-4" />
                    Mail app
                  </a>
                </div>
                <button onClick={close} className="btn-ghost mt-4">
                  Close
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Modal>
    </>
  );
}
