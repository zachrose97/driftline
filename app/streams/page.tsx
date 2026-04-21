export default async function StreamsPage() {
  const res = await fetch(
    'https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=ny&parameterCd=00060,00010&siteStatus=active',
    { cache: 'no-store' }
  );
  const data = await res.json();
  const sites = data.value.timeSeries;

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Stream Conditions — New York</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Live data from USGS · {sites.length} active gauges
      </p>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {sites.map((site: any) => (
          <div key={site.name} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '4px' }}>
              {site.sourceInfo.siteName}
            </h2>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>
              {site.variable.variableDescription}: {site.values[0]?.value[0]?.value ?? 'N/A'} {site.variable.unit.unitCode}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}