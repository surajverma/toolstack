'use client';

import { useMemo, useState } from 'react';
import {
  CodeOutput,
  ErrorMessage,
  Field,
  Tabs,
} from '@/components/workbench/Workbench';
import { ipv4Subnet, subdivideSubnet, subnetOverlaps } from './subnet';

export default function SubnetCalculator() {
  const [tab, setTab] = useState<'network' | 'split' | 'overlap'>('network');
  const [input, setInput] = useState('192.168.1.42/24');
  const [prefix, setPrefix] = useState(26);
  const [list, setList] = useState(
    '10.0.0.0/24\n10.0.0.128/25\n192.168.0.0/16',
  );
  const result = useMemo(() => {
    try {
      if (tab === 'overlap') {
        const pairs = subnetOverlaps(list);
        return {
          network: null,
          output: pairs.length
            ? pairs.map((pair) => pair.join(' overlaps ')).join('\n')
            : 'No overlapping networks.',
          error: '',
        };
      }
      const network = ipv4Subnet(input);
      return {
        network,
        output:
          tab === 'split' ? subdivideSubnet(input, prefix).join('\n') : '',
        error: '',
      };
    } catch (error) {
      return { network: null, output: '', error: (error as Error).message };
    }
  }, [tab, input, prefix, list]);
  return (
    <div className="wb-stack">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'network', label: 'Network details' },
          { value: 'split', label: 'Split a subnet' },
          { value: 'overlap', label: 'Check overlap' },
        ]}
      />
      <div className="wb-grid">
        <section className="panel wb-stack">
          {tab === 'overlap' ? (
            <Field label="IPv4 networks (one CIDR per line)">
              <textarea
                className="field wb-editor"
                value={list}
                maxLength={10000}
                onChange={(event) => setList(event.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label="IPv4 address / prefix">
                <input
                  className="field"
                  value={input}
                  maxLength={40}
                  onChange={(event) => setInput(event.target.value)}
                />
              </Field>
              {tab === 'split' && (
                <Field label="New prefix">
                  <input
                    className="field"
                    type="number"
                    value={prefix}
                    min={0}
                    max={32}
                    onChange={(event) => setPrefix(Number(event.target.value))}
                  />
                </Field>
              )}
            </>
          )}
          <p className="wb-muted">
            Calculations only. No network scan, connection or reachability check
            is performed. /31 uses point-to-point host counting; /32 represents
            a single address.
          </p>
          <ErrorMessage message={result.error} />
        </section>
        <section className="panel wb-stack">
          {result.network && tab === 'network' ? (
            <dl className="wb-results">
              {Object.entries({
                Network: result.network.cidr,
                'Subnet mask': result.network.mask,
                Wildcard: result.network.wildcard,
                'Last address / broadcast': result.network.broadcast,
                'First usable': result.network.first,
                'Last usable': result.network.last,
                Addresses: result.network.addresses,
                'Usable hosts': result.network.hosts,
              }).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <CodeOutput
              value={result.output}
              label={tab === 'split' ? 'Subnets' : 'Overlap report'}
            />
          )}
        </section>
      </div>
    </div>
  );
}
