import type { Authority, CategoryId } from '@/types';

/* ====================================================================
 *  Authority directory (verified public channels)
 *
 *  City bodies: helpline + official portal + WhatsApp + grievance email
 *  where published. `email` left EMPTY when a department has no public
 *  grievance inbox (the UI then uses phone / WhatsApp / portal instead).
 *
 *  Campus bodies: route through the CivicEye team inbox (the campus staff
 *  addresses are internal) — staff are reachable via the campus dashboard.
 *
 *  BBMP note: BBMP's working citizen channels are the official site
 *  (www.bbmp.gov.in / Namma Bengaluru Sahaaya 2.0), the 1533 helpline and
 *  the central grievance cell comm@bbmp.gov.in. Per-zone grievance emails
 *  are resolved by `bbmpGrievanceEmailFor()` from the report location.
 * ==================================================================== */

export const AUTHORITIES: Authority[] = [
  /* ------------------------- CivicEye (city) ------------------------- */
  {
    id: 'bbmp-42',
    name: 'BBMP — Roads & Potholes',
    department: 'Roads & Infrastructure · Grievance Cell',
    color: '#f59e0b',
    scope: 'city',
    categories: ['pothole', 'broken-road', 'sidewalk', 'manhole', 'other'],
    email: 'comm@bbmp.gov.in', // BBMP central grievance cell (public)
    phone: '+918022660000', // BBMP citizen helpline (full, dialable)
    phoneNote: 'Toll-free 1533 · helpline 080-2266 0000',
    whatsapp: ['919480685700'],
    whatsappNote: 'BBMP WhatsApp grievance',
    address: 'BBMP Head Office, N R Square, Bengaluru 560002',
    hours: 'Helpline 1533 · 24×7',
    portalUrl: 'https://www.bbmp.gov.in',
    portalLabel: 'BBMP official site',
    source: 'bbmp.gov.in + public helpline records',
  },
  {
    id: 'bbmp-swm',
    name: 'BBMP Solid Waste Management',
    department: 'Sanitation · Blackspots & Dumping',
    color: '#22c55e',
    scope: 'city',
    categories: ['garbage', 'illegal-dumping'],
    email: 'comm@bbmp.gov.in',
    phone: '+918022660000',
    phoneNote: 'Toll-free 1533 · helpline 080-2266 0000',
    whatsapp: ['919448197197'],
    whatsappNote: 'BBMP waste WhatsApp (launched 2025)',
    address: 'SWM Cell, BBMP Head Office, N R Square, Bengaluru 560002',
    hours: 'Helpline 1533 · 24×7',
    portalUrl: 'https://www.bbmp.gov.in',
    portalLabel: 'BBMP official site',
    source: 'BBMP waste-helpline announcement (Jun 2025)',
  },
  {
    id: 'bwssb',
    name: 'BWSSB Helpline',
    department: 'Water Supply & Sewerage',
    color: '#38bdf8',
    scope: 'city',
    categories: ['water-leakage', 'sewage'],
    email: '', // no published citizen grievance inbox
    phone: '19145',
    phoneNote: 'BWSSB helpline 19145 · Cauvery complaints',
    address: 'BWSSB, Cauvery Bhavan, KG Road, Bengaluru 560009',
    hours: '24×7 helpline',
    portalUrl: 'https://bwssb.karnataka.gov.in',
    portalLabel: 'BWSSB official site',
    source: 'BWSSB helpline',
  },
  {
    id: 'bescom',
    name: 'BESCOM 1912',
    department: 'Street Lighting & Power',
    color: '#facc15',
    scope: 'city',
    categories: ['street-light'],
    email: '', // complaints via 1912 / portal
    phone: '1912',
    phoneNote: 'BESCOM helpline 1912 · 24×7',
    address: 'BESCOM Corporate Office, KR Circle, Bengaluru 560001',
    hours: '24×7 helpline (1912)',
    portalUrl: 'https://bescom.karnataka.gov.in',
    portalLabel: 'BESCOM official site',
    source: 'BESCOM helpline 1912',
  },
  {
    id: 'traffic-police',
    name: 'Bengaluru Traffic Police',
    department: 'Traffic & Signals',
    color: '#fb7185',
    scope: 'city',
    categories: ['traffic-signal', 'accident'],
    email: '', // emergencies → 112/103
    phone: '112',
    phoneNote: 'Emergency 112 · Traffic helpline 103',
    address: 'Traffic Management Centre, Infantry Road, Bengaluru 560001',
    hours: '24×7 control room',
    portalUrl: 'https://www.bengalurucitypolice.gov.in',
    portalLabel: 'Bengaluru City Police',
    source: '112 / 103 helplines',
  },
  {
    id: 'forest-dept',
    name: 'BBMP Forest Cell',
    department: 'Trees & Parks',
    color: '#34d399',
    scope: 'city',
    categories: ['fallen-tree'],
    email: 'comm@bbmp.gov.in',
    phone: '+918022660000',
    phoneNote: 'Toll-free 1533 · helpline 080-2266 0000',
    address: 'Forest Cell, BBMP Head Office, N R Square, Bengaluru 560002',
    hours: 'Helpline 1533 · 24×7',
    portalUrl: 'https://www.bbmp.gov.in',
    portalLabel: 'BBMP official site',
    source: 'bbmp.gov.in',
  },

  /* ------------------------ Amrita Eye (campus) ---------------------- */
  {
    id: 'amrita-estate',
    name: 'Campus Estate & Civil Works',
    department: 'Campus Infrastructure',
    color: '#f59e0b',
    scope: 'campus',
    categories: ['pothole', 'broken-road', 'sidewalk', 'manhole', 'fallen-tree', 'other'],
    email: 'info@civiceye.co.in', // routed to campus staff via team
    phoneNote: 'Report to campus estate staff',
    address: 'Estate Office, Admin Block, Amrita Campus',
    hours: 'Mon–Sat 9:00–17:00',
    source: 'Campus office directory',
  },
  {
    id: 'amrita-facilities',
    name: 'Facilities & Housekeeping',
    department: 'Sanitation, Water & Electrical',
    color: '#38bdf8',
    scope: 'campus',
    categories: ['garbage', 'sewage', 'water-leakage', 'street-light'],
    email: 'info@civiceye.co.in',
    phoneNote: 'Report to campus facilities staff',
    address: 'Facilities Office, Ground Floor, Admin Block',
    hours: 'Mon–Sat 8:30–17:30',
    source: 'Campus office directory',
  },
  {
    id: 'amrita-security',
    name: 'Campus Security Control Room',
    department: 'Safety & Security',
    color: '#fb7185',
    scope: 'campus',
    categories: ['security', 'accident'],
    email: 'info@civiceye.co.in',
    phoneNote: '24×7 campus security line',
    address: 'Security Control Room, Main Gate',
    hours: '24×7 emergency line',
    source: 'Campus office directory',
  },
];

