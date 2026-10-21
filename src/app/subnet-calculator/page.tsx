import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import SubnetCalculator from '@/features/calculations/SubnetCalculator';

export const metadata = featureMetadata('/subnet-calculator');

export default function Page() {
  return (
    <FeaturePage slug="/subnet-calculator">
      <SubnetCalculator />
    </FeaturePage>
  );
}
