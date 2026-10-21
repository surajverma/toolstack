export async function openLocalImage(file: File) {
  if (file.size > 15 * 1024 * 1024)
    throw new Error('Choose an image below 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 30_000_000
    )
      throw new Error('Images must be below 30 million pixels.');
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png') {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not encode the image.')),
      type,
    ),
  );
}

export function makeCanvas(width: number, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  return { canvas, context };
}
