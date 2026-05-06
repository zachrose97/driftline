'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV_LINKS = [
  { href: '/streams',  label: 'Conditions' },
  { href: '/hatches',  label: 'Hatches'    },
  { href: '/stocking', label: 'Stocking'   },
  { href: '/map',      label: 'Map'        },
  { href: '/logbook',  label: 'Logbook'    },
];

export default function NavBar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserEmail(s?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      background: 'rgba(12, 20, 16, 0.88)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)',
    }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', lineHeight: 1 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '700', fontStyle: 'italic', color: 'var(--text)', letterSpacing: '-0.01em' }}>Drift</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '600', fontStyle: 'normal', color: 'var(--green)', letterSpacing: '-0.01em' }}>Line</span>
      </Link>

      {/* Desktop nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: isActive(href) ? '500' : '400',
              color: isActive(href) ? 'var(--text)' : 'var(--text-2)',
              textDecoration: 'none',
              background: isActive(href) ? 'var(--surface-2)' : 'transparent',
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {userEmail ? (
          <>
            <Link
              href="/account"
              style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {userEmail}
            </Link>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            style={{
              background: 'var(--green)',
              color: '#0c1410',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              letterSpacing: '-0.01em',
            }}
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
