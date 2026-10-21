'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { LayoutGrid, Star } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Wordmark from '@/components/Wordmark';
import SearchBar from '@/components/SearchBar';
import ToolList from '@/components/ToolList';
import PrivacyBadge from '@/components/PrivacyBadge';
import { CategoryIcon } from '@/components/ToolIcon';
import { usePinnedTools } from '@/lib/pinned-tools';
import { TOOLS } from '@/config/tools';
import { TOOL_CATEGORY_ORDER } from '@/config/tool-categories';
import type { ToolCategory } from '@/types/tool';

type DirectoryView = 'all' | 'pinned' | ToolCategory;
const preferred = new Map(['text-diff', 'json-toolbox', 'pdf-toolkit', 'support-sanitizer', 'image-compressor', 'data-anonymizer', 'qr-toolkit', 'markdown-editor', 'url-cleaner', 'document-privacy', 'file-hash', 'timestamp-tool'].map((id, index) => [id, index]));
const directoryTools = [...TOOLS].sort((a, b) => (preferred.get(a.id) ?? preferred.size) - (preferred.get(b.id) ?? preferred.size));

function FilterButton({ label, value, count, icon, selected, onSelect }: {
  label: string; value: DirectoryView; count: number; icon: ReactNode;
  selected: DirectoryView; onSelect: (value: DirectoryView) => void;
}) {
  return <button type='button' className='category-button' aria-label={`${label}, ${count} tools`} aria-pressed={selected === value} onClick={() => onSelect(value)}>
    {icon}<span>{label}</span><span className='category-count' aria-hidden='true'>{count}</span>
  </button>;
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<DirectoryView>('all');
  const { pinnedIds, togglePin } = usePinnedTools();
  const query = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => directoryTools.filter(tool =>
    (view === 'all' || (view === 'pinned' ? pinnedIds.has(tool.id) : tool.category === view)) &&
    (!query || [tool.name, tool.description, ...tool.tags].some(value => value.toLowerCase().includes(query)))
  ), [view, query, pinnedIds]);
  const title = query ? 'Search results' : view === 'all' ? 'All tools' : view === 'pinned' ? 'Pinned tools' : view;

  return <div className='home-page flex min-h-screen flex-col'>
    <Navbar home />
    <main id='main-content' className='flex-1'>
      <header className='home-intro'>
        <h1><Wordmark /></h1>
        <p>Privacy-first browser tools. Your data stays on your device.</p>
        <PrivacyBadge />
      </header>
      <section id='tools' className='directory-shell page-shell' aria-label='Tool directory'>
        <header className='directory-header'>
          <div className='directory-heading'><h2>{title}</h2><span>{filtered.length} tool{filtered.length === 1 ? '' : 's'}</span></div>
          <SearchBar value={searchTerm} onSearch={setSearchTerm} />
        </header>
        <aside className='directory-sidebar'>
          <nav className='category-nav' aria-label='Filter tools'>
            <FilterButton label='All tools' value='all' count={TOOLS.length} icon={<LayoutGrid size={17} strokeWidth={1.7} aria-hidden='true' />} selected={view} onSelect={setView} />
            <FilterButton label='Pinned' value='pinned' count={pinnedIds.size} icon={<Star size={17} strokeWidth={1.7} aria-hidden='true' />} selected={view} onSelect={setView} />
            <p className='category-label'>Categories</p>
            {TOOL_CATEGORY_ORDER.map(category => <FilterButton key={category} label={category} value={category} count={TOOLS.filter(tool => tool.category === category).length} icon={<CategoryIcon category={category} />} selected={view} onSelect={setView} />)}
          </nav>
        </aside>
        <div className='directory-content'>
          <ToolList key={`${view}:${query}`} tools={filtered} pinnedIds={pinnedIds} onTogglePin={togglePin} emptyMessage={view === 'pinned' && !query ? 'Star a tool to keep it here.' : 'No tools found. Try another search or category.'} />
        </div>
      </section>
    </main>
    <Footer />
  </div>;
}
