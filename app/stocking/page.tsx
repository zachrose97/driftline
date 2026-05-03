import StockingClient from './StockingClient';
import { supabase } from '@/lib/supabase';

export const revalidate = 3600; // revalidate hourly

export default async function StockingPage() {
  const { data: reports } = await supabase
    .from('stocking_reports')
    .select('*')
    .order('stocked_date', { ascending: false });

  return <StockingClient reports={reports ?? []} />;
}
