'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthChecked(true);
    });
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (!authChecked) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Loading...</p>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6B7280', marginBottom: '1rem' }}>You're not logged in.</p>
          <Link href="/login" style={{ color: '#085041', fontWeight: '600', textDecoration: 'none' }}>Log in</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>Account</h1>
        <p style={{ color: '#6B7280', fontSize: '0.95rem', marginBottom: '2rem' }}>{userEmail}</p>

        {/* Change password */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1.25rem' }}>Change password</h2>

          {passwordError && (
            <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#991B1B', fontSize: '0.875rem' }}>
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div style={{ background: '#DCFCE7', border: '1px solid #16A34A', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#166534', fontSize: '0.875rem' }}>
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{ background: '#085041', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Update password'}
            </button>
          </form>
        </div>

        {/* Sign out */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>Sign out</h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '1rem' }}>You'll be returned to the homepage.</p>
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', color: '#DC2626', border: '1px solid #DC2626', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
