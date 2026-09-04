import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import PwaRegistration from '@/components/PwaRegistration';
import './globals.css';
const inter = Inter({ weight: ['400','600','700','800'], subsets: ['latin'], variable: '--font-inter', display: 'swap' });
export const metadata: Metadata = { title: { default: 'ToolStack - Privacy-First Browser Tools', template: '%s | ToolStack' }, description: 'Free privacy-focused utilities that process your working data locally in the browser.', applicationName: 'ToolStack', manifest: '/manifest.webmanifest', icons: { icon: '/favicon.svg' }, openGraph: { title: 'ToolStack - Privacy-First Browser Tools', description: 'Browser tools with no file uploads, accounts, or tracking.', type: 'website' } };
export const viewport: Viewport = { themeColor: '#0284c7', colorScheme: 'light' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang='en'><body className={`${inter.variable} font-sans antialiased`}><PwaRegistration/>{children}</body></html>; }
