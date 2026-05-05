import type { Metadata } from 'next';
import { Suspense } from 'react';
import MapClient from './MapClient';

export type RiverPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  flow: number | null;
  temp: number | null;
  updated: string | null;
};

export type AccessPoint = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  water_name: string | null;
  county: string | null;
  access_type: string | null;
  species: string | null;
  parking: string | null;
  fee: string | null;
  ada: string | null;
  notes: string | null;
  detail_url: string | null;
};

const VALID_STATES = ['ny','pa','vt','me','nh','ma','ct','va','wv','nc','co','mt','id','wy','wa','or','ca'];

const STATE_NAMES: Record<string, string> = {
  ny:'New York', pa:'Pennsylvania', vt:'Vermont', me:'Maine', nh:'New Hampshire',
  ma:'Massachusetts', ct:'Connecticut', va:'Virginia', wv:'West Virginia', nc:'North Carolina',
  co:'Colorado', mt:'Montana', id:'Idaho', wy:'Wyoming', wa:'Washington', or:'Oregon', ca:'California',
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}): Promise<Metadata> {
  const { state: rawState } = await searchParams;
  const state = VALID_STATES.includes(rawState?.toLowerCase() ?? '') ? rawState!.toLowerCase() : 'ny';
  const stateName = STATE_NAMES[state] ?? 'New York';
  return {
    title: `${stateName} River Map — DriftLine`,
    description: `Interactive map of USGS stream gauge stations in ${stateName} with live flow data, color-coded by fishing condition.`,
  };
}

export default function MapPage() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
  return (
    <Suspense fallback={
      <div style={{ height: 'calc(100vh - 56px)', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Loading map...</p>
      </div>
    }>
      <MapClient token={token} />
    </Suspense>
  );
}
