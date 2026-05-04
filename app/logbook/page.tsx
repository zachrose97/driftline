'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

const emptyForm = {
  species: '',
  fly_used: '',
  length_inches: '',
  river_name: '',
  notes: '',
};

export default function LogbookPage() {
  const router = useRouter();
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
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ok');
      },
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
      const { error: uploadError } = await supabase.storage
        .from('catch-photos')
        .upload(path, photoFile);
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

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

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

  // Stats
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
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>Loading...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📓</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#085041', marginBottom: '0.75rem' }}>Your catch logbook is private</h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Log in to record your catches, track your stats, and build a lifetime fishing history — free forever.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/login?redirect=/logbook" style={{ background: '#085041', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
              Log in
            </Link>
            <Link href="/signup" style={{ background: 'transparent', color: '#085041', padding: '0.7rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', border: '1px solid #085041' }}>
              Sign up free
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '4px' }}>My Catch Logbook</h1>
            <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>{totalCatches} catch{totalCatches !== 1 ? 'es' : ''} recorded</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: '#085041', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Log a catch'}
          </button>
        </div>

        {/* Stats */}
        {totalCatches > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total catches', value: totalCatches.toString() },
              { label: 'Favorite fly', value: favoriteFly ?? '—' },
              { label: 'Best river', value: bestRiver ?? '—' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '4px' }}>{stat.label}</p>
                <p style={{ fontSize: '1rem', fontWeight: '700', color: '#085041', wordBreak: 'break-word' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#DCFCE7', border: '1px solid #6EE7B7', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#166534', fontWeight: '500', fontSize: '0.9rem' }}>
            {successMsg}
          </div>
        )}

        {/* Log form */}
        {showForm && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginBottom: '1.25rem' }}>Log a catch</h2>

            {submitError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#991B1B', fontSize: '0.85rem' }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Species *</label>
                  <select
                    value={form.species}
                    onChange={e => setForm({ ...form, species: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', background: '#fff' }}
                  >
                    <option value="">Select species...</option>
                    {SPECIES_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Fly used *</label>
                  <input
                    value={form.fly_used}
                    onChange={e => setForm({ ...form, fly_used: e.target.value })}
                    placeholder="e.g. Hendrickson #14"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>River name *</label>
                  <input
                    value={form.river_name}
                    onChange={e => setForm({ ...form, river_name: e.target.value })}
                    placeholder="e.g. Beaverkill"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Length (inches)</label>
                  <input
                    type="number"
                    value={form.length_inches}
                    onChange={e => setForm({ ...form, length_inches: e.target.value })}
                    placeholder="e.g. 18"
                    min="1"
                    max="60"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Conditions, time of day, hatch activity..."
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827', resize: 'vertical' }}
                />
              </div>

              {/* GPS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={getGPS}
                  disabled={gpsStatus === 'loading'}
                  style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {gpsStatus === 'loading' ? 'Getting location...' : '📍 Auto-fill GPS'}
                </button>
                {gpsStatus === 'ok' && coords && (
                  <span style={{ fontSize: '0.8rem', color: '#16A34A' }}>
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                )}
                {gpsStatus === 'error' && (
                  <span style={{ fontSize: '0.8rem', color: '#DC2626' }}>Location unavailable</span>
                )}
              </div>

              {/* Photo */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Photo (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                  style={{ fontSize: '0.85rem', color: '#374151' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>
                  Requires a "catch-photos" storage bucket in Supabase with public access.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ background: '#085041', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Saving...' : 'Save catch'}
              </button>
            </form>
          </div>
        )}

        {/* Catches timeline */}
        {loadingCatches ? (
          <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '2rem' }}>Loading catches...</p>
        ) : catches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9CA3AF' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎣</div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No catches yet</p>
            <p style={{ fontSize: '0.9rem' }}>Log your first catch to start your fishing history</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {catches.map(c => (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {c.photo_url && (
                  <Image
                    src={c.photo_url}
                    alt="Catch photo"
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#085041', fontSize: '1rem' }}>{c.species}</span>
                      {c.length_inches && (
                        <span style={{ fontSize: '0.85rem', color: '#6B7280', marginLeft: '8px' }}>{c.length_inches}"</span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                      {new Date(c.caught_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '4px' }}>
                    <span style={{ color: '#6B7280' }}>on</span> {c.fly_used} <span style={{ color: '#6B7280' }}>— {c.river_name}</span>
                  </p>
                  {c.notes && <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: '1.5' }}>{c.notes}</p>}
                  {c.lat && c.lng && (
                    <p style={{ fontSize: '0.75rem', color: '#D1D5DB', marginTop: '4px' }}>
                      📍 {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                    </p>
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
