import Link from 'next/link';
import { Star } from 'lucide-react';
import ToolIcon from './ToolIcon';
import type { Tool } from '@/types/tool';

export default function ToolCard({ tool, pinned, onTogglePin }: { tool: Tool; pinned: boolean; onTogglePin: (id: string) => void }) {
  const titleId = `tool-title-${tool.id}`;
  return <article role='listitem' className='tool-card' data-tool-id={tool.id}>
    <Link href={tool.slug} className='tool-card-link' aria-labelledby={titleId} data-tool-link>
      <span className='tool-card-icon'><ToolIcon id={tool.id} /></span>
      <h3 id={titleId}>{tool.name}</h3>
      <p>{tool.description}</p>
    </Link>
    <button type='button' className='tool-pin' aria-label={`${pinned ? 'Unpin' : 'Pin'} ${tool.name}`} aria-pressed={pinned} title={`${pinned ? 'Unpin' : 'Pin'} ${tool.name}`} onClick={() => onTogglePin(tool.id)}>
      <Star size={17} strokeWidth={1.7} aria-hidden='true' />
    </button>
  </article>;
}
