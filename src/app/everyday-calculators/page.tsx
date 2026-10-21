import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import EverydayCalculators from '@/features/calculations/EverydayCalculators';

export const metadata = featureMetadata('/everyday-calculators');

export default function Page() {
  return (
    <FeaturePage slug="/everyday-calculators">
      <EverydayCalculators />
    </FeaturePage>
  );
}
