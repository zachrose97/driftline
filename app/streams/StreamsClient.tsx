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
  if (flow > 1000) return { label: 'High', color: 'var(--red)',    bg: 'var(--red-dim)'   };
  if (flow > 200)  return { label: 'Good', color: 'var(--green)',  bg: 'var(--green-dim)' };
  if (flow > 50)   return { label: 'Fair', color: 'var(--amber)',  bg: 'var(--amber-dim)' };
  return            { label: 'Low',  color: 'var(--slate)',  bg: 'var(--slate-dim)' };
}

function celsiusToF(c: number) {
  return ((c * 9) / 5 + 32).toFixed(1);
}

function titleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

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

export default function StreamsClient({ rivers, currentState, usgsDown }: { rivers: any[]; currentState: string; usgsDown?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');

  const stateName = STATES.find(s => s.code === currentState)?.label ?? currentState.toUpperCase();

  let filtered = rivers.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  if (conditionFilter) filtered = filtered.filter(r => getCondition(r.flow).label === conditionFilter);
  if (sort === 'flow-high') filtered.sort((a, b) => b.flow - a.flow);
  if (sort === 'flow-low')  filtered.sort((a, b) => a.flow - b.flow);
  if (sort === 'name')      filtered.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Stream Conditions
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            Live USGS data · {stateName} · {rivers.length} rivers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <select value={currentState} onChange={e => router.push(`/streams?state=${e.target.value}`)} style={SELECT_STYLE}>
            {STATES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>

          <input
            type="text"
            placeholder="Search rivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...SELECT_STYLE, flex: 1, minWidth: '180px', cursor: 'text' }}
          />

          <select value={sort} onChange={e => setSort(e.target.value)} style={SELECT_STYLE}>
            <option value="">Sort by...</option>
            <option value="flow-high">Flow: High → Low</option>
            <option value="flow-low">Flow: Low → High</option>
            <option value="name">Name A–Z</option>
          </select>

          <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} style={SELECT_STYLE}>
            <option value="">All conditions</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="High">High</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {usgsDown && (
          <div style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--amber)', fontSize: '0.85rem' }}>
            USGS data is temporarily unavailable. Try refreshing in a few minutes.
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
          {filtered.length} of {rivers.length} rivers
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((river: any) => {
            const condition = getCondition(river.flow);
            return (
              <Link key={river.id} href={`/river/${currentState}-${river.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.1rem 1.25rem',
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '0.83rem', fontWeight: '600', color: 'var(--text)', lineHeight: '1.4', flex: 1, marginRight: '8px' }}>
                      {titleCase(river.name)}
                    </h2>
                    <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: condition.bg, color: condition.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {condition.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div>
                      <p style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text)', lineHeight: 1 }}>
                        {river.flow.toLocaleString()}
                        <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'var(--text-3)', marginLeft: '3px' }}>cfs</span>
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>Flow</p>
                    </div>
                    {river.temp !== null && (
                      <div>
                        <p style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text)', lineHeight: 1 }}>
                          {celsiusToF(river.temp)}
                          <span style={{ fontSize: '0.7rem', fontWeight: '400', color: 'var(--text-3)', marginLeft: '2px' }}>°F</span>
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>Temp</p>
                      </div>
                    )}
                  </div>

                  {river.updated && (
                    <p style={{ fontSize: '0.67rem', color: 'var(--text-3)', marginTop: '8px' }}>Updated {river.updated}</p>
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
