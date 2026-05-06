'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Catch = {
  id: string;
  user_id: string;
  river_name: string;
  species: string;
  fly_used: string;
  length_inches: number | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  photo_url: string | null;
  caught_at: string;
};

const SPECIES_OPTIONS = [
  'Brown Trout', 'Rainbow Trout', 'Brook Trout',
  'Cutthroat Trout', 'Lake Trout', 'Bull Trout',
  'Atlantic Salmon', 'Steelhead', 'Smallmouth Bass', 'Other',
];

const SPECIES_COLORS: Record<string, string> = {
  'Brown Trout':     '#fbbf24',
  'Rainbow Trout':   '#60a5fa',
  'Brook Trout':     '#34d399',
  'Cutthroat Trout': '#a78bfa',
  'Lake Trout':      '#38bdf8',
  'Bull Trout':      '#fb923c',
  'Atlantic Salmon': '#f472b6',
  'Steelhead':       '#818cf8',
  'Smallmouth Bass': '#84cc16',
};

const emptyForm = {
  species: '',
  fly_used: '',
  length_inches: '',
  river_name: '',
  notes: '',
};

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
  fontSize: '0.75rem',
  fontWeight: '600',
  color: 'var(--text-3)',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

export default function LogbookPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [loadingCatches, setLoadingCatches] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingCatches(true);
    supabase
      .from('catches')
      .select('*')
      .eq('user_id', userId)
      .order('caught_at', { ascending: false })
      .then(({ data }) => {
        setCatches(data ?? []);
        setLoadingCatches(false);
      });
  }, [userId]);

  function getGPS() {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ok'); },
      () => setGpsStatus('error'),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!form.species || !form.fly_used || !form.river_name) {
      setSubmitError('Species, fly, and river name are required.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('catch-photos').upload(path, photoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('catch-photos').getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from('catches')
      .insert({
        user_id: userId,
        species: form.species,
        fly_used: form.fly_used,
        length_inches: form.length_inches ? parseFloat(form.length_inches) : null,
        river_name: form.river_name,
        notes: form.notes || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        photo_url: photoUrl,
        caught_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) { setSubmitError(error.message); setSubmitting(false); return; }

    setCatches([data, ...catches]);
    setForm(emptyForm);
    setCoords(null);
    setPhotoFile(null);
    setGpsStatus('idle');
    setShowForm(false);
    setSubmitting(false);
    setSuccessMsg('Catch logged!');
    setTimeout(() => setSuccessMsg(''), 3000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const totalCatches = catches.length;
  const favoriteFly = (() => {
    if (!catches.length) return null;
    const counts: Record<string, number> = {};
    catches.forEach(c => { counts[c.fly_used] = (counts[c.fly_used] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();
  const bestRiver = (() => {
    if (!catches.length) return null;
    const counts: Record<string, number> = {};
    catches.forEach(c => { counts[c.river_name] = (counts[c.river_name] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  if (!authChecked) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-3)' }}>Loading...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '1rem' }}>
            Private · Free forever
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text)', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
            Your catch logbook
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.7' }}>
            Log catches with GPS, species, fly, and notes. Build a lifetime fishing history — private and free.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/login?redirect=/logbook" style={{ background: 'var(--green)', color: '#0c1410', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '0.875rem' }}>
              Log in
            </Link>
            <Link href="/signup" style={{ background: 'transparent', color: 'var(--text)', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem', border: '1px solid var(--border)' }}>
              Sign up free
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.03em' }}>
              Catch Logbook
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
              {totalCatches} catch{totalCatches !== 1 ? 'es' : ''} recorded
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: showForm ? 'var(--surface-2)' : 'var(--green)', color: showForm ? 'var(--text-2)' : '#0c1410', padding: '0.6rem 1.25rem', borderRadius: '8px', border: showForm ? '1px solid var(--border)' : 'none', fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {showForm ? 'Cancel' : '+ Log a catch'}
          </button>
        </div>

        {/* Stats */}
        {totalCatches > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total catches', value: totalCatches.toString() },
              { label: 'Favorite fly', value: favoriteFly ?? '—' },
              { label: 'Best river', value: bestRiver ?? '—' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-3)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</p>
                <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--green)', wordBreak: 'break-word' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: 'var(--green)', fontWeight: '500', fontSize: '0.875rem' }}>
            {successMsg}
          </div>
        )}

        {/* Log form */}
        {showForm && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '1.25rem' }}>Log a catch</h2>

            {submitError && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: 'var(--red)', fontSize: '0.85rem' }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={LABEL}>Species *</label>
                  <select value={form.species} onChange={e => setForm({ ...form, species: e.target.value })} style={INPUT}>
                    <option value="">Select species...</option>
                    {SPECIES_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Fly used *</label>
                  <input value={form.fly_used} onChange={e => setForm({ ...form, fly_used: e.target.value })} placeholder="e.g. Hendrickson #14" style={INPUT} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={LABEL}>River name *</label>
                  <input value={form.river_name} onChange={e => setForm({ ...form, river_name: e.target.value })} placeholder="e.g. Beaverkill" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>Length (inches)</label>
                  <input type="number" value={form.length_inches} onChange={e => setForm({ ...form, length_inches: e.target.value })} placeholder="e.g. 18" min="1" max="60" style={INPUT} />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={LABEL}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Conditions, time of day, hatch activity..." rows={3} style={{ ...INPUT, resize: 'vertical' }} />
              </div>

              {/* GPS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <button type="button" onClick={getGPS} disabled={gpsStatus === 'loading'} style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  {gpsStatus === 'loading' ? 'Getting location...' : 'Auto-fill GPS'}
                </button>
                {gpsStatus === 'ok' && coords && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--green)' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                )}
                {gpsStatus === 'error' && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--red)' }}>Location unavailable</span>
                )}
              </div>

              {/* Photo */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={LABEL}>Photo (optional)</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] ?? null)} style={{ fontSize: '0.82rem', color: 'var(--text-2)' }} />
              </div>

              <button type="submit" disabled={submitting} style={{ background: 'var(--green)', color: '#0c1410', padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.875rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Saving...' : 'Save catch'}
              </button>
            </form>
          </div>
        )}

        {/* Catches timeline */}
        {loadingCatches ? (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '2rem' }}>Loading...</p>
        ) : catches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem', color: 'var(--text-2)' }}>No catches yet</p>
            <p style={{ fontSize: '0.85rem' }}>Log your first catch to start your fishing history</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {catches.map(c => {
              const accentColor = SPECIES_COLORS[c.species] ?? 'var(--green)';
              return (
                <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {c.photo_url && (
                    <Image src={c.photo_url} alt="Catch photo" width={72} height={72} style={{ objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', color: accentColor, fontSize: '0.95rem' }}>{c.species}</span>
                        {c.length_inches && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: '20px' }}>{c.length_inches}"</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {new Date(c.caught_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: c.notes ? '4px' : 0 }}>
                      {c.fly_used} <span style={{ color: 'var(--text-3)' }}>— {c.river_name}</span>
                    </p>
                    {c.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: '1.55' }}>{c.notes}</p>}
                    {c.lat && c.lng && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '3px', opacity: 0.6 }}>
                        {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
