// Import NY DEC boat launch sites into Supabase
// Source: NY Open Data — Boat Launch Sites by Waterbody (icvg-v8xr)
// These are the specific GPS parking/launch points on NY rivers and lakes.
// Usage: node scripts/import-access-ny-launches.mjs

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

console.log('Fetching NY DEC boat launch sites...');

while (true) {
  const res = await fetch(
    `https://data.ny.gov/resource/icvg-v8xr.json?$limit=${LIMIT}&$offset=${offset}`,
    { signal: AbortSignal.timeout(20000) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const batch = await res.json();
  if (!batch.length) break;
  all.push(...batch);
  offset += batch.length;
  if (batch.length < LIMIT) break;
}

console.log(`Fetched ${all.length} launch sites.`);

function parkingDesc(car, trail) {
  const parts = [];
  if (car && parseInt(car) > 0)   parts.push(`${car} car spaces`);
  if (trail && parseInt(trail) > 0) parts.push(`${trail} trailer spaces`);
  return parts.length ? parts.join(', ') : null;
}

const rows = all
  .map(r => {
    const lat = parseFloat(r.point_y);
    const lng = parseFloat(r.point_x);
    if (isNaN(lat) || isNaN(lng)) return null;
    const waterbody = r.waterbody?.trim();
    if (!waterbody) return null;
    return {
      state:       'ny',
      name:        `${waterbody} Boat Launch`,
      lat,
      lng,
      water_name:  waterbody,
      county:      null,
      access_type: r.access?.trim() || 'Boat Launch',
      species:     null,
      parking:     parkingDesc(r.car, r.trail),
      fee:         null,
      ada:         null,
      notes:       r.sanitary_f === 'Yes' ? 'Sanitary facilities available' : null,
      detail_url:  null,
    };
  })
  .filter(Boolean);

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
