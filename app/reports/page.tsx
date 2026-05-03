import ReportsClient from './ReportsClient';
import { supabase } from '@/lib/supabase';

export default async function ReportsPage() {
  const { data: reports } = await supabase
    .from('shop_reports')
    .select('*')
    .order('created_at', { ascending: false });

  return <ReportsClient reports={reports || []} />;
}