import HatchesClient from './HatchesClient';
import { HATCHES } from '@/lib/hatches';

export default function HatchesPage() {
  return <HatchesClient hatches={HATCHES} />;
}
