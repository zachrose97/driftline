'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RiverPoint, AccessPoint } from './page';
import { supabase } from '@/lib/supabase';

const STATES: { code: string; label: string; center: [number, number]; zoom: number }[] = [
  { code: 'ny', label: 'New York',       center: [-75.4,  42.9], zoom: 7 },
  { code: 'pa', label: 'Pennsylvania',   center: [-77.2,  41.2], zoom: 7 },
  { code: 'vt', label: 'Vermont',        center: [-72.6,  44.0], zoom: 7 },
  { code: 'me', label: 'Maine',          center: [-69.2,  45.2], zoom: 6 },
  { code: 'nh', label: 'New Hampshire',  center: [-71.5,  43.9], zoom: 7 },
  { code: 'ma', label: 'Massachusetts',  center: [-71.8,  42.3], zoom: 8 },
  { code: 'ct', label: 'Connecticut',    center: [-72.7,  41.6], zoom: 8 },
  { code: 'va', label: 'Virginia',       center: [-79.5,  37.8], zoom: 7 },
  { code: 'wv', label: 'West Virginia',  center: [-80.4,  38.9], zoom: 7 },
  { code: 'nc', label: 'North Carolina', center: [-79.0,  35.6], zoom: 6 },
  { code: 'co', label: 'Colorado',       center: [-105.5, 39.1], zoom: 7 },
  { code: 'mt', label: 'Montana',        center: [-110.0, 47.0], zoom: 6 },
  { code: 'id', label: 'Idaho',          center: [-114.5, 44.5], zoom: 6 },
  { code: 'wy', label: 'Wyoming',        center: [-107.5, 43.0], zoom: 6 },
  { code: 'wa', label: 'Washington',     center: [-120.5, 47.5], zoom: 7 },
  { code: 'or', label: 'Oregon',         center: [-120.5, 44.0], zoom: 7 },
  { code: 'ca', label: 'California',     center: [-119.5, 37.5], zoom: 6 },
];

function getCondition(flow: number): { label: string; color: string } {
  if (flow > 1000) return { label: 'High', color: '#DC2626' };
  if (flow > 200)  return { label: 'Good', color: '#16A34A' };
  if (flow > 50)   return { label: 'Fair', color: '#D97706' };
  return            { label: 'Low',  color: '#9CA3AF' };
}

function celsiusToF(c: number) {
  return ((c * 9) / 5 + 32).toFixed(1);
}

function titleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function buildPopupHTML(name: string, flow: number | null, temp: number | null, updated: string | null, siteId: string, state: string) {
  const cond = flow != null ? getCondition(flow) : null;
  return `
    <div style="font-family:sans-serif;min-width:200px;padding:4px 0">
      <p style="font-size:13px;font-weight:700;color:#111827;margin:0 0 8px">${titleCase(name)}</p>
      <div style="display:flex;gap:12px;align-items:flex-end">
        ${flow != null ? `
          <div>
            <p style="font-size:20px;font-weight:700;color:#085041;margin:0;line-height:1">${flow.toLocaleString()}<span style="font-size:11px;color:#9CA3AF;font-weight:400"> cfs</span></p>
            <p style="font-size:11px;color:#9CA3AF;margin:2px 0 0">Flow</p>
          </div>` : ''}
        ${temp != null ? `
          <div>
            <p style="font-size:20px;font-weight:700;color:#085041;margin:0;line-height:1">${celsiusToF(temp)}<span style="font-size:11px;color:#9CA3AF;font-weight:400">°F</span></p>
            <p style="font-size:11px;color:#9CA3AF;margin:2px 0 0">Temp</p>
          </div>` : ''}
        ${cond ? `
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${cond.color}22;color:${cond.color};margin-bottom:2px">${cond.label}</span>
        ` : ''}
      </div>
      ${updated ? `<p style="font-size:10px;color:#D1D5DB;margin:8px 0 0">Updated ${updated}</p>` : ''}
      <a href="/river/${state}-${siteId}" style="display:inline-block;margin-top:10px;font-size:11px;color:#085041;text-decoration:none;font-weight:600">View river details →</a>
    </div>
  `;
}

