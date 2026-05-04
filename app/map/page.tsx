import type { Metadata } from 'next';
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

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state: rawState } = await searchParams;
  const state = VALID_STATES.includes(rawState?.toLowerCase() ?? '') ? rawState!.toLowerCase() : 'ny';

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  let rivers: RiverPoint[] = [];

  try {
    const res = await fetch(
      `https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=${state}&parameterCd=00060,00010&siteStatus=active`,
      { cache: 'no-store', signal: AbortSignal.timeout(15000) },
    );
    const data = await res.json();
    const sites = data.value.timeSeries;

    const siteMap: Record<string, RiverPoint> = {};

    sites.forEach((site: any) => {
      const id = site.sourceInfo.siteCode[0].value;
      const geo = site.sourceInfo.geoLocation?.geogLocation;

      if (!siteMap[id]) {
        siteMap[id] = {
          id,
          name: site.sourceInfo.siteName,
          lat: geo?.latitude ?? null,
          lng: geo?.longitude ?? null,
          flow: null,
          temp: null,
          updated: null,
        };
      }

      const raw = site.values[0]?.value[0]?.value;
      const value = parseFloat(raw);
      const desc = site.variable.variableDescription;
      const dateTime = site.values[0]?.value[0]?.dateTime;

      if (desc.includes('Discharge') && !isNaN(value)) siteMap[id].flow = value;
      if (desc.includes('Temperature') && !isNaN(value)) siteMap[id].temp = value;
      if (dateTime && !siteMap[id].updated) {
        siteMap[id].updated = new Date(dateTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    });

    rivers = Object.values(siteMap).filter(
      (r): r is RiverPoint => r.lat !== null && r.lng !== null && r.flow !== null,
    );
  } catch {
    // USGS unavailable — map renders with no points
  }

  return <MapClient rivers={rivers} token={token} currentState={state} />;
}
