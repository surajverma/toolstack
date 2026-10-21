import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'ToolStack', short_name: 'ToolStack', lang: 'en',
    description: 'Privacy-first browser tools. Your data stays on your device, online or offline.',
    start_url: '/', scope: '/', display: 'standalone',
    background_color: '#0b1220', theme_color: '#0284c7', categories: ['utilities', 'productivity', 'developer'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Text & File Diff', url: '/text-diff' },
      { name: 'PDF Toolkit', url: '/pdf-toolkit' },
      { name: 'JSON Toolbox', url: '/json-toolbox' },
    ],
  };
}
