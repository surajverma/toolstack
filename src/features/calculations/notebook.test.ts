import { describe, expect, it } from 'vitest';
import {
  evaluateExpression,
  evaluateNotebook,
  redactNotebookNumbers,
} from './notebook';

describe('private calculation notebook', () => {
  it('calculates decimals, precedence, percentages and conversions', () => {
    expect(evaluateExpression('0.1 + 0.2').display).toBe('0.3');
    expect(evaluateExpression('-2 ^ 2 + 3 * (4 + 1)').display).toBe('11');
    expect(evaluateExpression('15% of 200 USD').display).toBe('30 USD');
    expect(evaluateExpression('2 hours + 30 min to hours').display).toBe(
      '2.5 hours',
    );
    expect(evaluateExpression('60 km / hour to m / s').display).toBe(
      '16.666666666667 m / s',
    );
    expect(evaluateExpression('2 GiB to MiB').display).toBe('2048 MiB');
  });
  it('resolves forward references and reports duplicate and circular definitions', () => {
    const rows = evaluateNotebook(
      'total = workHours * rate\nworkHours = 12 hour\nrate = 85 USD / hour\ntotal',
    );
    expect(rows[0].display).toBe('1020 USD');
    expect(rows[3].display).toBe('1020 USD');
    expect(evaluateNotebook('a = b\nb = a')[0].error).toContain('Circular');
    expect(evaluateNotebook('a = 1\na = 2')[0].error).toContain(
      'more than once',
    );
  });
  it('refuses incompatible units, code and resource exhaustion', () => {
    for (const source of [
      '1 m + 2 s',
      '10 USD + 10 EUR',
      '1 / 0',
      'globalThis.alert(1)',
      'constructor.constructor(1)',
      '2 ^ 100',
      '1e999999',
      '1 m to m - m',
      '1 m to m / 0',
    ])
      expect(() => evaluateExpression(source)).toThrow();
    expect(() =>
      evaluateExpression('('.repeat(40) + '1' + ')'.repeat(40)),
    ).toThrow();
    expect(evaluateNotebook('hour = 123')[0].error).toContain('reserved');
  });
  it('removes comments and numeric values from a structure-only export', () => {
    expect(
      redactNotebookNumbers(
        'salary = 123456 USD # private name\ntax = salary * 25%',
      ),
    ).toBe('salary = [value] USD \ntax = salary * [value]%');
    expect(redactNotebookNumbers('phase2 = 42 USD\nphase2 * 1.5')).toBe(
      'phase2 = [value] USD\nphase2 * [value]',
    );
  });
});
