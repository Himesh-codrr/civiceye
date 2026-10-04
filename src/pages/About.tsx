import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, GraduationCap, Heart, Lightbulb, MapPin, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SectionHeading } from '@/components/SectionHeading';
import { Reveal } from '@/components/Reveal';
import { Logo } from '@/components/Logo';
import { useBrand } from '@/hooks/useBrand';

const VALUES = [
  {
    icon: GraduationCap,
    title: 'Born in the hostel',
    text: 'We were students new to a city we knew nothing about. CivicEye exists so the next fresher never has to learn a pothole the hard way.',
  },
  {
    icon: Compass,
    title: 'City knowledge, shared',
    text: 'Broken lights, dark streets, flooded junctions — the things locals know and newcomers don\u2019t. We make that knowledge visible to everyone.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified by neighbours',
    text: 'Reports are confirmed by the people who live there. Numbers and community votes decide what gets fixed first — no one decides alone.',
  },
  {
    icon: Lightbulb,
    title: 'Progress you can see',
    text: 'When a report goes Pending \u2192 Verified \u2192 In progress \u2192 Resolved, everyone can watch it. Fixing things visibly builds trust.',
  },
];

const TIMELINE = [
  {
    date: '1 August 2026',
    title: 'The idea is born',
    text: 'Living in hostels in a brand-new city, we realised no one tells you where the potholes are, which streets go dark at night, or which junctions flood after rain. You find out by getting hurt. We decided to fix that.',
  },
  {
    date: 'August 2026',
    title: 'The first build',
    text: 'The very first version of CivicEye — a shared map where anyone can report what\u2019s broken, dark, flooded or unsafe, and neighbours can verify it. Real logins, real reports, live on a map.',
  },
  {
    date: 'Ongoing',
    title: 'Campus & city rollout',
    text: 'Amrita Eye brings the same idea inside campuses — water leaks, broken lights, suspicious activity — straight to the people who keep the campus safe.',
  },
  {
    date: 'Next',
    title: 'The mission',
    text: 'Help anyone new to a place — students, freshers, new residents — and the people already living there, understand the neighbourhood before trouble finds them.',
  },
];

const CREATORS = [
  {
    badge: 'AR',
    name: 'Archit Renjeev',
    role: 'Founder · Backend',
    lines: [
      'I’m a big optimist when it comes to building, and CivicEye holds a special place in my heart. What began as a small idea quickly evolved into a platform designed to serve others, driven by a simple question: with so many tools at our fingertips to create change, why not us? I’m immensely proud of our team for turning that spark into reality—and I’d build it all over again in a heartbeat.',
    ],
  },
  {
    badge: 'AS',
    name: 'Aswathram',
    role: 'Founder · AI & Backend',
    lines: [
      'Built the photo analysis and data layers so a snapped pothole becomes a classified, mapped pin in seconds.',
    ],
  },
  {
    badge: 'KI',
    name: 'Koushik',
    role: 'Founder · UI Designer',
    lines: [
      'Designed the citizen-facing experience — reporting in seconds, with every status legible at a glance.',
    ],
  },
  {
    badge: 'SH',
    name: 'S. Himeshkara',
    role: 'Founder · UI Designer',
    lines: [
      'I’m one of the UI designers behind CivicEye, part of the team building a safer Bharath — one report at a time. My goal was simple: design a page that stays with you, so you never forget that help is just a click away.',
      'CivicEye lets citizens report everyday hazards — broken streetlights, fallen trees, potholes — before they turn into tragedies. And with our SOS button, women can alert the police directly the moment they feel unsafe.',
    ],
    quote: 'Because safety shouldn’t be a privilege — it should be a right.',
  },
  {
    badge: 'NI',
    name: 'Niranjhan',
    role: 'Brand Outreach',
    lines: [
      'Leads brand outreach and partnerships — making sure CivicEye is known where it matters most: in campus administrations, student bodies, and the wardens who act on the reports.',
      'If you’ve seen CivicEye pop up at a campus event or reach a new city rollout, that’s his work.',
    ],
  },
];

/** Why the team built CivicEye — written by the founders. */
const MISSION =
  'Our team built CivicEye to solve a specific problem: urban hazards are frequently ignored until they cause harm. CivicEye is a reporting platform that allows citizens across India to document and track infrastructure failures like potholes and broken streetlights. Beyond infrastructure, we prioritize personal security. The platform features an SOS button designed specifically for women to instantly alert local law enforcement during emergencies. CivicEye exists to give citizens a practical tool to improve their surroundings and ensure their safety.';

