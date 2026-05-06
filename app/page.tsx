import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { HATCHES } from '@/lib/hatches';

export const revalidate = 300;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const SPECIES_COLORS: Record<string, string> = {
  'Brown Trout':     '#fbbf24',
  'Rainbow Trout':   '#60a5fa',
  'Brook Trout':     '#34d399',
  'Cutthroat Trout': '#a78bfa',
  'Lake Trout':      '#38bdf8',
  'Tiger Trout':     '#fb923c',
};

const TYPE_COLORS: Record<string, string> = {
  mayfly:   'var(--green)',
  caddis:   'var(--amber)',
  stonefly: 'var(--red)',
  midge:    'var(--slate)',
};

const FEATURES = [
  { icon: '〰', title: 'Live Stream Conditions', desc: 'Real-time flow and temperature from USGS gauges. Multi-state, updated every 15 min.', href: '/streams', cta: 'View conditions' },
  { icon: '◌', title: 'Hatch Calendar', desc: 'Region-specific emergence timing with fly pattern recommendations for 20 major US hatches.', href: '/hatches', cta: 'View hatches' },
  { icon: '◈', title: 'Guide Reports', desc: 'Daily conditions from local fly shops — what\'s hatching, what\'s working, where to go.', href: '/reports', cta: 'Read reports' },
  { icon: '◎', title: 'Stocking Reports', desc: 'Trout stocking data from state fish & wildlife agencies. Never miss a fresh plant.', href: '/stocking', cta: 'View stocking' },
  { icon: '◫', title: 'Catch Logbook', desc: 'Log catches with GPS, species, conditions, and notes. Private and free forever.', href: '/logbook', cta: 'Open logbook' },
  { icon: '⊕', title: 'River Map', desc: 'Interactive map of gauges and fishing access points, color-coded by flow condition.', href: '/map', cta: 'Open map' },
];

export default async function HomePage() {
  const currentMonth = new Date().getMonth() + 1;
  const activeHatches = HATCHES.filter(h => h.months.includes(currentMonth));

  const [{ data: recentReports }, { data: recentStocking }] = await Promise.all([
    supabase.from('shop_reports').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('stocking_reports').select('*').order('stocked_date', { ascending: false }).limit(5),
  ]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        padding: '7rem 2rem 6rem',
        textAlign: 'center',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(52,211,153,0.07) 0%, transparent 70%)',
        }} />

        <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '1.5rem', position: 'relative' }}>
          The all-in-one fly fishing platform
        </p>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: '800',
          color: 'var(--text)',
          lineHeight: '1.1',
          letterSpacing: '-0.03em',
          marginBottom: '1.5rem',
          position: 'relative',
        }}>
          Read the river.<br />
          <span style={{ color: 'var(--green)' }}>Fish with confidence.</span>
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-2)', maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: '1.7', position: 'relative' }}>
          Live conditions, hatch calendars, stocking alerts, and access points — free forever, no paywalls.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <Link href="/streams" style={{
            background: 'var(--green)', color: '#0c1410',
            padding: '0.75rem 1.75rem', borderRadius: '8px',
            textDecoration: 'none', fontWeight: '700', fontSize: '0.9rem',
            letterSpacing: '-0.01em',
          }}>
            Check Conditions
          </Link>
          <Link href="/map" style={{
            background: 'var(--surface)', color: 'var(--text)',
            padding: '0.75rem 1.75rem', borderRadius: '8px',
            textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem',
            border: '1px solid var(--border)',
          }}>
            Open Map
          </Link>
        </div>
      </section>

      {/* ── Live snapshot ──────────────────────────────────────────── */}
      <section style={{ padding: '3rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '1.25rem' }}>
          {MONTHS[currentMonth - 1]} snapshot
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>

          {/* Active hatches */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontWeight: '600', color: 'var(--text)', fontSize: '0.9rem' }}>Active Hatches</p>
              <Link href="/hatches" style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: '600', textDecoration: 'none' }}>
                Full calendar →
              </Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {activeHatches.slice(0, 8).map(h => (
                <span key={h.id} style={{
                  fontSize: '0.72rem', fontWeight: '500', padding: '3px 9px', borderRadius: '20px',
                  background: 'var(--surface-2)', color: TYPE_COLORS[h.type] ?? 'var(--text-2)',
                  border: `1px solid ${TYPE_COLORS[h.type] ?? 'var(--border)'}22`,
                }}>
                  {h.name}
                </span>
              ))}
              {activeHatches.length > 8 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', padding: '3px 0' }}>+{activeHatches.length - 8} more</span>
              )}
              {activeHatches.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>No major hatches — midges year-round.</p>
              )}
            </div>
          </div>

          {/* Recent stocking */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontWeight: '600', color: 'var(--text)', fontSize: '0.9rem' }}>Recent Stocking</p>
              <Link href="/stocking" style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: '600', textDecoration: 'none' }}>
                All records →
              </Link>
            </div>
            {recentStocking?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {recentStocking.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.83rem', color: 'var(--text)', fontWeight: '500', flex: 1, marginRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.river_name}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: SPECIES_COLORS[r.species] ?? 'var(--text-2)', flexShrink: 0 }}>
                      {r.species}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Updated weekly. Check back Monday.</p>
            )}
          </div>

        </div>
      </section>

      {/* ── Guide reports ──────────────────────────────────────────── */}
      {recentReports && recentReports.length > 0 && (
        <section style={{ padding: '0 2rem 3rem', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Latest Guide Reports
            </p>
            <Link href="/reports" style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: '600', textDecoration: 'none' }}>
              All reports →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {recentReports.map((r: any) => (
              <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div>
                    <p style={{ fontWeight: '600', color: 'var(--green)', fontSize: '0.85rem' }}>{r.shop_name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{r.river_name}</p>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {r.report_text}
                </p>
                {r.flies_working?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {r.flies_working.slice(0, 3).map((fly: string) => (
                      <span key={fly} style={{ fontSize: '0.7rem', background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px' }}>
                        {fly}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Feature grid ───────────────────────────────────────────── */}
      <section style={{ padding: '3rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Built for fly fishers
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>Free forever. No paywalls.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href} style={{ textDecoration: 'none', display: 'block', background: 'var(--surface)', padding: '1.5rem', transition: 'background 0.15s' }}>
              <p style={{ fontSize: '1.4rem', marginBottom: '0.75rem', opacity: 0.5 }}>{f.icon}</p>
              <p style={{ fontWeight: '600', color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>{f.title}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '0.75rem' }}>{f.desc}</p>
              <span style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: '600' }}>{f.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Shop CTA ───────────────────────────────────────────────── */}
      <section style={{ margin: '0 2rem 4rem', maxWidth: '1100px', marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '2.5rem',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(52,211,153,0.05) 0%, transparent 70%)',
          }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.5rem', letterSpacing: '-0.02em', position: 'relative' }}>
            Are you a local fly shop or guide?
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.5rem', position: 'relative' }}>
            Post daily conditions reports for free. Help anglers in your area find fish.
          </p>
          <Link href="/apply-shop" style={{
            background: 'var(--green)', color: '#0c1410',
            padding: '0.7rem 1.75rem', borderRadius: '8px',
            textDecoration: 'none', fontWeight: '700', fontSize: '0.88rem',
            position: 'relative',
          }}>
            Apply for a free listing
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ padding: '1.5rem 2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem', borderTop: '1px solid var(--border-subtle)' }}>
        DriftLine · Built for fly fishers · Stream data via USGS
      </footer>

    </main>
  );
}
