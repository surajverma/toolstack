import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import LaunchKit from '@/features/launch-kit/LaunchKit';

export const metadata = featureMetadata('/favicon-generator');

export default function Page() {
  return (
    <FeaturePage slug="/favicon-generator">
      <LaunchKit initialTab="icons" focused />
    </FeaturePage>
  );
}
