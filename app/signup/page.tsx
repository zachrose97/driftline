'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
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

    const { error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ background: '#DCFCE7', border: '1px solid #6EE7B7', borderRadius: '12px', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534', marginBottom: '0.5rem' }}>Check your email</h2>
            <p style={{ color: '#166534', fontSize: '0.9rem', lineHeight: '1.6' }}>
              We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then log in.
            </p>
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: '#6B7280' }}>
            <Link href="/login" style={{ color: '#085041', fontWeight: '600', textDecoration: 'none' }}>Back to log in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>Create your account</h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Free forever. No credit card needed.</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '2rem' }}>
          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                Password
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
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#6B7280' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#085041', fontWeight: '600', textDecoration: 'none' }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
