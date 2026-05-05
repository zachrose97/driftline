// One-shot script: import CT DEEP fishing stocking site locations into Supabase
// Source: CT Fisheries Stocking Sites ArcGIS Feature Service (active sites only)
// Each stop is a distinct public fishing access point on a stocked stream.
// Usage: node scripts/import-access-ct.mjs

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

const BASE = 'https://services1.arcgis.com/FjPcSmEFuDYlIdKC/arcgis/rest/services/CT_Fisheries_Stocking_Sites/FeatureServer/0/query';

console.log('Fetching CT DEEP stocking site access points...');

const all = [];
let offset = 0;

while (true) {
  const params = new URLSearchParams({
    where:             "active='Y'",
    outFields:         'route_name,stop_numb,Notes',
    returnGeometry:    'true',
    outSR:             '4326',
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

console.log(`Fetched ${all.length} active stocking sites.`);

const rows = all
  .map(({ attributes: a, geometry: g }) => {
    const lat = g?.y ?? g?.latitude;
    const lng = g?.x ?? g?.longitude;
    if (!lat || !lng) return null;
    const route = a.route_name?.trim();
    if (!route) return null;
    const stopNum = a.stop_numb ?? '';
    return {
      state:       'ct',
      name:        stopNum ? `${route} — Stop ${stopNum}` : route,
      lat:         parseFloat(lat),
      lng:         parseFloat(lng),
      water_name:  route,
      county:      null,
      access_type: 'Stocking Site',
      species:     'Trout (Mixed)',
      parking:     null,
      fee:         null,
      ada:         null,
      notes:       a.Notes?.trim() || null,
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
