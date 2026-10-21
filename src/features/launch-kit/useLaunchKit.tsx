'use client';

import { useMemo, useState } from 'react';
import { useHydrated } from '@/lib/use-hydrated';
import { downloadLocal } from '@/lib/local-files';
import { openLocalImage } from '@/lib/image-canvas';
import { DEFAULT_SVG_OPTIONS, prepareSvg } from '@/features/svg-toolkit/svg';
import { Field } from '@/components/workbench/Workbench';
import {
  appManifest,
  createIconPack,
  drawIcon,
  ICON_HTML,
  type IconDesign,
} from './icons';
import {
  DEFAULT_SITE,
  inspectMetadata,
  metadataOutput,
  sitemapXml,
  type SiteMetadata,
} from './metadata';
import { defaultRobots, parseRobots, testRobots } from './robots';

export type LaunchTab = 'project' | 'metadata' | 'robots' | 'icons' | 'export';
export function useLaunchKit(initialTab: LaunchTab) {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<LaunchTab>(initialTab);
  const [site, setSite] = useState<SiteMetadata>(DEFAULT_SITE);
  const [html, setHtml] = useState('');
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [robots, setRobots] = useState(defaultRobots(DEFAULT_SITE.url));
  const [testPath, setTestPath] = useState('/');
  const [agent, setAgent] = useState('Googlebot');
  const [paths, setPaths] = useState('/\n/about\n/contact');
  const [icon, setIcon] = useState<IconDesign>({
    image: null,
    text: 'TS',
    background: '#0284c7',
    foreground: '#ffffff',
    padding: 16,
    transparent: false,
  });
  const iconPreview = useMemo(() => {
    if (!hydrated) return '';
    try {
      return drawIcon(icon, 512).toDataURL('image/png');
    } catch {
      return '';
    }
  }, [icon, hydrated]);
  const [socialPreview, setSocialPreview] = useState('');
  const [format, setFormat] = useState<'html' | 'next'>('html');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [status, setStatus] = useState('');
  const metadata = useMemo(() => {
    try {
      return { value: metadataOutput(site), error: '' };
    } catch (err) {
      return { value: null, error: (err as Error).message };
    }
  }, [site]);
  const rules = useMemo(() => {
    try {
      return { value: testRobots(robots, agent, testPath), error: '' };
    } catch (err) {
      return { value: null, error: (err as Error).message };
    }
  }, [robots, agent, testPath]);
  const sitemap = useMemo(() => {
    try {
      return { value: sitemapXml(site.url, paths), error: '' };
    } catch (err) {
      return { value: '', error: (err as Error).message };
    }
  }, [site.url, paths]);
  const warnings = [
    ...(metadata.value?.warnings || []),
    ...importWarnings,
    ...(rules.value?.warnings || []),
  ];
  function update<K extends keyof SiteMetadata>(
    key: K,
    value: SiteMetadata[K],
  ) {
    setSite((current) => ({ ...current, [key]: value }));
  }
  function field(
    key: Exclude<keyof SiteMetadata, 'noindex'>,
    label: string,
    type = 'text',
  ) {
    return (
      <Field label={label}>
        <input
          className="field"
          type={type}
          value={site[key]}
          maxLength={key === 'description' ? 1000 : 2048}
          onChange={(event) => update(key, event.target.value)}
        />
      </Field>
    );
  }
  function updateIcon(update: Partial<IconDesign>) {
    const next = { ...icon, ...update };
    setIcon(next);
    try {
      drawIcon(next, 16);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function loadIcon(file: File) {
    setError('');
    setBusy(true);
    try {
      let selected = file;
      if (file.size > 15 * 1024 * 1024)
        throw new Error('Choose an image below 15 MB.');
      if (
        file.type === 'image/svg+xml' ||
        file.name.toLowerCase().endsWith('.svg')
      ) {
        const result = prepareSvg(await file.text(), {
          ...DEFAULT_SVG_OPTIONS,
          responsive: false,
        });
        selected = new File([result.svg], 'prepared.svg', {
          type: 'image/svg+xml',
        });
        if (result.changes.length)
          setStatus(
            'SVG was cleaned before drawing: ' + result.changes.join('; '),
          );
      } else if (
        ![
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/gif',
          'image/avif',
        ].includes(file.type)
      )
        throw new Error('Choose PNG, JPEG, WebP, GIF, AVIF or SVG.');
      updateIcon({ image: await openLocalImage(selected) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function previewSocial(file: File) {
    setError('');
    setBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
        throw new Error('Choose PNG, JPEG or WebP for a local social preview.');
      const image = await openLocalImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 315;
      const context = canvas.getContext('2d')!;
      const scale = Math.max(
        600 / image.naturalWidth,
        315 / image.naturalHeight,
      );
      context.drawImage(
        image,
        (600 - image.naturalWidth * scale) / 2,
        (315 - image.naturalHeight * scale) / 2,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      );
      setSocialPreview(canvas.toDataURL('image/png'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportZip(iconsOnly = false) {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (!iconsOnly && (!metadata.value || sitemap.error))
        throw new Error(
          metadata.error || sitemap.error || 'Complete the project details.',
        );
      if (!iconsOnly) parseRobots(robots);
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const files = await createIconPack(icon);
      files.forEach((blob, name) => zip.file(name, blob));
      zip.file('site.webmanifest', appManifest(site.siteName, site.theme));
      zip.file('icons.html', ICON_HTML);
      zip.file(
        'README.txt',
        'Deploy these files at your site root. For Next.js, put image files in public/.\nA manifest and icons alone do not provide offline support: your app still needs its own service worker.\nNo original uploaded image or project form data file is included.\nReview generated crawler rules before publishing. robots.txt is not access control.',
      );
      if (!iconsOnly) {
        zip.file('head.html', metadata.value!.html + '\n' + ICON_HTML);
        zip.file('next-metadata.ts', metadataOutput(site, true).next);
        zip.file('robots.txt', robots);
        zip.file('sitemap.xml', sitemap.value);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadLocal(
        blob,
        iconsOnly ? 'favicon-pack.zip' : 'website-launch-kit.zip',
        'application/zip',
      );
      setStatus(iconsOnly ? 'Icon pack downloaded.' : 'Launch kit downloaded.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function importHtml() {
    setError('');
    try {
      const imported = inspectMetadata(html);
      setImportWarnings(imported.warnings);
      setSite((current) => ({
        ...current,
        ...Object.fromEntries(
          Object.entries(imported.values).filter(([, value]) => value !== ''),
        ),
      }));
      setStatus(
        'Metadata imported locally. No external page or image was requested.',
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return {
    tab,
    setTab,
    site,
    html,
    setHtml,
    robots,
    setRobots,
    testPath,
    setTestPath,
    agent,
    setAgent,
    paths,
    setPaths,
    icon,
    iconPreview,
    socialPreview,
    format,
    setFormat,
    busy,
    error,
    setError,
    status,
    metadata,
    rules,
    sitemap,
    warnings,
    update,
    field,
    updateIcon,
    loadIcon,
    previewSocial,
    exportZip,
    importHtml,
  };
}
export type LaunchKitState = ReturnType<typeof useLaunchKit>;
