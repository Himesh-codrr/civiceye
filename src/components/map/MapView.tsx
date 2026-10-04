import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus, X, Navigation } from 'lucide-react';
import type { Coordinates, Report } from '@/types';
import { useGoogleMapsStatus } from '@/hooks/useGoogleMaps';
import { requestLocation } from '@/services/geoService';
import { useToast } from '@/hooks/useToast';
import { CITY_CENTER, MAX_ZOOM, MIN_ZOOM } from '@/utils/geo';
import { clamp, cn } from '@/utils/cn';
import { GoogleMapView } from './GoogleMapView';
import { FallbackMapView } from './FallbackMapView';
import { Loader } from '../Loader';

export interface MapViewHandle {
  /** Fly to a place query and draw a blackout dim around it. */
  flyToPlace: (query: string) => void;
  /** Clear any active blackout / focus. */
  clearFocus: () => void;
}

interface MapViewProps {
  reports: Report[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  center?: Coordinates;
  zoom?: number;
  onViewChange?: (center: Coordinates, zoom: number) => void;
  heatmap?: boolean;
  pinDropping?: boolean;
  onPinDrop?: (coords: Coordinates) => void;
  droppedPin?: Coordinates | null;
  className?: string;
}

/**
 * Map shell: boots Google Maps when a key exists, otherwise renders the
 * built-in fallback vector map. Adds zoom + locate controls that work in
 * both modes.
 *
 * Exposes an imperative handle (via forwardRef / useImperativeHandle) so
 * parents (e.g. the page header search bar) can invoke flyToPlace /
 * clearFocus without duplicating the search UI on top of the map.
 */
export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    reports,
    selectedId,
    onSelect,
    center: centerProp,
    zoom: zoomProp,
    onViewChange: onViewChangeProp,
    heatmap = false,
    pinDropping = false,
    onPinDrop,
    droppedPin = null,
    className,
  },
  ref,
) {
  const status = useGoogleMapsStatus();
  const toast = useToast();
  const controlled = centerProp !== undefined && zoomProp !== undefined;

  const [internalCenter, setInternalCenter] = useState<Coordinates>(centerProp ?? CITY_CENTER);
  const [internalZoom, setInternalZoom] = useState<number>(zoomProp ?? 13);

  const center = controlled ? (centerProp as Coordinates) : internalCenter;
  const zoom = controlled ? (zoomProp as number) : internalZoom;

  const handleViewChange = (nextCenter: Coordinates, nextZoom: number) => {
    if (onViewChangeProp) onViewChangeProp(nextCenter, nextZoom);
    if (!controlled) {
      setInternalCenter(nextCenter);
      setInternalZoom(nextZoom);
    }
  };

  const zoomBy = (delta: number) =>
    handleViewChange(center, clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM));

  const locateMe = async () => {
    toast.info('Locating you…');
    const result = await requestLocation();
    if (result.status === 'success' && result.coords) {
      handleViewChange(result.coords, 15);
      toast.success('Location found', 'Map centred on your position.');
    } else {
      toast.error('Location unavailable', result.error ?? 'Could not fetch your position.');
    }
  };

  // --- Imperative API handed out to parent via ref ---
  const searchApiRef = useRef<{
    search: (q: string) => void;
    clear: () => void;
  } | null>(null);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);

  const flyToPlace = useCallback((q: string) => {
    if (!searchApiRef.current) return;
    searchApiRef.current.search(q.trim());
  }, []);
  const clearFocus = useCallback(() => {
    searchApiRef.current?.clear();
    setSearchLabel(null);
  }, []);

  useImperativeHandle(ref, () => ({ flyToPlace, clearFocus }), [flyToPlace, clearFocus]);

  const commonProps = {
    reports,
    center,
    zoom,
    onViewChange: handleViewChange,
    selectedId,
    onSelect,
    heatmap,
    pinDropping,
    onPinDrop: onPinDrop ?? (() => undefined),
    droppedPin,
    onSearchReady:
      status === 'ready'
        ? (api: { search: (q: string) => void; clear: () => void }) => {
            searchApiRef.current = api;
          }
        : undefined,
    onSearchTarget:
      status === 'ready'
        ? (target: { center: Coordinates; zoom: number; label?: string } | null) => {
            if (!target) {
              setSearchLabel(null);
              return;
            }
            setSearchLabel(target.label ?? null);
            handleViewChange(target.center, target.zoom);
          }
        : undefined,
  };

  return (
    <div className={cn('relative h-full w-full overflow-hidden rounded-2xl', className)}>
      {status === 'loading' ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
          <Loader label="Loading maps…" />
        </div>
      ) : null}

      {status === 'ready' ? (
        <GoogleMapView {...commonProps} />
      ) : (
        <FallbackMapView
          reports={commonProps.reports}
          center={commonProps.center}
          zoom={commonProps.zoom}
          onViewChange={commonProps.onViewChange}
          selectedId={commonProps.selectedId}
          onSelect={commonProps.onSelect}
          heatmap={commonProps.heatmap}
          pinDropping={commonProps.pinDropping}
          onPinDrop={commonProps.onPinDrop}
          droppedPin={commonProps.droppedPin}
        />
      )}

      {/* "Focus: <place>" pill on the map — small, dismissable, only
          visible after a place search. Lets users clear the blackout
          without leaving the map area. */}
      {status === 'ready' && searchLabel ? (
        <div className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-2 rounded-lg border-2 border-[#172b44] bg-[#ffd630] px-3 py-1.5 text-xs font-black shadow-[3px_3px_0_#172b44]">
          <Navigation className="h-3.5 w-3.5" /> Focus: {searchLabel}
          <button
            onClick={clearFocus}
            className="pointer-events-auto ml-1 rounded p-0.5 hover:bg-black/10"
            aria-label="Clear focus"
            title="Clear blackout"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {/* Shared zoom / locate controls */}
      <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
        <button
          onClick={() => zoomBy(1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/90 text-slate-700 shadow-softer backdrop-blur transition-all hover:scale-105 hover:text-primary-600 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-200"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomBy(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/90 text-slate-700 shadow-softer backdrop-blur transition-all hover:scale-105 hover:text-primary-600 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-200"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => void locateMe()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/90 text-slate-700 shadow-softer backdrop-blur transition-all hover:scale-105 hover:text-primary-600 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-200"
          aria-label="Show my location"
          title="Show my location"
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
