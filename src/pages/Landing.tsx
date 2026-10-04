import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { founderThemes, isComicSoundOn, playBlip, setComicSoundOn } from '@/utils/comicSound';
import { useReports } from '@/hooks/useReports';
import { useBrand } from '@/hooks/useBrand';
import { useAuth } from '@/hooks/useAuth';

const steps = [
  ['01', 'Spot it', 'Notice a pothole, a dark street, or an open manhole.'],
  ['02', 'Snap it', 'Capture evidence with your phone.'],
  ['03', 'Pin it', 'We grab GPS, or you can drop a map pin.'],
  ['04', 'Verify it', 'Neighbours confirm the report.'],
  ['05', 'Fix it', 'Authorities assign, work, and resolve it.'],
];

const features = [
  { icon: Camera, title: 'Snap & Report', text: 'Photo evidence meets AI-assisted category and severity information.', tint: 'bg-[#ef6b59]' },
  { icon: MapPin, title: 'Live Community Map', text: 'Verified issues appear on a map with clusters, heatmaps, and filters.', tint: 'bg-[#28627a]' },
  { icon: Sparkles, title: 'AI Photo Analysis', text: 'Computer vision helps identify issue details in seconds.', tint: 'bg-[#5b806a]' },
];

/** The four founders of CivicEye — initials stand in until real photos are added. */
const creators = [
  ['AR', 'Archit Renjeev', 'Founder · Backend', '#ffd630'],
  ['AS', 'Aswathram', 'Founder · AI & Backend', '#91dcc4'],
  ['KI', 'Koushik', 'Founder · UI Designer', '#ef6b59'],
  ['SH', 'S. Himeshkara', 'Founder · UI Designer', '#28627a'],
];

/** Why the team built CivicEye — written by the founders. */
const mission =
  'Our team of four built CivicEye to solve a specific problem: urban hazards are frequently ignored until they cause harm. CivicEye is a reporting platform that allows citizens across India to document and track infrastructure failures like potholes and broken streetlights. Beyond infrastructure, we prioritize personal security. CivicEye exists to give citizens a practical tool to improve their surroundings and ensure their safety.';

