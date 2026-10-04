import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp, ArrowUpDown, Inbox, ListFilter } from 'lucide-react';
import type { CategoryId, Report, ReportStatus, Severity, SortKey, ScopeFilter } from '@/types';
import { useReports } from '@/hooks/useReports';
import { useBrand } from '@/hooks/useBrand';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/SearchBar';
import { FilterBar } from '@/components/FilterBar';
import { ReportCard } from '@/components/ReportCard';
import { Leaderboard } from '@/components/Leaderboard';
import { Drawer } from '@/components/Drawer';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { SEVERITY_META } from '@/data/categories';

interface CommunityFilters {
  categories: CategoryId[];
  severities: Severity[];
  status: ReportStatus[];
  verifiedOnly: boolean;
  search: string;
  scope: ScopeFilter;
}

const DEFAULT_FILTERS: CommunityFilters = {
  categories: [],
  severities: [],
  status: [],
  verifiedOnly: false,
  search: '',
  scope: 'all',
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'votes', label: 'Most votes' },
  { key: 'confirms', label: 'Most confirmed' },
  { key: 'severity', label: 'Most severe' },
];

const PAGE_SIZE = 9;

function sortReports(list: Report[], sort: SortKey): Report[] {
  const copy = [...list];
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => (a.date < b.date ? 1 : -1));
    case 'oldest':
      return copy.sort((a, b) => (a.date > b.date ? 1 : -1));
    case 'votes':
      return copy.sort((a, b) => b.votes - a.votes);
    case 'confirms':
      return copy.sort((a, b) => b.confirms - a.confirms);
    case 'severity':
      return copy.sort(
        (a, b) => SEVERITY_META[b.severity].weight - SEVERITY_META[a.severity].weight,
      );
  }
}

/** Community reports feed: search, filter, sort, paginate. */
export function Community() {
  const { reports, loading } = useReports();
  const { isAmrita } = useBrand();
  const [filters, setFilters] = useState<CommunityFilters>({
    ...DEFAULT_FILTERS,
    scope: isAmrita ? 'campus' : 'city',
  });
  const [sort, setSort] = useState<SortKey>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 250);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return reports.filter((r) => {
      // Complete separation: CivicEye only ever shows city reports; Amrita Eye
      // only ever shows campus reports — never mixed, even on "All".
      if (isAmrita ? r.scope !== 'campus' : r.scope !== 'city') return false;
      if (filters.scope !== 'all' && r.scope !== filters.scope) return false;
      if (filters.categories.length && !filters.categories.includes(r.category)) return false;
      if (filters.severities.length && !filters.severities.includes(r.severity)) return false;
      if (filters.status.length && !filters.status.includes(r.status)) return false;
      if (filters.verifiedOnly && !r.verified) return false;
      if (q) {
        const haystack = `${r.title} ${r.description} ${r.locationName} ${r.author}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reports, filters, debouncedSearch, isAmrita]);

  const sorted = useMemo(() => sortReports(filtered, sort), [filtered, sort]);
  const page = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const resetPagination = () => setVisibleCount(PAGE_SIZE);

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Reports from your neighbours"
        description="Every report below is citizen-submitted and community-validated. Search, filter and vote — the numbers decide what gets fixed first. View AI annotation on each card."
      />

      <section className="section-pad py-6 sm:py-8">
        {/* Compact leaderboard strip — visible first, reports come right after */}
        <div className="mb-6 rounded-2xl border border-slate-200/70 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-4 backdrop-blur dark:border-white/5 dark:from-amber-500/10 dark:via-white/[0.02] dark:to-emerald-500/10">
          <Leaderboard compact />
        </div>
      </section>

      <section className="section-pad py-4 sm:py-8">
        {/* Controls */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            value={filters.search}
            onChange={(search) => {
              setFilters((f) => ({ ...f, search }));
              resetPagination();
            }}
            placeholder="Search reports, areas, categories…"
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <ArrowDownUp className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  resetPagination();
                }}
                aria-label="Sort reports"
                className="input-base w-full appearance-none pl-10 pr-8 sm:w-48"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3.5 text-sm font-semibold text-slate-600 transition-all hover:border-primary-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 lg:hidden"
              aria-label="Open filters"
            >
              <ListFilter className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop filter bar */}
        <div className="mb-8 hidden rounded-2xl border border-slate-200/70 bg-white/60 p-5 backdrop-blur lg:block dark:border-white/5 dark:bg-white/[0.02]">
          <div className="grid gap-8 xl:grid-cols-[1fr_auto_auto]">
            <FilterBar
              filters={filters}
              onChange={(f) => {
                setFilters(f);
                resetPagination();
              }}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} card />
            ))}
          </div>
        ) : page.length === 0 ? (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState
                icon={<Inbox className="h-8 w-8" />}
                title="No reports found"
                description="Nothing matches your search and filters right now. Try clearing them, or be the first to report in this area."
                action={
                  <button
                    onClick={() => {
                      setFilters({ ...DEFAULT_FILTERS, scope: isAmrita ? 'campus' : 'city' });
                      resetPagination();
                    }}
                    className="btn-secondary"
                  >
                    Clear filters
                  </button>
                }
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {page.map((report, i) => (
                  <ReportCard key={report.id} report={report} index={i} />
                ))}
              </AnimatePresence>
            </div>

            {hasMore ? (
              <div className="mt-10 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="btn-secondary"
                >
                  <ArrowUpDown className="h-4 w-4 rotate-90" />
                  Load more ({sorted.length - visibleCount} remaining)
                </button>
              </div>
            ) : (
              <p className="mt-10 text-center text-xs font-medium text-slate-400">
                Showing all {sorted.length} matching report{sorted.length === 1 ? '' : 's'} — the
                end of the road
                <span className="ml-1 inline-block">🛣️</span>
              </p>
            )}
          </>
        )}
      </section>

      {/* Mobile filters drawer */}
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="p-5">
          <FilterBar
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              resetPagination();
            }}
          />
        </div>
      </Drawer>
    </>
  );
}
