import ToolCard from './ToolCard';
import type { Tool } from '@/types/tool';

export default function ToolList({ tools }: { tools: Tool[] }) {
  if (tools.length === 0) return null;
  return <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>{tools.map(tool => <ToolCard key={tool.id} tool={tool} />)}</div>;
}
