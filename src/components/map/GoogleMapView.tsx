import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MarkerClusterer, GridAlgorithm } from '@googlemaps/markerclusterer';
import type { Cluster, Renderer } from '@googlemaps/markerclusterer';
import { loadGoogleMaps, getMapStyles } from '@/services/mapService';
import type { Coordinates, Report, Severity } from '@/types';
import { SEVERITY_META } from '@/data/categories';
import { useTheme } from '@/hooks/useTheme';
import { MapPopup } from './MapPopup';
import { clamp } from '@/utils/cn';

interface GoogleMapViewProps {
  reports: Report[];
  center: Coordinates;
  zoom: number;
  onViewChange: (center: Coordinates, zoom: number) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  heatmap: boolean;
  pinDropping: boolean;
  onPinDrop: (coords: Coordinates) => void;
  droppedPin: Coordinates | null;
  /** Imperative API so the parent owns the search UI but the map does
   *  the geocoding and blackout drawing. */
  onSearchReady?: (api: {
    search: (q: string) => void;
    clear: () => void;
  }) => void;
  onSearchTarget?: (target: { center: Coordinates; zoom: number; label?: string } | null) => void;
}

/** Tight, accurate Greater Bengaluru bounding box. */
const BLR_BOUNDS_LITERAL = {
  north: 13.205,
  south: 12.835,
  west: 77.375,
  east: 77.835,
};
const BLR_INITIAL_CENTER = { lat: 12.9716, lng: 77.5946 };
const BLR_MIN_ZOOM = 12;
const BLR_MAX_ZOOM = 19;

const SEVERITY_HEX: Record<Severity, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

function pinIcon(severity: Severity, selected: boolean, verified: boolean, resolved: boolean) {
  const color = resolved ? '#10b981' : SEVERITY_HEX[severity];
  const size = selected ? 50 : 38;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <defs><filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#000" flood-opacity="0.45"/></filter></defs>
    <path d="M12 0C7 0 3 4 3 9c0 6.6 7.5 13.6 8.4 14.5a1 1 0 0 0 1.2 0C13.5 22.6 21 15.6 21 9c0-5-4-9-9-9z"
          fill="${color}" stroke="#ffffff" stroke-width="1.8" filter="url(#sh)"/>
    <circle cx="12" cy="9" r="3.4" fill="#ffffff" opacity="0.95"/>
    ${verified ? `<circle cx="19.5" cy="4.5" r="4" fill="#10b981" stroke="#ffffff" stroke-width="1.6"/>` : ''}
    ${resolved ? `<path d="M18 3l1.3 1.3L22 1.6" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" fill="none" transform="translate(-.5 1.5)"/>` : ''}
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size),
  } as google.maps.Icon;
}

