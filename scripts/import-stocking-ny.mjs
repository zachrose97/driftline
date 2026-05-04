// One-shot script: fetch NY DEC stocking data and upsert into Supabase
// Usage: node scripts/import-stocking-ny.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const MONTH_NUM = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseDate(dateStr, year) {
  const s = dateStr.toLowerCase();
  let month = null;
  let day = 1;

  // Find first recognizable month name
  for (const [name, num] of Object.entries(MONTH_NUM)) {
    if (s.includes(name)) { month = num; break; }
  }
  if (!month) {
    // "Spring" → April, "Fall" → October
    if (s.includes('spring')) month = 4;
    else if (s.includes('fall') || s.includes('autumn')) month = 10;
    else month = 4; // fallback
  }

  // Week hints
  if (s.includes('first week')) day = 1;
  else if (s.includes('second week')) day = 8;
  else if (s.includes('third week')) day = 15;
  else if (s.includes('fourth week')) day = 22;
  else if (s.includes('early')) day = 1;
  else if (s.includes('mid')) day = 15;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const LIMIT = 2000;
let offset = 0;
const all = [];

console.log('Fetching NY DEC stocking data from data.ny.gov...');

while (true) {
  const url = `https://data.ny.gov/resource/d9y2-n436.json?$limit=${LIMIT}&$offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const batch = await res.json();
  if (!batch.length) break;
  all.push(...batch);
  offset += batch.length;
  if (batch.length < LIMIT) break;
}

console.log(`Fetched ${all.length} records.`);

const rows = all.map(r => ({
  river_name: r.waterbody?.trim() ?? 'Unknown',
  state: 'ny',
  species: r.species_name?.trim() ?? 'Unknown',
  quantity: r.number ? parseInt(r.number, 10) : null,
  stocked_date: parseDate(r.date ?? 'spring', r.year ?? '2026'),
})).filter(r => r.river_name && r.species && r.stocked_date);

console.log(`Upserting ${rows.length} rows into stocking_reports...`);

const BATCH = 500;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const { error } = await supabase
    .from('stocking_reports')
    .upsert(chunk, { onConflict: 'river_name,stocked_date,species,state', ignoreDuplicates: true });
  if (error) {
    console.error('Upsert error:', error.message);
    process.exit(1);
  }
  inserted += chunk.length;
  console.log(`  ${inserted}/${rows.length}`);
}

console.log('Done.');
