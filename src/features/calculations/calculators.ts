import { D, formatDecimal } from './notebook';

export function decimalInput(
  value: string,
  label: string,
  minimum = '0',
  maximum = '1000000000000',
) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim()) || value.length > 40)
    throw new Error(`Enter a valid ${label}.`);
  const number = new D(value);
  if (!number.isFinite() || number.lt(minimum) || number.gt(maximum))
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  return number;
}

export function percentageChange(before: string, after: string) {
  const a = decimalInput(before, 'original value', '-1000000000000');
  const b = decimalInput(after, 'new value', '-1000000000000');
  if (a.isZero())
    throw new Error(
      'Percentage change is undefined when the original value is zero.',
    );
  return {
    difference: formatDecimal(b.sub(a)),
    percent: formatDecimal(b.sub(a).div(a.abs()).mul(100)),
  };
}

export function comparePrices(
  priceA: string,
  sizeA: string,
  priceB: string,
  sizeB: string,
) {
  const a = decimalInput(priceA, 'price A').div(
    decimalInput(sizeA, 'quantity A', '.000001'),
  );
  const b = decimalInput(priceB, 'price B').div(
    decimalInput(sizeB, 'quantity B', '.000001'),
  );
  return {
    unitA: formatDecimal(a),
    unitB: formatDecimal(b),
    winner: a.eq(b)
      ? 'Equal unit price'
      : a.lt(b)
        ? 'Option A costs less per unit'
        : 'Option B costs less per unit',
  };
}

export function splitBill(total: string, tip: string, people: number) {
  if (!Number.isInteger(people) || people < 1 || people > 1000)
    throw new Error('Use 1–1,000 people.');
  const amount = decimalInput(total, 'bill total')
    .mul(decimalInput(tip, 'tip percentage', '0', '100').div(100).add(1))
    .toDecimalPlaces(2);
  const cents = amount.mul(100);
  const base = cents.div(people).floor();
  const extra = cents.mod(people).toNumber();
  return {
    total: amount.toFixed(2),
    low: base.div(100).toFixed(2),
    high: base.add(1).div(100).toFixed(2),
    extra,
    people,
  };
}

export type LoanRow = {
  month: number;
  payment: string;
  principal: string;
  interest: string;
  balance: string;
};
export function loanSchedule(
  principal: string,
  annualRate: string,
  months: number,
  extra: string,
) {
  const amount = decimalInput(
    principal,
    'principal',
    '.01',
    '1000000000000',
  ).toDecimalPlaces(2);
  const rate = decimalInput(annualRate, 'annual interest rate', '0', '100').div(
    1200,
  );
  const extraPayment = decimalInput(
    extra,
    'extra monthly payment',
  ).toDecimalPlaces(2);
  if (!Number.isInteger(months) || months < 1 || months > 600)
    throw new Error('Use a term from 1 to 600 months.');
  const payment = (
    rate.isZero()
      ? amount.div(months)
      : amount.mul(rate).div(new D(1).sub(new D(1).add(rate).pow(-months)))
  ).toDecimalPlaces(2);
  let balance = amount;
  let totalInterest = new D(0);
  let totalPaid = new D(0);
  const rows: LoanRow[] = [];
  for (let month = 1; month <= months && balance.gt(0); month++) {
    const interest = balance.mul(rate).toDecimalPlaces(2);
    const due = balance.add(interest);
    const actual =
      month === months ? due : D.min(payment.add(extraPayment), due);
    const paidPrincipal = actual.sub(interest);
    if (paidPrincipal.lte(0))
      throw new Error(
        'Rounded payment does not cover interest. Use a larger principal or a shorter term.',
      );
    balance = balance.sub(paidPrincipal).toDecimalPlaces(2);
    totalInterest = totalInterest.add(interest);
    totalPaid = totalPaid.add(actual);
    rows.push({
      month,
      payment: actual.toFixed(2),
      principal: paidPrincipal.toFixed(2),
      interest: interest.toFixed(2),
      balance: balance.toFixed(2),
    });
  }
  return {
    payment: payment.toFixed(2),
    interest: totalInterest.toFixed(2),
    total: totalPaid.toFixed(2),
    rows,
  };
}

export function savingsProjection(
  initial: string,
  monthly: string,
  ratePercent: string,
  years: number,
) {
  let balance = decimalInput(initial, 'initial balance');
  const contribution = decimalInput(monthly, 'monthly contribution');
  const rate = decimalInput(
    ratePercent,
    'annual nominal rate',
    '-50',
    '100',
  ).div(1200);
  if (!Number.isInteger(years) || years < 1 || years > 50)
    throw new Error('Use 1–50 years.');
  let deposited = balance;
  const rows: {
    year: number;
    deposited: string;
    growth: string;
    balance: string;
  }[] = [];
  for (let month = 1; month <= years * 12; month++) {
    balance = balance.mul(rate.add(1)).add(contribution);
    deposited = deposited.add(contribution);
    if (balance.abs().gt('1e30'))
      throw new Error('Projection exceeds the supported range.');
    if (month % 12 === 0)
      rows.push({
        year: month / 12,
        deposited: deposited.toFixed(2),
        growth: balance.sub(deposited).toFixed(2),
        balance: balance.toFixed(2),
      });
  }
  return rows;
}

function strictDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose both dates.');
  const time = Date.parse(value + 'T00:00:00Z');
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  )
    throw new Error('Enter a valid date.');
  return time;
}
export function dateDifference(
  from: string,
  through: string,
  holidays: string[] = [],
) {
  const start = strictDate(from),
    end = strictDate(through);
  if (end < start)
    throw new Error('The end date must be on or after the start date.');
  const days = (end - start) / 86400000;
  if (days > 36600) throw new Error('Choose a window of up to 100 years.');
  const excluded = new Set(
    holidays.filter(Boolean).map((day) => strictDate(day)),
  );
  let weekdays = 0;
  // Start included, end excluded: avoids double-counting adjacent windows.
  for (let time = start; time < end; time += 86400000) {
    const day = new Date(time).getUTCDay();
    if (day !== 0 && day !== 6 && !excluded.has(time)) weekdays++;
  }
  return { days, weekdays, weeks: formatDecimal(new D(days).div(7)) };
}

export function rowsToCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const cell = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;
  return [
    columns.map(cell).join(','),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(',')),
  ].join('\r\n');
}
