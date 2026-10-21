'use client';

import { useMemo, useState } from 'react';
import { downloadLocal } from '@/lib/local-files';
import { ErrorMessage, Field, Tabs } from '@/components/workbench/Workbench';
import { loanSchedule, rowsToCsv, savingsProjection } from './calculators';

export default function FinanceCalculator() {
  const [tab, setTab] = useState<'loan' | 'savings'>('loan');
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('6');
  const [months, setMonths] = useState(24);
  const [extra, setExtra] = useState('0');
  const [monthly, setMonthly] = useState('100');
  const [years, setYears] = useState(10);
  const result = useMemo(() => {
    try {
      if (tab === 'savings')
        return {
          savings: savingsProjection(principal, monthly, rate, years),
          loan: null,
          baseline: null,
          error: '',
        };
      return {
        loan: loanSchedule(principal, rate, months, extra),
        baseline: loanSchedule(principal, rate, months, '0'),
        savings: null,
        error: '',
      };
    } catch (err) {
      return {
        savings: null,
        loan: null,
        baseline: null,
        error: (err as Error).message,
      };
    }
  }, [tab, principal, rate, months, extra, monthly, years]);
  const rows = result.loan?.rows || result.savings || [];
  return (
    <div className="wb-stack">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'loan', label: 'Loan & extra repayments' },
          { value: 'savings', label: 'Savings projection' },
        ]}
      />
      <div className="wb-grid wb-grid-sidebar">
        <section className="panel wb-stack">
          <Field label={tab === 'loan' ? 'Loan principal' : 'Initial balance'}>
            <input
              className="field"
              inputMode="decimal"
              value={principal}
              maxLength={40}
              onChange={(event) => setPrincipal(event.target.value)}
            />
          </Field>
          <Field label="Annual nominal interest rate (%)">
            <input
              className="field"
              inputMode="decimal"
              value={rate}
              maxLength={20}
              onChange={(event) => setRate(event.target.value)}
            />
          </Field>
          {tab === 'loan' ? (
            <>
              <Field label="Term in months">
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={600}
                  value={months}
                  onChange={(event) => setMonths(Number(event.target.value))}
                />
              </Field>
              <Field label="Extra repayment each month">
                <input
                  className="field"
                  inputMode="decimal"
                  value={extra}
                  maxLength={40}
                  onChange={(event) => setExtra(event.target.value)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Monthly contribution">
                <input
                  className="field"
                  inputMode="decimal"
                  value={monthly}
                  maxLength={40}
                  onChange={(event) => setMonthly(event.target.value)}
                />
              </Field>
              <Field label="Years">
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={50}
                  value={years}
                  onChange={(event) => setYears(Number(event.target.value))}
                />
              </Field>
            </>
          )}
          <div className="note">
            {tab === 'loan'
              ? 'Fixed nominal rate, monthly payments, two-decimal rounding each month. The final payment clears the remaining balance. Fees, taxes and lender-specific conventions are excluded.'
              : 'Monthly compounding, contributions at the end of each month. Values are rounded for display. No taxes, fees, inflation or changing returns are assumed.'}{' '}
            Use your own rates; this is a scenario calculation.
          </div>
        </section>
        <section className="panel wb-stack">
          <ErrorMessage message={result.error} />
          {result.loan && (
            <dl className="wb-results wb-results-inline">
              <div>
                <dt>Scheduled monthly payment</dt>
                <dd>{result.loan.payment}</dd>
              </div>
              <div>
                <dt>Total interest</dt>
                <dd>{result.loan.interest}</dd>
              </div>
              <div>
                <dt>Total paid</dt>
                <dd>{result.loan.total}</dd>
              </div>
              <div>
                <dt>Months to repay</dt>
                <dd>
                  {result.loan.rows.length}
                  {result.baseline &&
                  result.loan.rows.length < result.baseline.rows.length
                    ? ` (${result.baseline.rows.length - result.loan.rows.length} earlier)`
                    : ''}
                </dd>
              </div>
            </dl>
          )}
          {result.savings && (
            <dl className="wb-results wb-results-inline">
              {Object.entries(result.savings.at(-1) || {})
                .filter(([key]) => key !== 'year')
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          )}
          <div className="wb-output-heading">
            <h2>{tab === 'loan' ? 'Payment schedule' : 'Annual projection'}</h2>
            <button
              className="action action-secondary"
              disabled={!rows.length}
              onClick={() =>
                downloadLocal(
                  rowsToCsv(rows),
                  tab === 'loan'
                    ? 'loan-schedule.csv'
                    : 'savings-projection.csv',
                  'text/csv;charset=utf-8',
                )
              }
            >
              Download CSV
            </button>
          </div>
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  {Object.keys(rows[0] || {}).map((key) => (
                    <th key={key} scope="col">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, column) => (
                      <td key={column}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
