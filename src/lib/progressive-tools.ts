/** Observe one batch, with a manual fallback if observation is unavailable or stalls. */
export function observeToolLoading(sentinel: HTMLElement, onLoadMore: () => void, onFallback: () => void) {
  const host = sentinel.ownerDocument.defaultView;
  if (!host) return () => undefined;
  let observer: IntersectionObserver | undefined;
  let timer: number | undefined;
  let stopped = false;

  const cleanup = () => {
    stopped = true;
    if (timer !== undefined) host.clearTimeout(timer);
    observer?.disconnect();
    host.removeEventListener('scroll', checkProgress);
    host.removeEventListener('resize', checkProgress);
  };
  const fallBack = () => {
    if (stopped) return;
    cleanup();
    onFallback();
  };
  function checkProgress() {
    if (stopped || !host) return;
    if (timer !== undefined) host.clearTimeout(timer);
    timer = undefined;
    const bounds = sentinel.getBoundingClientRect();
    if (bounds.top <= host.innerHeight + 40 && bounds.bottom >= 0) {
      timer = host.setTimeout(fallBack, 1200);
    }
  }

  try {
    if (typeof host.IntersectionObserver !== 'function') {
      timer = host.setTimeout(fallBack, 0);
      return cleanup;
    }
    observer = new host.IntersectionObserver(entries => {
      if (stopped || !entries.some(entry => entry.isIntersecting)) return;
      cleanup();
      onLoadMore();
    }, { rootMargin: '240px 0px' });
    observer.observe(sentinel);
    host.addEventListener('scroll', checkProgress, { passive: true });
    host.addEventListener('resize', checkProgress);
    checkProgress();
  } catch {
    observer?.disconnect();
    timer = host.setTimeout(fallBack, 0);
  }
  return cleanup;
}
