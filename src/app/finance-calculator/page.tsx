import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import FinanceCalculator from '@/features/calculations/FinanceCalculator';

export const metadata = featureMetadata('/finance-calculator');

export default function Page() {
  return (
    <FeaturePage slug="/finance-calculator">
      <FinanceCalculator />
    </FeaturePage>
  );
}
