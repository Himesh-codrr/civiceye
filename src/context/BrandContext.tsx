import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { BrandId } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { BRAND_META } from '@/data/brands';
import type { BrandMeta } from '@/data/brands';
import logoCivicEye from '@/assets/logo.svg';
import logoAmrita from '@/assets/logo-amrita.svg';

interface BrandContextValue {
  brand: BrandId;
  meta: BrandMeta;
  isAmrita: boolean;
  /** Preview/override the brand imperatively — used by the login page to
   *  switch colors instantly while the user types their @amrita.edu address,
   *  so the post-login navigation doesn't flash CivicEye. */
  setPreviewBrand: (b: BrandId | null) => void;
}

const BrandContext = createContext<BrandContextValue | null>(null);

function initialBrand(): BrandId {
  // Always start on CivicEye — the brand is re-derived from the route/auth
  // right after mount. (No localStorage memory, so the two sites can never
  // flash each other's branding.)
  return 'civiceye';
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user, isAmrita, loading } = useAuth();
  const location = useLocation();
  const [brand, setBrand] = useState<BrandId>(initialBrand);
  const [previewBrand, setPreviewBrandState] = useState<BrandId | null>(null);

  const setPreviewBrand = useCallback((b: BrandId | null) => {
    setPreviewBrandState(b);
  }, []);

  /* Effective brand:
     - setPreviewBrand() override (login page pre-switch).
     - ?brand=amrita|civiceye in the URL explicitly forces a brand (demo/dev
       preview tool — lets you preview the Amrita Eye experience without an
       Amrita login, and vice-versa).
     - The /amrita route ALWAYS forces the Amrita brand (so it never shows
       CivicEye branding, even for logged-out visitors).
     - Otherwise: Amrita emails → Amrita Eye; everyone else → CivicEye. */
  useEffect(() => {
    if (previewBrand) {
      setBrand(previewBrand);
      return;
    }
    if (loading) return;
    const routeAmrita = location.pathname.startsWith('/amrita');
    const q = new URLSearchParams(location.search).get('brand');
    let next: BrandId;
    if (q === 'amrita' || q === 'civiceye') {
      next = q;
    } else {
      next = routeAmrita || (isAmrita && user) ? 'amrita' : 'civiceye';
    }
    setBrand(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewBrand, isAmrita, user?.id, loading, location.pathname, location.search]);

  /* Apply the brand class + document title + favicon + meta. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('amrita', brand === 'amrita');
    const meta = BRAND_META[brand];
    document.title = `${meta.appName} — ${meta.tagline}`;

    // Swap the browser-tab icon: indigo pin for CivicEye, red pin for Amrita Eye.
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.setAttribute('href', brand === 'amrita' ? logoAmrita : logoCivicEye);
    }

    // Meta description + address-bar color follow the brand too.
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', meta.description);
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', meta.themeColor);
  }, [brand]);

  const value = useMemo<BrandContextValue>(
    () => ({ brand, meta: BRAND_META[brand], isAmrita: brand === 'amrita', setPreviewBrand }),
    [brand, setPreviewBrand],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export { BrandContext };
