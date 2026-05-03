import { createClient } from '@supabase/supabase-js';

// Called by Vercel cron weekly — requires CRON_SECRET env var for security
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // needs service role key to bypass RLS
  );

  try {
    // NY DEC stocking schedule CSV
    // URL may change seasonally — verify at https://www.dec.ny.gov/outdoor/fishing.html
    const csvUrl = 'https://www.dec.ny.gov/docs/fish_marine_pdf/troutstock.csv';
    const res = await fetch(csvUrl, {
      headers: { 'User-Agent': 'DriftLine/1.0 (fly fishing app)' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return Response.json({ error: `DEC fetch failed: ${res.status}` }, { status: 502 });
    }

    const text = await res.text();
    const lines = text.trim().split('\n');

    if (lines.length < 2) {
      return Response.json({ error: 'CSV appears empty' }, { status: 502 });
    }

    // Parse header row to find column indices
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const col = (name: string) => headers.findIndex(h => h.includes(name));

    const riverCol    = col('water') !== -1 ? col('water') : col('river');
    const speciesCol  = col('species');
    const quantityCol = col('quantity') !== -1 ? col('quantity') : col('number');
    const dateCol     = col('date');
    const countyCol   = col('county');

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      if (cells.length < 3) continue;

      const riverName = riverCol >= 0 ? cells[riverCol] : '';
      const species   = speciesCol >= 0 ? normalizeSpecies(cells[speciesCol]) : '';
      const quantity  = quantityCol >= 0 ? parseInt(cells[quantityCol].replace(/,/g, ''), 10) : null;
      const rawDate   = dateCol >= 0 ? cells[dateCol] : '';
      const stockedDate = parseDate(rawDate);

      if (!riverName || !species || !stockedDate) continue;

      records.push({
        river_name:   riverName,
        state:        'NY',
        species,
        quantity:     isNaN(quantity as number) ? null : quantity,
        stocked_date: stockedDate,
      });
    }

    if (records.length === 0) {
      return Response.json({ error: 'No parseable records in CSV' }, { status: 502 });
    }

    // Upsert — use river_name + stocked_date + species as natural key
    const { error } = await supabase
      .from('stocking_reports')
      .upsert(records, { onConflict: 'river_name,stocked_date,species,state' });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ imported: records.length });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}

function normalizeSpecies(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('brown')) return 'Brown Trout';
  if (s.includes('rainbow') || s.includes('rbt')) return 'Rainbow Trout';
  if (s.includes('brook') || s.includes('brk')) return 'Brook Trout';
  if (s.includes('lake') || s.includes('lkt')) return 'Lake Trout';
  if (s.includes('tiger')) return 'Tiger Trout';
  if (s.includes('cutthroat')) return 'Cutthroat Trout';
  return raw.trim();
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Try MM/DD/YYYY or MM/DD/YY
  const parts = raw.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    const date = new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  const date = new Date(raw);
  if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  return null;
}
