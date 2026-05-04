import type { Metadata } from 'next';
import StockingClient from './StockingClient';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Stocking Reports — DriftLine',
  description: 'Up-to-date trout stocking data imported weekly from state fish & wildlife agencies. Search by river, state, and species.',
};

export const revalidate = 3600; // revalidate hourly

export default async function StockingPage() {
  const { data: reports } = await supabase
    .from('stocking_reports')
    .select('*')
    .order('stocked_date', { ascending: false });

  return <StockingClient reports={reports ?? []} />;
}