/** About page. */
export function About() {
  const { meta, isAmrita } = useBrand();
  const appName = meta.appName;
  // Render-time brand substitution: any "CivicEye" mention in the static
  // story text becomes the active brand's name (e.g. "Amrita Eye").
  const b = (s: string) => s.replace(/CivicEye/g, appName);

  // Complete separation: CivicEye's About never mentions campus / Amrita Eye.
  const timeline = TIMELINE.filter((t) => isAmrita || t.title !== 'Campus & city rollout');
  const placeWord = isAmrita ? 'campus' : 'city';
  useEffect(() => {
    if (window.location.hash !== '#creators') return;
    const timer = window.setTimeout(() => {
      document.getElementById('creators')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 420);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={`About ${appName}`}
        title="Know your place before it bites"
        description={`${appName} is a shared, living map of what\u2019s broken, dark, flooded or unsafe in your ${placeWord} — reported and verified by the people around you, so newcomers and locals alike know where they\u2019re going.`}
      />

      <section className="section-pad py-16 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal direction="right">
            <SectionHeading
              align="left"
              eyebrow="Our story"
              title="From a hostel room to a safer city"
              className="mb-6"
            />
            <div className="space-y-4 text-slate-500 dark:text-slate-400">
              <p>
                Every year, thousands of students move to a new city and spend four years there
                knowing almost nothing about it. Where are the potholes that swallow bike wheels?
                Which streets have no lights at night? Which junction floods every monsoon? The
                answers exist — scattered across the memory of people who've lived there a long
                time. Newcomers just don't have access to them.
              </p>
              <p>
                {appName} started in the hostel as exactly that missing knowledge — a place where
                anyone can report what they see and neighbours can confirm it, so the whole map of
                "what to avoid" and "what to fix" is built together, one report at a time.
              </p>
              <p>
                It's for students and citizens who are new to a place, and for the people who live
                nearby — so a broken street light or a pothole costs you a scare instead of an
                accident, and a future headache turns into a fixed report.
              </p>
            </div>
          </Reveal>

          <Reveal direction="left" className="flex min-w-0 justify-center">
            <div className="relative w-full max-w-md overflow-hidden rounded-[2rem]">
              <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] brand-panel blur-2xl" />
              <div className="card relative max-w-none w-full p-6 text-center sm:p-8">
                <div className="flex justify-center">
                  <Logo iconOnly />
                </div>
                <p className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">
                  Made by students, for students
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  and for anyone new to their neighbourhood
                </p>
                <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 text-center">
                  {[
                    ['1 Aug', '2026'],
                    ['4 yrs', 'of college life'],
                    ['100%', 'community-built'],
                  ].map(([v, l]) => (
                    <div key={l} className="rounded-xl bg-slate-50 px-1 py-3 dark:bg-white/[0.04]">
                      <p className="text-base font-extrabold text-primary-600 dark:text-primary-400 sm:text-lg">
                        {v}
                      </p>
                      <p className="text-[10px] font-medium leading-tight text-slate-400 sm:text-[11px]">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="creators" className="scroll-mt-32 border-y border-slate-200/70 bg-white/60 py-14 dark:border-white/5 dark:bg-white/[0.02] sm:py-20">
        <div className="section-pad">
          <SectionHeading eyebrow="The team" title="Built by students" className="mb-6" />
          <p className="mx-auto mb-12 max-w-3xl text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-base">
            {b(MISSION)}
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {CREATORS.map((creator, index) => (
              <Reveal key={creator.name} delay={index * 0.08}>
                <article className="card h-full p-6">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-sm font-bold text-primary-600 dark:text-primary-400">
                      {creator.badge}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {creator.name}
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400">
                        {creator.role}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {creator.lines.map((line) => (
                      <p key={line.slice(0, 24)} className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {b(line)}
                      </p>
                    ))}
                    {creator.quote ? (
                      <p className="pt-1 text-sm font-semibold italic text-primary-600 dark:text-primary-400">
                        “{creator.quote}”
                      </p>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/report" className="btn-primary">
              Report a hazard
            </Link>
            <Link to="/contact" className="btn-secondary">
              Talk to the founders
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/60 py-16 dark:border-white/5 dark:bg-white/[0.02] sm:py-20">
        <div className="section-pad">
          <SectionHeading eyebrow="What we believe" title="The values behind the product" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="card h-full p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl brand-grad-1 text-white">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {b(v.text)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad py-16 sm:py-20">
        <SectionHeading eyebrow="Timeline" title="How this started" />
        <div className="mx-auto max-w-3xl">
          {timeline.map((t, i) => (
            <Reveal key={t.date} delay={i * 0.1}>
              <div className="relative flex gap-6 pb-10 last:pb-0">
                {i < timeline.length - 1 ? (
                  <span className="absolute left-[15px] top-9 h-full w-0.5 bg-gradient-to-b from-primary-400 to-accent-400/40" />
                ) : null}
                <span className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full brand-grad-1 text-[10px] font-bold text-white shadow-glow">
                  {i + 1}
                </span>
                <div className="card flex-1 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
                    {t.date}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {t.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {b(t.text)}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-pad pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl brand-cta p-10 text-center shadow-glow sm:p-14">
            <MapPin className="mx-auto mb-4 h-10 w-10 text-white/80" />
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              New to the neighbourhood?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-white/80 sm:text-base">
              See what the people around you already know — and add what you spot. It takes under a
              minute.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary-700 shadow-soft transition-all hover:-translate-y-0.5"
              >
                <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                Report an issue
              </Link>
              <Link
                to="/map"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
              >
                View the map
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
