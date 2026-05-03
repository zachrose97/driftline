'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function ApplyShopPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    shop_name: '',
    website: '',
    address: '',
    state: '',
    contact_email: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email ?? null;
      setUserEmail(email);
      if (email) setForm(f => ({ ...f, contact_email: email }));
      setAuthChecked(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shop_name || !form.state || !form.contact_email) {
      setError('Shop name, state, and contact email are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const { error: dbError } = await supabase
      .from('shops')
      .insert({
        shop_name:     form.shop_name,
        website:       form.website || null,
        address:       form.address || null,
        state:         form.state,
        contact_email: form.contact_email,
        description:   form.description || null,
        verified:      false,
      });

    if (dbError) {
      setError(dbError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
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
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎣</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#085041', marginBottom: '0.75rem' }}>
            Create an account to apply
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            A free DriftLine account links your shop listing to your login so you can post daily conditions reports.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/signup" style={{ background: '#085041', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
              Sign up free
            </Link>
            <Link href="/login" style={{ background: 'transparent', color: '#085041', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', border: '1px solid #085041' }}>
              Log in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ background: '#DCFCE7', border: '1px solid #6EE7B7', borderRadius: '12px', padding: '2.5rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#166534', marginBottom: '0.75rem' }}>
              Application received!
            </h2>
            <p style={{ color: '#166534', fontSize: '0.95rem', lineHeight: '1.7' }}>
              Thanks for applying, <strong>{form.shop_name}</strong>. We'll review your application and reach out to <strong>{form.contact_email}</strong> within a few days. Once verified, you'll be able to post daily conditions reports.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '0.5rem' }}>
            Apply for a free shop listing
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Verified fly shops and guides can post daily conditions reports on DriftLine. It's free and helps local anglers find fish. We review every application manually.
          </p>
        </div>

        <div style={{ background: '#F0FDF4', border: '1px solid #6EE7B7', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>✅</span>
          <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: '1.6' }}>
            <strong>What you get:</strong> A verified shop badge, the ability to post daily reports, and a listing on DriftLine — all free, no subscription required.
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '2rem' }}>
          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Shop or guide name *</label>
                <input
                  value={form.shop_name}
                  onChange={e => setForm({ ...form, shop_name: e.target.value })}
                  placeholder="e.g. Dette Flies"
                  required
                  style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>State *</label>
                <select
                  value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">Select...</option>
                  {US_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Website</label>
                <input
                  value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })}
                  placeholder="https://yourshop.com"
                  type="url"
                  style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, Roscoe, NY 12776"
                  style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Contact email *</label>
                <input
                  value={form.contact_email}
                  onChange={e => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="owner@yourshop.com"
                  type="email"
                  required
                  style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Tell us about your shop</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What rivers do you cover? What species do you guide for?"
                  rows={3}
                  style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: '#085041',
                color: '#fff',
                padding: '0.75rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
