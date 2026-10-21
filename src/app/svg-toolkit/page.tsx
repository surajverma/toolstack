import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import SvgToolkit from '@/features/svg-toolkit/SvgToolkit';

export const metadata = featureMetadata('/svg-toolkit');

export default function Page() {
  return (
    <FeaturePage slug="/svg-toolkit">
      <SvgToolkit />
    </FeaturePage>
  );
}
