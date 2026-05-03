import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9' }}>

      {/* Hero */}
      <section style={{ background: '#085041', padding: '5rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#9FE1CB', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>
          The all-in-one fly fishing platform
        </p>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.25rem', lineHeight: '1.2' }}>
          Everything you need.<br />Nothing you don't.
        </h1>
        <p style={{ color: '#9FE1CB', fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: '1.7' }}>
          Live stream conditions, local guide reports, stocking alerts, and a free catch logbook — all in one place. Free forever.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/streams" style={{ background: '#D97706', color: '#fff', padding: '0.8rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem' }}>
            Check Conditions
          </Link>
          <Link href="/hatches" style={{ background: 'transparent', color: '#fff', padding: '0.8rem 2rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem', border: '1px solid rgba(255,255,255,0.3)' }}>
            View Hatch Calendar
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>
          Built for fly fishers
        </h2>
        <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: '3rem', fontSize: '0.95rem' }}>
          Free forever. No paywalls. No algorithms hiding the good stuff.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {[
            { emoji: '🌊', title: 'Live Stream Conditions', desc: 'Real-time flow, water temperature, and gauge data for thousands of rivers via USGS.', href: '/streams', cta: 'View conditions' },
            { emoji: '🪰', title: 'Hatch Calendar', desc: 'Region-specific insect emergence timing with fly pattern recommendations. See what\'s hatching right now.', href: '/hatches', cta: 'View hatches' },
            { emoji: '🎣', title: 'Guide & Shop Reports', desc: 'Daily conditions posted by local fly shops — what\'s hatching, what\'s working, where to go.', href: '/reports', cta: 'Read reports' },
            { emoji: '📋', title: 'Stocking Reports', desc: 'Up-to-date stocking data from state fish & wildlife agencies. Never miss a fresh plant.', href: '/stocking', cta: 'View stocking' },
            { emoji: '📓', title: 'Free Catch Logbook', desc: 'Log catches with GPS, photos, and conditions. Your fishing history, private and free.', href: '/logbook', cta: 'Open logbook' },
            { emoji: '🗺️', title: 'River Map', desc: 'Interactive map of rivers, access points, and live gauge markers across your region.', href: '/map', cta: 'Open map' },
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

      {/* CTA banner */}
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

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem', borderTop: '1px solid #E5E7EB' }}>
        DriftLine · Built for fly fishers · Stream data from USGS
      </footer>

    </main>
  );
}
