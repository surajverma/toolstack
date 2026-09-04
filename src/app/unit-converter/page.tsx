'use client';

import { useMemo, useState } from 'react';
import LocalToolLayout from '@/components/LocalToolLayout';

type Category = { label: string; units: Record<string, number>; temperature?: boolean };

const CATEGORIES: Record<string, Category> = {
  length: {
    label: 'Length',
    units: {
      meter: 1,
      kilometer: 1000,
      centimeter: 0.01,
      millimeter: 0.001,
      mile: 1609.344,
      yard: 0.9144,
      foot: 0.3048,
      inch: 0.0254,
    },
  },
  mass: {
    label: 'Mass',
    units: {
      kilogram: 1,
      gram: 0.001,
      milligram: 0.000001,
      tonne: 1000,
      pound: 0.45359237,
      ounce: 0.028349523125,
    },
  },
  temperature: {
    label: 'Temperature',
    units: { celsius: 1, fahrenheit: 1, kelvin: 1 },
    temperature: true,
  },
  dataSI: {
    label: 'Data Storage (SI, decimal)',
    units: { byte: 1, kilobyte: 1e3, megabyte: 1e6, gigabyte: 1e9, terabyte: 1e12 },
  },
  dataIEC: {
    label: 'Data Storage (IEC, binary)',
    units: {
      byte: 1,
      kibibyte: 1024,
      mebibyte: 1024 ** 2,
      gibibyte: 1024 ** 3,
      tebibyte: 1024 ** 4,
    },
  },
  speed: {
    label: 'Speed',
    units: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knot: 0.514444 },
  },
};

function convertTemperature(value: number, from: string, to: string) {
  const celsius =
    from === 'fahrenheit'
      ? ((value - 32) * 5) / 9
      : from === 'kelvin'
        ? value - 273.15
        : value;

  return to === 'fahrenheit'
    ? (celsius * 9) / 5 + 32
    : to === 'kelvin'
      ? celsius + 273.15
      : celsius;
}

export default function UnitConverterPage() {
  const [category, setCategory] = useState('length');
  const units = Object.keys(CATEGORIES[category].units);
  const [from, setFrom] = useState('meter');
  const [to, setTo] = useState('foot');
  const [input, setInput] = useState('1');

  const changeCategory = (next: string) => {
    setCategory(next);
    const nextUnits = Object.keys(CATEGORIES[next].units);
    setFrom(nextUnits[0]);
    setTo(nextUnits[1] ?? nextUnits[0]);
    setInput('1');
  };

  const output = useMemo(() => {
    const value = Number(input);
    if (!Number.isFinite(value)) return '';

    const currentCategory = CATEGORIES[category];
    const converted = currentCategory.temperature
      ? convertTemperature(value, from, to)
      : (value * currentCategory.units[from]) / currentCategory.units[to];

    return Number.isFinite(converted) ? Number(converted.toPrecision(12)).toString() : '';
  }, [category, from, to, input]);

  return (
    <LocalToolLayout
      title='Unit Converter'
      description='Convert common units locally, with separate decimal SI and binary IEC storage units.'
    >
      <section className='mx-auto max-w-xl rounded-xl bg-white p-6 shadow'>
        <label className='font-semibold'>
          Category
          <select
            value={category}
            onChange={(event) => changeCategory(event.target.value)}
            className='mt-2 w-full rounded border p-2'
          >
            {Object.entries(CATEGORIES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>

        <div className='mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-2'>
          <label>
            From
            <select
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className='mt-1 w-full rounded border p-2'
            >
              {units.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setFrom(to);
              setTo(from);
              setInput(output);
            }}
            className='rounded bg-slate-100 p-2'
            aria-label='Swap units'
          >
            ⇄
          </button>
          <label>
            To
            <select
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className='mt-1 w-full rounded border p-2'
            >
              {units.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
        </div>

        <label className='mt-5 block'>
          Value
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            inputMode='decimal'
            className='mt-1 w-full rounded border p-3 font-mono'
          />
        </label>
        <label className='mt-4 block'>
          Result
          <input
            readOnly
            value={output}
            className='mt-1 w-full rounded border bg-slate-50 p-3 font-mono'
          />
        </label>
      </section>
    </LocalToolLayout>
  );
}
