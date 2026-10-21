import FeaturePage, { featureMetadata } from '@/components/FeaturePage';
import EncryptedNotes from '@/features/encrypted-notes/EncryptedNotes';

export const metadata = featureMetadata('/encrypted-notes');

export default function Page() {
  return (
    <FeaturePage slug="/encrypted-notes">
      <EncryptedNotes />
    </FeaturePage>
  );
}
