import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Clock, ExternalLink, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/hooks/useToast';
import { useBrand } from '@/hooks/useBrand';
import { authoritiesForScope } from '@/data/authorities';

/** Official CivicEye contact inbox — used across the contact + escalation flows. */
export const CIVICEYE_CONTACT_EMAIL = 'info@civiceye.co.in';

const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your name.'),
  email: z.string().email('Please enter a valid email address.'),
  subject: z.string().min(4, 'Please add a short subject.'),
  message: z.string().min(10, 'Your message should be at least 10 characters.'),
  ward: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

const INFO: Array<{ icon: typeof Mail; label: string; value: string; href?: string }> = [
  { icon: Mail, label: 'Email', value: CIVICEYE_CONTACT_EMAIL, href: `mailto:${CIVICEYE_CONTACT_EMAIL}` },
  { icon: Phone, label: 'Helpline', value: '1533 · 1912 · 19145 (govt helplines)' },
  { icon: MapPin, label: 'Serving', value: 'Bengaluru, Karnataka, India' },
  { icon: Clock, label: 'Response time', value: 'Within 1–2 working days' },
];

/** Contact page with a validated form — opens the user's mail client. */
export function Contact() {
  const toast = useToast();
  const { isAmrita } = useBrand();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (data: ContactForm) => {
    // Open the user's mail app with everything pre-filled to the official inbox.
    const subject = encodeURIComponent(data.subject);
    const body = encodeURIComponent(
      `Hi CivicEye team,\n\n${data.message}\n\n— ${data.name}${data.email ? ` (${data.email})` : ''}${data.ward ? `\nArea/Ward: ${data.ward}` : ''}`,
    );
    window.location.href = `mailto:${CIVICEYE_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    await new Promise((r) => setTimeout(r, 600));
    console.info('[CivicEye] contact form opened mail client for', data);
    setSent(true);
    toast.success('Opening your mail app…', `Your message is addressed to ${CIVICEYE_CONTACT_EMAIL}.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact us"
        title="Talk to the team"
        description="Questions, partnerships, or a ward office that wants in? We\u2019d love to hear from you."
      />

      <section className="section-pad py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Info panel */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 lg:col-span-2"
          >
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Reach us directly
              </h2>
              <ul className="mt-5 space-y-4">
                {INFO.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {item.label}
                      </p>
                      {'href' in item && item.href ? (
                        <a
                          href={item.href}
                          className="text-sm font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="break-words text-sm font-medium text-slate-700 dark:text-slate-200">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card relative overflow-hidden brand-cta p-6 text-white">
              <h3 className="text-base font-bold">Official reporting inbox</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/85">
                Escalated citizen reports and official correspondence land here. Prefer the
                department portals below — they go straight to the responsible civic body.
              </p>
              <a
                href={`mailto:${CIVICEYE_CONTACT_EMAIL}`}
                className="mt-4 inline-block text-sm font-semibold underline underline-offset-2"
              >
                {CIVICEYE_CONTACT_EMAIL}
              </a>
            </div>
          </motion.aside>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="card p-6 sm:p-8">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-12 text-center"
                >
                  <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-500" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Message sent! 🎉
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Thanks for reaching out! Your email app just opened with your message
                    addressed to {CIVICEYE_CONTACT_EMAIL} — hit send and our team will get back to
                    you within 1–2 working days.
                  </p>
                  <button onClick={() => setSent(false)} className="btn-secondary mt-6">
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="label-base">
                        Full name
                      </label>
                      <input
                        id="name"
                        {...register('name')}
                        className="input-base"
                        placeholder="e.g. Ananya Rao"
                        aria-invalid={Boolean(errors.name)}
                      />
                      {errors.name ? (
                        <p className="mt-1.5 text-xs font-medium text-rose-600">
                          {errors.name.message}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="email" className="label-base">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...register('email')}
                        className="input-base"
                        placeholder="you@example.com"
                        aria-invalid={Boolean(errors.email)}
                      />
                      {errors.email ? (
                        <p className="mt-1.5 text-xs font-medium text-rose-600">
                          {errors.email.message}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="label-base">
                      Subject
                    </label>
                    <input
                      id="subject"
                      {...register('subject')}
                      className="input-base"
                      placeholder="How can we help?"
                      aria-invalid={Boolean(errors.subject)}
                    />
                    {errors.subject ? (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.subject.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="ward" className="label-base">
                      Ward / area (optional)
                    </label>
                    <input
                      id="ward"
                      {...register('ward')}
                      className="input-base"
                      placeholder="e.g. Koramangala"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="label-base">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      {...register('message')}
                      className="input-base resize-none"
                      placeholder="Tell us what\u2019s on your mind…"
                      aria-invalid={Boolean(errors.message)}
                    />
                    {errors.message ? (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">
                        {errors.message.message}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Send className="h-4 w-4 animate-pulse" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Real authority reporting — every civic body a report can be escalated to */}
      <section className="border-t border-slate-200/70 bg-white/50 py-14 dark:border-white/5 dark:bg-white/[0.02] sm:py-16">
        <div className="section-pad">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
                <ShieldCheck className="h-4 w-4" /> Report to the right authority
              </p>
              <h2 className="heading-lg mt-1">Where your civic reports go</h2>
            </div>
            <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
              When you report an issue, it is auto-routed to the department below that owns that
              category — and the app emails a consolidated report to our official inbox. Use the
              portal buttons to also file it directly with the department.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {authoritiesForScope(isAmrita ? 'campus' : 'city').map((a) => (
              <div key={a.id} className="card flex h-full flex-col p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${a.color}22`, color: a.color }}
                  >
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {a.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-400">{a.department}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Handles: {a.categories.map((c) => c.replace(/-/g, ' ')).join(' · ')}
                </p>
                {a.hours ? (
                  <p className="mt-1 text-xs text-slate-400">{a.hours}</p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {a.portalUrl ? (
                    <a
                      href={a.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Official portal
                    </a>
                  ) : null}
                  <a
                    href={`mailto:${CIVICEYE_CONTACT_EMAIL}?subject=${encodeURIComponent(
                      `Report for ${a.name} (${a.department})`,
                    )}`}
                    className="text-xs font-semibold text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                  >
                    Email us instead
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            For emergencies call 112 · Reports are verified by the community before they reach the
            department.
          </p>
        </div>
      </section>
    </>
  );
}
