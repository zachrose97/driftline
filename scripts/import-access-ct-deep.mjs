// Import CT DEEP Property Access Locations (freshwater fishing sites) into Supabase
// Source: CT DEEP ArcGIS — DEEP_Property_Access_Locations, filtered to FISH_FRESH=Yes
// These are the named parking/launch/trail access points on CT DEEP managed properties.
// Usage: node scripts/import-access-ct-deep.mjs

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

const BASE = 'https://services1.arcgis.com/FjPcSmEFuDYlIdKC/arcgis/rest/services/DEEP_Property_Access_Locations/FeatureServer/0/query';
const FIELDS = 'PROPERTY,SECTN_NAME,ACCSS_NAME,ACCSS_TOWN,ACCSS_TYPE,LINK';

console.log('Fetching CT DEEP property access locations (freshwater fishing)...');

const all = [];
let offset = 0;

while (true) {
  const params = new URLSearchParams({
    where:             "FISH_FRESH <> 'No' AND STATUS = 'Open'",
    outFields:         FIELDS,
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

console.log(`Fetched ${all.length} access locations.`);

const rows = all
  .map(({ attributes: a, geometry: g }) => {
    const lat = g?.y ?? g?.latitude;
    const lng = g?.x ?? g?.longitude;
    if (!lat || !lng) return null;
    const name = a.ACCSS_NAME?.trim();
    if (!name) return null;
    return {
      state:       'ct',
      name,
      lat:         parseFloat(lat),
      lng:         parseFloat(lng),
      water_name:  a.SECTN_NAME?.trim() || a.PROPERTY?.trim() || null,
      county:      null,
      access_type: a.ACCSS_TYPE?.trim() || null,
      species:     null,
      parking:     null,
      fee:         null,
      ada:         null,
      notes:       a.PROPERTY?.trim() || null,
      detail_url:  a.LINK?.trim() || null,
    };
  })
  .filter(Boolean);

console.log(`Upserting ${rows.length} rows...`);

const { error } = await supabase
  .from('access_points')
  .upsert(rows, { onConflict: 'state,lat,lng', ignoreDuplicates: true });

if (error) { console.error('Upsert error:', error.message); process.exit(1); }

console.log('Done.');
