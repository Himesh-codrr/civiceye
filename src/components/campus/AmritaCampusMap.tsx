import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Search,
 MapPin,
 Layers,
 Satellite,
 Building2,
 Navigation,
 X,
 Menu,
 ZoomIn,
 ZoomOut,
 Maximize2,
 Info,
 GraduationCap,
 Library,
 UtensilsCrossed,
 Dumbbell,
 Home,
 ArrowLeftRight,
 Route,
 Copy,
 ExternalLink,
 Flag,
 QrCode,
 Share2,
} from 'lucide-react';
import type { Report, Coordinates } from '@/types';
import { CAMPUS_GEO } from '@/data/amritaCampus/geo';
import { CAMPUS_FLOORS } from '@/data/amritaCampus/floors';
import { ALL_FACULTY } from '@/data/amritaCampus/allFaculty';
import { generateProperFloorPlan, ProperFloorPlanSVG } from '@/tools/amritaFloorPlanTool';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/useToast';

// Types
type ViewMode = { mode: 'campus'; floor?: null } | { mode: 'floor'; buildingId: string; floorId: string };

type CampusPoint = [number, number];

interface SearchItem {
 kind: 'building' | 'block' | 'facility' | 'zone' | 'poi' | 'gate' | 'space' | 'faculty' | 'report' | 'hall';
 id: string;
 name: string;
 sub: string;
 rank: number;
 // refs
 buildingId?: string;
 floorId?: string;
 spaceId?: string;
 facultyName?: string;
 point?: CampusPoint;
 report?: Report;
 raw?: any;
}

// Geo helpers
const ORIGIN_LAT = CAMPUS_GEO.meta.origin[0] as number;
const ORIGIN_LNG = CAMPUS_GEO.meta.origin[1] as number;
const WIDTH_M = CAMPUS_GEO.meta.width as number;
const HEIGHT_M = CAMPUS_GEO.meta.height as number;
const M_PER_DEG_LAT = 111320;
const AVG_LAT = 12.8945;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((AVG_LAT * Math.PI) / 180);

function latLngToSvg(coords: Coordinates): CampusPoint | null {
 const x = (coords.lng - ORIGIN_LNG) * M_PER_DEG_LNG;
 const yMeters = (coords.lat - ORIGIN_LAT) * M_PER_DEG_LAT;
 const y = HEIGHT_M - yMeters;
 if (x < -50 || x > WIDTH_M + 50 || y < -50 || y > HEIGHT_M + 50) return null;
 return [x, y];
}

function svgToLatLng(x: number, y: number): Coordinates {
 const yMeters = HEIGHT_M - y;
 const lat = ORIGIN_LAT + yMeters / M_PER_DEG_LAT;
 const lng = ORIGIN_LNG + x / M_PER_DEG_LNG;
 return { lat, lng };
}

function svgToLatLngString(x: number, y: number) {
 const c = svgToLatLng(x, y);
 return `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`;
}

// Campus navigation
type NavNode = CampusPoint;
const NAV_NODES: NavNode[] = CAMPUS_GEO.nav.nodes as unknown as any;
const NAV_EDGES: [number, number][] = CAMPUS_GEO.nav.edges as unknown as any;
const NAV_POIS = CAMPUS_GEO.nav.pois as unknown as any[];

const navAdj: Record<number, number[]> = {};
NAV_EDGES.forEach(([a, b]) => {
 if (!navAdj[a]) navAdj[a] = [];
 if (!navAdj[b]) navAdj[b] = [];
 navAdj[a].push(b);
 navAdj[b].push(a);
});
function navDist(a: number, b: number) {
 const [x1, y1] = NAV_NODES[a];
 const [x2, y2] = NAV_NODES[b];
 return Math.hypot(x1 - x2, y1 - y2);
}
function findCampusPath(start: number, end: number): { path: number[]; dist: number } | null {
 const dist: Record<number, number> = { [start]: 0 };
 const prev: Record<number, number> = {};
 const visited = new Set<number>();
 // eslint-disable-next-line no-constant-condition
 while (true) {
 let u: number | null = null;
 let best = Infinity;
 for (const k in dist) {
 const n = Number(k);
 if (!visited.has(n) && dist[n] < best) {
 best = dist[n];
 u = n;
 }
 }
 if (u === null) break;
 if (u === end) break;
 visited.add(u);
 (navAdj[u] || []).forEach((v) => {
 const alt = dist[u] + navDist(u, v);
 if (dist[v] === undefined || alt < dist[v]) {
 dist[v] = alt;
 prev[v] = u;
 }
 });
 }
 if (dist[end] === undefined) return null;
 const path: number[] = [];
 let c: number | undefined = end;
 while (c !== undefined) {
 path.unshift(c);
 c = prev[c];
 }
 return { path, dist: dist[end] };
}
function bearing(a: CampusPoint, b: CampusPoint) {
 return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
}
function turnIcon(delta: number): [string, string] {
 const d = ((delta + 540) % 360) - 180;
 if (d > -25 && d <= 25) return ['↑', 'Continue straight'];
 if (d > 25 && d <= 65) return ['↗', 'Bear right'];
 if (d > 65 && d <= 135) return ['→', 'Turn right'];
 if (d > 135) return ['↱', 'Sharp right'];
 if (d < -25 && d >= -65) return ['↖', 'Bear left'];
 if (d < -65 && d >= -135) return ['←', 'Turn left'];
 return ['↰', 'Sharp left'];
}

// Color maps
const KIND_COLOR: Record<string, string> = {
 academic: '#A51636',
 hostel: '#7c2d12',
 support: '#475569',
 food: '#14532d',
 sport: '#065f46',
 transit: '#4c1d95',
 campus: '#0f766e',
 block: '#A51636',
};
const BLOCK_COLOR: Record<string, string> = {
 A: '#ef4444',
 B: '#22c55e',
 C: '#3b82f6',
 D: '#eab308',
 E: '#A51636',
};
const TYPE_COLOR: Record<string, string> = {
 classroom: '#1e3a8a',
 lab: '#155e75',
 office: '#7c2d12',
 admin: '#4c1d95',
 amenity: '#14532d',
 restroom: '#334155',
 stairs: '#78350f',
 entrance: '#065f46',
 support: '#334155',
};
const SEV_COLOR: Record<string, string> = {
 low: '#22c55e',
 medium: '#eab308',
 high: '#f97316',
 critical: '#ef4444',
};

// Props
interface AmritaCampusMapProps {
 reports?: Report[];
 selectedId?: string | null;
 onSelect?: (id: string | null) => void;
 pinDropping?: boolean;
 onPinDrop?: (coords: Coordinates, meta: { x: number; y: number; building?: string; block?: string; floor?: string; room?: string }) => void;
 droppedPin?: Coordinates | null;
 className?: string;
 // optional controlled view
 initialView?: ViewMode;
}

