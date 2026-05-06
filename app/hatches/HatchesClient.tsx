'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Hatch } from '@/lib/hatches';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_COLOR: Record<string, string> = {
  mayfly:   'var(--green)',
  caddis:   'var(--amber)',
  stonefly: 'var(--red)',
  midge:    'var(--slate)',
};

const REGION_LABELS: Record<string, string> = {
  east: 'East',
  west: 'West',
  both: 'East & West',
};

const SELECT_STYLE: React.CSSProperties = {
  padding: '0.55rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  fontSize: '0.85rem',
  background: 'var(--surface)',
  color: 'var(--text)',
  cursor: 'pointer',
  outline: 'none',
};

export default function HatchesClient({ hatches }: { hatches: Hatch[] }) {
  const currentMonth = new Date().getMonth() + 1;
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<number>(currentMonth);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = hatches.filter(h => {
    if (regionFilter !== 'all') {
      if (regionFilter === 'east' && h.region === 'west') return false;
      if (regionFilter === 'west' && h.region === 'east') return false;
    }
    if (typeFilter !== 'all' && h.type !== typeFilter) return false;
    if (monthFilter && !h.months.includes(monthFilter)) return false;
    return true;
  });

  const activeCount = hatches.filter(h => h.months.includes(currentMonth)).length;
  const activeNames = hatches.filter(h => h.months.includes(currentMonth)).map(h => h.name);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Hatch Calendar
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            20 major US hatches · {activeCount} active in {MONTHS[currentMonth - 1]}
          </p>
        </div>

        {/* Active now banner */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderLeftColor: 'var(--green)', borderLeftWidth: '3px' }}>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '3px' }}>
              Active Now — {MONTHS[currentMonth - 1]}
            </p>
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
              {activeNames.slice(0, 6).join(' · ')}{activeNames.length > 6 ? ` +${activeNames.length - 6} more` : ''}
            </p>
          </div>
          <button
            onClick={() => { setMonthFilter(currentMonth); setRegionFilter('all'); setTypeFilter('all'); }}
            style={{ background: 'var(--green)', color: '#0c1410', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Show active
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <select value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))} style={SELECT_STYLE}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}{i + 1 === currentMonth ? ' (now)' : ''}</option>
            ))}
          </select>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={SELECT_STYLE}>
            <option value="all">All regions</option>
            <option value="east">Eastern US</option>
            <option value="west">Western US</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={SELECT_STYLE}>
            <option value="all">All types</option>
            <option value="mayfly">Mayflies</option>
            <option value="caddis">Caddis</option>
            <option value="stonefly">Stoneflies</option>
            <option value="midge">Midges</option>
          </select>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
          {filtered.length} hatch{filtered.length !== 1 ? 'es' : ''} for {MONTHS[monthFilter - 1]}
        </p>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '0.95rem' }}>No hatches match your filters — try adjusting month or region.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {filtered.map(hatch => {
              const isActive = hatch.months.includes(currentMonth);
              const accentColor = TYPE_COLOR[hatch.type] ?? 'var(--text-2)';
              return (
                <div
                  key={hatch.id}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isActive ? 'rgba(52,211,153,0.25)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Card image */}
                  <div style={{ position: 'relative', height: '160px', background: 'var(--surface-2)', overflow: 'hidden' }}>
                    {hatch.image && (
                      <Image
                        src={hatch.image}
                        alt={hatch.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 360px"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        unoptimized
                      />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(12,20,16,0.85) 0%, rgba(12,20,16,0.1) 60%, transparent 100%)' }} />
                    {isActive && (
                      <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--green)', color: '#0c1410', fontSize: '0.6rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Active
                      </span>
                    )}
                    <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: `${accentColor}30`, color: accentColor, backdropFilter: 'blur(8px)' }}>
                        {hatch.type.charAt(0).toUpperCase() + hatch.type.slice(1)}
                      </span>
                      <span style={{ fontSize: '0.68rem', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: 'rgba(12,20,16,0.5)', color: 'var(--text-2)', backdropFilter: 'blur(8px)' }}>
                        {REGION_LABELS[hatch.region]}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text)', margin: '0 0 2px' }}>{hatch.name}</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontStyle: 'italic', margin: '0 0 0.75rem' }}>{hatch.latinName}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: '1.65', margin: '0 0 0.75rem' }}>{hatch.description}</p>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    <span>{hatch.size}</span>
                    <span>{hatch.timeOfDay}</span>
                  </div>

                  {/* Month timeline */}
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '0.75rem' }}>
                    {MONTHS.map((m, i) => (
                      <div
                        key={m}
                        title={m}
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '2px',
                          background: hatch.months.includes(i + 1)
                            ? (i + 1 === currentMonth ? accentColor : `${accentColor}60`)
                            : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>

                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-3)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flies</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {hatch.flies.map(fly => (
                        <span key={fly} style={{ fontSize: '0.7rem', background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '20px' }}>
                          {fly}
                        </span>
                      ))}
                    </div>
                  </div>
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
