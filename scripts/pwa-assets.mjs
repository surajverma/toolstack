import { createHash } from 'node:crypto';

/** Opaque filenames avoid host rules that reject route names such as license.txt. */
export function offlineSnapshotUrl(version, route, type) {
  if (
    !/^[a-f0-9]{16}$/.test(version) ||
    !route.startsWith('/') ||
    !['page', 'flight'].includes(type)
  ) {
    throw new Error('Invalid offline snapshot configuration.');
  }
  const id = createHash('sha256').update(route).digest('hex').slice(0, 20);
  return `/pwa/${version}/${type}-${id}.${type === 'page' ? 'html' : 'txt'}`;
}
