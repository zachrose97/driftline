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
    <>
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
        <Link href="/" style={{ textDecoration: 'none', lineHeight: 1, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '700', fontStyle: 'italic', color: 'var(--text)', letterSpacing: '-0.01em' }}>Drift</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '600', fontStyle: 'normal', color: 'var(--green)', letterSpacing: '-0.01em' }}>Line</span>
        </Link>

        {/* Desktop nav */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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

        {/* Desktop auth */}
        <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                style={{ background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{ background: 'var(--green)', color: '#0c1410', padding: '0.4rem 1rem', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '-0.01em' }}
            >
              Log in
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          style={{ display: 'none', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-2)' }}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            zIndex: 99,
            background: 'rgba(12, 20, 16, 0.97)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid var(--border)',
            padding: '0.75rem 1.5rem 1.25rem',
          }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '0.7rem 0',
                fontSize: '1rem',
                fontWeight: isActive(href) ? '600' : '400',
                color: isActive(href) ? 'var(--text)' : 'var(--text-2)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ marginTop: '1rem' }}>
            {userEmail ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{userEmail}</span>
                <button onClick={handleLogout} style={{ background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '0.35rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Log out
                </button>
              </div>
            ) : (
              <Link href="/login" style={{ display: 'block', background: 'var(--green)', color: '#0c1410', padding: '0.65rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '700', textAlign: 'center' }}>
                Log in
              </Link>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 680px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  );
}
