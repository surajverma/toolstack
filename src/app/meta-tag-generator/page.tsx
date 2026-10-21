import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import LaunchKit from '@/features/launch-kit/LaunchKit';

export const metadata = featureMetadata('/meta-tag-generator');

export default function Page() {
  return (
    <FeaturePage slug="/meta-tag-generator">
      <LaunchKit initialTab="metadata" focused />
    </FeaturePage>
  );
}