export const authorityById = (id: string | undefined): Authority | undefined =>
  AUTHORITIES.find((a) => a.id === id);

/** All authorities that serve a given product scope. */
export const authoritiesForScope = (scope: 'city' | 'campus'): Authority[] =>
  AUTHORITIES.filter((a) => a.scope === scope);

/**
 * The authority responsible for a report of `category` inside `scope`.
 * Falls back to the first authority of that scope ("catch-all" office)
 * so a caller always gets a real, contactable office.
 */
export function authorityForCategory(
  category: CategoryId | undefined,
  scope: 'city' | 'campus',
): Authority {
  const scoped = authoritiesForScope(scope);
  if (category) {
    const hit = scoped.find((a) => a.categories.includes(category));
    if (hit) return hit;
  }
  return scoped[0] ?? AUTHORITIES[0];
}

/* ====================================================================
 *  Higher-authority escalation chain (SLA-breach).
 *
 *  When a report breaches its SLA deadline it moves up a level — these
 *  are the *next* offices citizens can escalate to. Public grievance
 *  channels only (official portals + published control rooms). Phone
 *  numbers go into a tel:/sms: link, whatsapp into wa.me/, email into
 *  the server-side sender or mailto: fallback.
 * ==================================================================== */

export const HIGHER_AUTHORITIES: Record<
  'city' | 'campus',
  Record<number, Authority>
