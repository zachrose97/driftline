import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { HATCHES } from '@/lib/hatches';

export const revalidate = 300; // refresh every 5 minutes

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  mayfly:   { bg: '#DCFCE7', color: '#166534' },
  caddis:   { bg: '#FEF3C7', color: '#92400E' },
  stonefly: { bg: '#FEE2E2', color: '#991B1B' },
  midge:    { bg: '#F3F4F6', color: '#374151' },
};

export default async function HomePage() {
  const currentMonth = new Date().getMonth() + 1;
  const activeHatches = HATCHES.filter(h => h.months.includes(currentMonth));

  const [{ data: recentReports }, { data: recentStocking }] = await Promise.all([
    supabase.from('shop_reports').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('stocking_reports').select('*').order('stocked_date', { ascending: false }).limit(4),
  ]);

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9' }}>

      {/* Hero */}
      <section style={{ background: '#085041', padding: '4.5rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#9FE1CB', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>
          The all-in-one fly fishing platform
        </p>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.25rem', lineHeight: '1.2' }}>
          Everything you need.<br />Nothing you don't.
        </h1>
        <p style={{ color: '#9FE1CB', fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: '1.7' }}>
          Live stream conditions, hatch calendars, guide reports, stocking alerts, and a free catch logbook — no paywalls, ever.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/streams" style={{ background: '#D97706', color: '#fff', padding: '0.8rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem' }}>
            Check Conditions
          </Link>
          <Link href="/hatches" style={{ background: 'transparent', color: '#fff', padding: '0.8rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.35)' }}>
            View Hatch Calendar
          </Link>
        </div>
      </section>

      {/* On the Water Today */}
      <section style={{ padding: '2.5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#085041', marginBottom: '1.5rem' }}>
          On the Water Today
          <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#9CA3AF', marginLeft: '0.75rem' }}>
            {MONTHS[currentMonth - 1]}
          </span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>

          {/* Active hatches */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>🪰 Active Hatches</p>
              <Link href="/hatches" style={{ fontSize: '0.78rem', color: '#085041', fontWeight: '600', textDecoration: 'none' }}>
                Full calendar →
              </Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {activeHatches.slice(0, 8).map(h => {
                const tc = TYPE_COLORS[h.type];
                return (
                  <span key={h.id} style={{ fontSize: '0.75rem', fontWeight: '500', padding: '3px 9px', borderRadius: '20px', background: tc.bg, color: tc.color }}>
                    {h.name}
                  </span>
                );
              })}
              {activeHatches.length > 8 && (
                <span style={{ fontSize: '0.75rem', color: '#9CA3AF', padding: '3px 0' }}>
                  +{activeHatches.length - 8} more
                </span>
              )}
            </div>
            {activeHatches.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>No major hatches this month — midges year-round.</p>
            )}
          </div>

          {/* Recent stocking */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>📋 Recent Stocking</p>
              <Link href="/stocking" style={{ fontSize: '0.78rem', color: '#085041', fontWeight: '600', textDecoration: 'none' }}>
                All stocking →
              </Link>
            </div>
            {recentStocking && recentStocking.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentStocking.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: '#374151', fontWeight: '500', flex: 1, marginRight: '8px' }}>{r.river_name}</span>
                    <span style={{ color: '#6B7280', flexShrink: 0 }}>{r.species}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Stocking data updated weekly. Check back Monday.</p>
            )}
          </div>

        </div>
      </section>

      {/* Recent guide reports */}
      {recentReports && recentReports.length > 0 && (
        <section style={{ padding: '0 2rem 2.5rem', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#085041' }}>Latest Guide Reports</h2>
            <Link href="/reports" style={{ fontSize: '0.85rem', color: '#085041', fontWeight: '600', textDecoration: 'none' }}>
              All reports →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {recentReports.map((r: any) => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: '600', color: '#085041', fontSize: '0.9rem' }}>{r.shop_name}</p>
                    <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>{r.river_name}</p>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: '1.55', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {r.report_text}
                </p>
                {r.flies_working && r.flies_working.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                    {r.flies_working.slice(0, 3).map((fly: string) => (
                      <span key={fly} style={{ fontSize: '0.7rem', background: '#F3F4F6', color: '#374151', padding: '2px 7px', borderRadius: '20px' }}>
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

      {/* Feature cards */}
      <section style={{ padding: '2rem 2rem 4rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>
          Built for fly fishers
        </h2>
        <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '3rem', fontSize: '0.95rem' }}>
          Free forever. No paywalls. No algorithms hiding the good stuff.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {[
            { emoji: '🌊', title: 'Live Stream Conditions', desc: 'Real-time flow and temperature for hundreds of rivers from USGS gauges. Multi-state support.', href: '/streams', cta: 'View conditions' },
            { emoji: '🪰', title: 'Hatch Calendar', desc: 'Region-specific insect emergence timing with fly pattern recommendations for 20 major US hatches.', href: '/hatches', cta: 'View hatches' },
            { emoji: '🎣', title: 'Guide & Shop Reports', desc: 'Daily conditions posted by local fly shops — what\'s hatching, what\'s working, where to go.', href: '/reports', cta: 'Read reports' },
            { emoji: '📋', title: 'Stocking Reports', desc: 'Up-to-date stocking data imported weekly from state fish & wildlife agencies. Never miss a fresh plant.', href: '/stocking', cta: 'View stocking' },
            { emoji: '📓', title: 'Free Catch Logbook', desc: 'Log catches with GPS coordinates, photos, and conditions. Your fishing history — private and free.', href: '/logbook', cta: 'Open logbook' },
            { emoji: '🗺️', title: 'River Map', desc: 'Interactive map of USGS gauge stations with live flow data, clustered by region and color-coded by condition.', href: '/map', cta: 'Open map' },
          ].map((feature) => (
            <div key={feature.title} style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{feature.emoji}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>{feature.title}</h3>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: '1.6', marginBottom: '1rem' }}>{feature.desc}</p>
              <Link href={feature.href} style={{ fontSize: '0.85rem', color: '#085041', fontWeight: '600', textDecoration: 'none' }}>
                {feature.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Shop CTA */}
      <section style={{ background: '#085041', padding: '3rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.75rem' }}>
          Are you a local fly shop or guide?
        </h2>
        <p style={{ color: '#9FE1CB', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Post your daily conditions report for free. Help anglers in your area find fish.
        </p>
        <Link href="/apply-shop" style={{ background: '#D97706', color: '#fff', padding: '0.8rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem' }}>
          Apply for a free shop listing
        </Link>
      </section>

      <footer style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem', borderTop: '1px solid #E5E7EB' }}>
        DriftLine · Built for fly fishers · Stream data from USGS
      </footer>

    </main>
  );
}
