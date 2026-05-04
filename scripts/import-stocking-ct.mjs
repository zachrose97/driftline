// One-shot script: fetch CT DEEP stocking data and upsert into Supabase
// Usage: node scripts/import-stocking-ct.mjs
//
// Source: CT DEEP ArcGIS Feature Service backing the official stocking map
// Species not available per-site from this API, so imported as "Trout (Mixed)"

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

const BASE_URL = 'https://services1.arcgis.com/FjPcSmEFuDYlIdKC/arcgis/rest/services/Connecticut_Stocked_Streams/FeatureServer/0/query';
const FIELDS = 'STOCKING_TABLE_NAME,STOCKING_TABLE_STOCKDATE,STOCKING_TABLE_ACTIVE_SITE';

console.log('Fetching CT DEEP stocking data...');

const all = [];
let offset = 0;

while (true) {
  const params = new URLSearchParams({
    where: "STOCKING_TABLE_ACTIVE_SITE='Y'",
    outFields: FIELDS,
    returnGeometry: 'false',
    resultRecordCount: '1000',
    resultOffset: String(offset),
    f: 'json',
  });
  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.features?.length) break;
  all.push(...body.features);
  offset += body.features.length;
  if (!body.exceededTransferLimit) break;
}

console.log(`Fetched ${all.length} active stocking sites.`);

const rows = all
  .map(({ attributes: a }) => {
    const name = a.STOCKING_TABLE_NAME?.trim();
    if (!name) return null;
    const epochMs = a.STOCKING_TABLE_STOCKDATE;
    if (!epochMs || epochMs <= 0) return null;
    const date = new Date(epochMs).toISOString().split('T')[0];
    return {
      river_name:   name,
      state:        'ct',
      species:      'Trout (Mixed)',
      quantity:     null,
      stocked_date: date,
    };
  })
  .filter(Boolean);

console.log(`Upserting ${rows.length} rows...`);

const { error } = await supabase
  .from('stocking_reports')
  .upsert(rows, { onConflict: 'river_name,stocked_date,species,state', ignoreDuplicates: true });

if (error) {
  console.error('Upsert error:', error.message);
  process.exit(1);
}

console.log('Done.');