> = {
  city: {
    1: {
      id: 'bbmp-commissioner',
      name: 'BBMP Commissioner',
      department: 'Office of the Commissioner · Grievance Cell (Level 1 escalation)',
      color: '#ef4444',
      scope: 'city',
      categories: ['pothole', 'broken-road', 'sidewalk', 'manhole', 'garbage', 'illegal-dumping', 'water-leakage', 'sewage', 'street-light', 'traffic-signal', 'fallen-tree', 'accident', 'other'],
      email: 'comm@bbmp.gov.in',
      phone: '+918022660000',
      phoneNote: 'BBMP control room 080-2266 0000 · 1533',
      whatsapp: ['919480685700'],
      whatsappNote: 'BBMP Commissioner grievance WhatsApp',
      address: 'BBMP Head Office, N R Square, Bengaluru 560002',
      hours: '24×7 control room',
      portalUrl: 'https://www.bbmp.gov.in',
      portalLabel: 'BBMP Commissioner grievance',
      source: 'bbmp.gov.in',
    },
    2: {
      id: 'bbmp-chief-mayor',
      name: 'BBMP Chief Commissioner + Mayor',
      department: 'Office of the Chief Commissioner & Mayor (Level 2 escalation)',
      color: '#dc2626',
      scope: 'city',
      categories: ['pothole', 'broken-road', 'sidewalk', 'manhole', 'garbage', 'illegal-dumping', 'water-leakage', 'sewage', 'street-light', 'traffic-signal', 'fallen-tree', 'accident', 'other'],
      email: 'comm@bbmp.gov.in',
      phone: '+918022660000',
      phoneNote: 'BBMP control room — ask for Chief Commissioner desk',
      whatsapp: ['919480685700'],
      address: 'BBMP Head Office, N R Square, Bengaluru 560002',
      hours: 'Control room 24×7',
      portalUrl: 'https://www.bbmp.gov.in',
      portalLabel: 'BBMP — Mayor / Chief Commissioner cell',
      source: 'bbmp.gov.in',
    },
    3: {
      id: 'ka-udd',
      name: 'Karnataka Urban Development Department',
      department: 'Principal Secretary, UDD — Govt. of Karnataka (Level 3 escalation)',
      color: '#b91c1c',
      scope: 'city',
      categories: ['pothole', 'broken-road', 'sidewalk', 'manhole', 'garbage', 'illegal-dumping', 'water-leakage', 'sewage', 'street-light', 'traffic-signal', 'fallen-tree', 'accident', 'other'],
      email: 'secyudd@karnataka.gov.in',
      phone: '08022034204',
      phoneNote: 'UDD Secretariat 080-2203 4204',
      address: 'Vikasa Soudha, Dr Ambedkar Road, Bengaluru 560001',
      hours: 'Mon–Fri 10:00–17:30',
      portalUrl: 'https://www.karnataka.gov.in/udd',
      portalLabel: 'Karnataka UDD public grievance',
      source: 'karnataka.gov.in/udd',
    },
  },
  campus: {
    1: {
      id: 'amrita-dean',
      name: 'Dean / Director Office',
      department: 'Office of the Dean — Campus Administration (Level 1 escalation)',
      color: '#ef4444',
      scope: 'campus',
      categories: ['pothole', 'broken-road', 'sidewalk', 'manhole', 'fallen-tree', 'garbage', 'sewage', 'water-leakage', 'street-light', 'security', 'accident', 'other'],
      email: 'info@civiceye.co.in',
      phoneNote: 'Route through Estate Office to Dean office',
      address: 'Admin Block, Amrita Campus',
      hours: 'Mon–Fri 9:00–17:00',
      source: 'Campus directory',
    },
    2: {
      id: 'amrita-vc',
      name: 'Vice Chancellor Office',
      department: 'Office of the Vice Chancellor (Level 2 escalation)',
      color: '#dc2626',
      scope: 'campus',
      categories: ['pothole', 'broken-road', 'sidewalk', 'manhole', 'fallen-tree', 'garbage', 'sewage', 'water-leakage', 'street-light', 'security', 'accident', 'other'],
      email: 'info@civiceye.co.in',
      phoneNote: 'Route through the Dean/PRO to VC office',
      address: 'University HQ, Amrita Vishwa Vidyapeetham',
      hours: 'Mon–Fri 9:00–17:00',
      source: 'Campus directory',
    },
  },
};

