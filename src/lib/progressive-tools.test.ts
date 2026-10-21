import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeToolLoading } from './progressive-tools';

function environment(top = 1000, mode: 'working' | 'missing' | 'throwing' = 'working') {
  let callback: IntersectionObserverCallback | undefined;
  const position = { top };
  const disconnect = vi.fn();
  const host = Object.assign(new EventTarget(), {
    innerHeight: 800,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  if (mode !== 'missing') Object.assign(host, { IntersectionObserver: class {
    constructor(handler: IntersectionObserverCallback) {
      if (mode === 'throwing') throw new Error('Observation unavailable');
      callback = handler;
    }
    observe = vi.fn();
    disconnect = disconnect;
  } });
  const sentinel = {
    ownerDocument: { defaultView: host },
    getBoundingClientRect: () => ({ top: position.top, bottom: position.top + 1 }),
  } as unknown as HTMLElement;
  return {
    sentinel, host, position, disconnect,
    intersect: (isIntersecting: boolean) => callback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver),
  };
}

describe('progressive tool directory loading', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('loads one batch on intersection and ignores duplicate or late callbacks', () => {
    const env = environment();
    const load = vi.fn(); const fallback = vi.fn();
    observeToolLoading(env.sentinel, load, fallback);
    env.intersect(false); expect(load).not.toHaveBeenCalled();
    env.intersect(true); env.intersect(true);
    vi.advanceTimersByTime(2000);
    expect(load).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
    expect(env.disconnect).toHaveBeenCalledTimes(1);
  });

  it('offers manual loading when IntersectionObserver is unsupported', () => {
    const env = environment(1000, 'missing');
    const load = vi.fn(); const fallback = vi.fn();
    observeToolLoading(env.sentinel, load, fallback);
    vi.runAllTimers();
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
  });

  it('offers manual loading when observer construction fails', () => {
    const env = environment(1000, 'throwing');
    const load = vi.fn(); const fallback = vi.fn();
    observeToolLoading(env.sentinel, load, fallback);
    vi.runAllTimers();
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
  });

  it('reveals the fallback if the visible end never receives an intersection callback', () => {
    const env = environment(790);
    const load = vi.fn(); const fallback = vi.fn();
    observeToolLoading(env.sentinel, load, fallback);
    vi.advanceTimersByTime(1199); expect(fallback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(fallback).toHaveBeenCalledTimes(1);
    env.intersect(true);
    expect(load).not.toHaveBeenCalled();
    expect(env.disconnect).toHaveBeenCalledTimes(1);
  });

  it('waits until the end is visible before starting the stall timeout', () => {
    const env = environment(3000);
    const fallback = vi.fn();
    observeToolLoading(env.sentinel, vi.fn(), fallback);
    vi.advanceTimersByTime(5000); expect(fallback).not.toHaveBeenCalled();
    env.position.top = 780;
    env.host.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(1200);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('cancels pending work and callbacks when a filter unmounts the old list', () => {
    const env = environment(780);
    const load = vi.fn(); const fallback = vi.fn();
    const cleanup = observeToolLoading(env.sentinel, load, fallback);
    cleanup();
    env.intersect(true);
    env.host.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(2000);
    expect(load).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
