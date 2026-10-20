export function downloadLocal(data: BlobPart, name: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function checkFileBatch(files: File[], maxFileMB = 5, maxTotalMB = 20, maxFiles = 10) {
  if (!files.length) throw new Error('Choose at least one file.');
  if (files.length > maxFiles) throw new Error(`Choose up to ${maxFiles} files at a time.`);
  if (files.some(file => file.size > maxFileMB * 1024 * 1024)) throw new Error(`Each file must be ${maxFileMB} MB or smaller.`);
  if (files.reduce((sum, file) => sum + file.size, 0) > maxTotalMB * 1024 * 1024) throw new Error(`The whole batch must be ${maxTotalMB} MB or smaller.`);
}
