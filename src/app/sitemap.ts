import type { MetadataRoute } from 'next';
import { TOOLS } from '@/config/tools';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://toolstack.surajverma.in';
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, changeFrequency: 'weekly', priority: 1 }, ...TOOLS.map(tool => ({ url: `${SITE_URL}${tool.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 }))];
}
