// One-shot script: import NY DEC recommended fishing access points into Supabase
// Source: NY Open Data — Recommended Fishing Rivers and Streams (tjny-fki3)
// Usage: node scripts/import-access-ny.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const LIMIT = 1000;
let offset = 0;
const all = [];

console.log('Fetching NY fishing access points...');

while (true) {
  const res = await fetch(
    `https://data.ny.gov/resource/tjny-fki3.json?$limit=${LIMIT}&$offset=${offset}`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const batch = await res.json();
  if (!batch.length) break;
  all.push(...batch);
  offset += batch.length;
  if (batch.length < LIMIT) break;
}

console.log(`Fetched ${all.length} records.`);

const rows = all
  .map(r => {
    const lat = parseFloat(r.point_y);
    const lng = parseFloat(r.point_x);
    if (isNaN(lat) || isNaN(lng)) return null;
    return {
      state:       'ny',
      name:        r.name?.trim() ?? '',
      lat,
      lng,
      water_name:  r.name?.trim() ?? null,
      county:      r.county?.trim() ?? null,
      access_type: r.public_acc?.trim() || 'Public Fishing Rights',
      species:     r.fish_spec?.trim() ?? null,
      parking:     null,
      fee:         null,
      ada:         null,
      notes:       r.access_own?.trim() || null,
      detail_url:  null,
    };
  })
  .filter(r => r && r.name);

console.log(`Upserting ${rows.length} rows...`);

const BATCH = 500;
for (let i = 0; i < rows.length; i += BATCH) {
  const { error } = await supabase
    .from('access_points')
    .upsert(rows.slice(i, i + BATCH), { onConflict: 'state,lat,lng', ignoreDuplicates: true });
  if (error) { console.error('Upsert error:', error.message); process.exit(1); }
  console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}

console.log('Done.');
