// src/app/image-metadata/page.tsx
'use client';

import React, { useState, ChangeEvent, DragEvent, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EXIF from 'exif-js';
import piexif from 'piexifjs';
import JSZip from 'jszip';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

interface Metadata {
  [key: string]: unknown;
}

interface ProcessedImage {
  id: string;
  name: string;
  type: string;
  src: string;
  metadata: Metadata | null;
  hasMetadata: boolean;
  width: number;
  height: number;
}

// Component to display a card for each processed image
const ImageResultCard = ({
  image,
  onRemove,
  onDownloadSingle,
}: {
  image: ProcessedImage;
  onRemove: (id: string) => void;
  onDownloadSingle: (image: ProcessedImage) => void;
}) => {
  return (
    <div className='relative bg-white dark:bg-slate-900 border rounded-lg shadow-sm overflow-hidden flex flex-col'>
      {/* Remove from list button */}
      <button
        onClick={() => onRemove(image.id)}
        className='absolute top-1.5 right-1.5 z-10 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-lg font-bold hover:bg-black/75 transition-colors leading-none'
        title='Remove from list'>
        &times;
      </button>

      <Image
        src={image.src}
        alt={`Preview of ${image.name}`}
        width={image.width}
        height={image.height}
        className='w-full h-40 object-cover bg-slate-100 dark:bg-slate-800'
      />
      <div className='p-4 flex flex-col flex-grow'>
        <p className='text-sm font-semibold text-slate-800 dark:text-slate-100 truncate' title={image.name}>
          {image.name}
        </p>
        <p className={`text-xs mt-1 ${image.hasMetadata ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
          {image.hasMetadata ? 'Contains Metadata' : 'No Metadata Found'}
        </p>

        <div className='flex-grow mt-2'>
          {image.hasMetadata && (
            <details className='text-xs'>
              <summary className='cursor-pointer text-blue-600 dark:text-blue-400 hover:underline'>View Metadata</summary>
              <pre className='mt-2 p-2 bg-slate-50 dark:bg-slate-950 rounded-md max-h-48 overflow-auto text-slate-700 dark:text-slate-200 font-mono'>
                <code>{JSON.stringify(image.metadata, null, 2)}</code>
              </pre>
            </details>
          )}
        </div>

        <button
          onClick={() => onDownloadSingle(image)}
          disabled={!image.hasMetadata}
          className='mt-4 w-full px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed'>
          Download Scrubbed
        </button>
      </div>
    </div>
  );
};

export default function ImageMetadataPage() {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setProcessedImages([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = (files: FileList) => {
    setError(null);
    const newImagesPromises: Promise<ProcessedImage>[] = [];

    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/jpeg')) {
        return;
      }

      const promise = new Promise<ProcessedImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          const img = document.createElement('img');
          img.onload = () => {
            // @ts-expect-error - The type definitions for exif-js are incorrect for this function call.
            // The type definitions for exif-js are incorrect for this function call.
            EXIF.getData(img, function (this: HTMLImageElement) {
              const allTags = EXIF.getAllTags(this);
              const hasMetadata = allTags && Object.keys(allTags).length > 0;

              resolve({
                id: `${file.name}-${file.lastModified}-${index}`,
                name: file.name,
                type: file.type,
                src,
                metadata: allTags,
                hasMetadata,
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            });
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      });
      newImagesPromises.push(promise);
    });

    Promise.all(newImagesPromises).then((newImages) => {
      setProcessedImages((prev) => [...prev, ...newImages]);
    });
  };

  const handleDownloadSingle = (image: ProcessedImage) => {
    if (!image.hasMetadata) return;

    const scrubbedDataUrl = piexif.remove(image.src);
    const link = document.createElement('a');
    link.href = scrubbedDataUrl;

    const nameWithoutExtension = image.name.replace(/\.[^/.]+$/, '');
    const extension = image.type.split('/')[1] || 'jpg';
    link.download = `${nameWithoutExtension}_scrubbed.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    if (processedImages.length === 0) return;

    const zip = new JSZip();
    let scrubbedCount = 0;

    processedImages.forEach((image) => {
      if (image.hasMetadata) {
        const scrubbedDataUrl = piexif.remove(image.src);
        const base64Data = scrubbedDataUrl.split(',')[1];
        const nameWithoutExtension = image.name.replace(/\.[^/.]+$/, '');
        const extension = image.type.split('/')[1] || 'jpg';

        zip.file(`${nameWithoutExtension}_scrubbed.${extension}`, base64Data, { base64: true });
        scrubbedCount++;
      }
    });

    if (scrubbedCount > 0) {
      zip.generateAsync({ type: 'blob' }).then((content) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'scrubbed_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        resetState(); // Reset after download
      });
    } else {
      setError('No images had metadata to remove.');
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFiles(event.dataTransfer.files);
    }
  };

  const removeImage = (idToRemove: string) => {
    setProcessedImages((prev) => prev.filter((img) => img.id !== idToRemove));
  };

  const imagesWithMetadataCount = processedImages.filter((img) => img.hasMetadata).length;

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>Image Metadata Remover</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>Scrub metadata from multiple images at once.</p>
        </header>

        <section className='bg-white dark:bg-slate-900 p-6 md:p-8 rounded-lg shadow-xl w-full min-w-0 mx-auto'>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-6 border-4 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ease-in-out
                ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-950'}
                 cursor-pointer`}>
            <input
              ref={fileInputRef}
              type='file'
              id='imageUpload'
              accept='image/jpeg'
              onChange={handleFileChange}
              className='hidden'
              multiple // Enable multiple file selection
            />
            <div className='flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 pointer-events-none'>
              <svg
                className='w-16 h-16 mb-4 text-slate-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                xmlns='http://www.w3.org/2000/svg'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='1.5'
                  d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'></path>
              </svg>
              <p className='text-lg font-semibold'>
                {isDragging ? 'Release to drop files' : 'Drag & drop JPEG images here, or click to select'}
              </p>
              <p className='text-sm'>All processing is done in your browser.</p>
            </div>
          </div>

          {error && <div className='my-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-md'>{error}</div>}

          {processedImages.length > 0 && (
            <div>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                {processedImages.map((image) => (
                  <ImageResultCard
                    key={image.id}
                    image={image}
                    onRemove={removeImage}
                    onDownloadSingle={handleDownloadSingle}
                  />
                ))}
              </div>
              <div className='text-center mt-8'>
                <button
                  onClick={handleDownloadAll}
                  disabled={imagesWithMetadataCount === 0}
                  className='px-8 py-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors duration-150 ease-in-out disabled:bg-red-300 dark:disabled:bg-red-900 disabled:cursor-not-allowed'>
                  Download All Scrubbed Images ({imagesWithMetadataCount})
                </button>
                {imagesWithMetadataCount === 0 && (
                  <p className='text-sm text-slate-500 dark:text-slate-400 mt-2'>No images with removable metadata selected.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <div className='mt-12 text-center'>
          <Link href='/' className='text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 hover:underline'>
            &larr; Back to All Tools
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
