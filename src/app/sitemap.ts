import type { MetadataRoute } from 'next';
import { TOOLS } from '@/config/tools';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL, changeFrequency: 'weekly', priority: 1 }, ...TOOLS.map(item => ({ url: `${SITE_URL}${item.slug}`, changeFrequency: 'monthly' as const, priority: 0.8 }))];
}