export function AmritaCampusMap({
 reports = [],
 selectedId = null,
 onSelect,
 pinDropping = false,
 onPinDrop,
 droppedPin = null,
 className,
 initialView,
}: AmritaCampusMapProps) {
 const toast = useToast();
 const svgRef = useRef<SVGSVGElement>(null);
 const gRef = useRef<SVGGElement>(null);
 const stageRef = useRef<HTMLDivElement>(null);

 // Camera
 const [cam, setCam] = useState({ x: 0, y: 0, k: 1 });
 const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

 // View
 const [view, setView] = useState<ViewMode>(initialView || { mode: 'campus' });
 useEffect(() => {
 if (initialView) setView(initialView);
 }, [initialView]);
 const [showSat, setShowSat] = useState(false);
 const [showBlocks, setShowBlocks] = useState(true);
 const [showReports, setShowReports] = useState(true);
 const [search, setSearch] = useState('');
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const [activeTab, setActiveTab] = useState<'explore' | 'issues' | 'faculty' | 'directions'>('explore');
 const [info, setInfo] = useState<any>(null);
 const [infoOpen, setInfoOpen] = useState(false);

 // Nav
 const [navFrom, setNavFrom] = useState<string>('');
 const [navTo, setNavTo] = useState<string>('');
 const [navRoute, setNavRoute] = useState<{ from: any; to: any; path: number[]; total: number } | null>(null);
 const [navSteps, setNavSteps] = useState<{ icon: string; text: string }[]>([]);

 // Floor helpers — FIXED so floor plans actually show (was placeholder due to buildingId mismatch)
 const currentBuilding = (() => {
 if (view.mode !== 'floor') return null;
 let bid = (view as any).buildingId;
 if (!bid) return null;
 if (bid.startsWith('block-')) bid = bid.replace('block-', '').toLowerCase();
 if (bid.length === 1 && bid.toUpperCase() in ['A','B','C','D','E']) bid = bid.toLowerCase();
 if (bid === 'way/631815097') bid = 'e';
 const valid = ['a','b','c','d','e'];
 if (!valid.includes(bid)) {
 const maybe = (view as any).floorId?.split('-')[0]?.toLowerCase();
 if (valid.includes(maybe)) bid = maybe;
 else bid = 'a';
 }
 return (CAMPUS_FLOORS.buildings as any)[bid] || null;
 })();
 const currentFloor = currentBuilding?.floors.find((f: any) => f.id === (view as any).floorId) || currentBuilding?.floors[0] || null;

 // Search index
 const searchIndex = useMemo(() => {
 const items: SearchItem[] = [];
 // Buildings
 (CAMPUS_GEO.buildings as unknown as any[]).forEach((b: any) => {
 items.push({
 kind: 'building',
 id: b.name,
 name: b.name,
 sub: `${b.kind}`,
 rank: 2,
 point: b.c,
 raw: b,
 });
 });
 (CAMPUS_GEO.blocks as unknown as any[]).forEach((b: any) => {
 if (b.part !== 0) return;
 items.push({
 kind: 'block',
 id: `block-${b.block}`,
 name: `Block ${b.block}`,
 sub: b.role,
 rank: 1,
 point: b.c,
 raw: b,
 });
 });
 (CAMPUS_GEO.digitized as unknown as any[]).forEach((d: any) => {
 items.push({
 kind: 'facility',
 id: d.id,
 name: d.name,
 sub: `${d.kind} `,
 rank: 3,
 point: d.c,
 raw: d,
 });
 });
 (CAMPUS_GEO.zones as unknown as any[]).forEach((z: any) => {
 items.push({ kind: 'zone', id: z.id, name: z.name, sub: `Zone`, rank: 4, point: z.c, raw: z });
 });
 NAV_POIS.forEach((p: any) => {
 items.push({
 kind: p.kind === 'gate' ? 'gate' : 'poi',
 id: p.id,
 name: p.name,
 sub: p.kind,
 rank: 3,
 point: p.c,
 raw: p,
 });
 });
 // Floors spaces
 Object.entries(CAMPUS_FLOORS.buildings as any).forEach(([bid, b]: any) => {
 b.floors.forEach((fl: any) => {
 fl.spaces.forEach((sp: any) => {
 const isHall = sp.capacity && sp.capacity > 25;
 items.push({
 kind: isHall ? 'hall' : 'building',
 id: sp.id,
 name: sp.name,
 sub: `${sp.label} · ${b.name} · ${fl.name}`,
 rank: isHall ? 1 : 2,
 buildingId: bid,
 floorId: fl.id,
 spaceId: sp.id,
 point: [sp.x + sp.w / 2, sp.y + sp.h / 2],
 raw: sp,
 });
 (sp.seats || []).forEach((seat: any) => {
 items.push({
 kind: 'faculty',
 id: seat.id,
 name: seat.person,
 sub: `${seat.dept || ''} · ${seat.role || ''} · ${sp.label} · ${b.name}`,
 rank: 0,
 buildingId: bid,
 floorId: fl.id,
 spaceId: sp.id,
 facultyName: seat.person,
 point: [seat.x, seat.y],
 raw: { ...seat, space: sp, floor: fl, building: b },
 });
 });
 });
 });
 });
 // Extended faculty without seats
 ALL_FACULTY.forEach((f: any) => {
 if (!items.some((it) => it.kind === 'faculty' && it.name === f.name)) {
 items.push({
 kind: 'faculty',
 id: f.id,
 name: f.name,
 sub: `${f.dept || ''} · ${f.role || ''} · ${f.blockName || ''}`,
 rank: 0,
 raw: f,
 });
 }
 });
 // Reports
 reports.forEach((r) => {
 const pt = latLngToSvg(r.coordinates);
 items.push({
 kind: 'report',
 id: r.id,
 name: r.title,
 sub: `${r.category} · ${r.locationName} · ${r.status}`,
 rank: 0,
 point: pt || undefined,
 report: r,
 raw: r,
 });
 });
 return items;
 }, [reports]);

 const filteredSearch = useMemo(() => {
 const q = search.trim().toLowerCase();
 if (!q) return [];
 return searchIndex
 .filter((it) => (it.name + ' ' + it.sub).toLowerCase().includes(q))
 .sort((a, b) => {
 const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
 const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
 if (aStarts !== bStarts) return aStarts - bStarts;
 return a.rank - b.rank;
 })
 .slice(0, 40);
 }, [search, searchIndex]);

 // Camera apply
 const applyCam = useCallback(() => {
 if (gRef.current) {
 gRef.current.setAttribute('transform', `translate(${cam.x},${cam.y}) scale(${cam.k})`);
 }
 }, [cam]);
 useEffect(() => {
 applyCam();
 }, [applyCam]);

 const resetView = useCallback(() => {
 if (!stageRef.current) return;
 const W = view.mode === 'campus' ? WIDTH_M : currentFloor?.width || 1000;
 const H = view.mode === 'campus' ? HEIGHT_M : currentFloor?.height || 460;
 const stage = stageRef.current;
 const bw = stage.clientWidth;
 const bh = stage.clientHeight;
 const pad = view.mode === 'campus' ? 60 : 40;
 const k = Math.min((bw - pad*2) / W, (bh - pad*2) / H) * 0.92;
 const x = (bw - W * k) / 2;
 const y = (bh - H * k) / 2;
 setCam({ x, y, k: Math.max(0.5, Math.min(4, k)) });
 }, [view, currentFloor]);

 useEffect(() => {
 resetView();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [view.mode, currentFloor?.id]);

 // Focus helper
 const focusPoint = useCallback(
 (x: number, y: number, span = 120) => {
 if (!stageRef.current) return;
 const b = stageRef.current.getBoundingClientRect();
 const k = Math.min(b.width / span, b.height / span, 3);
 setCam({ x: b.width / 2 - x * k, y: b.height / 2 - y * k, k });
 },
 [],
 );

 // Pointer handlers for pan/zoom
 useEffect(() => {
 const svg = svgRef.current;
 if (!svg) return;
 const onPointerDown = (e: PointerEvent) => {
 (e.target as Element).setPointerCapture?.(e.pointerId);
 setDrag({ x: e.clientX - cam.x, y: e.clientY - cam.y });
 if (svg) svg.style.cursor = 'grabbing';
 };
 const onPointerMove = (e: PointerEvent) => {
 if (!drag) return;
 setCam((c) => {
 let nx = e.clientX - drag.x;
 let ny = e.clientY - drag.y;
 // Prevent getting lost: clamp panning so campus always visible, limit black space
 if (stageRef.current) {
 const bw = stageRef.current.clientWidth;
 const bh = stageRef.current.clientHeight;
 const W = view.mode === 'campus' ? WIDTH_M : currentFloor?.width || 1000;
 const H = view.mode === 'campus' ? HEIGHT_M : currentFloor?.height || 460;
 const k = c.k;
 // Allow some overflow but not too much black space
 const minX = bw - W * k - 100;
 const maxX = 100;
 const minY = bh - H * k - 100;
 const maxY = 100;
 nx = Math.max(minX, Math.min(maxX, nx));
 ny = Math.max(minY, Math.min(maxY, ny));
 }
 return { ...c, x: nx, y: ny };
 });
 };
 const onPointerUp = () => {
 setDrag(null);
 if (svg) svg.style.cursor = 'grab';
 };
 const onWheel = (e: WheelEvent) => {
 e.preventDefault();
 if (!stageRef.current) return;
 const rect = stageRef.current.getBoundingClientRect();
 const mx = e.clientX - rect.left;
 const my = e.clientY - rect.top;
 const f = e.deltaY < 0 ? 1.12 : 0.89;
 setCam((c) => ({
 x: mx - (mx - c.x) * f,
 y: my - (my - c.y) * f,
 k: Math.max(0.5, Math.min(4, c.k * f)),
 }));
 };
 svg.addEventListener('pointerdown', onPointerDown);
 window.addEventListener('pointermove', onPointerMove);
 window.addEventListener('pointerup', onPointerUp);
 svg.addEventListener('wheel', onWheel, { passive: false });
 return () => {
 svg.removeEventListener('pointerdown', onPointerDown);
 window.removeEventListener('pointermove', onPointerMove);
 window.removeEventListener('pointerup', onPointerUp);
 svg.removeEventListener('wheel', onWheel);
 };
   }, [drag, cam.x, cam.y, view.mode, currentFloor?.width, currentFloor?.height]);

 // Click on canvas to pin
 const handleCanvasClick = useCallback(
 (e: React.MouseEvent) => {
 if (drag) return;
 if (!stageRef.current || !svgRef.current) return;
 // If clicking on a building, let its handler handle
 const target = e.target as Element;
 if (target.closest('.campus-interactive')) return;

 const rect = stageRef.current.getBoundingClientRect();
 const mx = e.clientX - rect.left;
 const my = e.clientY - rect.top;
 const x = (mx - cam.x) / cam.k;
 const y = (my - cam.y) / cam.k;

 if (pinDropping && onPinDrop) {
 const coords = svgToLatLng(x, y);
 onPinDrop(coords, { x, y });
 toast.success('Location pinned', `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
 return;
 }

 // Otherwise show lat/lng + copy
 const coords = svgToLatLng(x, y);
 setInfo({
 type: 'point',
 x,
 y,
 lat: coords.lat,
 lng: coords.lng,
 name: `Pinned Location`,
 sub: `${x.toFixed(1)}m, ${y.toFixed(1)}m · ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
 });
 setInfoOpen(true);
 },
 [drag, cam, pinDropping, onPinDrop, toast],
 );

 // Navigation
 const goRoute = useCallback(() => {
 if (!navFrom || !navTo || navFrom === navTo) {
 toast.error('Pick two different places');
 return;
 }
 const A = NAV_POIS.find((p) => p.id === navFrom);
 const B = NAV_POIS.find((p) => p.id === navTo);
 if (!A || !B) return;
 const res = findCampusPath(A.node, B.node);
 if (!res) {
 toast.error('No path found');
 return;
 }
 const total = res.dist + (A.walk || 0) + (B.walk || 0);
 const mins = Math.max(1, Math.round(total / 1.35 / 60));
 // Build steps
 const steps: { icon: string; text: string }[] = [];
 steps.push({ icon: '●', text: `Start at ${A.name}` });
 let acc = 0;
 for (let i = 0; i < res.path.length - 1; i++) {
 const seg = navDist(res.path[i], res.path[i + 1]);
 acc += seg;
 if (i + 2 < res.path.length) {
 const a = NAV_NODES[res.path[i]];
 const b = NAV_NODES[res.path[i + 1]];
 const c = NAV_NODES[res.path[i + 2]];
 const b1 = bearing(a, b);
 const b2 = bearing(b, c);
 let d = b2 - b1;
 d = ((d + 540) % 360) - 180;
 if (Math.abs(d) > 25) {
 const [ic, txt] = turnIcon(d);
 steps.push({ icon: ic, text: `${txt} after ${Math.round(acc)} m` });
 acc = 0;
 }
 }
 }
 if (acc > 3) steps.push({ icon: '↑', text: `Continue ${Math.round(acc)} m` });
 steps.push({ icon: '◎', text: `Arrive at ${B.name} · ${Math.round(total)} m · ~${mins} min` });
 setNavRoute({ from: A, to: B, path: res.path, total });
 setNavSteps(steps);
 if (view.mode !== 'campus') setView({ mode: 'campus' });
 // Fit
 const xs = [A.c[0], B.c[0], ...res.path.map((i) => NAV_NODES[i][0])];
 const ys = [A.c[1], B.c[1], ...res.path.map((i) => NAV_NODES[i][1])];
 const minX = Math.min(...xs),
 maxX = Math.max(...xs),
 minY = Math.min(...ys),
 maxY = Math.max(...ys);
 const cx = (minX + maxX) / 2;
 const cy = (minY + maxY) / 2;
 const span = Math.max(maxX - minX, maxY - minY, 80);
 focusPoint(cx, cy, span);
 }, [navFrom, navTo, toast, view.mode, focusPoint]);

 const clearNav = () => {
 setNavRoute(null);
 setNavSteps([]);
 };

 // Report markers on campus — FIXED: accurate placement using building centroids when lat/lng outside or from locationName
 const campusReportMarkers = useMemo(() => {
 if (!showReports) return [];
 // Building centroids for accurate mapping from locationName
 const buildingCentroids: Record<string, CampusPoint> = {
 'block-a': [145.4, 426.0],
 'block-b': [137.1, 446.2],
 'block-c': [129.5, 467.4],
 'block-d': [89.0, 482.2],
 'block-e': [199.4, 404.7],
 'main academic': [132.5, 437.6],
 'academic block east': [318.5, 435.5],
 'cafeteria': [133.3, 493.2],
 'library': [199.4, 404.7],
 'hostel': [238.0, 50.4],
 'playing field': [214.0, 132.4],
 'tennis': [261.2, 164.7],
 'basketball': [261.2, 164.7],
 'gate': [172.8, 326.2],
 };
 return reports
 .map((r) => {
 let pt = latLngToSvg(r.coordinates);
 // If lat/lng outside campus or conversion fails, try to map from locationName
 if (!pt) {
 const nameLower = (r.locationName || '').toLowerCase();
 for (const key in buildingCentroids) {
 if (nameLower.includes(key)) {
 pt = buildingCentroids[key];
 break;
 }
 }
 // Check for block letter in locationName like A-101, B-G7, C-106, etc.
 if (!pt) {
 const blockMatch = nameLower.match(/block\s*([a-e])/i) || nameLower.match(/\b([a-e])[-\s]*\d+/i);
 if (blockMatch) {
 const letter = blockMatch[1].toLowerCase();
 const map: Record<string, CampusPoint> = { 'a': [145.4, 426.0], 'b': [137.1, 446.2], 'c': [129.5, 467.4], 'd': [89.0, 482.2], 'e': [199.4, 404.7] };
 pt = map[letter] || [199.4, 404.7];
 }
 }
 // Fallback to campus center with slight random offset to avoid stacking
 if (!pt) {
 const jitter = (Math.random() - 0.5) * 40;
 pt = [132.5 + jitter, 437.6 + jitter];
 }
 }
 return pt ? { report: r, point: pt } : null;
 })
 .filter(Boolean) as { report: Report; point: CampusPoint }[];
 }, [reports, showReports]);

 // Pick from search
 const pickSearch = (item: SearchItem) => {
 setSearch('');
 setSidebarOpen(false);
 if (item.kind === 'report' && item.report) {
 onSelect?.(item.report.id);
 if (item.point) focusPoint(item.point[0], item.point[1], 80);
 setInfo({ type: 'report', report: item.report, point: item.point });
 setInfoOpen(true);
 return;
 }
 if (item.kind === 'faculty') {
 if (item.buildingId && item.floorId) {
 setView({ mode: 'floor', buildingId: item.buildingId, floorId: item.floorId });
 setTimeout(() => {
 if (item.point) focusPoint(item.point[0], item.point[1], 200);
 }, 100);
 }
 setInfo({ type: 'faculty', faculty: item.raw, buildingId: item.buildingId, floorId: item.floorId });
 setInfoOpen(true);
 return;
 }
 if (item.buildingId && item.floorId && item.spaceId) {
 setView({ mode: 'floor', buildingId: item.buildingId, floorId: item.floorId });
 setTimeout(() => {
 if (item.point) focusPoint(item.point[0], item.point[1], 300);
 }, 100);
 setInfo({ type: 'space', space: item.raw, buildingId: item.buildingId, floorId: item.floorId });
 setInfoOpen(true);
 return;
 }
 // Campus items
 setView({ mode: 'campus' });
 if (item.point) focusPoint(item.point[0], item.point[1], 120);
 setInfo({ type: item.kind, raw: item.raw, name: item.name, sub: item.sub, point: item.point });
 setInfoOpen(true);
 };

 // Info panel content
 const renderInfo = () => {
 if (!info) return null;
 if (info.type === 'point') {
 return (
 <div className="space-y-3">
 <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
 <MapPin className="h-5 w-5 text-[#A51636]" />
 {info.name}
 </h3>
 <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
 <div className="text-xs text-slate-500">Campus meters</div>
 <div className="font-mono text-sm">{info.x.toFixed(1)} m, {info.y.toFixed(1)} m</div>
 <div className="mt-2 text-xs text-slate-500">Lat / Lng</div>
 <div className="font-mono text-sm">
 {info.lat.toFixed(6)}, {info.lng.toFixed(6)}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => {
 navigator.clipboard.writeText(`${info.lat}, ${info.lng}`);
 toast.success('Copied coordinates');
 }}
 className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5"
 >
 <Copy className="h-4 w-4" /> Copy LatLng
 </button>
 <button
 onClick={() => {
 navigator.clipboard.writeText(svgToLatLngString(info.x, info.y));
 toast.success('Copied');
 }}
 className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5"
 >
 <Share2 className="h-4 w-4" /> Share
 </button>
 </div>
 {pinDropping ? (
 <button
 onClick={() => onPinDrop?.({ lat: info.lat, lng: info.lng }, { x: info.x, y: info.y })}
 className="w-full rounded-xl bg-[#A51636] px-4 py-3 text-sm font-bold text-white hover:bg-[#8a1230]"
 >
 Use this location for report
 </button>
 ) : (
 <button
 onClick={() => {
 const url = `https://www.google.com/maps?q=${info.lat},${info.lng}`;
 window.open(url, '_blank');
 }}
 className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-black dark:bg-white dark:text-black"
 >
 <ExternalLink className="h-4 w-4" /> Open in Maps
 </button>
 )}
 <div className="rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
 <Info className="mr-1 inline h-3.5 w-3.5" /> Tap to use this location for reporting.
 </div>
 </div>
 );
 }
 if (info.type === 'report') {
 const r: Report = info.report;
 return (
 <div className="space-y-3">
 <div className="flex items-start justify-between gap-3">
 <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{r.title}</h3>
 <span
 className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
 style={{ background: SEV_COLOR[r.severity] || '#666' }}
 >
 {r.severity}
 </span>
 </div>
 <div className="flex flex-wrap gap-1.5">
 <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-white/10">{r.category}</span>
 <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-white/10">{r.status}</span>
 {r.verified ? (
 <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Verified</span>
 ) : null}
 </div>
 <img src={r.image} alt="" className="h-40 w-full rounded-xl object-cover" />
 <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{r.description}</p>
 <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
 <div className="flex items-center gap-2 text-slate-500">
 <MapPin className="h-4 w-4" /> {r.locationName}
 </div>
 <div className="mt-1 font-mono text-xs text-slate-400">
 {r.coordinates.lat.toFixed(6)}, {r.coordinates.lng.toFixed(6)}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => onSelect?.(r.id)}
 className="rounded-xl bg-[#A51636] px-3 py-2.5 text-sm font-bold text-white"
 >
 View details
 </button>
 <button
 onClick={() => {
 if (info.point) focusPoint(info.point[0], info.point[1], 60);
 }}
 className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5"
 >
 Focus on map
 </button>
 </div>
 </div>
 );
 }
 if (info.type === 'faculty') {
 const f = info.faculty;
 return (
 <div className="space-y-3">
 <h3 className="text-lg font-bold text-slate-900 dark:text-white">{f.person || f.name}</h3>
 <div className="text-sm text-slate-500 dark:text-slate-400">{f.role || f.title} · {f.dept}</div>
 {f.desk ? (
 <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
 <div className="text-xs text-slate-500">Desk / Room</div>
 <div className="font-semibold">
 {f.desk} · {f.roomName || f.space?.name || f.room}
 </div>
 <div className="text-xs text-slate-500">
 {f.blockName || f.building?.name} · {f.floorName || f.floor?.name}
 </div>
 </div>
 ) : null}
 {f.url ? (
 <a
 href={f.url}
 target="_blank"
 rel="noopener noreferrer"
 className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-black dark:bg-white dark:text-black"
 >
 <ExternalLink className="h-4 w-4" /> Official profile
 </a>
 ) : null}
 <button
 onClick={() => {
 if (f.c) focusPoint(f.c[0], f.c[1], 100);
 else if (info.buildingId && info.floorId) {
 setView({ mode: 'floor', buildingId: info.buildingId, floorId: info.floorId });
 }
 }}
 className="w-full rounded-xl border border-[#A51636]/20 bg-[#A51636]/10 px-4 py-2.5 text-sm font-bold text-[#A51636]"
 >
 Show on map
 </button>
 <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
 Name, title and profile are from amrita.edu. Desk position is indicative.
 </div>
 </div>
 );
 }
 if (info.type === 'space') {
 const s = info.space;
 const isClassroom = s.type === 'classroom';
 const isLab = s.type === 'lab';
 const isLibrary = s.name.toLowerCase().includes('library') || s.label.toLowerCase().includes('library');
 const isHall = s.capacity && s.capacity >= 80;
 return (
 <div className="space-y-3">
 {isClassroom ? <img src="/amrita-bengaluru-campus-classroom-interi-1.jpg" alt="Classroom interior - 80 students per review" className="h-32 w-full rounded-xl object-cover" loading="lazy" /> : null}
 {isLab ? <img src="/amrita-bengaluru-campus-classroom-interi-2.jpg" alt="Lab interior" className="h-32 w-full rounded-xl object-cover" loading="lazy" /> : null}
 {isLibrary ? <img src="/amrita-bengaluru-campus-library-4th-floo-2.jpg" alt="Library 4th floor 1213 sq m 200 seating" className="h-32 w-full rounded-xl object-cover" loading="lazy" /> : null}
 {isHall ? <img src="/amrita-vishwa-vidyapeetham-bengaluru-cam-1.jpg" alt="Hall with real capacity from ICTS" className="h-32 w-full rounded-xl object-cover" loading="lazy" /> : null}
 <h3 className="text-lg font-bold text-slate-900 dark:text-white">{s.name}</h3>
 <div className="flex gap-2">
 <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white dark:bg-white dark:text-black">
 {s.label}
 </span>
 <span className="rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ background: TYPE_COLOR[s.type] || '#555' }}>
 {s.type}
 </span>
 </div>
 {s.capacity ? <div className="text-sm text-slate-500">Capacity: {s.capacity} seats</div> : null}
 {s.meta
 ? Object.entries(s.meta).map(([k, v]) => (
 <div key={k} className="flex justify-between border-b border-dashed border-slate-200 py-1.5 text-sm last:border-0 dark:border-white/10">
 <span className="text-slate-500">{k}</span>
 <span className="font-medium text-slate-800 dark:text-slate-200">{String(v)}</span>
 </div>
 ))
 : null}
 {s.seats?.length ? (
 <div>
 <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Faculty here</div>
 <div className="space-y-1">
 {s.seats.map((seat: any) => (
 <div key={seat.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
 <span className="text-xs font-mono">{seat.desk}</span>
 <span className="text-sm font-medium">{seat.person}</span>
 </div>
 ))}
 </div>
 </div>
 ) : null}
 <button
 onClick={() => {
 const fl = (CAMPUS_FLOORS.buildings as any)[info.buildingId].floors.find((f: any) => f.id === info.floorId);
 if (!fl) return;
 const ent = fl.spaces.find((sp: any) => sp.type === 'entrance') || fl.spaces.find((sp: any) => sp.type === 'stairs');
 if (!ent) return;
 // simple indoor route visual would be in floor view; just toast
 toast.info('Indoor route', `From ${ent.name} to ${s.name}`);
 }}
 className="w-full rounded-xl bg-[#A51636] px-4 py-2.5 text-sm font-bold text-white"
 >
 <Route className="mr-2 inline h-4 w-4" /> Route from entrance
 </button>
 <div className="flex gap-2">
 <button
 onClick={() => {
 const c = svgToLatLng(s.x + s.w / 2, s.y + s.h / 2);
 navigator.clipboard.writeText(`${c.lat},${c.lng}`);
 toast.success('Copied location');
 }}
 className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5"
 >
 <Copy className="h-4 w-4" /> Copy LatLng
 </button>
 <button
 onClick={() => {
 const url = `${window.location.origin}/amrita/map?b=${info.buildingId}&f=${info.floorId}&room=${s.label}`;
 navigator.clipboard.writeText(url);
 toast.success('Deep link copied');
 }}
 className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5"
 >
 <QrCode className="h-4 w-4" /> QR / Link
 </button>
 </div>
 </div>
 );
 }
 // building / block / etc
 const raw = info.raw || {};
 const isMainAcademic = (raw.name || '').toLowerCase().includes('main academic') || (info.name || '').toLowerCase().includes('main academic');
 const isCafeteria = (raw.name || '').toLowerCase().includes('cafeteria') || (info.name || '').toLowerCase().includes('cafeteria');
 const isHostel = (raw.kind === 'hostel') || (raw.name || '').toLowerCase().includes('hostel') || (info.name || '').toLowerCase().includes('hostel');
 const isLibrary = (raw.name || '').toLowerCase().includes('library') || (info.name || '').toLowerCase().includes('library');
 return (
 <div className="space-y-3">
 <h3 className="text-lg font-bold text-slate-900 dark:text-white">{info.name || raw.name}</h3>
 <div className="text-sm text-slate-500">{info.sub || raw.role || raw.kind}</div>
 {isMainAcademic ? (
 <div className="space-y-2">
 <div className="grid grid-cols-2 gap-2">
 <img src="/amrita-main-block-fountain.jpg" alt="Main academic block with fountain" className="h-28 w-full rounded-xl object-cover" loading="lazy" />
 <img src="/amrita-main-entrance-white.jpg" alt="Main entrance" className="h-28 w-full rounded-xl object-cover" loading="lazy" />
 </div>
 <div className="grid grid-cols-3 gap-1.5">
 <img src="/amrita-vishwa-vidyapeetham-bengaluru-cam-5.jpg" alt="Academic building peach 4 floors balconies" className="h-16 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-vishwa-vidyapeetham-bengaluru-cam-2.jpg" alt="Campus building with students green lawns" className="h-16 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-vishwa-vidyapeetham-bengaluru-cam-1.jpg" alt="Conference hall building small" className="h-16 w-full rounded-lg object-cover" loading="lazy" />
 </div>
 <div className="rounded-xl bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
 Main Academic Block with multiple wings and central facilities.
 </div>
 
 </div>
 ) : null}
 {isCafeteria ? (
 <div className="space-y-2">
 <div className="grid grid-cols-3 gap-1.5">
 <img src="/amrita-bengaluru-campus-cafeteria-cantee-1.webp" alt="Cafeteria canteen" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-bengaluru-campus-cafeteria-cantee-2.webp" alt="Cafeteria" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-bengaluru-campus-cafeteria-cantee-3.webp" alt="Cafeteria" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 </div>
 <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
 Campus cafeteria and dining facilities.
 </div>
 </div>
 ) : null}
 {isHostel ? (
 <div className="space-y-2">
 <div className="grid grid-cols-3 gap-1.5">
 <img src="/amrita-bengaluru-campus-hostel-blocks-1.webp" alt="Hostel blocks" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-bengaluru-campus-hostel-blocks-2.webp" alt="Hostel" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-bengaluru-campus-hostel-blocks-3.webp" alt="Hostel" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 </div>
 <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
 Student hostels and residential facilities.
 </div>
 </div>
 ) : null}
 {isLibrary ? (
 <div className="space-y-2">
 <div className="grid grid-cols-3 gap-1.5">
 <img src="/amrita-bengaluru-campus-library-4th-floo-1.jpg" alt="Library conference hall" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-bengaluru-campus-library-4th-floo-2.jpg" alt="Placements interior" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 <img src="/amrita-bengaluru-campus-library-4th-floo-3.jpg" alt="Library infrastructure" className="h-20 w-full rounded-lg object-cover" loading="lazy" />
 </div>
 <div className="rounded-xl bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
 Central Library with reading halls and digital resources.
 </div>
 </div>
 ) : null}
 
 {raw.note ? <div className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed dark:bg-white/5">{raw.note}</div> : null}
 {raw.confidence ? (
 <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
 {raw.confidence}
 </div>
 ) : null}
 <div className="grid grid-cols-2 gap-2">
 <button
 onClick={() => {
 if (raw.id && (CAMPUS_FLOORS.buildings as any)[raw.id]) {
 setView({ mode: 'floor', buildingId: raw.id, floorId: (CAMPUS_FLOORS.buildings as any)[raw.id].floors[0].id });
 } else if (info.point) {
 focusPoint(info.point[0], info.point[1], 100);
 }
 }}
 className="rounded-xl bg-[#A51636] px-3 py-2.5 text-sm font-bold text-white"
 >
 Open
 </button>
 <button
 onClick={() => {
 if (!info.point) return;
 const c = svgToLatLng(info.point[0], info.point[1]);
 navigator.clipboard.writeText(`${c.lat},${c.lng}`);
 toast.success('Copied');
 }}
 className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5"
 >
 <Copy className="mr-1 inline h-4 w-4" /> Copy
 </button>
 </div>
 </div>
 );
 };

 // Dropped pin marker
 const droppedSvg = droppedPin ? latLngToSvg(droppedPin) : null;

 return (
 <div className={cn('relative flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-[#A51636]/10 bg-[#FFF5F7] shadow-[0_8px_32px_rgba(165,22,54,0.08)] dark:border-white/10 dark:bg-[#0f0a0d] dark:shadow-none', className)}>
 {/* Top bar */}
 <div className="flex flex-wrap items-center gap-2 border-b border-[#A51636]/10 bg-white/90 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/30">
 <button
 onClick={() => setSidebarOpen((o) => !o)}
 className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white lg:hidden"
 >
 <Menu className="h-4 w-4" />
 </button>

 <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
 <Search className="h-4 w-4 text-slate-400" />
 <input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search building, room, teacher, issue…"
 className="w-[200px] bg-transparent text-sm outline-none placeholder:text-slate-400 sm:w-[280px]"
 />
 {search ? (
 <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
 <X className="h-4 w-4" />
 </button>
 ) : null}
 </div>

 <div className="ml-auto flex items-center gap-1.5 overflow-x-auto">
 <button
 onClick={() => setShowBlocks((v) => !v)}
 className={cn(
 'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold',
 showBlocks ? 'border-[#A51636] bg-[#A51636] text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
 )}
 >
 <Layers className="h-4 w-4" /> Blocks
 </button>
 <button
 onClick={() => setShowSat((v) => !v)}
 className={cn(
 'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold',
 showSat ? 'border-[#A51636] bg-[#A51636] text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
 )}
 >
 <Satellite className="h-4 w-4" /> Satellite
 </button>
 <button
 onClick={() => setShowReports((v) => !v)}
 className={cn(
 'flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold',
 showReports ? 'border-[#A51636] bg-[#A51636] text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
 )}
 >
 <Flag className="h-4 w-4" /> Issues
 </button>
 <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />
 <button onClick={() => setCam((c) => ({ ...c, k: Math.min(4, c.k * 1.25) }))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#A51636]/30 dark:border-white/10 dark:bg-white/5 dark:text-white">
 <ZoomIn className="h-4 w-4" />
 </button>
 <button onClick={() => setCam((c) => ({ ...c, k: Math.max(0.5, c.k * 0.8) }))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#A51636]/30 dark:border-white/10 dark:bg-white/5 dark:text-white">
 <ZoomOut className="h-4 w-4" />
 </button>
 <button onClick={resetView} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#A51636]/30 dark:border-white/10 dark:bg-white/5 dark:text-white">
 <Maximize2 className="h-4 w-4" />
 </button>
 </div>
 </div>

 {/* Breadcrumb + warning */}
 <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-[#FFF5F7] px-4 py-2 text-xs dark:border-white/5 dark:bg-[#1a0a0f]">
 <span className="font-semibold text-[#A51636]">Amrita Eye · Bengaluru</span>
 <span className="text-slate-400">·</span>
 <span className="text-slate-600 dark:text-slate-300">
 {view.mode === 'campus' ? `Campus` : `${currentBuilding?.name} › ${currentFloor?.name}`}
 </span>
 {view.mode === 'floor' ? (
 <div className="ml-auto flex gap-1">
 {Object.entries(CAMPUS_FLOORS.buildings as any).map(([bid, b]: any) => (
 <button
 key={bid}
 onClick={() => setView({ mode: 'floor', buildingId: bid, floorId: b.floors[0].id })}
 className={cn('rounded-full px-2.5 py-1 text-xs font-bold', (view as any).buildingId === bid ? 'bg-[#A51636] text-white' : 'bg-white text-slate-600 dark:bg-white/10 dark:text-slate-300')}
 >
 {b.name.replace('Block ', '')}
 </button>
 ))}
 </div>
 ) : null}
 </div>

 {view.mode === 'floor' ? (
 <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-white/5 dark:bg-white/5 dark:text-slate-300">
 <Building2 className="h-4 w-4 shrink-0 text-[#A51636]" />
 <span>Floor plan — tap a room to see details</span>
 </div>
 ) : null}

 <div className="relative flex min-h-0 flex-1">
 {/* Sidebar */}
 <aside
 className={cn(
 'z-20 flex w-[340px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f0a0d] max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:w-[86vw] max-lg:max-w-[360px] max-lg:shadow-2xl max-lg:transition-transform',
 sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
 )}
 >
 <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-white/10">
 <div>
 <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
 <Building2 className="h-4 w-4 text-[#A51636]" /> Campus Explorer
 </h2>
 <p className="mt-1 text-xs text-slate-500">Kasavanahalli · 560035</p>
 </div>
 <button onClick={() => setSidebarOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 lg:hidden">
 <X className="h-4 w-4" />
 </button>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 border-b border-slate-200 p-2 dark:border-white/10">
 {[
 { id: 'explore', label: 'Explore', icon: Building2 },
 { id: 'issues', label: 'Issues', icon: Flag },
 { id: 'faculty', label: 'Faculty', icon: GraduationCap },
 { id: 'directions', label: 'Route', icon: Navigation },
 ].map((t) => (
 <button
 key={t.id}
 onClick={() => setActiveTab(t.id as any)}
 className={cn(
 'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold',
 activeTab === t.id ? 'bg-[#A51636] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300',
 )}
 >
 <t.icon className="h-3.5 w-3.5" /> {t.label}
 </button>
 ))}
 </div>

 {/* Directions */}
 {activeTab === 'directions' ? (
 <div className="border-b border-slate-200 p-3 dark:border-white/10">
 <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Campus walking directions</div>
 <select value={navFrom} onChange={(e) => setNavFrom(e.target.value)} className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5">
 <option value="">From…</option>
 {NAV_POIS.map((p: any) => (
 <option key={p.id} value={p.id}>
 {p.name}
 </option>
 ))}
 </select>
 <select value={navTo} onChange={(e) => setNavTo(e.target.value)} className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5">
 <option value="">To…</option>
 {NAV_POIS.map((p: any) => (
 <option key={p.id} value={p.id}>
 {p.name}
 </option>
 ))}
 </select>
 <div className="flex gap-2">
 <button onClick={goRoute} className="flex-1 rounded-xl bg-[#A51636] px-3 py-2.5 text-sm font-bold text-white">
 Get directions
 </button>
 <button onClick={() => { const f = navFrom; setNavFrom(navTo); setNavTo(f); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
 <ArrowLeftRight className="h-4 w-4" />
 </button>
 <button onClick={clearNav} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
 <X className="h-4 w-4" />
 </button>
 </div>
 {navSteps.length ? (
 <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
 <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-white/10">
 <span className="text-xs font-bold">{navRoute ? `${Math.round(navRoute.total)} m · ~${Math.max(1, Math.round(navRoute.total / 1.35 / 60))} min walk` : ''}</span>
 <span className="text-[10px] text-slate-500">on campus paths</span>
 </div>
 <div className="max-h-[200px] overflow-auto">
 {navSteps.map((s, i) => (
 <div key={i} className="flex gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 dark:border-white/5">
 <span className="w-5 text-center text-[#A51636]">{s.icon}</span>
 <span>{s.text}</span>
 </div>
 ))}
 </div>
 </div>
 ) : null}
 </div>
 ) : null}

 {/* Quick filters */}
 {activeTab === 'explore' ? (
 <div className="flex gap-2 border-b border-slate-200 p-3 dark:border-white/10">
 {[
 { q: 'library', label: 'Library' },
 { q: 'hall', label: 'Halls' },
 { q: 'hostel', label: 'Hostels' },
 { q: 'cafeteria', label: 'Food' },
 ].map((b) => (
 <button key={b.q} onClick={() => setSearch(b.q)} className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-white/10 dark:bg-white/5">
 {b.label}
 </button>
 ))}
 </div>
 ) : null}

 {/* Results */}
 <div className="min-h-0 flex-1 overflow-auto">
 {search ? (
 <div>
 {filteredSearch.length ? (
 filteredSearch.map((it) => (
 <button
 key={it.id + it.kind}
 onClick={() => pickSearch(it)}
 className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
 >
 <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: it.kind === 'faculty' ? '#A51636' : it.kind === 'report' ? SEV_COLOR[it.report?.severity || 'medium'] : KIND_COLOR[it.raw?.kind] || '#6b7280' }}>
 {it.kind === 'faculty' ? <GraduationCap className="h-3.5 w-3.5" /> : it.kind === 'report' ? <Flag className="h-3.5 w-3.5" /> : it.kind === 'block' ? it.name.replace('Block ', '') : <Building2 className="h-3.5 w-3.5" />}
 </span>
 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{it.name}</span>
 <span className="block truncate text-xs text-slate-500">{it.sub}</span>
 </span>
 </button>
 ))
 ) : (
 <div className="p-6 text-center text-sm text-slate-500">No matches for “{search}”</div>
 )}
 </div>
 ) : activeTab === 'issues' ? (
 <div className="p-2">
 <div className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">{reports.length} campus issues</div>
 {reports.length ? (
 reports.map((r) => (
 <button
 key={r.id}
 onClick={() => {
 onSelect?.(r.id);
 const pt = latLngToSvg(r.coordinates);
 if (pt) focusPoint(pt[0], pt[1], 80);
 setInfo({ type: 'report', report: r, point: pt });
 setInfoOpen(true);
 }}
 className={cn(
 'mb-2 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all',
 selectedId === r.id ? 'border-[#A51636] bg-[#A51636]/5' : 'border-slate-200 bg-white hover:border-[#A51636]/30 dark:border-white/10 dark:bg-white/5',
 )}
 >
 <img src={r.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-bold">{r.title}</span>
 <span className="block truncate text-xs text-slate-500">{r.locationName}</span>
 <span className="mt-1 flex gap-1">
 <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: SEV_COLOR[r.severity] }}>
 {r.severity}
 </span>
 <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-white/10">{r.status}</span>
 </span>
 </span>
 </button>
 ))
 ) : (
 <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-white/10">
 <Flag className="mx-auto h-8 w-8 text-slate-300" />
 <div className="mt-2 text-sm font-semibold">No campus issues yet</div>
 <div className="text-xs text-slate-500">Be the first to report · Pin any location</div>
 </div>
 )}
 </div>
 ) : activeTab === 'faculty' ? (
 <div className="p-2">
 <div className="mb-2 flex items-center justify-between px-2">
 <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{ALL_FACULTY.length} faculty · public</span>
 <span className="rounded-full bg-[#A51636]/10 px-2 py-0.5 text-[10px] font-bold text-[#A51636]">155 total</span>
 </div>
 {ALL_FACULTY.slice(0, 100).map((f: any) => (
 <button
 key={f.id}
 onClick={() => {
 setInfo({ type: 'faculty', faculty: f });
 setInfoOpen(true);
 }}
 className="flex w-full items-start gap-3 border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
 >
 <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A51636]/10 text-[#A51636]">
 <GraduationCap className="h-4 w-4" />
 </span>
 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-semibold">{f.name || f.person}</span>
 <span className="block truncate text-xs text-slate-500">
 {f.dept} · {f.role}
 </span>
 </span>
 </button>
 ))}
 <div className="p-3 text-center text-xs text-slate-400">Search to find more · 155 total faculty indexed from amrita.edu</div>
 </div>
 ) : (
 <div className="p-2">
 {/* Buildings */}
 <div className="mb-3">
 <div className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">Buildings</div>
 {(CAMPUS_GEO.buildings as unknown as any[]).map((b: any) => (
 <button
 key={b.name}
 onClick={() => {
 setView({ mode: 'campus' });
 focusPoint(b.c[0], b.c[1], 100);
 setInfo({ type: 'building', raw: b, name: b.name, sub: `${b.kind}`, point: b.c });
 setInfoOpen(true);
 }}
 className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-[#A51636]/30 dark:border-white/10 dark:bg-white/5"
 >
 <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: KIND_COLOR[b.kind] || '#555' }}>
 {b.kind === 'hostel' ? <Home className="h-4 w-4" /> : b.kind === 'food' ? <UtensilsCrossed className="h-4 w-4" /> : b.kind === 'sport' ? <Dumbbell className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
 </span>
 <span className="min-w-0 flex-1">
 <span className="block truncate text-sm font-semibold">{b.short}</span>
 <span className="block truncate text-xs text-slate-500">{b.kind}</span>
 </span>
 </button>
 ))}
 </div>
 {/* Blocks A-E */}
 <div className="mb-3">
 <div className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">Blocks A–E</div>
 <div className="grid grid-cols-2 gap-2">
 {(CAMPUS_GEO.blocks as unknown as any[]).filter((b: any) => b.part === 0).map((b: any) => (
 <button
 key={b.block}
 onClick={() => {
 const bid = ({ A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' } as any)[b.block] || 'a';
 setView({ mode: 'floor', buildingId: bid, floorId: (CAMPUS_FLOORS.buildings as any)[bid].floors[0].id });
 }}
 className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-[#A51636]/30 dark:border-white/10 dark:bg-white/5"
 >
 <div className="flex items-center gap-2">
 <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: (BLOCK_COLOR as any)[b.block] }}>
 {b.block}
 </span>
 <span className="text-sm font-bold">Block {b.block}</span>
 </div>
 <div className="mt-1 text-xs text-slate-500">{b.role}</div>
 <div className="mt-1 text-xs font-mono text-slate-400"></div>
 </button>
 ))}
 </div>
 </div>
 {/* Halls */}
 <div className="mb-3">
 <div className="mb-2 px-2 text-xs font-bold uppercase tracking-widest text-slate-500">Named halls · real capacities</div>
 {[
 { name: 'Amriteshwari Hall', cap: 265, block: 'E', use: 'In-campus functions' },
 { name: 'Sudhamani Hall', cap: 300, block: 'A', use: 'Seminars, placement' },
 { name: 'Krishna Hall', cap: 112, block: 'B', use: 'Seminars' },
 { name: 'Vyasa Hall', cap: 90, block: 'C', use: 'Seminars' },
 { name: 'Rama Hall', cap: 85, block: 'C', use: 'Seminars' },
 { name: 'Valmiki Hall', cap: 80, block: 'C', use: 'Seminars' },
 { name: 'Central Library', cap: 120, block: 'E', use: '4th floor, 16,550 sq ft, 45,880+ items' },
 ].map((h) => (
 <div key={h.name} className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/5">
 <Library className="h-4 w-4 text-[#A51636]" />
 <div className="min-w-0 flex-1">
 <div className="truncate text-sm font-semibold">{h.name}</div>
 <div className="truncate text-xs text-slate-500">
 {h.cap} seats · Block {h.block} · {h.use}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="border-t border-slate-200 p-3 text-[10px] text-slate-400 dark:border-white/10">
 Amrita Bengaluru Campus Map
 </div>
 </aside>

 {/* Scrim */}
 {sidebarOpen ? <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

 {/* Stage */}
 <div ref={stageRef} className="relative flex-1 overflow-hidden bg-[#FFF5F7] dark:bg-[#1a0f14]" onClick={handleCanvasClick}>
 <svg ref={svgRef} className="h-full w-full touch-none select-none" style={{ cursor: drag ? 'grabbing' : 'grab' }}>
 <g ref={gRef}>
 {/* Satellite */}
 {view.mode === 'campus' && showSat ? <image href="/amrita-satellite.jpg" x={0} y={0} width={WIDTH_M} height={HEIGHT_M} preserveAspectRatio="none" opacity={0.85} /> : null}
              {view.mode === 'campus' ? <rect x={0} y={0} width={WIDTH_M} height={HEIGHT_M} fill="#ffffff" fillOpacity={0.3} /> : null}

 {view.mode === 'campus' ? (
 <>
 {/* Zones */}
 {(CAMPUS_GEO.zones as unknown as any[]).map((z: any) => (
 <g key={z.id} className="campus-interactive cursor-pointer">
 <path d={z.d} fill={showSat ? 'rgba(0,0,0,0.18)' : z.id === 'south' ? '#fff1f3' : '#f5f0ff'} stroke={z.id === 'south' ? '#A51636' : '#6b7280'} strokeWidth={showSat ? 3 : 2} opacity={0.9} onClick={() => { setInfo({ type: 'zone', raw: z, name: z.name, sub: ``, point: z.c }); setInfoOpen(true); }} />
 </g>
 ))}
 {/* Roads */}
 {(CAMPUS_GEO.roads as unknown as any[]).map((rd: any, i: number) => (
 <path key={i} d={rd.d} fill="none" stroke={rd.type === 'footway' ? '#94a3b8' : '#cbd5e1'} strokeWidth={rd.type === 'footway' ? 1.5 : 3} strokeLinecap="round" strokeDasharray={rd.type === 'footway' ? '4 4' : 'none'} opacity={0.8} />
 ))}
 {/* Digitized */}
 {(CAMPUS_GEO.digitized as unknown as any[]).map((f: any) => (
 <g key={f.id} className="campus-interactive cursor-pointer">
 <path d={f.d} fill={(KIND_COLOR[f.kind] || '#64748b') + '55'} stroke={KIND_COLOR[f.kind] || '#64748b'} strokeWidth={1.2} strokeDasharray="5 4" onClick={() => { setInfo({ type: 'facility', raw: f, name: f.name, sub: f.kind, point: f.c }); setInfoOpen(true); }} />
 <text x={f.c[0]} y={f.c[1]} textAnchor="middle" fontSize={10 / cam.k} fill="#334155" style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 2 / cam.k }}>
 {f.name}
 </text>
 </g>
 ))}
 {/* Buildings */}
 {(CAMPUS_GEO.buildings as unknown as any[]).map((b: any) => (
 <g key={b.name} className="campus-interactive cursor-pointer">
 <path d={b.d} fill={KIND_COLOR[b.kind] || '#A51636'} fillOpacity={showSat ? 0.85 : 0.15} stroke={KIND_COLOR[b.kind] || '#A51636'} strokeWidth={1.5} onClick={() => { setInfo({ type: 'building', raw: b, name: b.name, sub: `${b.kind}`, point: b.c }); setInfoOpen(true); focusPoint(b.c[0], b.c[1], 100); }} />
 <text x={b.c[0]} y={b.c[1]} textAnchor="middle" fontSize={11 / cam.k} fontWeight={600} fill="#1e293b" style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 / cam.k }}>
 {b.short}
 </text>
 </g>
 ))}
 {/* Blocks */}
 {showBlocks
 ? (CAMPUS_GEO.blocks as unknown as any[]).map((bl: any) => (
 <g key={bl.block} className="campus-interactive cursor-pointer">
 <path d={bl.d} fill={(BLOCK_COLOR as any)[bl.block] || '#A51636'} fillOpacity={showSat ? 0.25 : 0.12} stroke={(BLOCK_COLOR as any)[bl.block] || '#A51636'} strokeWidth={1.2} onClick={() => { const bid = ({ A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' } as any)[bl.block]; if (bid) setView({ mode: 'floor', buildingId: bid, floorId: (CAMPUS_FLOORS.buildings as any)[bid].floors[0].id }); }} />
 <text x={bl.c[0]} y={bl.c[1]} textAnchor="middle" fontSize={16 / cam.k} fontWeight={800} fill={(BLOCK_COLOR as any)[bl.block] || '#A51636'} style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 / cam.k }}>
 {bl.block}
 </text>
 </g>
 ))
 : null}
 {/* Gates */}
 {(CAMPUS_GEO.gates as unknown as any[]).map((g: any, i: number) => (
 <g key={i} className="campus-interactive cursor-pointer">
 <circle cx={g.c[0]} cy={g.c[1]} r={5 / cam.k} fill="#facc15" stroke="#000" strokeWidth={1.5 / cam.k} />
 <text x={g.c[0]} y={g.c[1] - 10 / cam.k} textAnchor="middle" fontSize={9 / cam.k} fill="#854d0e" fontWeight={700}>
 Gate {i + 1}
 </text>
 </g>
 ))}
 {/* Nav route */}
 {navRoute ? (
 <>
 <path
 d={'M' + [navRoute.from.c, ...navRoute.path.map((idx: number) => NAV_NODES[idx]), navRoute.to.c].map((p: any) => `${p[0]},${p[1]}`).join(' L')}
 fill="none"
 stroke="#000"
 strokeWidth={8 / cam.k}
 strokeLinecap="round"
 strokeLinejoin="round"
 opacity={0.8}
 />
 <path
 d={'M' + [navRoute.from.c, ...navRoute.path.map((idx: number) => NAV_NODES[idx]), navRoute.to.c].map((p: any) => `${p[0]},${p[1]}`).join(' L')}
 fill="none"
 stroke="#38bdf8"
 strokeWidth={4 / cam.k}
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 <circle cx={navRoute.from.c[0]} cy={navRoute.from.c[1]} r={6 / cam.k} fill="#22c55e" stroke="#000" strokeWidth={2 / cam.k} />
 <circle cx={navRoute.to.c[0]} cy={navRoute.to.c[1]} r={6 / cam.k} fill="#ef4444" stroke="#000" strokeWidth={2 / cam.k} />
 </>
 ) : null}
 {/* Reports */}
 {campusReportMarkers.map(({ report, point }) => (
 <g key={report.id} className="campus-interactive cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect?.(report.id); setInfo({ type: 'report', report, point }); setInfoOpen(true); }}>
 <circle cx={point[0]} cy={point[1]} r={selectedId === report.id ? 10 / cam.k : 7 / cam.k} fill={SEV_COLOR[report.severity] || '#ef4444'} stroke="#fff" strokeWidth={2 / cam.k} />
 <circle cx={point[0]} cy={point[1]} r={selectedId === report.id ? 16 / cam.k : 0} fill={SEV_COLOR[report.severity] || '#ef4444'} opacity={0.25} />
 </g>
 ))}
 {/* Dropped pin */}
 {droppedSvg ? (
 <g>
 <circle cx={droppedSvg[0]} cy={droppedSvg[1]} r={10 / cam.k} fill="#A51636" stroke="#fff" strokeWidth={2.5 / cam.k} />
 <text x={droppedSvg[0]} y={droppedSvg[1] - 14 / cam.k} textAnchor="middle" fontSize={10 / cam.k} fontWeight={800} fill="#A51636" style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 / cam.k }}>
 Pinned
 </text>
 </g>
 ) : null}
 </>
 ) : (
 <>
                   {/* Floor view — Proper floor plans using proper floor plan tool for Amrita Bangalore only — no placeholders, everything adapts to tentative floor plans */}
                  {currentFloor ? (
                    <ProperFloorPlanSVG plan={generateProperFloorPlan((view as any).buildingId, (view as any).floorId)} onRoomClick={(room) => { setInfo({ type: 'space', space: { label: room.label, name: room.name, type: room.type, capacity: room.capacity, meta: { Department: room.department } }, buildingId: (view as any).buildingId, floorId: (view as any).floorId }); setInfoOpen(true); }} />
                  ) : null}
              </>
            )}
 </g>
 </svg>

 {/* Scale */}
 <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 shadow backdrop-blur dark:bg-black/60 dark:text-slate-300">
 <div className="mb-1 h-1 w-12 rounded bg-slate-600 dark:bg-slate-300" style={{ width: `${50 * cam.k}px` }} />
 50 m
 </div>

 {/* Pin dropping hint */}
 {pinDropping ? (
 <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#A51636] px-4 py-2 text-sm font-bold text-white shadow-lg">
 <MapPin className="h-4 w-4" /> Tap to pin location
 </div>
 ) : null}
 </div>

 {/* Info panel - desktop side, mobile bottom sheet */}
 <AnimatePresence>
 {infoOpen && info ? (
 <motion.div
 initial={{ opacity: 0, y: 24, x: 16, scale: 0.96 }}
 animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
 exit={{ opacity: 0, y: 24, x: 16, scale: 0.96 }}
 transition={{ type: 'spring', stiffness: 300, damping: 24 }}
 className="absolute bottom-3 left-3 right-3 z-20 max-h-[60vh] overflow-auto rounded-[20px] border border-[#A51636]/10 bg-white p-5 shadow-[0_16px_48px_rgba(165,22,54,0.12)] dark:border-white/10 dark:bg-[#1a0f12] lg:bottom-auto lg:left-auto lg:right-3 lg:top-20 lg:w-[360px] lg:max-h-[72vh]"
 >
 <button onClick={() => setInfoOpen(false)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
 <X className="h-4 w-4" />
 </button>
 {renderInfo()}
 </motion.div>
 ) : null}
 </AnimatePresence>
 </div>

 {/* Bottom stats bar */}
 <div className="flex flex-wrap items-center gap-3 border-t border-[#A51636]/10 bg-white px-4 py-2.5 text-xs dark:border-white/10 dark:bg-[#1a0a0f]">
 <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
 <Building2 className="h-3.5 w-3.5 text-[#A51636]" /> Amrita Bengaluru Campus
 </span>
 <span className="hidden h-3 w-px bg-slate-200 dark:bg-white/10 sm:block" />
 <span className="text-slate-500">{(CAMPUS_GEO.buildings as unknown as any[]).length} Buildings</span>
 <span className="text-slate-500">5 Blocks</span>
 <span className="text-slate-500">155 Faculty</span>
 <span className="text-slate-500">{reports.length} Issues</span>
 <span className="ml-auto rounded-full bg-[#A51636] px-3 py-1 font-bold text-white">Campus Map</span>
 </div>
 </div>
 );
}
