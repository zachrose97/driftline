'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NavBar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const linkStyle = (href: string): React.CSSProperties => ({
    color: pathname === href ? '#085041' : '#6B7280',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: pathname === href ? '600' : '400',
  });

  return (
    <nav style={{
      background: '#ffffff',
      borderBottom: '1px solid #E5E7EB',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <Link href="/" style={{ fontSize: '1.4rem', fontWeight: '700', color: '#085041', textDecoration: 'none' }}>
        Drift<span style={{ color: '#D97706' }}>Line</span>
      </Link>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/streams" style={linkStyle('/streams')}>Conditions</Link>
        <Link href="/hatches" style={linkStyle('/hatches')}>Hatches</Link>
        <Link href="/reports" style={linkStyle('/reports')}>Reports</Link>
        <Link href="/stocking" style={linkStyle('/stocking')}>Stocking</Link>
        <Link href="/map" style={linkStyle('/map')}>Map</Link>
        <Link href="/logbook" style={linkStyle('/logbook')}>Logbook</Link>

        {userEmail ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{userEmail}</span>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              background: '#085041',
              color: '#fff',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
            }}
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
