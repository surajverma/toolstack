export type RedactionBox = { x: number; y: number; width: number; height: number };

export function clampBox(box: RedactionBox, width: number, height: number): RedactionBox {
  const x = Math.max(0, Math.min(width, Math.floor(Math.min(box.x, box.x + box.width))));
  const y = Math.max(0, Math.min(height, Math.floor(Math.min(box.y, box.y + box.height))));
  const right = Math.max(x, Math.min(width, Math.ceil(Math.max(box.x, box.x + box.width))));
  const bottom = Math.max(y, Math.min(height, Math.ceil(Math.max(box.y, box.y + box.height))));
  return { x, y, width: right - x, height: bottom - y };
}

export function paintRedactions(context: CanvasRenderingContext2D, boxes: RedactionBox[]) {
  context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; context.fillStyle = '#000000';
  for (const box of boxes) context.fillRect(box.x, box.y, box.width, box.height);
}
