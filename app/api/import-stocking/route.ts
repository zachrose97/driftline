import { createClient } from '@supabase/supabase-js';

// Called by Vercel cron weekly — requires CRON_SECRET env var for security
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const results: Record<string, number> = {};
  const errors: string[] = [];

  // ── NY: NY Open Data Socrata API ───────────────────────────────────────────
  try {
    const nyRecords = await fetchNY();
    await upsert(supabase, nyRecords);
    results.ny = nyRecords.length;
  } catch (e: any) {
    errors.push(`ny: ${e.message}`);
  }

  // ── PA: PFBC ArcGIS API + per-waterway stocking dates ────────────────────
  try {
    const paRecords = await fetchPA();
    const year = new Date().getFullYear();
    // Delete existing PA records for this year first — dates may have changed
    await supabase.from('stocking_reports').delete()
      .eq('state', 'pa')
      .gte('stocked_date', `${year}-01-01`)
      .lte('stocked_date', `${year}-12-31`);
    await upsert(supabase, paRecords);
    results.pa = paRecords.length;
  } catch (e: any) {
    errors.push(`pa: ${e.message}`);
  }

  // ── CT: CT DEEP ArcGIS Feature Service — overwrites to pick up daily date changes
  try {
    const ctRecords = await fetchCT();
    await upsert(supabase, ctRecords, true);
    results.ct = ctRecords.length;
  } catch (e: any) {
    errors.push(`ct: ${e.message}`);
  }

  return Response.json({ results, errors: errors.length ? errors : undefined });
}

async function upsert(supabase: any, records: any[], overwrite = false) {
  const BATCH = 500;
  for (let i = 0; i < records.length; i += BATCH) {
    const { error } = await supabase
      .from('stocking_reports')
      .upsert(records.slice(i, i + BATCH), { onConflict: 'river_name,stocked_date,species,state', ignoreDuplicates: !overwrite });
    if (error) throw new Error(error.message);
  }
}

// ── NY helpers ────────────────────────────────────────────────────────────────

