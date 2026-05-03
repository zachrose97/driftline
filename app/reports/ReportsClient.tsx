'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Shop = { id: string; shop_name: string; email: string; verified: boolean };

export default function ReportsClient({ reports }: { reports: any[] }) {
  const [allReports, setAllReports] = useState(reports);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [verifiedShop, setVerifiedShop] = useState<Shop | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [form, setForm] = useState({
    shop_name: '',
    river_name: '',
    report_text: '',
    water_temp: '',
    water_clarity: '',
    flies_working: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const email = session?.user?.email ?? null;
      setUserEmail(email);
      if (email) {
        const { data } = await supabase
          .from('shops')
          .select('*')
          .eq('contact_email', email)
          .eq('verified', true)
          .single();
        if (data) {
          setVerifiedShop(data);
          setForm(f => ({ ...f, shop_name: data.shop_name }));
        }
      }
      setAuthChecked(true);
    });
  }, []);

  async function handleSubmit() {
    if (!form.shop_name || !form.river_name || !form.report_text) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('shop_reports')
      .insert({
        shop_name: form.shop_name,
        river_name: form.river_name,
        report_text: form.report_text,
        water_temp: form.water_temp ? parseFloat(form.water_temp) : null,
        water_clarity: form.water_clarity,
        flies_working: form.flies_working ? form.flies_working.split(',').map(f => f.trim()) : [],
        verified_shop: !!verifiedShop,
      })
      .select()
      .single();

    if (!error && data) {
      setAllReports([data, ...allReports]);
      setForm(f => ({ ...f, river_name: '', report_text: '', water_temp: '', water_clarity: '', flies_working: '' }));
      setShowForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }
    setSubmitting(false);
  }

  const clarityColors: Record<string, string> = {
    Clear: '#16A34A',
    'Slightly Off': '#D97706',
    Murky: '#DC2626',
  };

  function renderPostButton() {
    if (!authChecked) return null;

    if (!userEmail) {
      return (
        <Link
          href="/login?redirect=/reports"
          style={{ background: '#085041', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}
        >
          Log in to post
        </Link>
      );
    }

    if (!verifiedShop) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <Link
            href="/apply-shop"
            style={{ background: '#085041', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}
          >
            Apply for shop listing
          </Link>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Verified shops only can post reports</p>
        </div>
      );
    }

    return (
      <button
        onClick={() => setShowForm(!showForm)}
        style={{ background: '#085041', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
      >
        {showForm ? 'Cancel' : '+ Post a Report'}
      </button>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '4px' }}>Guide & Shop Reports</h1>
            <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>Daily conditions from local fly shops and guides</p>
          </div>
          {renderPostButton()}
        </div>

        {success && (
          <div style={{ background: '#DCFCE7', border: '1px solid #16A34A', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#16A34A', fontWeight: '500' }}>
            Report posted successfully! Thank you.
          </div>
        )}

        {showForm && verifiedShop && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>Post a conditions report</h2>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '20px' }}>
                {verifiedShop.shop_name}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>River name *</label>
                <input
                  value={form.river_name}
                  onChange={e => setForm({ ...form, river_name: e.target.value })}
                  placeholder="e.g. Beaverkill River"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Water clarity</label>
                <select
                  value={form.water_clarity}
                  onChange={e => setForm({ ...form, water_clarity: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', background: '#fff' }}
                >
                  <option value="">Select...</option>
                  <option>Clear</option>
                  <option>Slightly Off</option>
                  <option>Murky</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Water temp (°F)</label>
                <input
                  value={form.water_temp}
                  onChange={e => setForm({ ...form, water_temp: e.target.value })}
                  placeholder="e.g. 54"
                  type="number"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Flies working (comma separated)</label>
                <input
                  value={form.flies_working}
                  onChange={e => setForm({ ...form, flies_working: e.target.value })}
                  placeholder="e.g. Hendrickson #14, BWO #18"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Conditions report *</label>
              <textarea
                value={form.report_text}
                onChange={e => setForm({ ...form, report_text: e.target.value })}
                placeholder="Describe what you're seeing on the water today..."
                rows={4}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', resize: 'vertical' }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ background: '#085041', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Posting...' : 'Post Report'}
            </button>
          </div>
        )}

        {allReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9CA3AF' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No reports yet</p>
            <p style={{ fontSize: '0.9rem' }}>Local shops and guides will post conditions here daily</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allReports.map((report: any) => (
              <div key={report.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                      <p style={{ fontWeight: '600', color: '#085041', fontSize: '0.95rem' }}>{report.shop_name}</p>
                      {report.verified_shop && (
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Verified Shop
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>{report.river_name}</p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {new Date(report.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.6', marginBottom: '0.75rem' }}>{report.report_text}</p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {report.water_temp && (
                    <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>💧 {report.water_temp}°F</span>
                  )}
                  {report.water_clarity && (
                    <span style={{ fontSize: '0.78rem', fontWeight: '500', color: clarityColors[report.water_clarity] || '#6B7280' }}>
                      ● {report.water_clarity}
                    </span>
                  )}
                  {report.flies_working && report.flies_working.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {report.flies_working.map((fly: string) => (
                        <span key={fly} style={{ fontSize: '0.72rem', background: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: '20px' }}>
                          {fly}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
