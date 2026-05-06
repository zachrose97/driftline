'use client';

import { useState } from 'react';

type StockingReport = {
  id: string;
  river_name: string;
  state: string;
  species: string;
  quantity: number | null;
  stocked_date: string;
  created_at: string;
};

const SPECIES_COLOR: Record<string, string> = {
  'Brown Trout':     'var(--amber)',
  'Rainbow Trout':   '#60a5fa',
  'Brook Trout':     'var(--green)',
  'Cutthroat Trout': '#a78bfa',
  'Lake Trout':      '#38bdf8',
  'Tiger Trout':     'var(--orange)',
};

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000);
  if (diff < 0) {
    const ahead = Math.abs(diff);
    if (ahead === 1) return 'Tomorrow';
    if (ahead < 7) return `In ${ahead} days`;
    return `Scheduled ${new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function StockingClient({ reports }: { reports: StockingReport[] }) {
  const [stateFilter, setStateFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [search, setSearch] = useState('');

  const states  = [...new Set(reports.map(r => r.state))].sort();
  const species = [...new Set(reports.map(r => r.species))].sort();

  const filtered = reports.filter(r => {
    if (stateFilter   && r.state   !== stateFilter)   return false;
    if (speciesFilter && r.species !== speciesFilter) return false;
    if (search && !r.river_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const recentCount = reports.filter(r =>
    Math.floor((Date.now() - new Date(r.stocked_date + 'T12:00:00').getTime()) / 86400000) <= 7
  ).length;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Stocking Reports
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
            {reports.length.toLocaleString()} records · {recentCount} stocked in the last 7 days
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search rivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...SELECT_STYLE, flex: 1, minWidth: '180px', cursor: 'text' }}
          />
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={SELECT_STYLE}>
            <option value="">All states</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)} style={SELECT_STYLE}>
            <option value="">All species</option>
            {species.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
          {filtered.length} of {reports.length} records
        </p>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-3)' }}>
            {reports.length === 0 ? (
              <p style={{ fontSize: '0.95rem' }}>Stocking data imported weekly from state fish & wildlife agencies.</p>
            ) : (
              <p style={{ fontSize: '0.95rem' }}>No records match your filters.</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map(r => {
              const diff = Math.floor((Date.now() - new Date(r.stocked_date + 'T12:00:00').getTime()) / 86400000);
              const isRecent = diff >= 0 && diff <= 3;
              const accentColor = SPECIES_COLOR[r.species] ?? 'var(--text-2)';
              return (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${isRecent ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '0.9rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '180px' }}>
                    {isRecent && (
                      <span style={{ fontSize: '0.62rem', fontWeight: '800', background: 'var(--green-dim)', color: 'var(--green)', padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                        New
                      </span>
                    )}
                    <div>
                      <p style={{ fontWeight: '600', color: 'var(--text)', fontSize: '0.9rem' }}>{r.river_name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{r.state.toUpperCase()}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: accentColor }}>
                      {r.species}
                    </span>
                    {r.quantity && (
                      <span style={{ fontSize: '0.83rem', color: 'var(--text-2)', fontWeight: '500' }}>
                        {r.quantity.toLocaleString()} fish
                      </span>
                    )}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {daysAgo(r.stocked_date)}
                    </span>
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
