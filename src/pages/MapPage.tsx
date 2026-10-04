import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Layers, ListFilter, MapPin, ShieldCheck, Thermometer, Building2 } from 'lucide-react';
import type { CategoryId, Coordinates, ReportStatus, Severity, ScopeFilter } from '@/types';
import { useReports } from '@/hooks/useReports';
import { useBrand } from '@/hooks/useBrand';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { MapView, type MapViewHandle } from '@/components/map/MapView';
import { AmritaCampusMap } from '@/components/campus/AmritaCampusMap';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { Drawer } from '@/components/Drawer';
import { Badge } from '@/components/Badge';
import { SEVERITY_META, STATUS_META } from '@/data/categories';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/utils/cn';

interface MapFilters {
  categories: CategoryId[];
  severities: Severity[];
  status: ReportStatus[];
  verifiedOnly: boolean;
  search: string;
  scope: ScopeFilter;
}

const DEFAULT_FILTERS: MapFilters = {
  categories: [],
  severities: [],
  status: [],
  verifiedOnly: false,
  search: '',
  scope: 'all',
};

const ALL = (list: unknown[]) => list.length === 0;

export function MapPage() {
  const { reports } = useReports();
  const { isAmrita } = useBrand();
  const [filters, setFilters] = useLocalStorage<MapFilters>('civiceye:map-filters', {
    ...DEFAULT_FILTERS,
    scope: isAmrita ? 'campus' : 'city',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useLocalStorage<boolean>('civiceye:map-heatmap', false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<{ center: Coordinates; zoom: number }>({
    center: { lat: 12.9716, lng: 77.5946 },
    zoom: 12,
  });
  const mapRef = useRef<MapViewHandle>(null);

  const debouncedSearch = useDebounce(filters.search, 250);

  const visibleReports = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return reports.filter((r) => {
      if (isAmrita ? r.scope !== 'campus' : r.scope !== 'city') return false;
      if (filters.scope !== 'all' && r.scope !== filters.scope) return false;
      if (!ALL(filters.categories) && !filters.categories.includes(r.category)) return false;
      if (!ALL(filters.severities) && !filters.severities.includes(r.severity)) return false;
      if (!ALL(filters.status) && !filters.status.includes(r.status)) return false;
      if (filters.verifiedOnly && !r.verified) return false;
      if (q) {
        const haystack = `${r.title} ${r.description} ${r.locationName} ${r.author} ${r.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reports, filters, debouncedSearch, isAmrita]);

  useEffect(() => {
    if (selectedId && !visibleReports.some((r) => r.id === selectedId)) setSelectedId(null);
  }, [visibleReports, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const report = reports.find((r) => r.id === selectedId || r.code === selectedId);
    if (report && !isAmrita) setView({ center: report.coordinates, zoom: 16 });
  }, [selectedId, reports, isAmrita]);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.severities.length > 0 ||
    filters.status.length > 0 ||
    filters.verifiedOnly ||
    filters.search.trim().length > 0 ||
    filters.scope !== (isAmrita ? 'campus' : 'city');

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, scope: isAmrita ? 'campus' : 'city' });
    mapRef.current?.clearFocus();
  };

  const handleFindOnMap = () => {
    const q = filters.search.trim();
    if (!q) return;
    mapRef.current?.flyToPlace(q);
  };

  if (isAmrita) {
    return (
      <div className="flex h-[calc(100vh-var(--nav-height))] flex-col bg-[#FFF5F7] pt-[calc(var(--nav-height)+2.5rem)] dark:bg-[#1A030A]">
        <div className="z-20 border-b border-[#A51636]/10 bg-white px-4 py-3 dark:border-white/5 dark:bg-[#111] sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <Building2 className="h-5 w-5 text-[#A51636]" /> Campus Map
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{visibleReports.length} issues on campus</p>
            </div>
            <div className="flex items-center gap-2">
              <SearchBar value={filters.search} onChange={(s) => setFilters({ ...filters, search: s })} placeholder="Search building, room, teacher…" className="flex-1 lg:w-80" />
              <button onClick={() => setFiltersOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 lg:hidden">
                <ListFilter className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 p-3 sm:p-4">
          <AmritaCampusMap reports={visibleReports} selectedId={selectedId} onSelect={setSelectedId} className="h-full min-h-[500px]" />
        </div>

        <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
          <div className="p-5">
            <FilterBar filters={filters} onChange={setFilters} />
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="btn-secondary mt-6 w-full">Clear filters</button>
            ) : null}
          </div>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="comic-map-page flex h-[calc(100vh-var(--nav-height))] flex-col bg-[#fff8e7] pt-[var(--nav-height)] text-[#172b44]">
      <div className="z-20 border-b-4 border-[#172b44] bg-[#ffd630] shadow-[0_5px_0_#ef6b59]">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-xl font-black uppercase text-[#172b44]">
              <Layers className="h-5 w-5 text-primary-500" /> Live issue map
            </h1>
            <p className="text-xs text-slate-500">{visibleReports.length} of {reports.length} reports shown</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-stretch gap-0 lg:w-[380px]">
              <SearchBar value={filters.search} onChange={(s) => setFilters({ ...filters, search: s })} placeholder="Search area, title, id…" className="flex-1" />
              <button
                onClick={handleFindOnMap}
                disabled={!filters.search.trim()}
                title="Find this place on the map (fly to + blackout)"
                className="ml-2 flex h-11 items-center gap-1.5 rounded-xl border-[3px] border-[#172b44] bg-[#fffdf4] px-3 text-xs font-black shadow-[3px_3px_0_#172b44] transition enabled:hover:-translate-y-0.5 enabled:hover:bg-[#91dcc4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MapPin className="h-3.5 w-3.5" /> <span className="hidden sm:inline">On map</span>
              </button>
            </div>
            <button onClick={() => setHeatmap(!heatmap)} aria-pressed={heatmap} className={cn('flex h-11 items-center gap-2 rounded-xl border-[3px] border-[#172b44] bg-[#fffdf4] px-3.5 text-sm font-semibold shadow-[3px_3px_0_#172b44]', heatmap ? 'bg-[#91dcc4]' : '')}>
              <Thermometer className="h-4 w-4" /> <span className="hidden sm:inline">Heatmap</span>
            </button>
            <button onClick={() => setFiltersOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border-[3px] border-[#172b44] bg-[#fffdf4] px-3.5 text-sm font-semibold shadow-[3px_3px_0_#172b44] lg:hidden">
              <ListFilter className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>
        <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#172b44]/60 sm:px-6">
          Type a place &amp; hit "On map" to fly there and dim everything outside the area.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_340px] lg:grid-rows-1">
        <div className="relative min-h-[320px] bg-[#fff8e7] p-4 sm:p-5">
          <MapView ref={mapRef} reports={visibleReports} selectedId={selectedId} onSelect={setSelectedId} center={view.center} zoom={view.zoom} onViewChange={(c, z) => setView({ center: c, zoom: z })} heatmap={heatmap} className="h-full min-h-[320px] border-[3px] border-[#172b44] shadow-[5px_5px_0_#ef6b59]" />
          <div className="pointer-events-none absolute bottom-8 left-8 z-20 hidden border-2 border-[#172b44] bg-[#fff8e7] px-4 py-3 shadow-[3px_3px_0_#172b44] sm:block">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Severity</p>
            <div className="space-y-1.5">
              {Object.entries(SEVERITY_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} /> {meta.label}
                </div>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {visibleReports.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 p-4 backdrop-blur-sm">
                <EmptyState icon={<Flame className="h-8 w-8" />} title="No reports match your filters" description="Try widening the filters." />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <aside className="hidden min-h-0 flex-col overflow-hidden border-l-4 border-[#172b44] bg-[#91dcc4] lg:flex">
          <div className="flex items-center justify-between border-b-2 border-[#172b44]/30 px-4 py-3">
            <p className="text-sm font-bold text-slate-800">Visible reports</p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="text-xs font-semibold text-[#ef6b59] hover:underline">Clear</button>
            ) : null}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {visibleReports.slice(0, 60).map((r) => {
              const severity = SEVERITY_META[r.severity];
              const status = STATUS_META[r.status];
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)} className={cn('flex w-full items-start gap-3 rounded-xl border-2 p-2.5 text-left transition-all', selectedId === r.id ? 'border-[#ef6b59] bg-[#ffd630] shadow-[3px_3px_0_#172b44]' : 'border-[#172b44] bg-[#fffdf4] hover:border-[#ef6b59]')}>
                  <img src={r.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{r.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{r.locationName}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge className={cn(severity.bg, severity.color)}>{severity.label}</Badge>
                      <Badge className={cn(status.bg, status.color)}>{status.label}</Badge>
                      {r.verified ? <Badge className="bg-emerald-500/10 text-emerald-600"><ShieldCheck className="h-3 w-3" /> Verified</Badge> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="p-5">
          <FilterBar filters={filters} onChange={setFilters} />
          {hasActiveFilters ? <button onClick={clearFilters} className="btn-secondary mt-6 w-full">Clear all filters</button> : null}
        </div>
      </Drawer>
    </div>
  );
}
