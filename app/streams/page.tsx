import StreamsClient from './StreamsClient';

const VALID_STATES = ['ny','pa','vt','me','nh','ma','ct','va','wv','nc','co','mt','id','wy','wa','or','ca'];

export default async function StreamsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state: rawState } = await searchParams;
  const state = VALID_STATES.includes(rawState?.toLowerCase() ?? '') ? rawState!.toLowerCase() : 'ny';

  const res = await fetch(
    `https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=${state}&parameterCd=00060,00010&siteStatus=active`,
    { cache: 'no-store' }
  );
  const data = await res.json();
  const sites = data.value.timeSeries;

  const siteMap: Record<string, any> = {};
  sites.forEach((site: any) => {
    const id = site.sourceInfo.siteCode[0].value;
    if (!siteMap[id]) {
      siteMap[id] = { id, name: site.sourceInfo.siteName, flow: null, temp: null, updated: null };
    }
    const value = parseFloat(site.values[0]?.value[0]?.value);
    const desc = site.variable.variableDescription;
    const dateTime = site.values[0]?.value[0]?.dateTime;
    if (desc.includes('Discharge')) siteMap[id].flow = value;
    if (desc.includes('Temperature')) siteMap[id].temp = value;
    if (dateTime) siteMap[id].updated = new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const rivers = Object.values(siteMap).filter((r: any) => r.flow !== null);

  return <StreamsClient rivers={rivers} currentState={state} />;
}
