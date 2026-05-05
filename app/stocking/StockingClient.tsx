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

const SPECIES_COLORS: Record<string, { bg: string; color: string }> = {
  'Brown Trout':     { bg: '#FEF3C7', color: '#92400E' },
  'Rainbow Trout':   { bg: '#DBEAFE', color: '#1E40AF' },
  'Brook Trout':     { bg: '#DCFCE7', color: '#166534' },
  'Cutthroat Trout': { bg: '#F3E8FF', color: '#6B21A8' },
  'Lake Trout':      { bg: '#E0F2FE', color: '#075985' },
  'Tiger Trout':     { bg: '#FEE2E2', color: '#991B1B' },
};

function getSpeciesStyle(species: string) {
  return SPECIES_COLORS[species] ?? { bg: '#F3F4F6', color: '#374151' };
}

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

export default function StockingClient({ reports }: { reports: StockingReport[] }) {
  const [stateFilter, setStateFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [search, setSearch] = useState('');

  const states = [...new Set(reports.map(r => r.state))].sort();
  const species = [...new Set(reports.map(r => r.species))].sort();

  const filtered = reports.filter(r => {
    if (stateFilter && r.state !== stateFilter) return false;
    if (speciesFilter && r.species !== speciesFilter) return false;
    if (search && !r.river_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const recentCount = reports.filter(r => {
    const diff = Math.floor((Date.now() - new Date(r.stocked_date).getTime()) / 86400000);
    return diff <= 7;
  }).length;

  return (
    <main style={{ minHeight: '100vh', background: '#f8faf9', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#085041', marginBottom: '4px' }}>
            Stocking Reports
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
            {reports.length} stocking records · {recentCount} in the last 7 days
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search rivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '180px', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', color: '#111827' }}
          />
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', color: '#111827', cursor: 'pointer' }}
          >
            <option value="">All states</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={speciesFilter}
            onChange={e => setSpeciesFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem', background: '#fff', color: '#111827', cursor: 'pointer' }}
          >
            <option value="">All species</option>
            {species.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#9CA3AF', marginBottom: '1rem' }}>
          Showing {filtered.length} of {reports.length} stocking records
        </p>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9CA3AF' }}>
            {reports.length === 0 ? (
              <>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No stocking data yet</p>
                <p style={{ fontSize: '0.9rem' }}>
                  Stocking data is imported weekly from state fish & wildlife agencies.
                </p>
              </>
            ) : (
              <p style={{ fontSize: '1rem' }}>No records match your filters</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filtered.map(r => {
              const style = getSpeciesStyle(r.species);
              const diff = Math.floor((Date.now() - new Date(r.stocked_date).getTime()) / 86400000);
              const isRecent = diff <= 3;
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#fff',
                    border: `1px solid ${isRecent ? '#6EE7B7' : '#E5E7EB'}`,
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '200px' }}>
                    {isRecent && (
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', background: '#DCFCE7', color: '#166534', padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase', flexShrink: 0 }}>
                        New
                      </span>
                    )}
                    <div>
                      <p style={{ fontWeight: '600', color: '#111827', fontSize: '0.95rem', marginBottom: '2px' }}>{r.river_name}</p>
                      <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{r.state}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: style.bg, color: style.color }}>
                      {r.species}
                    </span>
                    {r.quantity && (
                      <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: '500' }}>
                        {r.quantity.toLocaleString()} fish
                      </span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
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
