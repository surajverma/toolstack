import { TOOL_CATEGORY_ORDER } from '@/config/tool-categories';
export type ToolCategory = typeof TOOL_CATEGORY_ORDER[number];

export interface Tool {
  id: string;
  name: string;
  description: string;
  slug: string;
  category: ToolCategory;
  tags: string[];
  processing: 'local';
  networkRequired: false;
  storesData: false;
  icon?: string;
  featured?: boolean;
  new?: boolean;
}