const MONTH_NUM: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseDateStr(dateStr: string, year: string): string {
  const s = dateStr.toLowerCase();
  let month: number | null = null;
  let day = 1;
  for (const [name, num] of Object.entries(MONTH_NUM)) {
    if (s.includes(name)) { month = num; break; }
  }
  if (!month) month = s.includes('fall') || s.includes('autumn') ? 10 : 4;
  if (s.includes('first week')) day = 1;
  else if (s.includes('second week')) day = 8;
  else if (s.includes('third week')) day = 15;
  else if (s.includes('fourth week')) day = 22;
  else if (s.includes('early')) day = 1;
  else if (s.includes('mid')) day = 15;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function fetchNY() {
  const LIMIT = 2000;
  let offset = 0;
  const all: any[] = [];
  while (true) {
    const res = await fetch(`https://data.ny.gov/resource/d9y2-n436.json?$limit=${LIMIT}&$offset=${offset}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Socrata HTTP ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    all.push(...batch);
    offset += batch.length;
    if (batch.length < LIMIT) break;
  }
  return all
    .map((r: any) => ({
      river_name:   r.waterbody?.trim() ?? '',
      state:        'ny',
      species:      r.species_name?.trim() ?? '',
      quantity:     r.number ? parseInt(r.number, 10) : null,
      stocked_date: parseDateStr(r.date ?? 'spring', r.year ?? String(new Date().getFullYear())),
    }))
    .filter((r: any) => r.river_name && r.species);
}

// ── PA helpers ────────────────────────────────────────────────────────────────

const PA_SPECIES = [
  { field: 'TotalBrownStocked',   name: 'Brown Trout' },
  { field: 'TotalRainbowStocked', name: 'Rainbow Trout' },
  { field: 'TotalBrookStocked',   name: 'Brook Trout' },
  { field: 'TotalGoldenStocked',  name: 'Golden Trout' },
];

async function fetchPA() {
  const year = new Date().getFullYear();
  const fields = ['WtrName', 'StockingYear', 'RFP_WaterID', ...PA_SPECIES.map(s => s.field)].join(',');
  const base = `https://fbweb.pa.gov/arcgis/rest/services/PFBC_Map_Services/TroutStockedSections_${year}/MapServer/0/query`;

  const all: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({ where: '1=1', outFields: fields, returnGeometry: 'false', resultRecordCount: '1000', resultOffset: String(offset), f: 'json' });
    const res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`ArcGIS HTTP ${res.status}`);
    const body = await res.json();
    if (!body.features?.length) break;
    all.push(...body.features);
    offset += body.features.length;
    if (!body.exceededTransferLimit) break;
  }

  // Aggregate quantities by (rfpId, species)
  const agg = new Map<string, { river: string; qty: number }>();
  for (const { attributes: a } of all) {
    const river = a.WtrName?.trim();
    const rfpId: number = a.RFP_WaterID;
    if (!river || !rfpId) continue;
    for (const { field, name } of PA_SPECIES) {
      const qty: number = a[field] ?? 0;
      if (qty <= 0) continue;
      const key = `${rfpId}|${name}`;
      const cur = agg.get(key);
      agg.set(key, { river, qty: (cur?.qty ?? 0) + qty });
    }
  }

  // Fetch actual stocking dates from PFBC waterway pages
  const rfpIds = [...new Set(Array.from(agg.keys()).map(k => Number(k.split('|')[0])))];
  const dateMap = await fetchPADates(rfpIds, year);

  return Array.from(agg.entries()).map(([key, { river, qty }]) => {
    const [rfpId, species] = key.split('|');
    const date = dateMap.get(Number(rfpId)) ?? `${year}-04-01`;
    return { river_name: river, state: 'pa', species, quantity: qty, stocked_date: date };
  });
}

async function fetchPADates(rfpIds: number[], year: number): Promise<Map<number, string>> {
  const dateMap = new Map<number, string>();
  const today = new Date();
  const CONCURRENCY = 15;

  for (let i = 0; i < rfpIds.length; i += CONCURRENCY) {
    const batch = rfpIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const res = await fetch(
          `https://fbweb.pa.gov/stocking/TroutStocking_ATW_GIS_RFP.aspx?RFP_WaterID=${id}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return null;
        const html = await res.text();
        return pickPADate(html, year, today);
      })
    );
    results.forEach((r, j) => {
      if (r.status === 'fulfilled' && r.value) dateMap.set(batch[j], r.value);
    });
  }
  return dateMap;
}

function pickPADate(html: string, year: number, today: Date): string | null {
  const pattern = /\b(\d{2})\/(\d{2})\/(\d{2})\b/g;
  const dates: Date[] = [];
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const fullYear = 2000 + Number(m[3]);
    if (fullYear === year) dates.push(new Date(fullYear, Number(m[1]) - 1, Number(m[2])));
  }
  if (!dates.length) return null;
  dates.sort((a, b) => a.getTime() - b.getTime());
  const upcoming = dates.filter(d => d >= today);
  const chosen = upcoming.length ? upcoming[0] : dates[dates.length - 1];
  return chosen.toISOString().split('T')[0];
}

// ── CT helpers ────────────────────────────────────────────────────────────────

async function fetchCT() {
  const base = 'https://services1.arcgis.com/FjPcSmEFuDYlIdKC/arcgis/rest/services/Connecticut_Stocked_Streams/FeatureServer/0/query';
  const fields = 'STOCKING_TABLE_NAME,STOCKING_TABLE_STOCKDATE,STOCKING_TABLE_ACTIVE_SITE';

  const all: any[] = [];
  let offset = 0;
  while (true) {
    const params = new URLSearchParams({ where: "STOCKING_TABLE_ACTIVE_SITE='Y'", outFields: fields, returnGeometry: 'false', resultRecordCount: '1000', resultOffset: String(offset), f: 'json' });
    const res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`CT ArcGIS HTTP ${res.status}`);
    const body = await res.json();
    if (!body.features?.length) break;
    all.push(...body.features);
    offset += body.features.length;
    if (!body.exceededTransferLimit) break;
  }

  return all
    .map(({ attributes: a }: any) => {
      const name = a.STOCKING_TABLE_NAME?.trim();
      if (!name || !a.STOCKING_TABLE_STOCKDATE) return null;
      const date = new Date(a.STOCKING_TABLE_STOCKDATE).toISOString().split('T')[0];
      return { river_name: name, state: 'ct', species: 'Trout (Mixed)', quantity: null as number | null, stocked_date: date };
    })
    .filter(Boolean);
}
