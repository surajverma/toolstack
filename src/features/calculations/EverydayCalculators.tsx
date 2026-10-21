'use client';

import { useMemo, useState } from 'react';
import { ErrorMessage, Field, Tabs } from '@/components/workbench/Workbench';
import {
  comparePrices,
  dateDifference,
  percentageChange,
  splitBill,
} from './calculators';

export default function EverydayCalculators() {
  const [tab, setTab] = useState<'percentage' | 'prices' | 'bill' | 'dates'>(
    'percentage',
  );
  const [values, setValues] = useState({
    before: '80',
    after: '100',
    priceA: '3',
    sizeA: '500',
    priceB: '5',
    sizeB: '1000',
    bill: '100',
    tip: '10',
    people: '3',
    from: '',
    through: '',
    holidays: '',
  });
  const result = useMemo(() => {
    try {
      if (tab === 'percentage') {
        const value = percentageChange(values.before, values.after);
        return {
          entries: [
            ['Difference', value.difference],
            ['Percentage change', value.percent + '%'],
          ],
          error: '',
        };
      }
      if (tab === 'prices') {
        const value = comparePrices(
          values.priceA,
          values.sizeA,
          values.priceB,
          values.sizeB,
        );
        return {
          entries: [
            ['Option A per unit', value.unitA],
            ['Option B per unit', value.unitB],
            ['Comparison', value.winner],
          ],
          error: '',
        };
      }
      if (tab === 'bill') {
        const value = splitBill(values.bill, values.tip, Number(values.people));
        return {
          entries: [
            ['Including tip', value.total],
            [
              'Exact split',
              value.extra
                ? `${value.extra} ${value.extra === 1 ? 'person pays' : 'people pay'} ${value.high}; ${value.people - value.extra} ${value.people - value.extra === 1 ? 'person pays' : 'people pay'} ${value.low}`
                : `Everyone pays ${value.low}`,
            ],
          ],
          error: '',
        };
      }
      const value = dateDifference(
        values.from,
        values.through,
        values.holidays.split(/\s+/),
      );
      return {
        entries: [
          ['Calendar days', String(value.days)],
          ['Weeks', value.weeks],
          ['Working days', String(value.weekdays)],
        ],
        error: '',
      };
    } catch (error) {
      return { entries: [], error: (error as Error).message };
    }
  }, [tab, values]);
  function input(key: keyof typeof values, label: string, type = 'text') {
    return (
      <Field label={label}>
        <input
          className="field"
          type={type}
          maxLength={40}
          inputMode={type === 'text' ? 'decimal' : undefined}
          value={values[key]}
          onChange={(event) =>
            setValues((current) => ({ ...current, [key]: event.target.value }))
          }
        />
      </Field>
    );
  }
  return (
    <div className="wb-stack">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'percentage', label: 'Percentage change' },
          { value: 'prices', label: 'Unit prices' },
          { value: 'bill', label: 'Split a bill' },
          { value: 'dates', label: 'Dates & working days' },
        ]}
      />
      <div className="wb-grid">
        <section className="panel wb-stack">
          {tab === 'percentage' && (
            <>
              {input('before', 'Original value')}
              {input('after', 'New value')}
              <p className="wb-muted">
                Change = (new − original) ÷ |original| × 100. For positive
                values, 80 to 100 is a 25% increase.
              </p>
            </>
          )}
          {tab === 'prices' && (
            <>
              <div className="wb-form-grid">
                {input('priceA', 'Price A')}
                {input('sizeA', 'Quantity A')}
                {input('priceB', 'Price B')}
                {input('sizeB', 'Quantity B')}
              </div>
              <p className="wb-muted">
                Use the same currency and quantity unit for both options, such
                as price per gram.
              </p>
            </>
          )}
          {tab === 'bill' && (
            <>
              {input('bill', 'Bill total')}
              {input('tip', 'Tip percentage')}
              {input('people', 'People', 'number')}
              <p className="wb-muted">
                The bill is rounded to two decimal places and allocated in
                cents, so everyone’s payment adds up exactly.
              </p>
            </>
          )}
          {tab === 'dates' && (
            <>
              {input('from', 'Start date', 'date')}
              {input('through', 'End date', 'date')}
              <Field label="Holidays to exclude (one YYYY-MM-DD per line)">
                <textarea
                  className="field"
                  rows={4}
                  maxLength={20000}
                  value={values.holidays}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      holidays: event.target.value,
                    }))
                  }
                />
              </Field>
              <p className="wb-muted">
                Start included, end excluded. Working days are Monday–Friday
                minus the dates you supply. No regional holiday calendar is
                assumed.
              </p>
            </>
          )}
        </section>
        <section className="panel wb-stack">
          <h2>Result</h2>
          <ErrorMessage message={result.error} />
          <dl className="wb-results">
            {result.entries.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
