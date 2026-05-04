import type { Metadata } from 'next';
import HatchesClient from './HatchesClient';
import { HATCHES } from '@/lib/hatches';

export const metadata: Metadata = {
  title: 'Hatch Calendar — DriftLine',
  description: '20 major US fly fishing hatches with emergence timing, fly pattern recommendations, and region filters for East and West coast rivers.',
};

export default function HatchesPage() {
  return <HatchesClient hatches={HATCHES} />;
}