/**
 * Return the higher-level Authority a breached report should be escalated to.
 * `nextLevel` = current level + 1 (capped at the top of the chain).
 */
export function escalationAuthorityFor(
  scope: 'city' | 'campus',
  currentLevel: number,
): Authority | null {
  const chain = HIGHER_AUTHORITIES[scope];
  const nextLevel = Math.min(currentLevel + 1, 3);
  return chain[nextLevel] ?? chain[3] ?? null;
}

/* ------------------------------------------------------------------ */

/** tel: link for an authority phone number. */
export const telLink = (a: Authority): string | undefined =>
  a.phone ? `tel:${a.phone.replace(/[^\d+]/g, '')}` : undefined;

export function whatsAppLinks(
  a: Authority,
  message?: string,
): { number: string; url: string }[] {
  const text = encodeURIComponent(message ?? `CivicEye enquiry for ${a.name}`);
  return (a.whatsapp ?? []).map((number) => ({
    number,
    url: `https://wa.me/${number.replace(/[^\d]/g, '')}?text=${text}`,
  }));
}

export function smsLink(a: Authority, message?: string): string | undefined {
  if (!a.phone) return undefined;
  const text = encodeURIComponent(message ?? `CivicEye enquiry for ${a.name}`);
  return `sms:${a.phone.replace(/[^\d+]/g, '')}?body=${text}`;
}

export function mailToLink(a: Authority, subject: string, body: string): string {
  return `mailto:${a.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ------------------------------------------------------------------
 *  BBMP per-zone grievance emails (roads/potholes are handled zone-wise)
 *  Resolve from the report's location text. Fallback: central grievance cell.
 *  Source: BBMP zone contact directory (public, verify before relying).
 * ------------------------------------------------------------------ */
export interface BBMPZoneContact {
  zone: string;
  email: string;
  keywords: string[];
}

export const BBMP_ZONE_CONTACTS: BBMPZoneContact[] = [
  {
    zone: 'East',
    email: 'zc-east@bbmp.gov.in',
    keywords: ['indiranagar', 'cv raman nagar', 'kr puram', 'krpuram', 'baiyappanahalli', 'ulsoor', 'jeevan bima nagar', 'maruthi seva nagar', 'domlur', 'hal'],
  },
  {
    zone: 'West',
    email: 'zc-west@bbmp.gov.in',
    keywords: ['rajajinagar', 'malleswaram', 'malleswaram', 'basaveshwaranagar', 'vijayanagar', 'kamakshipalya', 'chandra layout', 'nagarabhavi', 'rajajinagar'],
  },
  {
    zone: 'South',
    email: 'zc-south@bbmp.gov.in',
    keywords: ['jayanagar', 'banashankari', 'btm', 'padmanabhanagar', 'kumaraswamy layout', 'uttarahalli', 'jp nagar', 'jayanagar', 'girinagar'],
  },
  {
    zone: 'Mahadevapura',
    email: 'bbmpjcmahadevapura@gmail.com',
    keywords: ['whitefield', 'brookefield', 'marathahalli', 'bellandur', 'kadugodi', 'hoodi', 'varthur', 'mahadevapura', 'cv raman nagar'],
  },
];

/** Best BBMP grievance email for a location string (empty → none matched). */
export function bbmpGrievanceEmailFor(location?: string | null): string {
  if (!location) return '';
  const q = location.toLowerCase();
  for (const z of BBMP_ZONE_CONTACTS) {
    if (z.keywords.some((k) => q.includes(k))) return z.email;
  }
  return '';
}

/** True when the authority has an escalation email to send to (non-blank). */
export const hasEscalationEmail = (a: Authority): boolean =>
  a.email.trim().length > 0;
