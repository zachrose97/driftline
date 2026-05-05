import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const STATE_NAMES: Record<string, string> = {
  ny: 'New York',    pa: 'Pennsylvania', vt: 'Vermont',       me: 'Maine',
  nh: 'New Hampshire', ma: 'Massachusetts', ct: 'Connecticut', va: 'Virginia',
  wv: 'West Virginia', nc: 'North Carolina', co: 'Colorado',   mt: 'Montana',
  id: 'Idaho',       wy: 'Wyoming',       wa: 'Washington',   or: 'Oregon',
  ca: 'California',
};

const VALID_STATES = new Set(Object.keys(STATE_NAMES));

// "HOUSATONIC R AT FALLS VILLAGE CT" → "Housatonic River"
function extractRiverName(usgsName: string): string {
  const trimmed = usgsName
    .replace(/\s+(AT|NEAR|NR|ABV|BLW|BLWM)\s+.+$/i, '')
    .trim();
  return trimmed
    .replace(/\bR\b/g, 'River')
    .replace(/\bCK\b/g, 'Creek')
    .replace(/\bBR\b/g, 'Branch')
    .replace(/\bFK\b/g, 'Fork')
    .replace(/\bCR\b/g, 'Creek')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function getCondition(flow: number) {
  if (flow > 1000) return { label: 'High', color: '#DC2626', bg: '#FEE2E2' };
  if (flow > 200)  return { label: 'Good', color: '#16A34A', bg: '#DCFCE7' };
  if (flow > 50)   return { label: 'Fair', color: '#D97706', bg: '#FEF3C7' };
  return            { label: 'Low',  color: '#9CA3AF', bg: '#F3F4F6' };
}

function celsiusToF(c: number) {
  return ((c * 9) / 5 + 32).toFixed(1);
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const SPECIES_COLORS: Record<string, { bg: string; color: string }> = {
  'Brown Trout':     { bg: '#FEF3C7', color: '#92400E' },
  'Rainbow Trout':   { bg: '#DBEAFE', color: '#1E40AF' },
  'Brook Trout':     { bg: '#DCFCE7', color: '#166534' },
  'Cutthroat Trout': { bg: '#F3E8FF', color: '#6B21A8' },
  'Lake Trout':      { bg: '#E0F2FE', color: '#075985' },
  'Tiger Trout':     { bg: '#FEE2E2', color: '#991B1B' },
};

async function fetchUSGS(siteId: string) {
  try {
    const res = await fetch(
      `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteId}&parameterCd=00060,00010&siteStatus=active`,
      { cache: 'no-store', signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const sites: any[] = data.value.timeSeries ?? [];
    if (!sites.length) return null;

    let name = '';
    let flow: number | null = null;
    let temp: number | null = null;
    let updated: string | null = null;

    for (const site of sites) {
      if (!name) name = site.sourceInfo.siteName;
      const raw = parseFloat(site.values[0]?.value[0]?.value);
      const desc: string = site.variable.variableDescription;
      const dt: string = site.values[0]?.value[0]?.dateTime;
      if (desc.includes('Discharge') && !isNaN(raw)) flow = raw;
      if (desc.includes('Temperature') && !isNaN(raw)) temp = raw;
      if (dt && !updated) updated = new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return name ? { name, flow, temp, updated } : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dashIdx = slug.indexOf('-');
  if (dashIdx === -1) return { title: 'River — DriftLine' };
  const state = slug.slice(0, dashIdx);
  const siteId = slug.slice(dashIdx + 1);
  const stateName = STATE_NAMES[state] ?? state.toUpperCase();
  return {
    title: `USGS ${siteId} · ${stateName} — DriftLine`,
    description: `Live flow, water temperature, stocking history, and fishing access points for USGS gauge ${siteId} in ${stateName}.`,
  };
}

export default async function RiverPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dashIdx = slug.indexOf('-');
  if (dashIdx === -1) notFound();

  const state = slug.slice(0, dashIdx);
  const siteId = slug.slice(dashIdx + 1);

  if (!VALID_STATES.has(state) || !/^\d+$/.test(siteId)) notFound();

  const usgs = await fetchUSGS(siteId);
  if (!usgs) notFound();

  const riverName = extractRiverName(usgs.name);
  const stateName = STATE_NAMES[state];
  const cond = usgs.flow != null ? getCondition(usgs.flow) : null;

  // Two separate ilike queries — avoids PostgREST or() wildcard ambiguity
  const [
    { data: stockingReports },
    { data: accessByWater },
    { data: accessByName },
  ] = await Promise.all([
    supabase
      .from('stocking_reports')
      .select('id,river_name,species,quantity,stocked_date')
      .eq('state', state)
      .ilike('river_name', `%${riverName}%`)
      .order('stocked_date', { ascending: false })
      .limit(50),
    supabase
      .from('access_points')
      .select('id,name,lat,lng,water_name,access_type,parking,ada,notes,detail_url')
      .eq('state', state)
      .ilike('water_name', `%${riverName}%`)
      .limit(100),
    supabase
      .from('access_points')
      .select('id,name,lat,lng,water_name,access_type,parking,ada,notes,detail_url')
      .eq('state', state)
      .ilike('name', `%${riverName}%`)
      .limit(100),
  ]);

  // Merge access points, deduplicate by id
  const seen = new Set<number>();
  const accessPoints = [...(accessByWater ?? []), ...(accessByName ?? [])].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        <Link
          href={`/streams?state=${state}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#6B7280', marginBottom: '1.5rem', textDecoration: 'none' }}
        >
          ← Stream Conditions
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', margin: '0 0 4px' }}>
              {riverName}
            </h1>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>
              {stateName} · USGS #{siteId}
            </p>
          </div>
          {cond && (
            <span style={{ fontSize: '0.85rem', fontWeight: '700', padding: '5px 16px', borderRadius: '20px', background: cond.bg, color: cond.color, alignSelf: 'center', flexShrink: 0 }}>
              {cond.label}
            </span>
          )}
        </div>

        {/* Live conditions card */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1rem' }}>
            Live Conditions
          </p>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '2.2rem', fontWeight: '700', color: usgs.flow != null ? '#085041' : '#D1D5DB', margin: '0', lineHeight: 1 }}>
                {usgs.flow != null ? usgs.flow.toLocaleString() : '—'}
                {usgs.flow != null && <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#9CA3AF', marginLeft: '4px' }}>cfs</span>}
              </p>
              <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '4px 0 0' }}>Flow</p>
            </div>
            {usgs.temp != null && (
              <div>
                <p style={{ fontSize: '2.2rem', fontWeight: '700', color: '#085041', margin: '0', lineHeight: 1 }}>
                  {celsiusToF(usgs.temp)}
                  <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#9CA3AF', marginLeft: '2px' }}>°F</span>
                </p>
                <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '4px 0 0' }}>Water temp</p>
              </div>
            )}
          </div>
          {usgs.updated && (
            <p style={{ fontSize: '0.72rem', color: '#D1D5DB', margin: '1rem 0 0' }}>
              Updated {usgs.updated} · USGS real-time data
            </p>
          )}
        </div>

        {/* Stocking history */}
        <section style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
            Stocking History{stockingReports?.length ? ` · ${stockingReports.length} records` : ''}
          </p>
          {!stockingReports?.length ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', color: '#9CA3AF', fontSize: '0.9rem', textAlign: 'center' }}>
              No stocking records found for this river
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stockingReports.map((r: any) => {
                const sc = SPECIES_COLORS[r.species] ?? { bg: '#F3F4F6', color: '#374151' };
                return (
                  <div
                    key={r.id}
                    style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0.9rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}
                  >
                    <p style={{ fontWeight: '600', color: '#111827', fontSize: '0.9rem', margin: 0 }}>{r.river_name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color }}>
                        {r.species}
                      </span>
                      {r.quantity && (
                        <span style={{ fontSize: '0.85rem', color: '#374151' }}>{r.quantity.toLocaleString()} fish</span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{daysAgo(r.stocked_date)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Access points */}
        <section>
          <p style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
            Access Points{accessPoints.length ? ` · ${accessPoints.length}` : ''}
          </p>
          {!accessPoints.length ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', color: '#9CA3AF', fontSize: '0.9rem', textAlign: 'center' }}>
              No access points found for this river
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {accessPoints.map((p: any) => (
                <div key={p.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                  <p style={{ fontWeight: '600', color: '#111827', fontSize: '0.88rem', margin: '0 0 3px' }}>{p.name}</p>
                  {p.access_type && (
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 6px' }}>{p.access_type}</p>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {p.parking && <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Parking: {p.parking}</span>}
                    {p.ada === 'Accessible' && (
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#166534' }}>ADA</span>
                    )}
                    {p.fee && <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>Fee: {p.fee}</span>}
                  </div>
                  {p.notes && (
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0' }}>{p.notes}</p>
                  )}
                  {p.detail_url && (
                    <a
                      href={p.detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: '#085041', textDecoration: 'none', display: 'inline-block', marginTop: '6px' }}
                    >
                      More info →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
