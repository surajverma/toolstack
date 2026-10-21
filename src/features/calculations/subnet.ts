function ipv4ToNumber(value: string) {
  const parts = value.split('.');
  if (
    parts.length !== 4 ||
    parts.some(
      (part) => !/^(?:0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255,
    )
  )
    throw new Error('Enter a valid IPv4 address without leading zeros.');
  return parts.reduce((result, part) => result * 256 + Number(part), 0);
}
function numberToIpv4(value: number) {
  return [24, 16, 8, 0]
    .map((shift) => Math.floor(value / 2 ** shift) % 256)
    .join('.');
}
export function ipv4Subnet(input: string) {
  const [address, prefixText, ...extra] = input.trim().split('/');
  if (extra.length || !/^(?:[0-9]|[12][0-9]|3[0-2])$/.test(prefixText || ''))
    throw new Error('Use CIDR notation, for example 192.168.1.42/24.');
  const ip = ipv4ToNumber(address),
    prefix = Number(prefixText);
  const addresses = 2 ** (32 - prefix);
  const network = Math.floor(ip / addresses) * addresses;
  const broadcast = network + addresses - 1;
  const hosts = prefix >= 31 ? addresses : addresses - 2;
  return {
    cidr: `${numberToIpv4(network)}/${prefix}`,
    prefix,
    addresses,
    hosts,
    network: numberToIpv4(network),
    broadcast: numberToIpv4(broadcast),
    first: numberToIpv4(prefix >= 31 ? network : network + 1),
    last: numberToIpv4(prefix >= 31 ? broadcast : broadcast - 1),
    mask: numberToIpv4(2 ** 32 - addresses),
    wildcard: numberToIpv4(addresses - 1),
    start: network,
    end: broadcast,
  };
}
export function subdivideSubnet(input: string, prefix: number) {
  const subnet = ipv4Subnet(input);
  if (!Number.isInteger(prefix) || prefix < subnet.prefix || prefix > 32)
    throw new Error('New prefix must be between the original prefix and 32.');
  const count = 2 ** (prefix - subnet.prefix);
  if (count > 1024)
    throw new Error('Split into at most 1,024 subnets at once.');
  return Array.from(
    { length: count },
    (_, index) =>
      ipv4Subnet(
        `${numberToIpv4(subnet.start + index * 2 ** (32 - prefix))}/${prefix}`,
      ).cidr,
  );
}
export function subnetOverlaps(source: string) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 200) throw new Error('Compare up to 200 networks.');
  const networks = lines.map((line) => ipv4Subnet(line));
  const pairs: [string, string][] = [];
  for (let a = 0; a < networks.length; a++)
    for (let b = a + 1; b < networks.length; b++) {
      if (
        networks[a].start <= networks[b].end &&
        networks[b].start <= networks[a].end
      )
        pairs.push([networks[a].cidr, networks[b].cidr]);
    }
  return pairs;
}
