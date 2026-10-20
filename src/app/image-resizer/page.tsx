// src/app/image-resizer/page.tsx
'use client';

import React, { useState, ChangeEvent, DragEvent, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // ADDED: Import Next.js Image component
import JSZip from 'jszip';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';

// Define the structure for each image being processed
interface ImageFileState {
  id: string;
  file: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
}

// A reusable input component for our settings
const SettingInput = ({
  label,
  type = 'number',
  value,
  onChange,
  unit = 'px',
}: {
  label: string;
  type?: string;
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
}) => (
  <div>
    <label className='block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1'>{label}</label>
    <div className='flex'>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className='block w-full p-2 border border-slate-300 dark:border-slate-700 rounded-l-md focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out'
      />
      <span className='inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 sm:text-sm'>
        {unit}
      </span>
    </div>
  </div>
);

// Component to display each uploaded image
const ImagePreviewCard = ({ image, onRemove }: { image: ImageFileState; onRemove: (id: string) => void }) => (
  <div className='relative bg-white dark:bg-slate-900 border rounded-lg shadow-sm overflow-hidden'>
    <button
      onClick={() => onRemove(image.id)}
      className='absolute top-1.5 right-1.5 z-10 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-lg font-bold hover:bg-black/75 transition-colors leading-none'
      title='Remove from list'>
      &times;
    </button>
    <div className='w-full h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center'>
      {/* FIX: Replaced <img> with next/image <Image> */}
      <Image
        src={image.previewUrl}
        alt={`Preview of ${image.file.name}`}
        width={image.originalWidth}
        height={image.originalHeight}
        className='max-h-full max-w-full object-contain'
      />
    </div>
    <div className='p-3 text-center'>
      <p className='text-xs font-semibold text-slate-700 dark:text-slate-200 truncate' title={image.file.name}>
        {image.file.name}
      </p>
      <p className='text-xs text-slate-500 dark:text-slate-400'>
        {image.originalWidth} x {image.originalHeight}px
      </p>
    </div>
  </div>
);

export default function ImageResizerPage() {
  const [images, setImages] = useState<ImageFileState[]>([]);
  const [targetWidth, setTargetWidth] = useState(800);
  const [targetHeight, setTargetHeight] = useState(600);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newImageFiles: Promise<ImageFileState>[] = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file, index) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
              resolve({
                id: `${file.name}-${file.lastModified}-${index}`,
                file,
                previewUrl: img.src,
                originalWidth: img.width,
                originalHeight: img.height,
              });
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        });
      });

    Promise.all(newImageFiles).then((results) => {
      if (images.length === 0 && results.length > 0) {
        const firstImage = results[0];
        setTargetWidth(firstImage.originalWidth);
        setTargetHeight(firstImage.originalHeight);
      }
      setImages((prev) => [...prev, ...results]);
    });
  };

  const handleWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10) || 0;
    setTargetWidth(newWidth);

    if (maintainAspectRatio && images.length > 0) {
      const refImage = images[0];
      const aspectRatio = refImage.originalHeight / refImage.originalWidth;
      setTargetHeight(Math.round(newWidth * aspectRatio));
    }
  };

  const handleHeightChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value, 10) || 0;
    setTargetHeight(newHeight);

    if (maintainAspectRatio && images.length > 0) {
      const refImage = images[0];
      const aspectRatio = refImage.originalWidth / refImage.originalHeight;
      setTargetWidth(Math.round(newHeight * aspectRatio));
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    setIsResizing(true);

    const zip = new JSZip();

    for (const image of images) {
      const finalWidth = targetWidth; // FIX: Changed 'let' to 'const'
      let finalHeight = targetHeight;

      if (maintainAspectRatio) {
        const aspectRatio = image.originalHeight / image.originalWidth;
        finalHeight = Math.round(targetWidth * aspectRatio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const img = document.createElement('img');
        img.src = image.previewUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        const mimeType = image.file.type;
        const quality = 0.92;

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));

        if (blob) {
          const nameWithoutExtension = image.file.name.replace(/\.[^/.]+$/, '');
          const extension = mimeType.split('/')[1] || 'png';
          zip.file(`${nameWithoutExtension}_resized_${finalWidth}x${finalHeight}.${extension}`, blob);
        }
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'resized_images.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    setIsResizing(false);
    setImages([]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    if (event.target) {
      event.target.value = '';
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
    handleFiles(event.dataTransfer.files);
  };

  const removeImage = (idToRemove: string) => {
    setImages((prev) => prev.filter((img) => img.id !== idToRemove));
  };

  return (
    <div className='flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950'>
      <Navbar />
      <Breadcrumbs />
      <main id='main-content' className='flex-grow page-shell px-4 py-8'>
        <header className='mb-8 text-center'>
          <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100'>Batch Image Resizer</h1>
          <p className='text-lg text-slate-600 dark:text-slate-300 mt-1'>
            Resize multiple images to a specified width and download as a zip file.
          </p>
        </header>

        <section className='bg-white dark:bg-slate-900 p-6 md:p-8 rounded-lg shadow-xl w-full min-w-0 mx-auto'>
          {images.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-4 border-dashed rounded-xl p-8 text-center transition-colors duration-200 ease-in-out
                        ${
                          isDragging
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950'
                            : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-950'
                        }
                        cursor-pointer`}>
              <input
                ref={fileInputRef}
                type='file'
                id='imageUpload'
                accept='image/*'
                onChange={handleFileChange}
                className='hidden'
                multiple
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
                  {isDragging ? 'Release to drop files' : 'Drag & drop images here, or click to select'}
                </p>
              </div>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
              {/* Controls */}
              <div className='md:col-span-1 space-y-4'>
                <h2 className='text-xl font-semibold text-slate-700 dark:text-slate-200'>Settings</h2>
                <SettingInput label='Target Width' value={targetWidth} onChange={handleWidthChange} />
                <SettingInput label='Target Height' value={targetHeight} onChange={handleHeightChange} />
                <div className='flex items-center'>
                  <input
                    id='aspect-ratio'
                    name='aspect-ratio'
                    type='checkbox'
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                    className='h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-sky-600 dark:text-sky-400 focus:ring-sky-500'
                  />
                  <label htmlFor='aspect-ratio' className='ml-2 block text-sm text-gray-900 dark:text-slate-100'>
                    Maintain aspect ratio
                  </label>
                </div>
                <div className='pt-4 border-t'>
                  <button
                    onClick={handleDownloadAll}
                    disabled={isResizing || images.length === 0}
                    className='w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors disabled:bg-sky-300 dark:disabled:bg-sky-900'>
                    {isResizing ? 'Resizing...' : `Resize & Download ${images.length} Images`}
                  </button>
                  <button
                    onClick={() => setImages([])}
                    disabled={isResizing}
                    className='w-full text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 mt-3'>
                    Clear All
                  </button>
                </div>
              </div>

              {/* Image Preview Grid */}
              <div className='md:col-span-3'>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                  {images.map((image) => (
                    <ImagePreviewCard key={image.id} image={image} onRemove={removeImage} />
                  ))}
                </div>
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
