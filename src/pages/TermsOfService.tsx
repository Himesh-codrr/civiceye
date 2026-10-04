import { Footer } from '@/components/Footer';
import { FooterAmrita } from '@/components/FooterAmrita';
import { Navbar } from '@/components/Navbar';
import { NavbarAmrita } from '@/components/NavbarAmrita';
import { useBrand } from '@/hooks/useBrand';
import { Logo } from '@/components/Logo';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: '1. Acceptance of terms',
    body: [
      'Welcome to CivicEye (and, for Amrita Vishwa Vidyapeetham Bengaluru campus users, its campus portal "Amrita Eye"). By accessing or using civiceye.co.in (the "Service") you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.',
      'You must be at least 13 years old to use the Service, and if you are under 18 you represent that your parent or guardian has reviewed and agreed to these terms with you.',
    ],
  },
  {
    heading: '2. What CivicEye does',
    body: [
      'CivicEye lets you submit geotagged photos and descriptions of public-infrastructure issues (potholes, garbage, broken lights, water logging, campus maintenance, etc.). Reports are displayed on a public map and community feed, and may be forwarded by you to the relevant civic or campus authority by email or SMS via the Service\'s "Report to authority" and SLA-escalation features.',
      'AI auto-detection is provided as a guide only. The category, confidence score, severity rating and annotated image are an automated suggestion, not a verified finding, and may be wrong.',
    ],
  },
  {
    heading: '3. Your account',
    body: [
      'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately of any unauthorised use.',
      'You may sign in with email/password or with Google. If you sign in with Google, you authorise us to receive your name, email address and profile picture from Google in accordance with their OAuth permissions.',
      'We reserve the right to suspend or terminate accounts that submit abusive, fraudulent, harassing, illegal or clearly bogus content.',
    ],
  },
  {
    heading: '4. Your content',
    body: [
      'You retain ownership of photos and text you submit. By submitting a report you grant CivicEye a worldwide, royalty-free, non-exclusive licence to host, display, annotate and transmit that content for the purpose of operating the Service (including sending it to the relevant civic/campus authority when you choose to escalate).',
      'You promise that: (a) you took the photo or have permission to submit it; (b) the report is truthful to the best of your knowledge; (c) the content does not violate any law or infringe anyone else\'s rights; (d) the report does not contain private personal information (phone numbers, faces of identifiable strangers, vehicle plates) beyond what is reasonably necessary to show the issue.',
      'Other users may upvote, comment on, and share your public reports. Reports are public and may appear in search engines.',
    ],
  },
  {
    heading: '5. Forwarding to authorities; no guarantee of response',
    body: [
      'When you tap "Report to authority" or escalate an SLA breach, CivicEye sends your report to publicly listed authority email addresses and/or SMS deep-links using your own messaging app. We make reasonable efforts to use the correct, up-to-date contact details, but we do not control the authority\'s inbox, response times or any action they may (or may not) take.',
      'CivicEye is not a government service and is not affiliated with BBMP, Amrita Vishwa Vidyapeetham, or any other authority listed on the platform. We do not guarantee that any report will be acknowledged, replied to, or fixed.',
    ],
  },
  {
    heading: '6. Acceptable use',
    body: [
      'You agree not to: (a) submit false, spam, or duplicate reports; (b) submit content that is defamatory, obscene, threatening, or hateful; (c) attempt to harm the Service or access other users\' accounts; (d) scrape the Service or use automated means to submit a high volume of reports; (e) impersonate another person or entity; (f) use the Service for emergencies — call your local emergency number (112/100/108) instead.',
    ],
  },
  {
    heading: '7. AI / third-party services',
    body: [
      'AI annotations are generated using CivicLENS AI (our in-house vision engine) and are provided as-is, without warranty. You should not rely on AI-detected categories for safety-critical decisions.',
      'Google sign-in is provided by Google and governed by Google\'s terms and privacy policy.',
      'The Service is hosted on Vercel and uses Supabase for authentication and data. Links to third-party sites are not endorsements.',
    ],
  },
  {
    heading: '8. Intellectual property',
    body: [
      'The CivicEye and Amrita Eye logos, source code, branding and UI design are © CivicEye contributors. Submitted reports are owned by their submitters and licensed to CivicEye as described in Section 4.',
    ],
  },
  {
    heading: '9. Disclaimer of warranties',
    body: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED OR STATUTORY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE OR SECURE, THAT AI ANNOTATIONS WILL BE ACCURATE, OR THAT REPORTS WILL BE ACTED UPON BY AUTHORITIES.',
    ],
  },
  {
    heading: '10. Limitation of liability',
    body: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CIVICEYE AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA OR GOODWILL ARISING OUT OF YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO INR 1,000.',
    ],
  },
  {
    heading: '11. Indemnity',
    body: [
      'You agree to indemnify and hold harmless CivicEye and its contributors from any claim, demand or damage arising from your use of the Service, your violation of these Terms, or your submission of content that infringes a third party\'s rights or violates law.',
    ],
  },
  {
    heading: '12. Modifications',
    body: [
      'We may update these Terms from time to time. Material changes will be announced with an in-app notice and the "Last updated" date at the top will be revised. Your continued use of the Service after the new terms take effect constitutes acceptance.',
    ],
  },
  {
    heading: '13. Contact & governing law',
    body: [
      'For questions about these Terms, email info@civiceye.co.in.',
      'These Terms are governed by the laws of India; disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.',
      'Last updated: 21 September 2026.',
    ],
  },
];

export function TermsOfService() {
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
          Terms of Service
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
