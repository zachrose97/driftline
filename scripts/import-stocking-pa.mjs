// One-shot script: fetch PA Fish & Boat Commission stocking data and upsert into Supabase
// Usage: node scripts/import-stocking-pa.mjs

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

const SPECIES_FIELDS = [
  { field: 'TotalBrownStocked',   name: 'Brown Trout' },
  { field: 'TotalRainbowStocked', name: 'Rainbow Trout' },
  { field: 'TotalBrookStocked',   name: 'Brook Trout' },
  { field: 'TotalGoldenStocked',  name: 'Golden Trout' },
];

const BASE_URL = 'https://fbweb.pa.gov/arcgis/rest/services/PFBC_Map_Services/TroutStockedSections_2026/MapServer/0/query';
const FIELDS = ['WtrName', 'StockingYear', ...SPECIES_FIELDS.map(s => s.field)].join(',');

console.log('Fetching PA stocking data from PFBC ArcGIS API...');

const all = [];
let offset = 0;
const LIMIT = 1000;

while (true) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: FIELDS,
    returnGeometry: 'false',
    resultRecordCount: LIMIT,
    resultOffset: offset,
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

console.log(`Fetched ${all.length} sections.`);

// Aggregate quantities per river+species (multiple sections can share a name)
const agg = new Map(); // key: "river|species|year"
for (const { attributes: a } of all) {
  const river = a.WtrName?.trim();
  const year = a.StockingYear ?? 2026;
  if (!river) continue;

  for (const { field, name } of SPECIES_FIELDS) {
    const qty = a[field];
    if (!qty || qty <= 0) continue;
    const key = `${river}|${name}|${year}`;
    agg.set(key, (agg.get(key) ?? 0) + qty);
  }
}

const rows = Array.from(agg.entries()).map(([key, qty]) => {
  const [river, species, year] = key.split('|');
  return {
    river_name:   river,
    state:        'pa',
    species,
    quantity:     qty,
    stocked_date: `${year}-04-01`,
  };
});

console.log(`Upserting ${rows.length} rows into stocking_reports...`);

const BATCH = 500;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const { error } = await supabase
    .from('stocking_reports')
    .upsert(rows.slice(i, i + BATCH), { onConflict: 'river_name,stocked_date,species,state', ignoreDuplicates: true });
  if (error) {
    console.error('Upsert error:', error.message);
    process.exit(1);
  }
  inserted += Math.min(BATCH, rows.length - i);
  console.log(`  ${inserted}/${rows.length}`);
}

console.log('Done.');
