import jsQR from 'jsqr';
self.onmessage = event => {
  try {
    const { pixels,width,height } = event.data;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 2560000 || pixels.length !== width * height * 4) throw new Error('Image dimensions are unsupported.');
    const result = jsQR(new Uint8ClampedArray(pixels),width,height,{ inversionAttempts: 'attemptBoth' });
    if (!result) throw new Error('No readable QR code found. Try a sharper, tightly cropped image.');
    self.postMessage({ text: result.data });
  } catch (error) { self.postMessage({ error: (error as Error).message }); }
};
