import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ fontSize: '5rem', fontWeight: '800', color: '#E5E7EB', lineHeight: 1, marginBottom: '1rem' }}>404</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#085041', marginBottom: '0.75rem' }}>
          Page not found
        </h1>
        <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.75rem' }}>
          Looks like you've waded into uncharted water. The page you're looking for doesn't exist.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link
            href="/"
            style={{ background: '#085041', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}
          >
            Back to home
          </Link>
          <Link
            href="/streams"
            style={{ background: 'transparent', color: '#085041', padding: '0.65rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', border: '1px solid #085041' }}
          >
            Stream conditions
          </Link>
        </div>
      </div>
    </main>
  );
}
