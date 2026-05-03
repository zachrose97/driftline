'use client';

import { useState } from 'react';
import type { Hatch } from './page';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  mayfly:   { bg: '#DCFCE7', color: '#166534' },
  caddis:   { bg: '#FEF3C7', color: '#92400E' },
  stonefly: { bg: '#FEE2E2', color: '#991B1B' },
  midge:    { bg: '#F3F4F6', color: '#374151' },
};

const REGION_LABELS: Record<string, string> = {
  east: 'East',
  west: 'West',
  both: 'East & West',
};

export default function HatchesClient({ hatches }: { hatches: Hatch[] }) {
  const currentMonth = new Date().getMonth() + 1;
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<number>(currentMonth);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  let filtered = hatches.filter(h => {
    if (regionFilter !== 'all') {
      if (regionFilter === 'east' && h.region === 'west') return false;
      if (regionFilter === 'west' && h.region === 'east') return false;
    }
    if (typeFilter !== 'all' && h.type !== typeFilter) return false;
    if (showActiveOnly && !h.months.includes(monthFilter)) return false;
    if (!showActiveOnly && monthFilter && !h.months.includes(monthFilter)) return false;
    return true;
  });

  const activeCount = hatches.filter(h => h.months.includes(currentMonth)).length;

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '4px' }}>
            Hatch Calendar
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
            20 major US hatches · {activeCount} active this month ({MONTHS[currentMonth - 1]})
          </p>
        </div>

        {/* Active now banner */}
        <div style={{
          background: '#085041',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div>
            <p style={{ color: '#9FE1CB', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
              Active Now — {MONTHS[currentMonth - 1]}
            </p>
            <p style={{ color: '#ffffff', fontSize: '0.9rem' }}>
              {hatches.filter(h => h.months.includes(currentMonth)).map(h => h.name).join(' · ')}
            </p>
          </div>
          <button
            onClick={() => {
              setMonthFilter(currentMonth);
              setRegionFilter('all');
              setTypeFilter('all');
            }}
            style={{
              background: '#D97706',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Show active hatches
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(Number(e.target.value))}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', color: '#111827', cursor: 'pointer' }}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}{i + 1 === currentMonth ? ' (now)' : ''}
              </option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', color: '#111827', cursor: 'pointer' }}
          >
            <option value="all">All regions</option>
            <option value="east">Eastern US</option>
            <option value="west">Western US</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', color: '#111827', cursor: 'pointer' }}
          >
            <option value="all">All types</option>
            <option value="mayfly">Mayflies</option>
            <option value="caddis">Caddis</option>
            <option value="stonefly">Stoneflies</option>
            <option value="midge">Midges</option>
          </select>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '1rem' }}>
          Showing {filtered.length} hatch{filtered.length !== 1 ? 'es' : ''} for {MONTHS[monthFilter - 1]}
        </p>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9CA3AF' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No hatches match your filters</p>
            <p style={{ fontSize: '0.9rem' }}>Try adjusting the month or region</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filtered.map(hatch => {
              const isActiveNow = hatch.months.includes(currentMonth);
              const typeStyle = TYPE_COLORS[hatch.type];
              return (
                <div
                  key={hatch.id}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${isActiveNow ? '#6EE7B7' : '#E5E7EB'}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    position: 'relative',
                  }}
                >
                  {isActiveNow && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#DCFCE7',
                      color: '#166534',
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      padding: '2px 7px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Active Now
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', paddingRight: isActiveNow ? '80px' : '0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: typeStyle.bg, color: typeStyle.color }}>
                      {hatch.type.charAt(0).toUpperCase() + hatch.type.slice(1)}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: '#EFF6FF', color: '#1D4ED8' }}>
                      {REGION_LABELS[hatch.region]}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>{hatch.name}</h2>
                  <p style={{ fontSize: '0.78rem', color: '#9CA3AF', fontStyle: 'italic', marginBottom: '0.75rem' }}>{hatch.latinName}</p>

                  <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.6', marginBottom: '0.75rem' }}>{hatch.description}</p>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#6B7280' }}>
                    <span>📏 {hatch.size}</span>
                    <span>🕐 {hatch.timeOfDay}</span>
                  </div>

                  {/* Month dots */}
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '0.75rem' }}>
                    {MONTHS.map((m, i) => (
                      <div
                        key={m}
                        title={m}
                        style={{
                          width: '18px',
                          height: '6px',
                          borderRadius: '3px',
                          background: hatch.months.includes(i + 1)
                            ? (i + 1 === currentMonth ? '#D97706' : '#085041')
                            : '#E5E7EB',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>

                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Recommended flies:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {hatch.flies.map(fly => (
                        <span key={fly} style={{ fontSize: '0.72rem', background: '#F3F4F6', color: '#374151', padding: '2px 7px', borderRadius: '20px' }}>
                          {fly}
                        </span>
                      ))}
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
