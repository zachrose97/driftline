'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase reads the access_token from the URL hash automatically on client mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        // Give Supabase a moment to process the hash fragment
        const timer = setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            setReady(!!s);
          });
        }, 500);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => router.push('/logbook'), 2000);
  }

  if (done) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>Password updated</h2>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Redirecting to your logbook...</p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: '#9CA3AF', marginBottom: '1rem' }}>Verifying reset link...</p>
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>
            If this takes too long, your link may have expired.{' '}
            <Link href="/forgot-password" style={{ color: '#085041', fontWeight: '600', textDecoration: 'none' }}>
              Request a new one
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>Set a new password</h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Choose something you haven't used before</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '2rem' }}>
          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Min. 8 characters"
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#085041',
                color: '#fff',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