function parseUSGS(sites: any[]): RiverPoint[] {
  const siteMap: Record<string, RiverPoint> = {};
  sites.forEach((site: any) => {
    const id = site.sourceInfo.siteCode[0].value;
    const geo = site.sourceInfo.geoLocation?.geogLocation;
    if (!siteMap[id]) {
      siteMap[id] = {
        id,
        name: site.sourceInfo.siteName,
        lat: geo?.latitude ?? null,
        lng: geo?.longitude ?? null,
        flow: null,
        temp: null,
        updated: null,
      };
    }
    const raw = site.values[0]?.value[0]?.value;
    const value = parseFloat(raw);
    const desc = site.variable.variableDescription;
    const dateTime = site.values[0]?.value[0]?.dateTime;
    if (desc.includes('Discharge') && !isNaN(value)) siteMap[id].flow = value;
    if (desc.includes('Temperature') && !isNaN(value)) siteMap[id].temp = value;
    if (dateTime && !siteMap[id].updated) {
      siteMap[id].updated = new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  });
  return Object.values(siteMap).filter(
    (r): r is RiverPoint => r.lat !== null && r.lng !== null && r.flow !== null,
  );
}

// ── Stocking filter ───────────────────────────────────────────────────────────

const STOCKING_FILTERS = [
  { value: 'all',   label: 'All' },
  { value: 'year',  label: 'This year' },
  { value: 'month', label: 'Last 30d' },
  { value: 'week',  label: 'Last 7d' },
  { value: 'day',   label: 'Last 24h' },
] as const;
type StockingFilter = typeof STOCKING_FILTERS[number]['value'];

function normalizeRiverName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function lookupStocking(map: Map<string, string>, name: string | null): string | null {
  if (!name) return null;
  const key = normalizeRiverName(name);
  if (map.has(key)) return map.get(key)!;
  // Partial-match fallback for name format differences across agencies
  for (const [k, date] of map) {
    if (k.length > 5 && (k.includes(key) || key.includes(k))) return date;
  }
  return null;
}

function isWithinFilter(dateStr: string | null, filter: StockingFilter): boolean {
  if (filter === 'all') return true;
  if (!dateStr) return false;
  // Use T12:00:00 to avoid UTC midnight timezone edge cases
  const diffMs = Date.now() - new Date(dateStr + 'T12:00:00').getTime();
  switch (filter) {
    case 'day':   return diffMs <= 86_400_000;
    case 'week':  return diffMs <= 7 * 86_400_000;
    case 'month': return diffMs <= 30 * 86_400_000;
    case 'year':  return new Date(dateStr).getFullYear() === new Date().getFullYear();
  }
}

// ── Map data helpers ──────────────────────────────────────────────────────────

function toGeoJSON(rivers: RiverPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rivers.map(r => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        name: r.name,
        flow: r.flow,
        temp: r.temp,
        updated: r.updated,
        condition: r.flow != null ? getCondition(r.flow).label : 'Unknown',
      },
    })),
  };
}

function accessToGeoJSON(
  points: AccessPoint[],
  stockingLookup: Map<string, string>,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map(p => {
      const last_stocked = lookupStocking(stockingLookup, p.water_name ?? p.name);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          name:         p.name,
          water_name:   p.water_name,
          county:       p.county,
          access_type:  p.access_type,
          species:      p.species,
          parking:      p.parking,
          fee:          p.fee,
          ada:          p.ada,
          notes:        p.notes,
          detail_url:   p.detail_url,
          last_stocked,
        },
      };
    }),
  };
}

