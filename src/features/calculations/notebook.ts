import Decimal from 'decimal.js';

export const D = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});
type Dimensions = Record<string, number>;
export type Quantity = { amount: Decimal; dimensions: Dimensions };
type Unit = { scale: string; dimension: string };
const units = new Map<string, Unit>();
function define(names: string[], scale: string, dimension: string) {
  names.forEach((name) => units.set(name, { scale, dimension }));
}
define(['m', 'meter', 'meters'], '1', 'm');
define(['cm'], '.01', 'm');
define(['mm'], '.001', 'm');
define(['km'], '1000', 'm');
define(['inch', 'inches'], '.0254', 'm');
define(['ft', 'foot', 'feet'], '.3048', 'm');
define(['mile', 'miles'], '1609.344', 'm');
define(['s', 'sec', 'second', 'seconds'], '1', 's');
define(['min', 'minute', 'minutes'], '60', 's');
define(['h', 'hour', 'hours'], '3600', 's');
define(['day', 'days'], '86400', 's');
define(['week', 'weeks'], '604800', 's');
define(['kg'], '1', 'kg');
define(['g'], '.001', 'kg');
define(['lb', 'lbs'], '.45359237', 'kg');
define(['B', 'byte', 'bytes'], '1', 'B');
define(['KB'], '1000', 'B');
define(['MB'], '1000000', 'B');
define(['GB'], '1000000000', 'B');
define(['KiB'], '1024', 'B');
define(['MiB'], '1048576', 'B');
define(['GiB'], '1073741824', 'B');
for (const currency of ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'])
  define([currency], '1', currency);
export const SUPPORTED_UNITS = [...units.keys()];
const functions = new Set([
  'abs',
  'round',
  'floor',
  'ceil',
  'sqrt',
  'minof',
  'maxof',
  'sum',
]);

function normalized(dimensions: Dimensions) {
  return Object.fromEntries(
    Object.entries(dimensions)
      .filter(([, exponent]) => exponent !== 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}
function sameUnits(a: Quantity, b: Quantity) {
  if (
    JSON.stringify(normalized(a.dimensions)) !==
    JSON.stringify(normalized(b.dimensions))
  )
    throw new Error('These units cannot be added or compared.');
}
function checked(amount: Decimal, dimensions: Dimensions = {}): Quantity {
  if (!amount.isFinite() || (!amount.isZero() && Math.abs(amount.e) > 300))
    throw new Error('Result is outside the supported numeric range.');
  if (Object.values(dimensions).some((power) => Math.abs(power) > 12))
    throw new Error('Unit exponent is too large.');
  return { amount, dimensions: normalized(dimensions) };
}
function multiply(a: Quantity, b: Quantity, divide = false) {
  if (divide && b.amount.isZero()) throw new Error('Cannot divide by zero.');
  const dimensions = { ...a.dimensions };
  for (const [unit, power] of Object.entries(b.dimensions))
    dimensions[unit] = (dimensions[unit] || 0) + power * (divide ? -1 : 1);
  return checked(
    divide ? a.amount.div(b.amount) : a.amount.mul(b.amount),
    dimensions,
  );
}
function tokensFor(source: string) {
  const tokens: string[] = [];
  let position = 0;
  while (position < source.length) {
    const rest = source.slice(position);
    if (/^\s/.test(rest)) {
      position++;
      continue;
    }
    const match = rest.match(
      /^(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z_][A-Za-z_0-9]*|[()+*/^%,\-])/i,
    );
    if (!match)
      throw new Error(`Unexpected character at position ${position + 1}.`);
    tokens.push(match[0]);
    position += match[0].length;
    if (tokens.length > 256)
      throw new Error('Keep each expression below 256 tokens.');
  }
  return tokens;
}

class Expression {
  private position = 0;
  private depth = 0;
  private tokens: string[];
  constructor(
    source: string,
    private resolve: (name: string) => Quantity | undefined,
  ) {
    this.tokens = tokensFor(source);
  }
  private peek() {
    return this.tokens[this.position];
  }
  private take() {
    return this.tokens[this.position++];
  }
  run() {
    if (!this.tokens.length) throw new Error('Enter an expression.');
    const result = this.parse(0);
    if (this.position !== this.tokens.length)
      throw new Error(`Unexpected token “${this.peek()}”.`);
    return result;
  }
  private parse(minimum: number): Quantity {
    if (++this.depth > 32) throw new Error('Expression is nested too deeply.');
    let left: Quantity;
    const token = this.take();
    if (token === '+' || token === '-') {
      left = this.parse(25);
      if (token === '-') left = checked(left.amount.neg(), left.dimensions);
    } else if (token === '(') {
      left = this.parse(0);
      if (this.take() !== ')') throw new Error('Missing closing parenthesis.');
    } else if (token && /^(?:\d|\.)/.test(token)) {
      if (
        token.length > 80 ||
        Math.abs(Number(token.split(/e/i)[1] || '0')) > 300
      )
        throw new Error('Number is too large.');
      left = checked(new D(token));
    } else if (token && functions.has(token) && this.peek() === '(') {
      this.take();
      const args = [this.parse(0)];
      while (this.peek() === ',') {
        this.take();
        args.push(this.parse(0));
        if (args.length > 16)
          throw new Error('Use up to 16 function arguments.');
      }
      if (this.take() !== ')') throw new Error('Missing closing parenthesis.');
      left = this.call(token, args);
    } else if (token && /^[A-Za-z_]/.test(token)) {
      const variable = this.resolve(token),
        unit = units.get(token);
      if (!variable && !unit) throw new Error(`Unknown variable “${token}”.`);
      left = variable || checked(new D(unit!.scale), { [unit!.dimension]: 1 });
    } else {
      throw new Error('Expected a number, variable or parenthesis.');
    }

    while (this.position < this.tokens.length) {
      const next = this.peek();
      if (next === '%' && minimum <= 40) {
        this.take();
        left = checked(left.amount.div(100), left.dimensions);
        continue;
      }
      const implicit =
        !!next && (/^[A-Za-z_]/.test(next) || next === '(') && next !== 'of';
      const operator = implicit ? '*' : next === 'of' ? '*' : next;
      const precedence =
        operator === '+' || operator === '-'
          ? 10
          : operator === '*' || operator === '/'
            ? 20
            : operator === '^'
              ? 30
              : -1;
      if (precedence < minimum) break;
      if (!implicit) this.take();
      const right = this.parse(precedence + (operator === '^' ? 0 : 1));
      if (operator === '+' || operator === '-') {
        sameUnits(left, right);
        left = checked(
          operator === '+'
            ? left.amount.add(right.amount)
            : left.amount.sub(right.amount),
          left.dimensions,
        );
      } else if (operator === '*' || operator === '/')
        left = multiply(left, right, operator === '/');
      else {
        if (
          Object.keys(right.dimensions).length ||
          !right.amount.isInteger() ||
          right.amount.abs().gt(12)
        )
          throw new Error(
            'Use a dimensionless integer exponent from -12 to 12.',
          );
        const exponent = right.amount.toNumber();
        left = checked(
          left.amount.pow(exponent),
          Object.fromEntries(
            Object.entries(left.dimensions).map(([unit, power]) => [
              unit,
              power * exponent,
            ]),
          ),
        );
      }
    }
    this.depth--;
    return left;
  }
  private call(name: string, args: Quantity[]) {
    if (['sum', 'minof', 'maxof'].includes(name)) {
      args.forEach((arg) => sameUnits(args[0], arg));
      const values = args.map((arg) => arg.amount);
      return checked(
        name === 'sum'
          ? values.reduce((a, b) => a.add(b), new D(0))
          : name === 'minof'
            ? D.min(...values)
            : D.max(...values),
        args[0].dimensions,
      );
    }
    if (args.length !== 1) throw new Error(`${name} takes one argument.`);
    const { amount, dimensions } = args[0];
    if (name === 'abs') return checked(amount.abs(), dimensions);
    if (Object.keys(dimensions).length)
      throw new Error(`${name} needs a dimensionless value.`);
    return checked(
      name === 'round'
        ? amount.round()
        : name === 'floor'
          ? amount.floor()
          : name === 'ceil'
            ? amount.ceil()
            : amount.sqrt(),
    );
  }
}

export function evaluateExpression(
  source: string,
  resolve: (name: string) => Quantity | undefined = () => undefined,
) {
  const parts = source.split(/\s+to\s+/);
  if (parts.length > 2) throw new Error('Use one conversion per expression.');
  const quantity = new Expression(parts[0], resolve).run();
  if (parts.length === 1)
    return { quantity, display: displayQuantity(quantity) };
  if (!/^[A-Za-z][A-Za-z0-9\s*/^()\-]*$/.test(parts[1]))
    throw new Error('Convert to a supported unit or unit expression.');
  const targetTokens = tokensFor(parts[1]);
  if (
    targetTokens.some((token, index) => {
      if (/^[A-Za-z_]/.test(token)) return !units.has(token);
      if (/^\d/.test(token))
        return (
          targetTokens[index - 1] !== '^' &&
          !(targetTokens[index - 1] === '-' && targetTokens[index - 2] === '^')
        );
      if (token === '-') return targetTokens[index - 1] !== '^';
      return !['*', '/', '^', '(', ')'].includes(token);
    })
  )
    throw new Error(
      'A conversion target must contain units, not arithmetic values.',
    );
  const target = new Expression(parts[1], () => undefined).run();
  sameUnits(quantity, target);
  return {
    quantity,
    display: `${formatDecimal(quantity.amount.div(target.amount))} ${parts[1]}`,
  };
}

export function formatDecimal(value: Decimal) {
  if (!value.isZero() && (value.abs().gte('1e15') || value.abs().lt('1e-9')))
    return value.toSignificantDigits(12).toString();
  return value.toDecimalPlaces(12).toFixed().replace(/^-0$/, '0');
}
export function displayQuantity(quantity: Quantity) {
  const dimensions = Object.entries(quantity.dimensions)
    .map(([unit, power]) => (power === 1 ? unit : `${unit}^${power}`))
    .join(' · ');
  return `${formatDecimal(quantity.amount)}${dimensions ? ' ' + dimensions : ''}`;
}
export type NotebookRow = {
  line: number;
  source: string;
  expression: string;
  name?: string;
  display?: string;
  error?: string;
  comment?: boolean;
};

export function evaluateNotebook(source: string): NotebookRow[] {
  if (source.length > 64_000 || source.split('\n').length > 200)
    throw new Error('Use up to 200 lines and 64,000 characters.');
  const definitions = new Map<string, string>();
  const duplicates = new Set<string>();
  const rows = source.split('\n').map((line, index) => {
    const expression = line.split('#')[0].trim();
    const assignment = expression.match(
      /^([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.+)$/,
    );
    if (assignment) {
      if (definitions.has(assignment[1])) duplicates.add(assignment[1]);
      definitions.set(assignment[1], assignment[2]);
    }
    return { line: index + 1, source: line, expression, name: assignment?.[1] };
  });
  const cache = new Map<string, Quantity>();
  const visiting = new Set<string>();
  function resolve(name: string): Quantity | undefined {
    if (!definitions.has(name)) return undefined;
    if (
      units.has(name) ||
      functions.has(name) ||
      name === 'of' ||
      name === 'to'
    )
      throw new Error(`“${name}” is reserved for units or functions.`);
    if (duplicates.has(name))
      throw new Error(`Variable “${name}” is defined more than once.`);
    const cached = cache.get(name);
    if (cached) return cached;
    const expression = definitions.get(name);
    if (!expression) throw new Error(`Unknown variable “${name}”.`);
    if (visiting.has(name))
      throw new Error(`Circular reference involving “${name}”.`);
    visiting.add(name);
    try {
      const quantity = evaluateExpression(expression, resolve).quantity;
      cache.set(name, quantity);
      return quantity;
    } finally {
      visiting.delete(name);
    }
  }
  return rows.map((row) => {
    if (!row.expression) return { ...row, comment: true };
    try {
      if (row.expression.length > 1024)
        throw new Error('Keep each expression below 1,024 characters.');
      if (row.name) resolve(row.name);
      const expression = row.name ? definitions.get(row.name)! : row.expression;
      return {
        ...row,
        display: evaluateExpression(expression, resolve).display,
      };
    } catch (error) {
      return { ...row, error: (error as Error).message };
    }
  });
}

/** Share variable names and expression structure, with every literal number removed. */
export function redactNotebookNumbers(source: string) {
  return source
    .split('\n')
    .map((line) =>
      line
        .split('#')[0]
        .replace(
          /\b[A-Za-z_][A-Za-z_0-9]*\b|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi,
          (token) => (/^[A-Za-z_]/.test(token) ? token : '[value]'),
        ),
    )
    .join('\n');
}
