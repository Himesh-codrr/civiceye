import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { primeComicAudio } from '@/utils/comicSound';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { NavbarAmrita } from '@/components/NavbarAmrita';
import { FooterAmrita } from '@/components/FooterAmrita';
import { SOSButton } from '@/components/SOSButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Landing } from '@/pages/Landing';
import { AmritaEye } from '@/pages/AmritaEye';
import { useBrand } from '@/hooks/useBrand';
import { cn } from '@/utils/cn';
import { Features } from '@/pages/Features';
import { MapPage } from '@/pages/MapPage';
import { AmritaMapPage } from '@/pages/AmritaMapPage';
import { ReportPage } from '@/pages/ReportPage';
import { ReportDetails } from '@/pages/ReportDetails';
import { Dashboard } from '@/pages/Dashboard';
import { Community } from '@/pages/Community';
import { LiveDetection } from '@/pages/LiveDetection';
import { About } from '@/pages/About';
import { Contact } from '@/pages/Contact';
import { Login } from '@/pages/Login';
import { AuthCallback } from '@/pages/AuthCallback';
import { ResetPassword } from '@/pages/ResetPassword';
import { AdminPanel } from '@/pages/AdminPanel';
import { AdminBackfill } from '@/pages/AdminBackfill';
import { Debug } from '@/pages/Debug';
import { NotFound } from '@/pages/NotFound';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfService } from '@/pages/TermsOfService';
import { FoodHygienePage } from '@/pages/FoodHygiene';
import { RequireAdmin } from '@/components/RequireAdmin';

/**
 * CivicEye / Amrita Eye application shell.
 * Routes are wrapped in a scroll-restoring, animated layout; the map
 * page intentionally keeps its own full-height layout. Auth pages render
 * without the navbar/footer.
 */
export default function App() {
  const location = useLocation();
  const { isAmrita } = useBrand();
  // Show the Amrita Eye chrome on the /amrita route too, not just for
  // @amrita.edu logins — matches the koushikkkkkkkkkk.github.io preview.
  const amritaChrome = isAmrita || location.pathname.startsWith('/amrita');

  // Browsers gate audio behind a user gesture; arm it once per visit.
  useEffect(() => {
    primeComicAudio();
  }, []);

  // Land on the right spot for anchor links like /about#creators.
  useEffect(() => {
    if (!location.hash) return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  // Auth + legal pages render without site chrome; legal pages are NOT
  // gated behind sign-in (Google's OAuth consent screen crawls them, and
  // users need to be able to read them before creating an account).
  const isAuthPage =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/auth/callback') ||
    location.pathname.startsWith('/reset');
  const isLegalPage =
    location.pathname === '/privacy' || location.pathname === '/terms';
  // Public (no-login) pages: legal pages + anonymous food-hygiene form.
  const isPublicPage = isLegalPage || location.pathname === '/food-hygiene';

  // DEMO MODE (VITE_DEMO_MODE=true): bypass the login gate so pages render
  // without a Supabase session — used for screenshots & live demos.
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  // Interior pages sit under a fixed top bar (comic street-sign header for
  // CivicEye, floating pill for Amrita Eye). Pages that manage their own
  // clearance (home, map, amrita landing, auth) are excluded.
  const p = location.pathname;
  const needsNavPad =
    !isAuthPage &&
    p !== '/' &&
    !p.startsWith('/amrita') &&
    p !== '/map';

  // Everything else requires a signed-in user (login-first app).
  const gatedRoutes = (
    <Routes location={location}>
      {/* Brand-aware landing: Amrita Eye users get the Amrita Eye page
          (koushikkkkkkkkkk.github.io/civiceye design); everyone else gets
          the CivicEye comic landing. */}
      <Route path="/" element={isAmrita ? <AmritaEye /> : <Landing />} />
      <Route path="/amrita" element={<AmritaEye />} />
      <Route path="/amrita/map" element={<AmritaMapPage />} />
      <Route path="/features" element={<Features />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/live" element={<LiveDetection />} />
      <Route path="/report" element={<ReportPage />} />
      <Route path="/report/:id" element={<ReportDetails />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/community" element={<Community />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/food-hygiene" element={<FoodHygienePage />} />
      <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
      <Route path="/admin/backfill" element={<RequireAdmin><AdminBackfill /></RequireAdmin>} />
      <Route path="/debug" element={<RequireAdmin><Debug /></RequireAdmin>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  const authRoutes = (
    <Routes location={location}>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Brand-aware chrome: Amrita Eye users get the Amrita Eye top bar +
          footer (the koushikkkkkkkkkk.github.io/civiceye design). Legal pages
          always keep chrome so users can navigate away. */}
      {!isAuthPage ? (amritaChrome ? <NavbarAmrita /> : <Navbar />) : null}
      {/* Global one-tap SOS (only shows for signed-in users; not on anonymous public forms). */}
      {!isAuthPage && !isPublicPage ? <SOSButton /> : null}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={cn('flex flex-1 flex-col', needsNavPad && 'has-top-nav')}
        >
          {isAuthPage
            ? authRoutes
            : isPublicPage
              ? gatedRoutes
              : demoMode
                ? gatedRoutes
                : <RequireAuth>{gatedRoutes}</RequireAuth>}
        </motion.main>
      </AnimatePresence>
      {!isAuthPage ? (amritaChrome ? <FooterAmrita /> : <Footer />) : null}
    </div>
  );
}
