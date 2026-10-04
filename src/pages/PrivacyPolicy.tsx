import { Footer } from '@/components/Footer';
import { FooterAmrita } from '@/components/FooterAmrita';
import { Navbar } from '@/components/Navbar';
import { NavbarAmrita } from '@/components/NavbarAmrita';
import { useBrand } from '@/hooks/useBrand';
import { Logo } from '@/components/Logo';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: '1. Who we are',
    body: [
      'CivicEye is a civic-issue reporting platform that lets citizens report potholes, broken street lights, garbage dumps, water logging and similar public-infrastructure problems with a photo, GPS location and AI-assisted analysis. Reports are shared with the community and forwarded by email/SMS to the responsible civic authority (BBMP for city reports; the Estate Office / campus administration for Amrita Vishwa Vidyapeetham, Bengaluru campus reports).',
      'This policy describes what personal information CivicEye collects, how it is used, and the choices you have. It applies to the web app hosted at civiceye.co.in (the CivicEye city portal) and the Amrita Eye campus portal on the same deployment.',
    ],
  },
  {
    heading: '2. Information we collect',
    body: [
      'Account information: your email address, full name (if you provide it during sign-up), and a profile picture if you sign in with Google. We use this to sign you in, attribute your reports and votes to you, and contact you if an authority responds to your report.',
      'Report content: photos you upload, category/severity, free-text description, and the GPS coordinates of where you took the report. This information is displayed publicly (both on the map and on the community feed) so other users can verify the issue and authorities can act on it.',
      'Device & usage: browser user agent, approximate IP-derived location, and basic analytics about page views, button taps and report submission outcomes. We use this to debug errors and improve the platform.',
      'Cookies & local storage: a short-lived authentication cookie set by our backend provider (Supabase) to keep you signed in, and a small localStorage/sessionStorage entry to remember your last-used email on the login page. We do not use third-party advertising trackers.',
    ],
  },
  {
    heading: '3. How we use the information',
    body: [
      'To run the service: to create your account, sign you in, let you submit reports, and display your reports on the community map.',
      'To forward reports to authorities: when you tap "Report to authority" or the SLA-breach escalation button, we email your report (including photo, annotated image, map link and your reporter email if you provided one) to the civic or campus authority contact we have on file.',
      'To run AI annotation: photos you submit are sent to our AI vision provider (our CivicLENS AI vision engine) for object detection and severity classification. The provider processes the image only to return annotations back to us; they do not use them for model training unless you separately opt in on their platform.',
      'To enforce community standards and prevent abuse (spam, fake reports, harassment).',
    ],
  },
  {
    heading: '4. Sharing',
    body: [
      'Public: the content of your reports (photo, location, description, severity) is public on the CivicEye map and feed. Your email address is NOT shown to other members of the public — only your display name (derived from your name or the first part of your email).',
      'Authorities: when you escalate or submit a report to an authority, that authority receives your report content and, if you chose to include it, your reporter email so they can follow up with you.',
      'Service providers: we share the minimum necessary data with our hosting (Vercel), database (Supabase), AI annotation (our CivicLENS AI vision engine), and email (Nodemailer / SMTP) providers, all of whom process data on our behalf under contractual or equivalent confidentiality obligations.',
      'Required by law: we will disclose information when required by a valid legal request from a court or government agency.',
      'We do NOT sell your personal information and we do not serve third-party advertising.',
    ],
  },
  {
    heading: '5. Data retention & deletion',
    body: [
      'You can delete your account at any time by emailing us at the contact address below. Deleting your account removes your profile information; reports you have already submitted may remain on the map in anonymised form so they can continue to help the community, but they will no longer be linked to your account.',
      'You can edit or delete an individual report you submitted from the report details page at any time.',
      'We keep server logs for up to 30 days for debugging and abuse prevention, then delete or aggregate them.',
    ],
  },
  {
    heading: '6. Security',
    body: [
      'Authentication uses Supabase Auth with encrypted cookies (PKCE flow). Passwords never touch our servers — Supabase stores them salted-and-hashed using industry-standard bcrypt. All traffic to and from the app is served over HTTPS.',
      'No system is perfectly secure. If you discover a vulnerability, please email us rather than disclosing it publicly; we will respond within 72 hours.',
    ],
  },
  {
    heading: '7. Your rights',
    body: [
      'You have the right to access, correct, or delete personal information we hold about you; to object to or restrict certain processing; and to receive a copy of the personal information we have collected. You can exercise most of these rights directly in the app (edit profile, delete reports, sign out); for anything else, email us.',
      'If you signed in with Google, you can revoke CivicEye\'s access at any time from your Google account\'s Third-party apps page.',
      'If you are a student or staff member using the Amrita Eye campus portal, the same rights apply. Reports you submit may be shared with Amrita Vishwa Vidyapeetham\'s Estate Office and campus security.',
    ],
  },
  {
    heading: '8. Children',
    body: [
      'CivicEye is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If we learn that a child under 13 has submitted personal information to us, we will delete it.',
    ],
  },
  {
    heading: '9. Changes to this policy',
    body: [
      'We will post any updates to this policy on this page and note the new effective date at the top. If changes are material, we will also show an in-app notice.',
    ],
  },
  {
    heading: '10. Contact',
    body: [
      'For privacy questions, data requests, or vulnerability reports, email us at info@civiceye.co.in.',
      'Last updated: 21 September 2026.',
    ],
  },
];

export function PrivacyPolicy() {
  const { isAmrita } = useBrand();
  const Chrome = isAmrita ? { Nav: NavbarAmrita, Ft: FooterAmrita } : { Nav: Navbar, Ft: Footer };
  const appName = isAmrita ? 'Amrita Eye' : 'CivicEye';
  return (
    <div className="flex min-h-screen flex-col">
      <Chrome.Nav />
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-28">
        <div className="mb-8 flex items-center gap-3">
          <Logo />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Effective: 21 September 2026 · Applies to {appName}
        </p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className={i > 0 ? 'mt-3' : ''}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Chrome.Ft />
    </div>
  );
}
