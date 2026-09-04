export function parsePageSelection(input: string, totalPages: number) {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new Error('The PDF has no pages.');
  const value = input.trim();
  if (!value) return Array.from({ length: totalPages }, (_, index) => index);
  const pages: number[] = [];
  for (const rawPart of value.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]); const end = Number(range[2]);
      if (start < 1 || start > totalPages || end < 1 || end > totalPages) throw new Error(`Page range ${part} is outside 1-${totalPages}.`);
      const step = start <= end ? 1 : -1;
      for (let page = start; page !== end + step; page += step) pages.push(page - 1);
      continue;
    }
    if (!/^\d+$/.test(part)) throw new Error(`Invalid page token: ${part}`);
    const page = Number(part);
    if (page < 1 || page > totalPages) throw new Error(`Page ${page} is outside 1-${totalPages}.`);
    pages.push(page - 1);
  }
  if (!pages.length) throw new Error('Select at least one page.');
  return pages;
}
