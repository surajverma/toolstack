import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import BashGenerator from '@/features/bash-generator/BashGenerator';

export const metadata = featureMetadata('/bash-generator');

export default function Page() {
  return (
    <FeaturePage slug="/bash-generator">
      <BashGenerator />
    </FeaturePage>
  );
}
