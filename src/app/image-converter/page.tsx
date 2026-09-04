'use client';

import { useEffect, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

type Format = 'image/png' | 'image/jpeg' | 'image/webp';

export default function ImageConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [format, setFormat] = useState<Format>('image/webp');
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (selectedFile: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const convert = async () => {
    if (!file) return;
    setBusy(true);

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(bitmap, 0, 0);
      bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, format, format === 'image/png' ? undefined : quality)
      );
      if (!blob) throw new Error('This browser could not encode the selected format.');

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const extension = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.[^.]+$/, '')}.${extension}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LocalToolLayout
      title='Image Format Converter'
      description='Convert browser-supported image files to PNG, JPEG or WebP without uploading them.'
    >
      <section className='mx-auto max-w-3xl rounded-xl bg-white p-6 shadow'>
        <input
          type='file'
          accept='image/*'
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (selectedFile) choose(selectedFile);
          }}
          className='w-full rounded border p-3'
        />

        {preview && (
          // A blob URL is already local browser data; Next Image optimization would add no value here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt='Selected preview'
            className='mx-auto mt-5 max-h-80 max-w-full rounded border object-contain'
          />
        )}

        <div className='mt-5 grid gap-4 sm:grid-cols-2'>
          <label>
            Output format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as Format)}
              className='mt-1 w-full rounded border p-2'
            >
              <option value='image/webp'>WebP</option>
              <option value='image/jpeg'>JPEG</option>
              <option value='image/png'>PNG</option>
            </select>
          </label>
          <label className={format === 'image/png' ? 'opacity-50' : ''}>
            Quality: {Math.round(quality * 100)}%
            <input
              disabled={format === 'image/png'}
              type='range'
              min='0.1'
              max='1'
              step='0.05'
              value={quality}
              onChange={(event) => setQuality(+event.target.value)}
              className='w-full'
            />
          </label>
        </div>

        <button
          disabled={!file || busy}
          onClick={convert}
          className='mt-5 rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50'
        >
          {busy ? 'Converting...' : 'Convert & download'}
        </button>
      </section>
    </LocalToolLayout>
  );
}
