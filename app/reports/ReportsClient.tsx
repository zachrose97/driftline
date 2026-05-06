'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Shop = { id: string; shop_name: string; email: string; verified: boolean };

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  fontSize: '0.875rem',
  color: 'var(--text)',
  background: 'var(--surface-2)',
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: '600',
  color: 'var(--text-3)',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const CLARITY_COLOR: Record<string, string> = {
  Clear:          'var(--green)',
  'Slightly Off': 'var(--amber)',
  Murky:          'var(--red)',
};

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

  function renderPostButton() {
    if (!authChecked) return null;
    if (!userEmail) {
      return (
        <Link href="/login?redirect=/reports" style={{ background: 'var(--green)', color: '#0c1410', padding: '0.55rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.875rem' }}>
          Log in to post
        </Link>
      );
    }
    if (!verifiedShop) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <Link href="/apply-shop" style={{ background: 'var(--green)', color: '#0c1410', padding: '0.55rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.875rem' }}>
            Apply for shop listing
          </Link>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Verified shops only</p>
        </div>
      );
    }
    return (
      <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? 'var(--surface-2)' : 'var(--green)', color: showForm ? 'var(--text-2)' : '#0c1410', padding: '0.55rem 1.25rem', borderRadius: '8px', border: showForm ? '1px solid var(--border)' : 'none', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer' }}>
        {showForm ? 'Cancel' : '+ Post a Report'}
      </button>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.03em' }}>
              Guide & Shop Reports
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
              Daily conditions from local fly shops and guides
            </p>
          </div>
          {renderPostButton()}
        </div>

        {success && (
          <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: 'var(--green)', fontWeight: '500', fontSize: '0.875rem' }}>
            Report posted. Thank you.
          </div>
        )}

        {/* Post form */}
        {showForm && verifiedShop && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)' }}>Post a conditions report</h2>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {verifiedShop.shop_name}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={LABEL}>River name *</label>
                <input value={form.river_name} onChange={e => setForm({ ...form, river_name: e.target.value })} placeholder="e.g. Beaverkill River" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Water clarity</label>
                <select value={form.water_clarity} onChange={e => setForm({ ...form, water_clarity: e.target.value })} style={INPUT}>
                  <option value="">Select...</option>
                  <option>Clear</option>
                  <option>Slightly Off</option>
                  <option>Murky</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={LABEL}>Water temp (°F)</label>
                <input value={form.water_temp} onChange={e => setForm({ ...form, water_temp: e.target.value })} placeholder="e.g. 54" type="number" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Flies working (comma-separated)</label>
                <input value={form.flies_working} onChange={e => setForm({ ...form, flies_working: e.target.value })} placeholder="e.g. Hendrickson #14, BWO #18" style={INPUT} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={LABEL}>Conditions report *</label>
              <textarea value={form.report_text} onChange={e => setForm({ ...form, report_text: e.target.value })} placeholder="Describe what you're seeing on the water today..." rows={4} style={{ ...INPUT, resize: 'vertical' }} />
            </div>

            <button onClick={handleSubmit} disabled={submitting} style={{ background: 'var(--green)', color: '#0c1410', padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Posting...' : 'Post Report'}
            </button>
          </div>
        )}

        {/* Reports list */}
        {allReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-2)', marginBottom: '0.5rem' }}>No reports yet</p>
            <p style={{ fontSize: '0.85rem' }}>Local shops and guides will post conditions here daily</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {allReports.map((report: any) => (
              <div key={report.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: '700', color: 'var(--green)', fontSize: '0.9rem' }}>{report.shop_name}</p>
                      {report.verified_shop && (
                        <span style={{ fontSize: '0.6rem', fontWeight: '800', background: 'var(--green-dim)', color: 'var(--green)', padding: '1px 7px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Verified
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>{report.river_name}</p>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(report.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: '1.65', marginBottom: '0.75rem' }}>{report.report_text}</p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {report.water_temp && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px' }}>
                      {report.water_temp}°F
                    </span>
                  )}
                  {report.water_clarity && (
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: CLARITY_COLOR[report.water_clarity] ?? 'var(--text-2)' }}>
                      ● {report.water_clarity}
                    </span>
                  )}
                  {report.flies_working?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {report.flies_working.map((fly: string) => (
                        <span key={fly} style={{ fontSize: '0.7rem', background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px' }}>
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
