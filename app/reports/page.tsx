import type { Metadata } from 'next';
import ReportsClient from './ReportsClient';
import { supabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Guide & Shop Reports — DriftLine',
  description: 'Daily fly fishing conditions reports posted by verified local fly shops and guides. What\'s hatching, what\'s working, where to fish.',
};

export default async function ReportsPage() {
  const { data: reports } = await supabase
    .from('shop_reports')
    .select('*')
    .order('created_at', { ascending: false });

  return <ReportsClient reports={reports || []} />;
}