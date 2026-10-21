'use client';

import { useState, type ReactNode } from 'react';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="wb-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label = 'Workspace',
}: {
  value: T;
  onChange: (value: T) => void;
  items: readonly { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div className="wb-tabs" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({
  text,
  label = 'Copy',
}: {
  text: string;
  label?: string;
}) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied');
    } catch {
      setMessage('Select the output to copy it manually.');
    }
  }
  return (
    <span className="wb-copy">
      <button
        type="button"
        className="action action-secondary"
        disabled={!text}
        onClick={() => void copy()}
      >
        {label}
      </button>
      <span role="status">{message}</span>
    </span>
  );
}

export function CodeOutput({
  value,
  label = 'Generated code',
}: {
  value: string;
  label?: string;
}) {
  return (
    <div className="wb-output">
      <div className="wb-output-heading">
        <h2>{label}</h2>
        <CopyButton text={value} />
      </div>
      <pre tabIndex={0} aria-label={label}>
        {value || 'Output will appear here.'}
      </pre>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="wb-error" role="alert">
      {message}
    </p>
  ) : null;
}
