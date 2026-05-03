'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { RiverPoint } from './page';

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

function buildPopupHTML(name: string, flow: number | null, temp: number | null, updated: string | null) {
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
    </div>
  `;
}

const LEGEND = [
  { label: 'Good (200–1000 cfs)', color: '#16A34A' },
  { label: 'High (>1000 cfs)',    color: '#DC2626' },
  { label: 'Fair (50–200 cfs)',   color: '#D97706' },
  { label: 'Low (<50 cfs)',       color: '#9CA3AF' },
];

export default function MapClient({ rivers, token, currentState }: { rivers: RiverPoint[]; token: string; currentState: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stateConfig = STATES.find(s => s.code === currentState) ?? STATES[0];

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token) return;

    let map: any;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = token;

      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: stateConfig.center,
        zoom: stateConfig.zoom,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: false }), 'top-right');

      mapRef.current = map;

      map.on('load', () => {
        const geojson: GeoJSON.FeatureCollection = {
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

        map.addSource('gauges', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 10,
          clusterRadius: 40,
        });

        map.addLayer({
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

        map.addLayer({
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

        map.addLayer({
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

        map.on('mouseenter', 'gauge-points', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'gauge-points', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

        map.on('click', 'gauge-points', (e: any) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const { name, flow, temp, updated } = feat.properties;
          const [lng, lat] = (feat.geometry as any).coordinates;
          new mapboxgl.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
            .setLngLat([lng, lat])
            .setHTML(buildPopupHTML(name, flow, temp, updated))
            .addTo(map);
        });

        map.on('click', 'clusters', (e: any) => {
          const feat = e.features?.[0];
          if (!feat) return;
          const clusterId = feat.properties.cluster_id;
          (map.getSource('gauges') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return;
            map.easeTo({ center: (feat.geometry as any).coordinates, zoom });
          });
        });

        setLoaded(true);
      });
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, [token, currentState]);

  function flyTo(river: RiverPoint) {
    if (!mapRef.current) return;
    setSelectedId(river.id);
    mapRef.current.flyTo({ center: [river.lng, river.lat], zoom: 12, duration: 1200 });
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      new mapboxgl.Popup({ closeButton: true, maxWidth: '300px', offset: 12 })
        .setLngLat([river.lng, river.lat])
        .setHTML(buildPopupHTML(river.name, river.flow, river.temp, river.updated))
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

          {/* State selector */}
          <select
            value={currentState}
            onChange={e => {
              setSearch('');
              setSelectedId(null);
              router.push(`/map?state=${e.target.value}`);
            }}
            style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', color: '#111827', background: '#fff', cursor: 'pointer', marginBottom: '0.5rem', boxSizing: 'border-box' }}
          >
            {STATES.map(s => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>

          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>
            {rivers.length} USGS gauges · {stateConfig.label}
          </p>
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
          {filtered.length === 0 && (
            <p style={{ padding: '2rem 1rem', fontSize: '0.85rem', color: '#9CA3AF', textAlign: 'center' }}>
              No rivers match "{search}"
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
