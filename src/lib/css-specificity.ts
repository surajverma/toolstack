import selectorParser from 'postcss-selector-parser';

export type Specificity = [number, number, number];
export interface SpecificityResult {
  selector: string;
  specificity: Specificity;
}

type AstNode = {
  type: string;
  value?: string;
  nodes?: AstNode[];
  toString?: () => string;
};

const add = (a: Specificity, b: Specificity): Specificity => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const compare = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const max = (values: Specificity[]) => values.reduce((best, value) => compare(value, best) > 0 ? value : best, [0, 0, 0] as Specificity);

function selectorSpecificity(node: AstNode): Specificity {
  return (node.nodes ?? []).reduce<Specificity>((score, child) => add(score, nodeSpecificity(child)), [0, 0, 0]);
}

function functionalPseudoMax(node: AstNode): Specificity {
  const selectors = (node.nodes ?? []).filter((child) => child.type === 'selector');
  return max(selectors.map(selectorSpecificity));
}

function nodeSpecificity(node: AstNode): Specificity {
  switch (node.type) {
    case 'id': return [1, 0, 0];
    case 'class':
    case 'attribute': return [0, 1, 0];
    case 'tag': return [0, 0, 1];
    case 'pseudo': {
      const value = (node.value ?? '').toLowerCase();
      if (value.startsWith('::')) return [0, 0, 1];
      if (value === ':where') return [0, 0, 0];
      if (value === ':is' || value === ':not' || value === ':has') return functionalPseudoMax(node);
      if (value === ':host' || value === ':host-context') return add([0, 1, 0], functionalPseudoMax(node));
      if (value === ':nth-child' || value === ':nth-last-child') return add([0, 1, 0], functionalPseudoMax(node));
      return [0, 1, 0];
    }
    default: return [0, 0, 0];
  }
}

export function calculateSpecificity(selector: string): SpecificityResult[] {
  const root = selectorParser().astSync(selector, { lossless: false }) as unknown as AstNode;
  const selectors = (root.nodes ?? []).filter((node) => node.type === 'selector');
  return selectors.map((node) => ({
    selector: node.toString?.() ?? selector,
    specificity: selectorSpecificity(node),
  }));
}

export function specificityLabel([a, b, c]: Specificity) {
  return `${a}-${b}-${c}`;
}
