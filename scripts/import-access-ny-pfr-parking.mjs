// Import NY DEC Public Fishing Parking Areas into Supabase
// Source: NYS DEC Division of Fish and Wildlife — Public Fishing Stream Parking Areas
// Layer 2 of FeatureServer: specific GPS points for stream-side parking on PFR easements
// 147k records, 2000/page max — paginates until done
// Usage: node scripts/import-access-ny-pfr-parking.mjs

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

const BASE = 'https://services6.arcgis.com/DZHaqZm9cxOD4CWM/arcgis/rest/services/Public_Fishing_Parking_Areas/FeatureServer/2/query';

console.log('Fetching NY DEC Public Fishing Parking Areas...');

const all = [];
let offset = 0;

while (true) {
  const params = new URLSearchParams({
    where:             '1=1',
    outFields:         'WATER,COMMENTS',
    returnGeometry:    'true',
    outSR:             '4326',
    resultRecordCount: '2000',
    resultOffset:      String(offset),
    f:                 'json',
  });
  const res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`ArcGIS error: ${body.error.message}`);
  if (!body.features?.length) break;
  all.push(...body.features);
  offset += body.features.length;
  if (offset % 10000 === 0) console.log(`  Fetched ${offset} so far...`);
  if (!body.exceededTransferLimit) break;
}

console.log(`Fetched ${all.length} parking locations.`);

const rows = all
  .map(({ attributes: a, geometry: g }) => {
    const lat = g?.y;
    const lng = g?.x;
    if (!lat || !lng) return null;
    const water = a.WATER?.trim();
    if (!water) return null;
    return {
      state:       'ny',
      name:        `${water} — Public Fishing Parking`,
      lat:         parseFloat(lat),
      lng:         parseFloat(lng),
      water_name:  water,
      county:      null,
      access_type: 'Public Fishing Rights Parking',
      species:     null,
      parking:     null,
      fee:         null,
      ada:         null,
      notes:       a.COMMENTS?.trim() || null,
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
  if ((i + BATCH) % 10000 < BATCH) console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
}

console.log('Done.');
