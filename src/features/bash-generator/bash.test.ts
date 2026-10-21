import { describe, expect, it } from 'vitest';
import { buildScript, shellLiteral } from './bash';

describe('reviewable shell templates', () => {
  it('quotes literal defaults rather than interpreting substitutions', () => {
    expect(shellLiteral("a'b $(touch /tmp/no) `id`")).toBe(
      "'a'\\''b $(touch /tmp/no) `id`'",
    );
    expect(() => shellLiteral('a\nb')).toThrow();
    const result = buildScript({
      task: 'backup',
      source: '/private path',
      destination: '/backups/new.tar.gz',
      name: 'backup.sh',
      shell: 'bash',
    });
    expect(result.script).toContain("source_dir='/private path'");
    expect(result.script).toContain('dry_run=true');
    expect(result.script).toContain('Output already exists');
    expect(result.script).toContain('outside the source');
    expect(result.script).not.toMatch(/sudo|curl\s|eval\s/);
  });
  it('keeps the POSIX skeleton free of Bash-only syntax', () => {
    const result = buildScript({
      task: 'skeleton',
      source: '.',
      destination: '',
      name: 'hello.sh',
      shell: 'posix',
    });
    expect(result.script).toContain('#!/bin/sh');
    expect(result.script).not.toContain('[[');
    expect(() =>
      buildScript({
        task: 'report',
        source: '.',
        destination: '',
        name: 'x\nmalicious',
        shell: 'bash',
      }),
    ).toThrow();
  });
});
