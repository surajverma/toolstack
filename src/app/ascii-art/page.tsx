import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import AsciiArt from '@/features/ascii-art/AsciiArt';

export const metadata = featureMetadata('/ascii-art');

export default function Page() {
  return (
    <FeaturePage slug="/ascii-art">
      <AsciiArt />
    </FeaturePage>
  );
}
