'use client';

import { useMemo, useState } from 'react';
import { downloadLocal } from '@/lib/local-files';
import {
  CodeOutput,
  ErrorMessage,
  Field,
} from '@/components/workbench/Workbench';
import { buildScript, type BashOptions } from './bash';

export default function BashGenerator() {
  const [options, setOptions] = useState<BashOptions>({
    task: 'report',
    source: '.',
    destination: '../backup.tar.gz',
    name: 'file-report.sh',
    shell: 'bash',
  });
  const result = useMemo(() => {
    try {
      return { value: buildScript(options), error: '' };
    } catch (err) {
      return { value: null, error: (err as Error).message };
    }
  }, [options]);
  return (
    <div className="wb-grid wb-grid-sidebar">
      <section className="panel wb-stack">
        <Field label="Shell">
          <select
            className="field"
            value={options.shell}
            onChange={(event) =>
              setOptions((current) => ({
                ...current,
                shell: event.target.value as BashOptions['shell'],
              }))
            }
          >
            <option value="bash">Bash 4+ / GNU Linux</option>
            <option value="posix">POSIX sh skeleton</option>
          </select>
        </Field>
        <Field label="Script filename">
          <input
            className="field"
            value={options.name}
            maxLength={80}
            onChange={(event) =>
              setOptions((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
          />
        </Field>
        {options.shell === 'bash' && (
          <>
            <Field label="Task">
              <select
                className="field"
                value={options.task}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    task: event.target.value as BashOptions['task'],
                  }))
                }
              >
                <option value="report">Directory file-size report</option>
                <option value="backup">Create a new backup archive</option>
                <option value="skeleton">
                  Argument parsing & dry-run skeleton
                </option>
              </select>
            </Field>
            <Field label="Default source directory">
              <input
                className="field"
                maxLength={1000}
                value={options.source}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    source: event.target.value,
                  }))
                }
              />
            </Field>
            {options.task === 'backup' && (
              <Field label="Default output archive (parent must exist)">
                <input
                  className="field"
                  maxLength={1000}
                  value={options.destination}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      destination: event.target.value,
                    }))
                  }
                />
              </Field>
            )}
          </>
        )}
        <ErrorMessage message={result.error} />
        <button
          className="action"
          disabled={!result.value}
          onClick={() =>
            downloadLocal(
              result.value!.script,
              options.name,
              'text/x-shellscript',
            )
          }
        >
          Download script
        </button>
        <div className="note">
          Review the generated script and its paths before running it in your
          terminal. Bash templates start in dry-run mode; pass{' '}
          <code>--apply</code> to perform the operation. This page generates
          text and never executes scripts.
        </div>
        {result.value && (
          <p className="wb-muted">
            Dependencies: {result.value.dependencies.join(', ')}. You can check
            the download with your local ShellCheck installation.
          </p>
        )}
      </section>
      <section className="panel">
        <CodeOutput
          value={result.value?.script || ''}
          label="Generated shell script"
        />
      </section>
    </div>
  );
}
