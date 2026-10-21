import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import LaunchKit from '@/features/launch-kit/LaunchKit';

export const metadata = featureMetadata('/robots-txt-generator');

export default function Page() {
  return (
    <FeaturePage slug="/robots-txt-generator">
      <LaunchKit initialTab="robots" focused />
    </FeaturePage>
  );
}
