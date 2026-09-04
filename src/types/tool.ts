export type ToolCategory =
  | 'Privacy & Security'
  | 'PDF & Documents'
  | 'Images'
  | 'Text & Data'
  | 'Developer'
  | 'Accessibility'
  | 'Converters'
  | 'Generators';

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