function buildAccessPopupHTML(props: any): string {
  const { name, water_name, county, access_type, species, parking, fee, ada, notes, detail_url, last_stocked } = props;
  const display = (water_name && water_name !== name) ? titleCase(water_name) : titleCase(name);
  const formattedDate = last_stocked && last_stocked !== 'null'
    ? new Date(last_stocked + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  return `
    <div style="font-family:sans-serif;min-width:180px;padding:4px 0">
      <p style="font-size:13px;font-weight:700;color:#111827;margin:0 0 6px">${display}</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
        ${access_type ? `<span style="font-size:11px;padding:1px 7px;border-radius:20px;background:#EFF6FF;color:#2563EB;font-weight:600">${access_type}</span>` : ''}
        ${county ? `<span style="font-size:11px;padding:1px 7px;border-radius:20px;background:#F3F4F6;color:#6B7280">${county} County</span>` : ''}
      </div>
      ${formattedDate ? `<p style="font-size:12px;color:#085041;font-weight:600;margin:0 0 6px">Last stocked: ${formattedDate}</p>` : ''}
      ${species && species !== 'null' ? `<p style="font-size:11px;color:#374151;margin:0 0 4px"><strong>Species:</strong> ${species}</p>` : ''}
      ${parking && parking !== 'null' ? `<p style="font-size:11px;color:#374151;margin:0 0 4px"><strong>Parking:</strong> ${parking}</p>` : ''}
      ${fee === 'Y' ? `<p style="font-size:11px;color:#DC2626;font-weight:600;margin:0 0 4px">Fee required</p>` : ''}
      ${ada && ada !== 'null' ? `<p style="font-size:11px;color:#374151;margin:0 0 4px">${ada}</p>` : ''}
      ${notes && notes !== 'null' ? `<p style="font-size:11px;color:#6B7280;margin:0 0 4px">${notes}</p>` : ''}
      ${detail_url && detail_url !== 'null' ? `<a href="${detail_url}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#2563EB">More info →</a>` : ''}
    </div>
  `;
}

const LEGEND = [
  { label: 'Good (200–1000 cfs)', color: '#16A34A' },
  { label: 'High (>1000 cfs)',    color: '#DC2626' },
  { label: 'Fair (50–200 cfs)',   color: '#D97706' },
  { label: 'Low (<50 cfs)',       color: '#9CA3AF' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapClient({ token }: { token: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawState = searchParams.get('state') ?? 'ny';
  const currentState = STATES.some(s => s.code === rawState) ? rawState : 'ny';

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAccess, setShowAccess] = useState(true);
  const [rivers, setRivers] = useState<RiverPoint[]>([]);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [stockingLookup, setStockingLookup] = useState<Map<string, string>>(new Map());
  const [stockingFilter, setStockingFilter] = useState<StockingFilter>('all');
  const [gaugesLoading, setGaugesLoading] = useState(false);

  const stateConfig = STATES.find(s => s.code === currentState) ?? STATES[0];

  // Access points filtered by stocking date, memoized to stabilize Effect 4 deps
  const displayedAccessPoints = useMemo(() => {
    if (stockingFilter === 'all') return accessPoints;
    return accessPoints.filter(p => {
      const lastStocked = lookupStocking(stockingLookup, p.water_name ?? p.name);
      return isWithinFilter(lastStocked, stockingFilter);
    });
  }, [accessPoints, stockingLookup, stockingFilter]);

  // ── Effect 1: create map once ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    let mapInstance: any;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (!containerRef.current || mapRef.current) return;
      mapboxgl.accessToken = token;

      mapInstance = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: stateConfig.center,
        zoom: stateConfig.zoom,
        attributionControl: false,
      });

      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
      mapInstance.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: false }), 'top-right');

      mapRef.current = mapInstance;

      mapInstance.on('load', () => {
        mapInstance.addSource('gauges', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 10,
          clusterRadius: 40,
        });

        mapInstance.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'gauges',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#085041',
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        mapInstance.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'gauges',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          },
          paint: { 'text-color': '#ffffff' },
        });

        mapInstance.addLayer({
          id: 'gauge-points',
          type: 'circle',
          source: 'gauges',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match', ['get', 'condition'],
              'High', '#DC2626',
              'Good', '#16A34A',
              'Fair', '#D97706',
              '#9CA3AF',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });

        mapInstance.on('mouseenter', 'gauge-points', () => { mapInstance.getCanvas().style.cursor = 'pointer'; });
        mapInstance.on('mouseleave', 'gauge-points', () => { mapInstance.getCanvas().style.cursor = ''; });
        mapInstance.on('mouseenter', 'clusters',     () => { mapInstance.getCanvas().style.cursor = 'pointer'; });
        mapInstance.on('mouseleave', 'clusters',     () => { mapInstance.getCanvas().style.cursor = ''; });

        mapInstance.on('click', 'gauge-points', (e: any) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const { id: siteId, name, flow, temp, updated } = feat.properties;
          const [lng, lat] = (feat.geometry as any).coordinates;
          new mapboxgl.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
            .setLngLat([lng, lat])
            .setHTML(buildPopupHTML(name, flow, temp, updated, siteId, currentState))
            .addTo(mapInstance);
        });

        mapInstance.on('click', 'clusters', (e: any) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const clusterId = feat.properties.cluster_id;
          (mapInstance.getSource('gauges') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            mapInstance.easeTo({ center: (feat.geometry as any).coordinates, zoom });
          });
        });

        mapInstance.addSource('access-points', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        mapInstance.addLayer({
          id: 'access-point-dots',
          type: 'circle',
          source: 'access-points',
          paint: {
            'circle-radius': 7,
            'circle-color': '#2563EB',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.85,
          },
        });

        mapInstance.on('mouseenter', 'access-point-dots', () => { mapInstance.getCanvas().style.cursor = 'pointer'; });
        mapInstance.on('mouseleave', 'access-point-dots', () => { mapInstance.getCanvas().style.cursor = ''; });

        mapInstance.on('click', 'access-point-dots', (e: any) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const [lng, lat] = (feat.geometry as any).coordinates;
          new mapboxgl.Popup({ closeButton: true, maxWidth: '280px', offset: 12 })
            .setLngLat([lng, lat])
            .setHTML(buildAccessPopupHTML(feat.properties))
            .addTo(mapInstance);
        });

        setLoaded(true);
      });
    });

    return () => {
      mapInstance?.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: fly to new state ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    mapRef.current.flyTo({ center: stateConfig.center, zoom: stateConfig.zoom, duration: 1000 });
  }, [currentState, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: update gauge layer ────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    const src = mapRef.current.getSource('gauges');
    if (src) src.setData(toGeoJSON(rivers));
  }, [rivers, loaded]);

  // ── Effect 4: update access points layer (filtered + enriched with stocking)
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    const src = mapRef.current.getSource('access-points');
    if (src) src.setData(accessToGeoJSON(displayedAccessPoints, stockingLookup));
  }, [displayedAccessPoints, stockingLookup, loaded]);

  // ── Effect 5: toggle access points visibility ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    mapRef.current.setLayoutProperty('access-point-dots', 'visibility', showAccess ? 'visible' : 'none');
  }, [showAccess, loaded]);

  // ── Effect 6: fetch USGS gauges client-side when state changes ──────────────
  useEffect(() => {
    const controller = new AbortController();
    setGaugesLoading(true);
    setRivers([]);

    fetch(
      `https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=${currentState}&parameterCd=00060,00010&siteStatus=active`,
      { signal: controller.signal },
    )
      .then(r => r.json())
      .then(data => {
        setRivers(parseUSGS(data.value.timeSeries));
        setGaugesLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setGaugesLoading(false);
      });

    return () => { controller.abort(); };
  }, [currentState]);

  // ── Effect 7: fetch access points when state changes ────────────────────────
  useEffect(() => {
    let cancelled = false;
    setAccessPoints([]);

    supabase
      .from('access_points')
      .select('id,name,lat,lng,water_name,county,access_type,species,parking,fee,ada,notes,detail_url')
      .eq('state', currentState)
      .then(({ data }) => {
        if (!cancelled) setAccessPoints(data ?? []);
      });

    return () => { cancelled = true; };
  }, [currentState]);

  // ── Effect 8: fetch stocking lookup when state changes ──────────────────────
  useEffect(() => {
    let cancelled = false;
    setStockingLookup(new Map());

    supabase
      .from('stocking_reports')
      .select('river_name,stocked_date')
      .eq('state', currentState)
      .order('stocked_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const row of data ?? []) {
          const key = normalizeRiverName(row.river_name);
          if (!map.has(key)) map.set(key, row.stocked_date);
        }
        setStockingLookup(map);
      });

    return () => { cancelled = true; };
  }, [currentState]);

  function flyTo(river: RiverPoint) {
    if (!mapRef.current) return;
    setSelectedId(river.id);
    mapRef.current.flyTo({ center: [river.lng, river.lat], zoom: 12, duration: 1200 });
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      new mapboxgl.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
        .setLngLat([river.lng, river.lat])
        .setHTML(buildPopupHTML(river.name, river.flow, river.temp, river.updated, river.id, currentState))
        .addTo(mapRef.current!);
    });
  }

  const filtered = rivers.filter(r =>
    search ? r.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  if (!token) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#085041', marginBottom: '0.75rem' }}>Mapbox token needed</h2>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: '1.7' }}>
            Add <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>NEXT_PUBLIC_MAPBOX_TOKEN</code> to your <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>.env.local</code> to enable the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{
        width: '300px',
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>River Map</h1>

          <select
            value={currentState}
            onChange={e => {
              setSearch('');
              setSelectedId(null);
              setStockingFilter('all');
              router.push(`/map?state=${e.target.value}`);
            }}
            style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', color: '#111827', background: '#fff', cursor: 'pointer', marginBottom: '0.5rem', boxSizing: 'border-box' }}
          >
            {STATES.map(s => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>

          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
            {gaugesLoading
              ? `Loading ${stateConfig.label} gauges…`
              : `${rivers.length} USGS gauges · ${stateConfig.label}`}
          </p>

          {accessPoints.length > 0 && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#374151', cursor: 'pointer', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={showAccess}
                  onChange={e => setShowAccess(e.target.checked)}
                  style={{ accentColor: '#2563EB', width: '14px', height: '14px' }}
                />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563EB', display: 'inline-block', flexShrink: 0 }} />
                {displayedAccessPoints.length}
                {stockingFilter !== 'all' && (
                  <span style={{ color: '#9CA3AF' }}>/{accessPoints.length}</span>
                )}
                {' '}access points
              </label>

              {showAccess && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px' }}>Filter by last stocked</p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {STOCKING_FILTERS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setStockingFilter(f.value)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '20px',
                          border: `1px solid ${stockingFilter === f.value ? '#2563EB' : '#D1D5DB'}`,
                          background: stockingFilter === f.value ? '#EFF6FF' : 'transparent',
                          color: stockingFilter === f.value ? '#2563EB' : '#6B7280',
                          fontSize: '0.72rem',
                          fontWeight: stockingFilter === f.value ? '600' : '400',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <input
            type="text"
            placeholder="Search rivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.85rem',
              color: '#111827',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Legend */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {LEGEND.map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#6B7280' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
              {l.label}
            </span>
          ))}
        </div>

        {/* River list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.slice(0, 150).map(river => {
            const cond = river.flow != null ? getCondition(river.flow) : null;
            const isSelected = river.id === selectedId;
            return (
              <button
                key={river.id}
                onClick={() => flyTo(river)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #F9FAFB',
                  background: isSelected ? '#F0FDF4' : 'transparent',
                  border: 'none',
                  borderLeft: isSelected ? '3px solid #085041' : '3px solid transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.82rem', color: '#111827', fontWeight: isSelected ? '600' : '400', flex: 1, lineHeight: '1.3' }}>
                  {titleCase(river.name)}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  {river.flow != null && (
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: cond?.color }}>
                      {river.flow.toLocaleString()} cfs
                    </span>
                  )}
                  {river.temp != null && (
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                      {celsiusToF(river.temp)}°F
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length > 150 && (
            <p style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#9CA3AF', textAlign: 'center' }}>
              Refine search to see more ({filtered.length - 150} hidden)
            </p>
          )}
          {filtered.length === 0 && !gaugesLoading && (
            <p style={{ padding: '2rem 1rem', fontSize: '0.85rem', color: '#9CA3AF', textAlign: 'center' }}>
              {search ? `No rivers match "${search}"` : 'No gauge data available'}
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {!loaded && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#f8faf9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Loading map...</p>
          </div>
        )}
      </div>
    </div>
  );
}
