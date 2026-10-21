import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import CalculationNotebook from '@/features/calculations/CalculationNotebook';

export const metadata = featureMetadata('/calculation-notebook');

export default function Page() {
  return (
    <FeaturePage slug="/calculation-notebook">
      <CalculationNotebook />
    </FeaturePage>
  );
}
