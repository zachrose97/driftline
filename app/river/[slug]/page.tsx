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
  if (flow > 1000) return { label: 'High', color: 'var(--red)',   bg: 'var(--red-dim)'   };
  if (flow > 200)  return { label: 'Good', color: 'var(--green)', bg: 'var(--green-dim)' };
  if (flow > 50)   return { label: 'Fair', color: 'var(--amber)', bg: 'var(--amber-dim)' };
  return            { label: 'Low',  color: 'var(--slate)', bg: 'var(--slate-dim)' };
}

function celsiusToF(c: number) {
  return ((c * 9) / 5 + 32).toFixed(1);
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000);
  if (diff < 0) {
    const ahead = Math.abs(diff);
    if (ahead === 1) return 'Tomorrow';
    if (ahead < 7) return `In ${ahead} days`;
    return `Scheduled ${new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const SPECIES_COLOR: Record<string, string> = {
  'Brown Trout':     'var(--amber)',
  'Rainbow Trout':   '#60a5fa',
  'Brook Trout':     'var(--green)',
  'Cutthroat Trout': '#a78bfa',
  'Lake Trout':      '#38bdf8',
  'Tiger Trout':     'var(--orange)',
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dashIdx = slug.indexOf('-');
  if (dashIdx === -1) return { title: 'River — DriftLine' };
  const state = slug.slice(0, dashIdx);
  const siteId = slug.slice(dashIdx + 1);
  const stateName = STATE_NAMES[state] ?? state.toUpperCase();
  return {
    title: `USGS ${siteId} · ${stateName} — DriftLine`,
    description: `Live flow, temperature, stocking history, and fishing access for USGS gauge ${siteId} in ${stateName}.`,
  };
}

export default async function RiverPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const [{ data: stockingReports }, { data: accessByWater }, { data: accessByName }] = await Promise.all([
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

  const seen = new Set<number>();
  const accessPoints = [...(accessByWater ?? []), ...(accessByName ?? [])].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const SECTION_LABEL: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: '800',
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    margin: '0 0 0.85rem',
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        <Link href={`/streams?state=${state}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '1.5rem', textDecoration: 'none' }}>
          ← Stream Conditions
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.04em', margin: '0 0 4px' }}>
              {riverName}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', margin: 0 }}>
              {stateName} · USGS #{siteId}
            </p>
          </div>
          {cond && (
            <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '5px 14px', borderRadius: '20px', background: cond.bg, color: cond.color, alignSelf: 'center', flexShrink: 0, letterSpacing: '0.02em' }}>
              {cond.label}
            </span>
          )}
        </div>

        {/* Live conditions */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={SECTION_LABEL}>Live Conditions</p>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '2.5rem', fontWeight: '800', color: usgs.flow != null ? 'var(--text)' : 'var(--text-3)', margin: 0, lineHeight: 1, letterSpacing: '-0.04em' }}>
                {usgs.flow != null ? usgs.flow.toLocaleString() : '—'}
                {usgs.flow != null && <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-3)', marginLeft: '5px' }}>cfs</span>}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '5px 0 0' }}>
                {usgs.flow != null ? 'Flow' : 'Flow unavailable'}
              </p>
            </div>
            {usgs.temp != null && (
              <div>
                <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text)', margin: 0, lineHeight: 1, letterSpacing: '-0.04em' }}>
                  {celsiusToF(usgs.temp)}
                  <span style={{ fontSize: '0.9rem', fontWeight: '400', color: 'var(--text-3)', marginLeft: '3px' }}>°F</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '5px 0 0' }}>Water temp</p>
              </div>
            )}
          </div>
          {usgs.updated && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '1rem 0 0' }}>
              Updated {usgs.updated} · USGS real-time data
            </p>
          )}
        </div>

        {/* Stocking history */}
        <section style={{ marginBottom: '1.5rem' }}>
          <p style={SECTION_LABEL}>
            Stocking History{stockingReports?.length ? ` · ${stockingReports.length} records` : ''}
          </p>
          {!stockingReports?.length ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center' }}>
              No stocking records found for this river
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stockingReports.map((r: any) => (
                <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.9rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <p style={{ fontWeight: '600', color: 'var(--text)', fontSize: '0.875rem', margin: 0 }}>{r.river_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: SPECIES_COLOR[r.species] ?? 'var(--text-2)' }}>
                      {r.species}
                    </span>
                    {r.quantity && (
                      <span style={{ fontSize: '0.83rem', color: 'var(--text-2)' }}>{r.quantity.toLocaleString()} fish</span>
                    )}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{daysAgo(r.stocked_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Access points */}
        <section>
          <p style={SECTION_LABEL}>
            Access Points{accessPoints.length ? ` · ${accessPoints.length}` : ''}
          </p>
          {!accessPoints.length ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center' }}>
              No access points found for this river
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {accessPoints.map((p: any) => (
                <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem' }}>
                  <p style={{ fontWeight: '600', color: 'var(--text)', fontSize: '0.85rem', margin: '0 0 3px' }}>{p.name}</p>
                  {p.access_type && <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', margin: '0 0 6px' }}>{p.access_type}</p>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {p.parking && <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>P: {p.parking}</span>}
                    {p.ada === 'Accessible' && <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--green)' }}>ADA</span>}
                    {p.fee && <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Fee: {p.fee}</span>}
                  </div>
                  {p.notes && <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', margin: '4px 0 0' }}>{p.notes}</p>}
                  {p.detail_url && (
                    <a href={p.detail_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--green)', textDecoration: 'none', display: 'inline-block', marginTop: '6px' }}>
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