class ClusterRenderer implements Renderer {
  render(cluster: Cluster) {
    const count = cluster.markers.length;
    const size = count > 50 ? 56 : count > 20 ? 48 : 40;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="#4f46e5" fill-opacity="0.92"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="none" stroke="#c7d2fe" stroke-width="2"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Inter, sans-serif" font-size="${count > 99 ? 13 : 15}" font-weight="700" fill="#ffffff">${count}</text>
    </svg>`;
    return new google.maps.Marker({
      position: cluster.position,
      icon: {
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        scaledSize: new google.maps.Size(size, size),
        anchor: new google.maps.Point(size / 2, size / 2),
      },
      zIndex: Number(google.maps.Marker.MAX_ZINDEX) + cluster.markers.length,
      title: `${count} reports here`,
    });
  }
}

/** Build an inverted polygon with a WORLD-SIZED outer ring (so it covers
 *  everything you can see at any zoom) and a counter-wound inner ring
 *  around the focus area, which punches a clear hole through the black
 *  fill. This is the documented Google Maps pattern for "dim everything
 *  outside a region" and works reliably at all zoom levels. */
function buildBlackoutPolygonPaths(focus: google.maps.LatLngBounds): google.maps.LatLngLiteral[][] {
  const n = focus.getNorthEast().lat();
  const s = focus.getSouthWest().lat();
  const w = focus.getSouthWest().lng();
  const e = focus.getNorthEast().lng();
  // Outer ring: covers the whole map, clockwise.
  const outer: google.maps.LatLngLiteral[] = [
    { lat: 85, lng: -180 },
    { lat: 85, lng: 180 },
    { lat: -85, lng: 180 },
    { lat: -85, lng: -180 },
    { lat: 85, lng: -180 },
  ];
  // Inner ring: counter-clockwise around the focus rectangle (opposite
  // winding to outer) so it punches a transparent hole.
  const inner: google.maps.LatLngLiteral[] = [
    { lat: n, lng: w },
    { lat: s, lng: w },
    { lat: s, lng: e },
    { lat: n, lng: e },
    { lat: n, lng: w },
  ];
  return [outer, inner];
}

export function GoogleMapView({
  reports,
  center,
  zoom,
  onViewChange,
  selectedId,
  onSelect,
  heatmap,
  pinDropping,
  onPinDrop,
  droppedPin,
  onSearchReady,
  onSearchTarget,
}: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const heatCirclesRef = useRef<google.maps.Circle[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const infoRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const hoverInfoRef = useRef<google.maps.InfoWindow | null>(null);
  const droppedPinRef = useRef<google.maps.Marker | null>(null);
  const blackoutRef = useRef<google.maps.Polygon | null>(null);
  const blackoutOutlineRef = useRef<google.maps.Rectangle | null>(null);
  const viewSyncingRef = useRef(false);
  const clampLockRef = useRef(false);
  const { theme } = useTheme();

  // Expose search/clear to the parent via callback ref. Parent owns the
  // input DOM so React state changes in the map never cause the input to
  // remount (which would steal focus).
  useEffect(() => {
    if (!onSearchReady) return;
    onSearchReady({
      search: (q: string) => {
        const map = mapRef.current;
        if (!map) return;
        const trimmed = q.trim();
        if (!trimmed) return;
        const svc = new google.maps.places.PlacesService(map);
        svc.textSearch(
          {
            query: trimmed,
            location: new google.maps.LatLng(BLR_INITIAL_CENTER.lat, BLR_INITIAL_CENTER.lng),
            radius: 25000,
          },
          (results, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results[0]) {
              return;
            }
            const place = results[0];
            const loc = place.geometry?.location;
            if (!loc) return;
            const vb = place.geometry?.viewport;
            viewSyncingRef.current = true;
            if (vb) {
              map.fitBounds(vb);
              google.maps.event.addListenerOnce(map, 'idle', () => drawBlackout(vb));
            } else {
              map.setCenter(loc);
              map.setZoom(17);
              window.setTimeout(() => {
                const nb = map.getBounds();
                if (nb) drawBlackout(nb);
              }, 80);
            }
            onSearchTarget?.({
              center: { lat: loc.lat(), lng: loc.lng() },
              zoom: map.getZoom() ?? 16,
              label: place.name || trimmed,
            });
          },
        );
      },
      clear: () => {
        blackoutRef.current?.setMap(null);
        blackoutRef.current = null;
        blackoutOutlineRef.current?.setMap(null);
        blackoutOutlineRef.current = null;
        onSearchTarget?.(null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSearchReady]);

  function drawBlackout(bounds: google.maps.LatLngBounds) {
    const map = mapRef.current;
    if (!map) return;
    blackoutRef.current?.setMap(null);
    blackoutOutlineRef.current?.setMap(null);
    blackoutRef.current = new google.maps.Polygon({
      map,
      paths: buildBlackoutPolygonPaths(bounds),
      strokeWeight: 0,
      fillColor: '#000000',
      fillOpacity: 0.55,
      clickable: false,
      zIndex: 50,
    });
    blackoutOutlineRef.current = new google.maps.Rectangle({
      map,
      bounds,
      clickable: false,
      fillOpacity: 0,
      strokeColor: '#ef6b59',
      strokeWeight: 3,
      strokeOpacity: 0.95,
      zIndex: 51,
    });
  }

  // Bootstrap the map exactly once.
  useEffect(() => {
    let cancelled = false;
    let idleListener: google.maps.MapsEventListener | null = null;
    let zoomListener: google.maps.MapsEventListener | null = null;
    let clickListener: google.maps.MapsEventListener | null = null;
    let centerListener: google.maps.MapsEventListener | null = null;
    let map: google.maps.Map | null = null;

    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;

      const restrictionBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(BLR_BOUNDS_LITERAL.south, BLR_BOUNDS_LITERAL.west),
        new google.maps.LatLng(BLR_BOUNDS_LITERAL.north, BLR_BOUNDS_LITERAL.east),
      );

      map = new google.maps.Map(containerRef.current, {
        center: BLR_INITIAL_CENTER,
        zoom,
        restriction: { latLngBounds: restrictionBounds, strictBounds: true },
        minZoom: BLR_MIN_ZOOM,
        maxZoom: BLR_MAX_ZOOM,
        styles: getMapStyles(theme === 'dark'),
        disableDefaultUI: true,
        zoomControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
        tilt: 0,
        keyboardShortcuts: false,
      });
      mapRef.current = map;

      zoomListener = map.addListener('zoom_changed', () => {
        if (!map) return;
        const z = map.getZoom();
        if (typeof z !== 'number') return;
        if (z < BLR_MIN_ZOOM) map.setZoom(BLR_MIN_ZOOM);
        else if (z > BLR_MAX_ZOOM) map.setZoom(BLR_MAX_ZOOM);
      });

      centerListener = map.addListener('center_changed', () => {
        if (!map || clampLockRef.current) return;
        const c = map.getCenter();
        if (!c) return;
        let lat = c.lat();
        let lng = c.lng();
        let fixed = false;
        if (lat < BLR_BOUNDS_LITERAL.south) { lat = BLR_BOUNDS_LITERAL.south; fixed = true; }
        if (lat > BLR_BOUNDS_LITERAL.north) { lat = BLR_BOUNDS_LITERAL.north; fixed = true; }
        if (lng < BLR_BOUNDS_LITERAL.west) { lng = BLR_BOUNDS_LITERAL.west; fixed = true; }
        if (lng > BLR_BOUNDS_LITERAL.east) { lng = BLR_BOUNDS_LITERAL.east; fixed = true; }
        if (fixed) {
          clampLockRef.current = true;
          map.setCenter({ lat, lng });
          clampLockRef.current = false;
        }
      });

      idleListener = map.addListener('idle', () => {
        if (!map) return;
        const c = map.getCenter();
        if (!c) return;
        const lat = clamp(c.lat(), BLR_BOUNDS_LITERAL.south, BLR_BOUNDS_LITERAL.north);
        const lng = clamp(c.lng(), BLR_BOUNDS_LITERAL.west, BLR_BOUNDS_LITERAL.east);
        if (viewSyncingRef.current) { viewSyncingRef.current = false; return; }
        onViewChange({ lat, lng }, map.getZoom() ?? 12);
      });

      clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng || !pinDropping || !map) return;
        const lat = clamp(e.latLng.lat(), BLR_BOUNDS_LITERAL.south, BLR_BOUNDS_LITERAL.north);
        const lng = clamp(e.latLng.lng(), BLR_BOUNDS_LITERAL.west, BLR_BOUNDS_LITERAL.east);
        onPinDrop({ lat, lng });
      }) as google.maps.MapsEventListener;

      hoverInfoRef.current = new google.maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new google.maps.Size(0, -8),
      });
    });

    return () => {
      cancelled = true;
      idleListener?.remove();
      zoomListener?.remove();
      clickListener?.remove();
      centerListener?.remove();
      clustererRef.current?.clearMarkers();
      clustererRef.current?.setMap(null);
      heatCirclesRef.current.forEach((c) => c.setMap(null));
      heatCirclesRef.current = [];
      infoRef.current?.close();
      hoverInfoRef.current?.close();
      droppedPinRef.current?.setMap(null);
      blackoutRef.current?.setMap(null);
      blackoutOutlineRef.current?.setMap(null);
      map = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync theme.
  useEffect(() => {
    mapRef.current?.setOptions({ styles: getMapStyles(theme === 'dark') });
  }, [theme]);

  // External centre/zoom sync.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = {
      lat: clamp(center.lat, BLR_BOUNDS_LITERAL.south, BLR_BOUNDS_LITERAL.north),
      lng: clamp(center.lng, BLR_BOUNDS_LITERAL.west, BLR_BOUNDS_LITERAL.east),
    };
    const newZ = clamp(zoom, BLR_MIN_ZOOM, BLR_MAX_ZOOM);
    viewSyncingRef.current = true;
    map.setCenter(target);
    map.setZoom(newZ);
  }, [center.lat, center.lng, zoom]);

  // Pin-drop click rebinding.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    google.maps.event.clearListeners(map, 'click');
    if (pinDropping) {
      map.setOptions({ draggableCursor: 'crosshair' });
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        onPinDrop({
          lat: clamp(e.latLng.lat(), BLR_BOUNDS_LITERAL.south, BLR_BOUNDS_LITERAL.north),
          lng: clamp(e.latLng.lng(), BLR_BOUNDS_LITERAL.west, BLR_BOUNDS_LITERAL.east),
        });
      });
    } else {
      map.setOptions({ draggableCursor: '' });
    }
  }, [pinDropping, onPinDrop]);

  // Markers + clustering (with hover previews).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    clustererRef.current?.clearMarkers();
    clustererRef.current?.setMap(null);

    const markers: google.maps.Marker[] = [];
    reports.forEach((r) => {
      const marker = new google.maps.Marker({
        position: { lat: r.coordinates.lat, lng: r.coordinates.lng },
        icon: pinIcon(r.severity, r.id === selectedId, r.verified, r.status === 'resolved'),
        title: `${SEVERITY_META[r.severity].label}: ${r.title}`,
        zIndex:
          r.id === selectedId ? 1000 : r.severity === 'critical' ? 500 : r.severity === 'high' ? 400 : 200,
      });
      google.maps.event.addListener(marker, 'click', () => onSelect(r.id));

      const imgSrc = (r as any).annotatedImage || (r.ai as any)?.annotatedImage || r.image;
      const badge =
        r.status === 'resolved'
          ? '<span style="background:#10b981;color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:auto">Fixed</span>'
          : r.verified
            ? '<span style="background:#10b981;color:#fff;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:auto">Verified</span>'
            : '';
      const hoverHtml = `
        <div style="font:12px/1.4 Inter,system-ui,sans-serif;color:#1f2937;max-width:220px">
          <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${SEVERITY_HEX[r.severity]}"></span>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px">${r.title || 'Report'}</span>${badge}
          </div>
          <div style="font-size:11px;color:#6b7280">${r.locationName || ''}</div>
          ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-top:4px;display:block" referrerpolicy="no-referrer"/>` : ''}
        </div>`;
      google.maps.event.addListener(marker, 'mouseover', () => {
        if (selectedId === r.id) return;
        const hover = hoverInfoRef.current;
        if (!hover || !map) return;
        hover.setContent(hoverHtml);
        hover.setPosition(marker.getPosition()!);
        hover.open(map);
      });
      google.maps.event.addListener(marker, 'mouseout', () => {
        hoverInfoRef.current?.close();
      });
      markers.push(marker);
    });

    clustererRef.current = new MarkerClusterer({
      markers,
      map,
      renderer: new ClusterRenderer(),
      algorithm: new GridAlgorithm({ gridSize: 56, maxDistance: 40000 }),
    });

    return () => {
      markers.forEach((m) => { google.maps.event.clearInstanceListeners(m); m.setMap(null); });
      clustererRef.current?.clearMarkers();
    };
  }, [reports, selectedId, onSelect]);

  // Heatmap.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    heatCirclesRef.current.forEach((c) => c.setMap(null));
    heatCirclesRef.current = [];
    if (!heatmap || reports.length === 0) return;
    heatCirclesRef.current = reports.map((r) => {
      const weight = SEVERITY_META[r.severity].weight;
      const color = SEVERITY_HEX[r.severity];
      return new google.maps.Circle({
        map, center: { lat: r.coordinates.lat, lng: r.coordinates.lng },
        radius: 22 + weight * 20,
        fillColor: color, fillOpacity: 0.1 + weight * 0.06,
        strokeColor: color, strokeOpacity: 0.3, strokeWeight: 1, zIndex: 1,
      });
    });
    return () => { heatCirclesRef.current.forEach((c) => c.setMap(null)); heatCirclesRef.current = []; };
  }, [reports, heatmap]);

  // Selected pin InfoWindow.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const report = reports.find((r) => r.id === selectedId);
    if (!report) { infoRef.current?.close(); return; }
    const host = document.createElement('div');
    host.style.cssText = 'padding:0;background:transparent;';
    const root = createRoot(host);
    infoRootRef.current = root;
    root.render(<MapPopup report={report} onClose={() => onSelect(null)} />);
    const info = infoRef.current ?? new google.maps.InfoWindow({ maxWidth: 340, disableAutoPan: false });
    info.setContent(host);
    info.setPosition({ lat: report.coordinates.lat, lng: report.coordinates.lng });
    info.open({ map });
    infoRef.current = info;
    info.addListener('closeclick', () => onSelect(null));
    return () => { root.unmount(); infoRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, reports]);

  // Dropped pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    droppedPinRef.current?.setMap(null);
    droppedPinRef.current = null;
    if (!droppedPin) return;
    droppedPinRef.current = new google.maps.Marker({
      position: { lat: droppedPin.lat, lng: droppedPin.lng },
      icon: pinIcon('critical', true, false, false),
      map,
      zIndex: Number(google.maps.Marker.MAX_ZINDEX),
    });
    return () => { droppedPinRef.current?.setMap(null); droppedPinRef.current = null; };
  }, [droppedPin]);

  return <div ref={containerRef} className="h-full w-full" aria-label="Interactive map of Bengaluru" />;
}