/** Comic-book CivicEye landing page. Keeps existing routes and live report data intact. */
export function Landing() {
  const { reports } = useReports();
  const { isAmrita } = useBrand();
  const { user } = useAuth();
  const [promoOpen, setPromoOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [certificateIssued, setCertificateIssued] = useState(false);
  const [certificateName, setCertificateName] = useState('');
  const [certificatePlace, setCertificatePlace] = useState('');
  const [certificateImage, setCertificateImage] = useState('');
  const [soundOn, setSoundOn] = useState(isComicSoundOn);
  // Shows the sticky "ABOUT US" prompt once a visitor has left the hero, so it
  // stays in front of them for the rest of the page.
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const stats = useMemo(() => {
    const scoped = reports.filter((r) => r.scope === (isAmrita ? 'campus' : 'city'));
    return {
      total: scoped.length,
      verified: scoped.filter((r) => r.verified).length,
      resolved: scoped.filter((r) => r.status === 'resolved').length,
      votes: scoped.reduce((sum, r) => sum + r.upvotes, 0),
    };
  }, [reports, isAmrita]);

  const missionProgress = useMemo(() => {
    if (!user) return 2; // demo shows 2/3 for visitors
    const userReports = reports.filter((r) => r.userId === user.id || r.author === user.email || r.scope === (isAmrita ? 'campus' : 'city'));
    const verifiedCount = userReports.filter((r) => r.verified).length;
    const totalCount = userReports.length;
    // Mission: 3 verified reports or 3 total reports with at least 1 verified
    return Math.min(3, Math.max(verifiedCount, Math.min(totalCount, 2) + (verifiedCount > 0 ? 1 : 0)));
  }, [reports, user, isAmrita]);
  const missionComplete = missionProgress >= 3;


  /** Route all UI blips through the gesture-gated shared engine so we never
   *  construct an AudioContext before the user has interacted with the page
   *  (which would otherwise spam the "AudioContext prevented from starting
   *  automatically" console warning on every mouseenter). */
  const sound = (notes: number[]) => {
    if (!soundOn) return;
    playBlip(notes);
  };

  const downloadCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff8e7'; ctx.fillRect(0, 0, 1600, 1100);
    ctx.fillStyle = '#ffd630'; ctx.fillRect(0, 0, 1600, 42);
    ctx.fillStyle = '#ef6b59'; ctx.fillRect(0, 42, 1600, 18);
    ctx.strokeStyle = '#172b44'; ctx.lineWidth = 18; ctx.strokeRect(60, 90, 1480, 930);
    ctx.strokeStyle = '#ef6b59'; ctx.lineWidth = 12; ctx.strokeRect(82, 112, 1436, 886);
    ctx.fillStyle = '#91dcc4'; ctx.beginPath(); ctx.arc(800, 245, 74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#172b44'; ctx.font = '900 32px Arial'; ctx.textAlign = 'center'; ctx.fillText('CIVICEYE CITY HERO CERTIFICATE', 800, 165);
    ctx.font = '900 96px Georgia'; ctx.fillText('STREET GUARDIAN', 800, 385);
    ctx.fillStyle = '#ef6b59'; ctx.font = '900 54px Georgia'; ctx.fillText(certificateName, 800, 500);
    ctx.fillStyle = '#172b44'; ctx.font = '700 32px Arial'; ctx.fillText('is recognised for verified civic action in', 800, 590);
    ctx.font = '900 42px Georgia'; ctx.fillText(certificatePlace, 800, 655);
    ctx.fillStyle = '#ffd630'; ctx.fillRect(470, 730, 660, 78);
    ctx.fillStyle = '#172b44'; ctx.font = '900 26px Arial'; ctx.fillText('ISSUE #004 · COMMUNITY POWER AWARDED', 800, 782);
    ctx.font = '900 28px Arial'; ctx.fillText('✦ CITY HERO · CIVICEYE · BENGALURU ✦', 800, 905);
    const image = canvas.toDataURL('image/jpeg', 0.94);
    setCertificateImage(image);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CivicEye-Street-Guardian-${certificateName.replace(/\\s+/g, '-') || 'Certificate'}.jpg`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    }, 'image/jpeg', 0.96);
  };

  return (
    <div className="comic-page overflow-hidden bg-[#fff8e7] text-[#172b44]">
      <div className="h-3 bg-[repeating-linear-gradient(135deg,#ffd630_0_15px,#ef6b59_15px_28px,#172b44_28px_32px)]" />
      {pastHero ? (
        <Link to="/about#creators" onMouseEnter={() => sound([330, 494])} onClick={() => sound([330, 494, 659])} className="about-us-pill group fixed left-3 top-[calc(var(--nav-height)+.5rem)] z-[55] flex items-center gap-2 border-[3px] border-[#172b44] bg-[#ffd630] px-3 py-2 text-xs font-black tracking-[.1em] shadow-[4px_4px_0_#ef6b59] transition hover:-translate-y-0.5 hover:bg-[#91dcc4] sm:left-5">
          <Users className="h-4 w-4" strokeWidth={3} />
          <span>ABOUT US</span>
          <span aria-hidden className="about-us-ping absolute -right-1 -top-1 h-2.5 w-2.5 border-2 border-[#172b44] bg-[#ef6b59]" />
        </Link>
      ) : null}
      <section className="comic-hero relative overflow-hidden section-pad pb-10 pt-28 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-50 [background:repeating-linear-gradient(145deg,transparent_0_72px,rgba(239,107,89,.13)_73px_76px,transparent_77px_112px)]" />
        <div className="pointer-events-none absolute right-[3%] top-36 z-0 h-36 w-36 rotate-12 bg-[#ffd630] [clip-path:polygon(50%_0%,60%_36%,100%_22%,68%_50%,100%_78%,60%_64%,50%_100%,40%_64%,0_78%,32%_50%,0_22%,40%_36%)]" />
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[.76fr_1.24fr]">
          <div>
            <p className="inline-block border-2 border-[#172b44] bg-[#172b44] px-3 py-2 text-xs font-extrabold tracking-[.14em] text-[#ffd630] shadow-[4px_4px_0_#ef6b59]">ISSUE #001 — THE CITY SPEAKS</p>
            <h1 className="mt-6 font-serif text-5xl font-black uppercase leading-[.82] tracking-[-.07em] sm:text-7xl lg:text-8xl">Your street.<br /><span className="text-[#ef6b59]">Your story.</span><br />Your move.</h1>
            <p className="mt-6 max-w-xl border-l-[6px] border-[#ef6b59] pl-4 text-base font-semibold leading-relaxed sm:text-lg">CivicEye turns everyday city problems into a story everyone can act on: citizens report, neighbours verify, and authorities respond.</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link onMouseEnter={() => sound([250, 520])} to="/report" className="comic-button bg-[#ffd630]">Report an issue →</Link>
              <Link onMouseEnter={() => sound([390, 640])} to="/map" className="font-extrabold underline decoration-2 underline-offset-4">Explore the map</Link>
            </div>
            <p className="mt-6 text-xs font-extrabold tracking-wide">✓ FREE FOR CITIZENS &nbsp; ✓ VERIFIED BY NEIGHBOURS &nbsp; ✓ SHARED WITH AUTHORITIES</p>
          </div>
          <div className="comic-frame relative overflow-hidden border-[6px] border-[#172b44] bg-[#172b44] shadow-[16px_16px_0_#ffd630,23px_23px_0_#ef6b59] lg:-mr-8 lg:scale-[1.07]">
            <p className="absolute left-3 top-3 z-10 border-[3px] border-[#172b44] bg-[#ffd630] px-3 py-2 text-[10px] font-black tracking-[.12em] shadow-[3px_3px_0_#172b44]">NOW PLAYING · ISSUE #001</p>
            <img src="/comic-assets/civiceye-talking-characters.gif" alt="Ravi and Meera discussing a civic issue" className="aspect-video w-full object-cover" />
            <span className="absolute right-[7%] top-[12%] rotate-[9deg] border-[3px] border-[#172b44] bg-[#91dcc4] px-3 py-2 font-serif text-xl font-black shadow-[3px_3px_0_#172b44]">PIN IT!</span>
            <span className="absolute bottom-[14%] left-[8%] -rotate-[8deg] border-[3px] border-[#172b44] bg-[#ef6b59] px-3 py-2 font-serif text-xl font-black shadow-[3px_3px_0_#172b44]">POW!</span>
            <div className="absolute bottom-0 left-0 right-0 bg-[#172b44]/90 px-4 py-3 text-xs font-black tracking-[.12em] text-[#fff8e7]"><span className="mr-3 text-[#ffd630]">ISSUE #001</span> RAVI + MEERA / A STREET STORY</div>
          </div>
        </div>
      </section>

      <section id="about-us" aria-labelledby="about-us-title" className="relative overflow-hidden border-y-[7px] border-[#172b44] bg-[#ef6b59] py-10 text-[#172b44] sm:py-14">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(135deg,transparent_0_46px,rgba(23,43,68,.22)_47px_50px,transparent_51px_88px)]" />
        <div className="pointer-events-none absolute -left-10 top-1/2 hidden h-32 w-32 -translate-y-1/2 rotate-6 bg-[#91dcc4] [clip-path:polygon(50%_0%,60%_36%,100%_22%,68%_50%,100%_78%,60%_64%,50%_100%,40%_64%,0_78%,32%_50%,0_22%,40%_36%)] lg:block" />
        <div className="pointer-events-none absolute -right-8 top-6 hidden rotate-12 border-[3px] border-[#172b44] bg-[#ffd630] px-3 py-2 font-serif text-lg font-black shadow-[3px_3px_0_#172b44] sm:block">FOUR FOUNDERS. ONE CITY.</div>
        <div className="section-pad relative z-10">
          <p className="inline-block border-2 border-[#172b44] bg-[#172b44] px-3 py-2 text-xs font-extrabold tracking-[.14em] text-[#ffd630] shadow-[4px_4px_0_#ffd630]">ISSUE #002 — THE FOUR FOUNDERS</p>
          <h2 id="about-us-title" className="mt-5 font-serif text-5xl font-black uppercase leading-[.82] tracking-[-.06em] [text-shadow:3px_3px_0_#ffd630] sm:text-7xl">About us.</h2>
          <p className="mt-6 max-w-3xl border-l-[6px] border-[#172b44] pl-4 text-base font-semibold leading-relaxed sm:text-lg">{mission}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 border-[3px] border-[#172b44] bg-[#172b44] px-4 py-3 text-xs font-black tracking-[.12em] text-[#ffd630] shadow-[4px_4px_0_#ffd630]"><ShieldAlert className="h-4 w-4" strokeWidth={3} /> SOS FOR WOMEN — ALERTS LOCAL LAW ENFORCEMENT</span>
            <Link onMouseEnter={() => sound([330, 494, 659])} onClick={() => sound([330, 494, 659])} to="/about#creators" className="about-us-cta comic-button bg-[#172b44]"><Users className="h-4 w-4" /> MEET THE FOUNDERS →</Link>
            <Link onMouseEnter={() => sound([250, 520])} onClick={() => sound([250, 520])} to="/contact" className="comic-button bg-[#fff8e7]">Talk to the team</Link>
          </div>
          <p className="mt-6 font-serif text-4xl font-black leading-[.9] text-[#ffd630] [text-shadow:3px_3px_0_#172b44,7px_7px_0_#172b44] sm:text-5xl">Alert Today, Alive Tomorrow.</p>
          <p className="mt-7 text-xs font-black tracking-[.14em]">THE FOUR FOUNDERS OF CIVICEYE</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {creators.map(([badge, name, role, tint], index) => (
              <li key={name}>
                <Link onClick={() => founderThemes[index]?.()} to="/about#creators" tabIndex={0} className="flex h-full items-center gap-3 border-4 border-[#172b44] bg-[#fffdf4] p-4 shadow-[5px_5px_0_#172b44] transition hover:-translate-y-1 hover:rotate-[-1deg] hover:shadow-[7px_8px_0_#ffd630]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-[#172b44] font-serif text-xl font-black shadow-[3px_3px_0_#172b44]" style={{ background: tint }}>{badge}</span>
                  <span className="min-w-0">
                    <span className="block font-serif text-base font-black uppercase leading-tight">{name}</span>
                    <span className="mt-2 block text-[10px] font-bold tracking-[.06em]">{role}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="border-y-4 border-[#172b44] bg-[#172b44] py-3 text-center text-sm font-black tracking-[.12em] text-[#fff8e7]">⚡ CITY PULSE — {stats.verified} REPORTS VERIFIED ✦ {stats.resolved} ISSUES RESOLVED ✦ YOUR WARD IS LISTENING ✦</div>

      <section className="section-pad py-14 sm:py-20">
        <p className="inline-block border-2 border-[#172b44] bg-[#91dcc4] px-3 py-1 text-xs font-black tracking-[.14em]">THE FIVE-PANEL STORY</p>
        <h2 className="mt-4 font-serif text-4xl font-black uppercase tracking-[-.05em] sm:text-5xl">From spotted to sorted</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(([number, title, text], index) => (
            <article key={title} tabIndex={0} onMouseEnter={() => sound([310 + index * 48, 520 + index * 36])} className={`comic-card min-h-56 border-4 border-[#172b44] p-5 shadow-[5px_6px_0_#172b44] transition hover:-translate-y-2 hover:rotate-[-1deg] ${index % 3 === 1 ? 'bg-[#ffd630]' : index % 3 === 2 ? 'bg-[#91dcc4]' : 'bg-[#fffdf4]'}`}>
              <p className="font-serif text-5xl font-black text-[#ef6b59] [text-shadow:1px_1px_0_#172b44]">{number}</p>
              <h3 className="mt-4 font-serif text-xl font-black uppercase">{title}</h3>
              <p className="mt-3 text-sm font-semibold leading-snug">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y-[7px] border-[#172b44] bg-[#172b44] py-14 text-[#fff8e7] sm:py-20">
        <div className="section-pad">
          <p className="inline-block border-2 border-[#172b44] bg-[#ffd630] px-3 py-1 text-xs font-black tracking-[.14em] text-[#172b44]">CIVIC SUPERPOWERS</p>
          <h2 className="mt-4 font-serif text-4xl font-black uppercase tracking-[-.05em] sm:text-5xl">A complete civic toolkit</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text, tint }, index) => (
              <article key={title} tabIndex={0} onMouseEnter={() => sound([420 + index * 70, 650 + index * 70])} className={`${tint} min-h-60 border-4 border-[#fff8e7] p-7 transition hover:-translate-y-2 hover:rotate-1 hover:shadow-[7px_8px_0_#ffd630]`}>
                <Icon className="h-9 w-9 text-[#ffd630]" strokeWidth={2.7} />
                <h3 className="mt-6 font-serif text-2xl font-black uppercase leading-none">{title}</h3>
                <p className="mt-4 text-sm font-semibold leading-relaxed">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad py-14 sm:py-20">
        <div className="grid overflow-hidden border-[5px] border-[#172b44] bg-[#ffd630] shadow-[12px_12px_0_#ef6b59] lg:grid-cols-[1.15fr_.85fr]">
          <div className="relative p-8 sm:p-12">
            <div className="absolute right-7 top-7 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#172b44] bg-[#91dcc4] shadow-[3px_3px_0_#172b44]"><MapPin className="h-7 w-7 text-[#ef6b59]" /></div>
            <p className="inline-block bg-[#ef6b59] px-3 py-2 text-xs font-black tracking-[.14em]">NEXT CHAPTER — LIVE MAP</p>
            <h2 className="mt-5 max-w-xl font-serif text-4xl font-black leading-[.9] sm:text-5xl">See the danger before you hit it.</h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed">Heatmaps, filters, and severity pins help people choose safer routes and show authorities where action is needed first.</p>
            <Link onMouseEnter={() => sound([280, 560, 790])} to="/map" className="comic-button mt-7 inline-flex bg-[#fff8e7]"><MapPin className="h-4 w-4" /> Open interactive map</Link>
          </div>
          <div className="group relative min-h-64 overflow-hidden border-t-[5px] border-[#172b44] bg-[#1f536b] lg:border-l-[5px] lg:border-t-0">
            <iframe
              title="Live Bengaluru map"
              loading="lazy"
              className="absolute inset-0 h-full w-full border-0"
              src="https://www.google.com/maps?q=Bengaluru%2C%20Karnataka&z=12&output=embed"
            />
            <p className="pointer-events-none absolute left-[26%] top-[32%] z-10 rotate-[-8deg] border-[3px] border-[#172b44] bg-[#ef6b59] px-5 py-3 font-serif text-2xl font-black shadow-[4px_4px_0_#172b44] transition-all duration-300 group-hover:translate-y-4 group-hover:opacity-0">LIVE<br />MAP VIEW</p>
          </div>
        </div>
      </section>

      <section className="section-pad pb-16 sm:pb-24">
        <div className="relative overflow-hidden border-4 border-[#172b44] bg-[#172b44] p-6 text-[#fff8e7] shadow-[6px_6px_0_#ffd630] sm:p-10">
          
          <div className="relative z-10">
            <p className="inline-block border-[3px] border-[#172b44] bg-[#ffd630] px-3 py-1.5 text-xs font-black tracking-[.14em] text-[#172b44] shadow-[3px_3px_0_#fff8e7]">CIVIC HERO MISSIONS</p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
              <div>
                <h2 className="font-serif text-4xl font-black uppercase leading-[.85] tracking-[-.02em] [text-shadow:3px_3px_0_#ef6b59] sm:text-5xl">Your next<br />city mission.</h2>
                <p className="mt-4 max-w-xl text-[15px] font-semibold leading-relaxed text-[#fff8e7]/90">Confirm three neighbourhood reports and help a real civic issue become impossible to ignore.</p>
                <div className="mt-6 border-[3px] border-[#172b44] bg-[#ef6b59] p-4 text-white shadow-[4px_4px_0_#ffd630]">
                  <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#172b44]">Mission #004 — Light up the block</p>
                  <p className="mt-2 font-serif text-2xl font-black uppercase tracking-tight text-[#172b44]">Progress: {missionProgress} / 3</p>
                  <div className="mt-3 h-5 border-[3px] border-[#172b44] bg-[#fff8e7] p-[3px] shadow-[2px_2px_0_#172b44]"><div className="h-full bg-[#ffd630]" style={{ width: `${(missionProgress / 3) * 100}%` }} /></div>
                  <p className="mt-2 text-xs font-bold text-[#172b44]/70">{missionProgress} of 3 confirmed — keep going!</p>
                </div>
              </div>
              <div className="border-[4px] border-[#172b44] bg-[#0f2e3d] p-6 text-[#fff8e7] shadow-[4px_4px_0_#ef6b59]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#ffd630]" />
                  <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#91dcc4]">Reward unlocked at 3 / 3</p>
                </div>
                <h3 className="mt-3 font-serif text-3xl font-black uppercase leading-[.9] tracking-[-.01em] text-[#fff8e7] [text-shadow:2px_2px_0_#ef6b59]">Street<br />Guardian</h3>
                <p className="mt-4 text-sm font-medium leading-relaxed text-[#fff8e7]/80">Earn a CivicEye badge and an appreciation certificate for verified community action.</p>
                <button disabled={!missionComplete} onClick={() => { setCertificateOpen(true); setCertificateIssued(false); sound([523, 659, 784, 1046]); }} className="mt-6 w-full border-[3px] border-[#172b44] bg-[#ffd630] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#172b44] shadow-[4px_4px_0_#fff8e7] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fff8e7] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#2a3a4a] disabled:text-[#5a6a7a] disabled:shadow-none">{missionComplete ? 'View City Hero Rewards ✦' : `Locked — Complete ${3 - missionProgress} More`}</button>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[#91dcc4]/70">{missionComplete ? 'Ready to claim!' : 'Complete 1 more report to unlock'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

            {/* Live Stats — Fixed, Pending, Escalated, Leaderboard — HIGH CONTRAST FIXED */}
      <section className="section-pad bg-[#0f1a2e] py-12 sm:py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Fixed Issues */}
          <div className="relative border-[4px] border-[#172b44] bg-[#d1fae5] p-5 shadow-[6px_6px_0_#172b44]">
            <div className="absolute -top-3 left-4 bg-[#172b44] px-3 py-1 text-[11px] font-black tracking-widest text-white">FIXED ISSUES</div>
            <p className="mt-4 font-serif text-5xl font-black leading-none" style={{ color: '#172b44' }}>{stats.resolved}</p>
            <p className="mt-2 text-[13px] font-black leading-tight" style={{ color: '#172b44' }}>✓ Resolved & verified with before/after proof</p>
            <div className="mt-4 h-3 w-full bg-white border-[3px] border-[#172b44] p-[2px]"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (stats.resolved / Math.max(1, stats.total)) * 100)}%` }} /></div>
            <p className="mt-3 rounded bg-[#172b44] px-2 py-1 text-[11px] font-bold text-white">Proof of fix with AI verification</p>
          </div>
          
          {/* Pending Issues */}
          <div className="relative border-[4px] border-[#172b44] bg-[#fef3c7] p-5 shadow-[6px_6px_0_#172b44]">
            <div className="absolute -top-3 left-4 bg-[#172b44] px-3 py-1 text-[11px] font-black tracking-widest text-white">PENDING ISSUES</div>
            <p className="mt-4 font-serif text-5xl font-black leading-none" style={{ color: '#172b44' }}>{reports.filter((r) => r.scope === (isAmrita ? 'campus' : 'city') && r.status === 'pending').length}</p>
            <p className="mt-2 text-[13px] font-black leading-tight" style={{ color: '#172b44' }}>⏳ Awaiting community verification</p>
            <div className="mt-4 h-3 w-full bg-white border-[3px] border-[#172b44] p-[2px]"><div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (reports.filter((r) => r.scope === (isAmrita ? 'campus' : 'city') && r.status === 'pending').length / Math.max(1, stats.total)) * 100)}%` }} /></div>
            <p className="mt-3 rounded bg-[#172b44] px-2 py-1 text-[11px] font-bold text-white">Needs 3 confirms to verify</p>
          </div>
          
          {/* Escalated Issues */}
          <div className="relative border-[4px] border-[#172b44] bg-[#fecdd3] p-5 shadow-[6px_6px_0_#172b44]">
            <div className="absolute -top-3 left-4 bg-[#ef6b59] px-3 py-1 text-[11px] font-black tracking-widest text-white">ESCALATED</div>
            <p className="mt-4 font-serif text-5xl font-black leading-none" style={{ color: '#172b44' }}>{reports.filter((r) => r.scope === (isAmrita ? 'campus' : 'city') && r.escalation && r.escalation.level > 0).length}</p>
            <p className="mt-2 text-[13px] font-black leading-tight" style={{ color: '#172b44' }}>⚠️ SLA breached → auto-escalated</p>
            <div className="mt-4 space-y-1.5 rounded border-2 border-[#172b44] bg-white p-2 text-[12px] font-black" style={{ color: '#172b44' }}>
              <div className="flex justify-between border-b border-[#172b44]/10 pb-1"><span>Critical</span><span className="bg-rose-500 text-white px-2 rounded">24h</span></div>
              <div className="flex justify-between border-b border-[#172b44]/10 pb-1"><span>High</span><span className="bg-orange-500 text-white px-2 rounded">48h</span></div>
              <div className="flex justify-between"><span>Medium</span><span className="bg-amber-500 text-white px-2 rounded">7d</span></div>
            </div>
          </div>
          
          {/* Leaderboard */}
          <div className="relative border-[4px] border-[#172b44] bg-[#172b44] p-5 shadow-[6px_6px_0_#ffd630]">
            <div className="absolute -top-3 left-4 bg-[#ffd630] px-3 py-1 text-[11px] font-black tracking-widest" style={{ color: '#172b44' }}>LEADERBOARD</div>
            <h3 className="mt-4 font-serif text-2xl font-black uppercase leading-none" style={{ color: '#fff8e7' }}>Top Heroes</h3>
            <div className="mt-4 space-y-2">
              {reports
                .filter((r) => r.scope === (isAmrita ? 'campus' : 'city'))
                .reduce((acc: any[], r) => {
                  const ex = acc.find((a) => a.author === r.author);
                  if (ex) { ex.count++; if (r.verified) ex.verified++; }
                  else acc.push({ author: r.author, count: 1, verified: r.verified ? 1 : 0 });
                  return acc;
                }, [])
                .sort((a, b) => b.verified - a.verified || b.count - a.count)
                .slice(0, 3)
                .map((leader: any, i: number) => (
                  <div key={leader.author} className="flex items-center gap-2 border-[3px] border-[#172b44] bg-[#fff8e7] p-2.5 shadow-[3px_3px_0_#ffd630]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#172b44] text-[12px] font-black text-white">{i + 1}</span>
                    <span className="font-black truncate flex-1 text-[13px]" style={{ color: '#172b44' }}>{leader.author}</span>
                    <span className="rounded bg-[#172b44] px-2 py-1 text-[11px] font-black text-white">{leader.count} reports</span>
                  </div>
                ))}
            </div>
            <p className="mt-4 rounded bg-[#ffd630] px-2 py-1.5 text-[11px] font-black" style={{ color: '#172b44' }}>Report 3 issues → Street Guardian certificate</p>
          </div>
        </div>
      </section>

      <button onClick={() => { const next = !soundOn; setSoundOn(next); setComicSoundOn(next); if (next) sound([523, 659, 784]); }} className={`fixed right-5 top-[calc(var(--nav-height)+1.6rem)] z-[60] border-3 border-[#172b44] px-3 py-2 text-xs font-black shadow-[4px_4px_0_#172b44] ${soundOn ? 'bg-[#91dcc4]' : 'bg-[#ffd630]'}`} aria-pressed={soundOn}>♬ SOUND: {soundOn ? 'ON' : 'OFF'}</button>
      <button onClick={() => { setPromoOpen(true); sound([196, 392, 784]); }} className="fixed bottom-5 left-5 z-40 border-[3px] border-[#172b44] bg-[#ef6b59] px-4 py-3 text-xs font-black shadow-[5px_5px_0_#172b44]">▶ WATCH THE CIVICEYE STORY</button>
      {certificateOpen ? <div role="dialog" aria-label="Civic Hero certificate" className="fixed inset-0 z-[70] grid place-items-center bg-[#172b44]/90 p-5" onClick={() => setCertificateOpen(false)}>
        <div className="w-full max-w-2xl border-[6px] border-[#172b44] bg-[#fff8e7] p-6 shadow-[10px_10px_0_#ffd630] sm:p-10" onClick={(e) => e.stopPropagation()}>
          {!certificateIssued ? <>
            <p className="inline-block bg-[#ef6b59] px-3 py-2 text-xs font-black tracking-[.14em]">CITY HERO CERTIFICATE</p>
            <h2 className="mt-4 font-serif text-4xl font-black uppercase leading-none text-[#172b44]">Tell us who<br />saved the block.</h2>
            <p className="mt-3 font-semibold text-[#172b44]">Enter your name and neighbourhood to create your personalised Street Guardian appreciation certificate.</p>
            <label className="mt-6 block text-xs font-black tracking-[.14em]">YOUR NAME<input value={certificateName} onChange={(e) => setCertificateName(e.target.value)} className="mt-2 w-full border-3 border-[#172b44] bg-[#fffdf4] p-3 text-base font-bold" placeholder="Your name" /></label>
            <label className="mt-4 block text-xs font-black tracking-[.14em]">YOUR PLACE / WARD<input value={certificatePlace} onChange={(e) => setCertificatePlace(e.target.value)} className="mt-2 w-full border-3 border-[#172b44] bg-[#fffdf4] p-3 text-base font-bold" placeholder="Example: Koramangala, Bengaluru" /></label>
            <button disabled={!certificateName.trim() || !certificatePlace.trim()} onClick={() => { setCertificateIssued(true); downloadCertificate(); sound([523, 659, 784, 1046]); }} className="mt-6 border-3 border-[#172b44] bg-[#ffd630] px-5 py-3 font-black shadow-[4px_4px_0_#172b44] disabled:opacity-40">GENERATE & DOWNLOAD JPG ✦</button>
          </> : <div className="relative overflow-hidden border-[5px] border-[#172b44] bg-[repeating-linear-gradient(135deg,#91dcc4_0_18px,#b9f0df_18px_36px)] p-7 text-center shadow-[8px_8px_0_#ef6b59] animate-[bounce_0.55s_ease-out]">
            <span className="absolute left-5 top-5 rotate-[-12deg] border-3 border-[#172b44] bg-[#ffd630] px-2 py-1 text-xs font-black shadow-[2px_2px_0_#172b44]">UNLOCKED!</span>
            <span className="absolute right-5 top-5 rotate-[12deg] text-3xl">✦</span>
            <p className="text-xs font-black tracking-[.18em]">CIVICEYE CITY HERO CERTIFICATE</p>
            <h2 className="mt-5 font-serif text-5xl font-black uppercase leading-none">Street Guardian</h2>
            <p className="mt-6 font-serif text-3xl font-black">{certificateName}</p>
            <p className="mt-4 font-semibold">is recognised for verified civic action in<br /><strong>{certificatePlace}</strong></p>
            <p className="mt-6 text-xs font-black tracking-[.14em]">ISSUE #004 · COMMUNITY POWER AWARDED</p>
            {certificateImage ? <img src={certificateImage} alt="Generated CivicEye certificate" className="mx-auto mt-6 max-h-64 border-3 border-[#172b44] shadow-[4px_4px_0_#172b44]" /> : null}
            <div className="mt-6 flex flex-wrap justify-center gap-3"><a href={certificateImage || '#'} download={`CivicEye-Street-Guardian-${certificateName || 'Certificate'}.jpg`} className="border-3 border-[#172b44] bg-[#ffd630] px-5 py-3 font-black shadow-[4px_4px_0_#172b44]">DOWNLOAD JPG CERTIFICATE ✦</a><a href={certificateImage || '#'} target="_blank" rel="noopener" className="border-3 border-[#172b44] bg-[#fff8e7] px-5 py-3 font-black shadow-[4px_4px_0_#172b44]">OPEN JPG TO SAVE</a><button onClick={downloadCertificate} className="border-3 border-[#172b44] bg-[#ffd630] px-5 py-3 font-black shadow-[4px_4px_0_#172b44]">REGENERATE JPG</button><button onClick={() => { setCertificateIssued(false); setCertificateName(''); setCertificatePlace(''); }} className="border-3 border-[#172b44] bg-[#fff8e7] px-5 py-3 font-black shadow-[4px_4px_0_#172b44]">CREATE ANOTHER</button></div>
          </div>}
        </div>
      </div> : null}
      {promoOpen ? <div role="dialog" aria-label="CivicEye story" className="fixed inset-0 z-50 grid place-items-center bg-[#172b44]/90 p-5" onClick={() => setPromoOpen(false)}>
        <div className="relative w-full max-w-5xl overflow-hidden border-[5px] border-[#172b44] bg-[#fff8e7] shadow-[10px_10px_0_#ffd630]" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setPromoOpen(false)} className="absolute right-3 top-3 z-10 h-10 w-10 border-3 border-[#172b44] bg-[#ffd630] text-xl font-black">×</button>
          <img src="/comic-assets/civiceye-talking-characters.gif" alt="Animated CivicEye awareness story" className="aspect-video w-full object-cover" />
          <div className="absolute bottom-8 left-[7%] border-4 border-[#172b44] bg-[#ffd630] px-5 py-4 font-serif text-3xl font-black uppercase leading-none shadow-[5px_5px_0_#172b44] sm:text-5xl">See it.<br />Speak up.</div>
        </div>
      </div> : null}
    </div>
  );
}
