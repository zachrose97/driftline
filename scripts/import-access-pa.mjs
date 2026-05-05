// One-shot script: import PA PFBC shore-fishing access points into Supabase
// Source: PFBC Access MapServer — shore fishing sites only
// Usage: node scripts/import-access-pa.mjs

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

const BASE = 'https://fbweb.pa.gov/arcgis/rest/services/PFBC_Map_Services/Access/MapServer/0/query';
const FIELDS = 'ACC_NAME,WATERBODY,COUNTY,PARKING,FEE,SHORE_FISH,ACCESSABLE,HP_FullDesc,Parking_FullDesc,Ftr_Page,Long_,Lat';

const ADA_MAP = { '0': null, '1': 'Not Accessible', '2': 'Accessible' };

console.log('Fetching PA shore fishing access points...');

const all = [];
let offset = 0;

while (true) {
  const params = new URLSearchParams({
    where:             "SHORE_FISH='Y'",
    outFields:         FIELDS,
    returnGeometry:    'false',
    resultRecordCount: '1000',
    resultOffset:      String(offset),
    f:                 'json',
  });
  const res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.features?.length) break;
  all.push(...body.features);
  offset += body.features.length;
  if (!body.exceededTransferLimit) break;
}

console.log(`Fetched ${all.length} shore fishing sites.`);

const rows = all
  .map(({ attributes: a }) => {
    const lat = parseFloat(a.Lat);
    const lng = parseFloat(a.Long_);
    if (isNaN(lat) || isNaN(lng)) return null;
    const name = a.ACC_NAME?.trim();
    if (!name) return null;
    return {
      state:       'pa',
      name,
      lat,
      lng,
      water_name:  a.WATERBODY?.trim() || null,
      county:      a.COUNTY?.trim() || null,
      access_type: 'Shore Fishing',
      species:     null,
      parking:     a.Parking_FullDesc?.trim() || null,
      fee:         a.FEE?.trim() || null,
      ada:         ADA_MAP[String(a.ACCESSABLE)] ?? null,
      notes:       a.HP_FullDesc?.trim() || null,
      detail_url:  a.Ftr_Page?.trim() || null,
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
