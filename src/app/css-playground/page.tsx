import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import CssPlayground from '@/features/css-playground/CssPlayground';

export const metadata = featureMetadata('/css-playground');

export default function Page() {
  return (
    <FeaturePage slug="/css-playground">
      <CssPlayground />
    </FeaturePage>
  );
}
