import type { Metadata } from 'next';
import { TOOL_BY_SLUG } from '@/config/tools';
import LocalToolLayout from './LocalToolLayout';

function feature(slug: string) {
  const tool = TOOL_BY_SLUG.get(slug);
  if (!tool) throw new Error(`Unregistered tool route: ${slug}`);
  return tool;
}
export function featureMetadata(slug: string): Metadata {
  const tool = feature(slug);
  return { title: tool.name, description: tool.description };
}
export default function FeaturePage({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const tool = feature(slug);
  return (
    <LocalToolLayout title={tool.name} description={tool.description}>
      {children}
    </LocalToolLayout>
  );
}
