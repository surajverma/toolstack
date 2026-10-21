export type BashTask = 'report' | 'backup' | 'skeleton';
export type BashOptions = {
  task: BashTask;
  source: string;
  destination: string;
  name: string;
  shell: 'bash' | 'posix';
};
export function shellLiteral(value: string) {
  if (value.length > 1000 || /[\u0000-\u001f\u007f]/.test(value))
    throw new Error(
      'Paths must be below 1,000 characters and contain no control characters.',
    );
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

export function buildScript(options: BashOptions) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(options.name))
    throw new Error(
      'Use a short script filename containing letters, numbers, dots, underscores or hyphens.',
    );
  const source = shellLiteral(options.source || '.');
  const destination = shellLiteral(options.destination || './backup.tar.gz');
  if (options.shell === 'posix') {
    return {
      dependencies: ['POSIX sh'],
      script: `#!/bin/sh
# ${options.name} — POSIX argument-handling skeleton
set -eu

usage() {
  printf '%s\\n' 'Usage: ${options.name} [--name VALUE] [--help]'
}

name='world'
while [ "$#" -gt 0 ]; do
  case "$1" in
    --name)
      [ "$#" -ge 2 ] || { printf '%s\\n' 'Missing --name value' >&2; exit 2; }
      name=$2; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'Unknown argument: %s\\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

printf 'Hello, %s\\n' "$name"
`,
    };
  }
  const base = `#!/usr/bin/env bash
# ${options.name} — review before running
# Requires Bash 4+ on GNU/Linux.
set -euo pipefail
trap 'printf "Error on line %s\\n" "$LINENO" >&2' ERR

die() { printf '%s\\n' "$*" >&2; exit 1; }
usage() {
  printf '%s\\n' 'Usage: ${options.name} [--source DIR] [--output FILE] [--apply] [--help]'
  printf '%s\\n' 'Starts in dry-run mode. --apply enables the selected operation.'
}

source_dir=${source}
output_file=${destination}
dry_run=true
while (( $# )); do
  case "$1" in
    --source|--output)
      (( $# >= 2 )) || die "Missing value for $1"
      if [[ $1 == --source ]]; then source_dir=$2; else output_file=$2; fi
      shift 2 ;;
    --apply) dry_run=false; shift ;;
    --dry-run) dry_run=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -d "$source_dir" ]] || die 'Source directory does not exist'
source_dir=$(cd -- "$source_dir" && pwd -P)
`;
  if (options.task === 'skeleton')
    return {
      dependencies: ['Bash 4+'],
      script:
        base +
        `
if "$dry_run"; then
  printf 'Dry run. Source: %q\\n' "$source_dir"
else
  # Add your operation here. Quote every path and avoid eval.
  printf 'Source: %s\\n' "$source_dir"
fi
`,
    };
  if (options.task === 'report')
    return {
      dependencies: ['Bash 4+', 'GNU find', 'wc'],
      script:
        base +
        `
command -v find >/dev/null || die 'find is required'
command -v wc >/dev/null || die 'wc is required'
if "$dry_run"; then
  printf 'Would list regular files under %q with byte counts.\\n' "$source_dir"
  exit 0
fi

printf 'Bytes\\tPath (shell-escaped)\\n'
while IFS= read -r -d '' file; do
  bytes=$(wc -c < "$file")
  printf '%s\\t%q\\n' "$bytes" "$file"
done < <(find "$source_dir" -type f -print0)
`,
    };
  if (options.task !== 'backup')
    throw new Error('Choose a supported script template.');
  return {
    dependencies: ['Bash 4+', 'GNU tar', 'dirname', 'basename'],
    script:
      base +
      `
command -v tar >/dev/null || die 'tar is required'
[[ $source_dir != / ]] || die 'Choose a source smaller than the filesystem root'
output_parent=$(cd -- "$(dirname -- "$output_file")" && pwd -P)
output_file="$output_parent/$(basename -- "$output_file")"
[[ ! -e "$output_file" && ! -L "$output_file" ]] || die 'Output already exists; choose a new filename'
case "$output_parent/" in
  "$source_dir/"*) die 'Choose an output directory outside the source directory' ;;
esac

if "$dry_run"; then
  printf 'Would create %q from %q\\n' "$output_file" "$source_dir"
  exit 0
fi

# On interruption, a partial archive may remain. Review it before using it.
tar -czf "$output_file" -C "$source_dir" .
printf 'Created %s\\n' "$output_file"
`,
  };
}
