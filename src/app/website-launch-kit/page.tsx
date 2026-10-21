import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import LaunchKit from '@/features/launch-kit/LaunchKit';

export const metadata = featureMetadata('/website-launch-kit');

export default function Page() {
  return (
    <FeaturePage slug="/website-launch-kit">
      <LaunchKit />
    </FeaturePage>
  );
}
