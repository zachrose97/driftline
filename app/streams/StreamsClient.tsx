'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATES: { code: string; label: string }[] = [
  { code: 'ny', label: 'New York' },
  { code: 'pa', label: 'Pennsylvania' },
  { code: 'vt', label: 'Vermont' },
  { code: 'me', label: 'Maine' },
  { code: 'nh', label: 'New Hampshire' },
  { code: 'ma', label: 'Massachusetts' },
  { code: 'ct', label: 'Connecticut' },
  { code: 'va', label: 'Virginia' },
  { code: 'wv', label: 'West Virginia' },
  { code: 'nc', label: 'North Carolina' },
  { code: 'co', label: 'Colorado' },
  { code: 'mt', label: 'Montana' },
  { code: 'id', label: 'Idaho' },
  { code: 'wy', label: 'Wyoming' },
  { code: 'wa', label: 'Washington' },
  { code: 'or', label: 'Oregon' },
  { code: 'ca', label: 'California' },
];

function getCondition(flow: number) {
  if (flow > 1000) return { label: 'High', color: '#DC2626', bg: '#FEE2E2' };
  if (flow > 200) return { label: 'Good', color: '#16A34A', bg: '#DCFCE7' };
  if (flow > 50) return { label: 'Fair', color: '#D97706', bg: '#FEF3C7' };
  return { label: 'Low', color: '#9CA3AF', bg: '#F3F4F6' };
}

function celsiusToF(c: number) {
  return ((c * 9) / 5 + 32).toFixed(1);
}

function titleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function StreamsClient({ rivers, currentState, usgsDown }: { rivers: any[]; currentState: string; usgsDown?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  const stateName = STATES.find(s => s.code === currentState)?.label ?? currentState.toUpperCase();

  let filtered = rivers.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (conditionFilter) {
    filtered = filtered.filter(r => getCondition(r.flow).label === conditionFilter);
  }

  if (sort === 'flow-high') filtered.sort((a, b) => b.flow - a.flow);
  if (sort === 'flow-low') filtered.sort((a, b) => a.flow - b.flow);
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '4px' }}>
            Stream Conditions
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
            Live USGS data · {stateName} · {rivers.length} rivers with flow data
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <select
            value={currentState}
            onChange={e => router.push(`/streams?state=${e.target.value}`)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', cursor: 'pointer', color: '#111827', fontWeight: '500' }}
          >
            {STATES.map(s => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search rivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', outline: 'none', color: '#111827' }}
          />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', cursor: 'pointer', color: '#111827' }}
          >
            <option value="">Sort by...</option>
            <option value="flow-high">Flow: High to Low</option>
            <option value="flow-low">Flow: Low to High</option>
            <option value="name">Name A–Z</option>
          </select>
          <select
            value={conditionFilter}
            onChange={e => setConditionFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', cursor: 'pointer', color: '#111827' }}
          >
            <option value="">All conditions</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="High">High</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {usgsDown && (
          <div style={{ background: '#FEF3C7', border: '1px solid #D97706', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#92400E', fontSize: '0.875rem' }}>
            USGS data is temporarily unavailable. Try refreshing in a few minutes.
          </div>
        )}

        <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '1rem' }}>
          Showing {filtered.length} of {rivers.length} rivers
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filtered.map((river: any) => {
            const condition = getCondition(river.flow);
            return (
              <Link key={river.id} href={`/river/${currentState}-${river.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '0.88rem', fontWeight: '600', color: '#111827', lineHeight: '1.4', flex: 1, marginRight: '8px' }}>
                    {titleCase(river.name)}
                  </h2>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: condition.bg, color: condition.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {condition.label}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem', display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#085041' }}>
                      {river.flow.toLocaleString()}
                      <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#9CA3AF', marginLeft: '3px' }}>ft³/s</span>
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Flow</p>
                  </div>
                  {river.temp !== null && (
                    <div>
                      <p style={{ fontSize: '1.4rem', fontWeight: '700', color: '#085041' }}>
                        {celsiusToF(river.temp)}
                        <span style={{ fontSize: '0.75rem', fontWeight: '400', color: '#9CA3AF', marginLeft: '3px' }}>°F</span>
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Water temp</p>
                    </div>
                  )}
                </div>

                {river.updated && (
                  <p style={{ fontSize: '0.7rem', color: '#D1D5DB', marginTop: '8px' }}>Updated {river.updated}</p>
                )}
              </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
