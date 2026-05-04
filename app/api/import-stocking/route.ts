import { createClient } from '@supabase/supabase-js';

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
  if (!month) {
    if (s.includes('spring')) month = 4;
    else if (s.includes('fall') || s.includes('autumn')) month = 10;
    else month = 4;
  }

  if (s.includes('first week')) day = 1;
  else if (s.includes('second week')) day = 8;
  else if (s.includes('third week')) day = 15;
  else if (s.includes('fourth week')) day = 22;
  else if (s.includes('early')) day = 1;
  else if (s.includes('mid')) day = 15;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

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

  try {
    // Fetch all records from NY Open Data (Socrata API)
    const LIMIT = 2000;
    let offset = 0;
    const all: any[] = [];

    while (true) {
      const url = `https://data.ny.gov/resource/d9y2-n436.json?$limit=${LIMIT}&$offset=${offset}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        return Response.json({ error: `Socrata fetch failed: ${res.status}` }, { status: 502 });
      }
      const batch = await res.json();
      if (!batch.length) break;
      all.push(...batch);
      offset += batch.length;
      if (batch.length < LIMIT) break;
    }

    const records = all.map((r: any) => ({
      river_name: r.waterbody?.trim() ?? 'Unknown',
      state: 'ny',
      species: r.species_name?.trim() ?? 'Unknown',
      quantity: r.number ? parseInt(r.number, 10) : null,
      stocked_date: parseDateStr(r.date ?? 'spring', r.year ?? String(new Date().getFullYear())),
    })).filter((r: any) => r.river_name !== 'Unknown' && r.species !== 'Unknown');

    if (records.length === 0) {
      return Response.json({ error: 'No parseable records' }, { status: 502 });
    }

    const BATCH = 500;
    let imported = 0;
    for (let i = 0; i < records.length; i += BATCH) {
      const { error } = await supabase
        .from('stocking_reports')
        .upsert(records.slice(i, i + BATCH), { onConflict: 'river_name,stocked_date,species,state', ignoreDuplicates: true });
      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
      imported += Math.min(BATCH, records.length - i);
    }

    return Response.json({ fetched: all.length, imported });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
