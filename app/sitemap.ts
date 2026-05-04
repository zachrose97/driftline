import type { MetadataRoute } from 'next';

const BASE_URL = 'https://driftline.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/streams`, lastModified: new Date(), changeFrequency: 'always', priority: 0.9 },
    { url: `${BASE_URL}/hatches`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/reports`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/stocking`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/map`, lastModified: new Date(), changeFrequency: 'always', priority: 0.7 },
    { url: `${BASE_URL}/apply-shop`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ];
}
