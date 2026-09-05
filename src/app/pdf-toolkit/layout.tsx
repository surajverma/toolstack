import type { Metadata } from 'next';
import ClientMountBoundary from './ClientMountBoundary';

export const metadata: Metadata = {
  title: 'PDF Toolkit',
  description: 'Compress, merge, split, reorder, extract, delete and rotate PDFs locally in your browser without uploading documents.',
};

export default function PdfToolkitLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClientMountBoundary>{children}</ClientMountBoundary>;
}
