import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PwaActions } from '../components/PwaControls';
import type { PwaState } from '../components/PwaProvider';

function render(
  state: PwaState['status']['state'],
  options: Partial<PwaState> = {},
  online = true,
) {
  const pwa: PwaState = {
    status: { state },
    update: false,
    canInstall: false,
    retry: vi.fn(),
    install: vi.fn(),
    applyUpdate: vi.fn(),
    ...options,
  };
  return renderToStaticMarkup(createElement(PwaActions, { pwa, online }));
}

describe('quiet PWA footer', () => {
  it('offers installation only after a complete offline download and a native install offer', () => {
    expect(render('preparing', { canInstall: true })).toBe('');
    expect(render('error', { canInstall: true })).not.toContain('Install app');
    expect(render('ready', { canInstall: true })).toContain('Install app');
    expect(render('ready', { canInstall: true }, false)).toBe('');
  });

  it('renders no status message or empty container when installation is unavailable', () => {
    // The native install hook clears availability after installation or in standalone mode.
    for (const state of [
      'ready',
      'preparing',
      'development',
      'unsupported',
    ] as const) {
      expect(render(state)).toBe('');
      expect(render(state, {}, false)).toBe('');
    }
  });

  it('keeps failed downloads recoverable while connected', () => {
    expect(render('error')).toContain('Retry offline download');
    expect(render('error', {}, false)).toBe('');
  });

  it('keeps updates explicit even inside an installed app or while offline', () => {
    const html = render('ready', { update: true }, false);
    expect(html).toContain('Reload to update');
    expect(html).toContain('Save or download your work');
    expect(html).not.toContain('Install app');
  });
});
