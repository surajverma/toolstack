'use client';

import { useEffect, useRef, useState } from 'react';
import ToolCard from './ToolCard';
import { observeToolLoading } from '@/lib/progressive-tools';
import type { Tool } from '@/types/tool';

const BATCH_SIZE = 12;

export default function ToolList({ tools, pinnedIds, onTogglePin, emptyMessage }: {
  tools: Tool[];
  pinnedIds: Set<string>;
  onTogglePin: (id: string) => void;
  emptyMessage: string;
}) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [manualOnly, setManualOnly] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const shownCount = Math.min(visibleCount, tools.length);
  const hasMore = shownCount < tools.length;

  useEffect(() => {
    if (!hasMore || manualOnly || !sentinel.current) return;
    return observeToolLoading(sentinel.current,
      () => setVisibleCount(count => Math.min(count + BATCH_SIZE, tools.length)),
      () => setManualOnly(true));
  }, [hasMore, manualOnly, tools.length, visibleCount]);

  function loadManually() {
    const nextIndex = shownCount;
    setVisibleCount(count => Math.min(count + BATCH_SIZE, tools.length));
    requestAnimationFrame(() => {
      list.current?.querySelectorAll<HTMLAnchorElement>('[data-tool-link]')[nextIndex]?.focus();
    });
  }

  if (!tools.length) return <p className='directory-empty' role='status'>{emptyMessage}</p>;

  return <>
    <div id='all-tools' ref={list} className='tool-grid' role='list' aria-label='Tools'>
      {tools.slice(0, shownCount).map(tool => <ToolCard key={tool.id} tool={tool} pinned={pinnedIds.has(tool.id)} onTogglePin={onTogglePin} />)}
    </div>
    {hasMore && <div ref={sentinel} className='directory-sentinel' aria-hidden='true' />}
    <div className='directory-progress'>
      <p role='status' aria-live='polite'>{hasMore ? `Showing ${shownCount} of ${tools.length} tools` : `${tools.length} tool${tools.length === 1 ? '' : 's'} shown`}</p>
      {hasMore && <button type='button' className={`directory-load-more ${manualOnly ? '' : 'sr-only focus:not-sr-only'}`} onClick={loadManually}>Load more</button>}
    </div>
  </>;
}
