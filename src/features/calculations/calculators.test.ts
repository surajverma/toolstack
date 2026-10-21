import { describe, expect, it } from 'vitest';
import {
  comparePrices,
  dateDifference,
  loanSchedule,
  percentageChange,
  savingsProjection,
  splitBill,
} from './calculators';
import { ipv4Subnet, subdivideSubnet, subnetOverlaps } from './subnet';

describe('everyday and financial calculations', () => {
  it('handles percentages, unit prices and exact bill allocation', () => {
    expect(percentageChange('80', '100')).toEqual({
      difference: '20',
      percent: '25',
    });
    expect(() => percentageChange('0', '10')).toThrow();
    expect(comparePrices('3', '500', '5', '1000').winner).toContain('Option B');
    expect(splitBill('10', '0', 3)).toMatchObject({
      low: '3.33',
      high: '3.34',
      extra: 1,
    });
  });
  it('amortizes principal exactly, supports zero interest and saves interest with extra payments', () => {
    const normal = loanSchedule('10000', '6', 24, '0');
    const faster = loanSchedule('10000', '6', 24, '100');
    expect(normal.rows.at(-1)?.balance).toBe('0.00');
    expect(normal.payment).toBe('443.21');
    expect(Number(faster.interest)).toBeLessThan(Number(normal.interest));
    expect(faster.rows.length).toBeLessThan(normal.rows.length);
    expect(loanSchedule('1200', '0', 12, '0')).toMatchObject({
      payment: '100.00',
      interest: '0.00',
      total: '1200.00',
    });
  });
  it('uses end-of-month contributions and explicit calendar boundaries', () => {
    expect(savingsProjection('100', '10', '0', 1)[0]).toMatchObject({
      deposited: '220.00',
      balance: '220.00',
      growth: '0.00',
    });
    expect(
      dateDifference('2024-02-28', '2024-03-02', ['2024-02-29']),
    ).toMatchObject({ days: 3, weekdays: 2 });
    expect(() => dateDifference('2024-02-30', '2024-03-02')).toThrow();
    expect(() => loanSchedule('100', '5', 1000000, '0')).toThrow();
  });
});
describe('IPv4 planning', () => {
  it('normalizes networks and handles /0, /31 and /32 edge cases', () => {
    expect(ipv4Subnet('192.168.1.42/24')).toMatchObject({
      cidr: '192.168.1.0/24',
      hosts: 254,
      mask: '255.255.255.0',
      broadcast: '192.168.1.255',
    });
    expect(ipv4Subnet('1.2.3.4/0').addresses).toBe(4294967296);
    expect(ipv4Subnet('10.0.0.0/31')).toMatchObject({
      hosts: 2,
      first: '10.0.0.0',
      last: '10.0.0.1',
    });
    expect(ipv4Subnet('10.0.0.7/32').hosts).toBe(1);
    expect(() => ipv4Subnet('010.0.0.1/24')).toThrow();
  });
  it('finds containment and overlap, and bounds subdivision', () => {
    expect(subdivideSubnet('10.0.0.0/24', 26)).toEqual([
      '10.0.0.0/26',
      '10.0.0.64/26',
      '10.0.0.128/26',
      '10.0.0.192/26',
    ]);
    expect(
      subnetOverlaps('10.0.0.0/24\n10.0.0.128/25\n192.168.0.0/16'),
    ).toHaveLength(1);
    expect(() => subdivideSubnet('0.0.0.0/0', 32)).toThrow('1,024');
  });
});
