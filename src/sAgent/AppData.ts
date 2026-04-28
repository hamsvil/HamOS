export const serverList = [
  { id: 'sg-1', name: 'SG - Premium 1', host: '128.199.100.1', country: 'Singapore', flag: '🇸🇬', latency: '25ms', load: '12%', ip: '128.199.100.1' },
  { id: 'sg-2', name: 'SG - Premium 2', host: '128.199.100.2', country: 'Singapore', flag: '🇸🇬', latency: '28ms', load: '45%', ip: '128.199.100.2' },
  { id: 'id-1', name: 'ID - Fiber Local', host: '103.111.12.1', country: 'Indonesia', flag: '🇮🇩', latency: '15ms', load: '78%', ip: '103.111.12.1' },
  { id: 'us-1', name: 'US - Gaming Low Latency', host: '45.76.99.12', country: 'USA', flag: '🇺🇸', latency: '190ms', load: '30%', ip: '45.76.99.12' },
];
export const commonPorts = [80, 443, 8080, 8888, 1080];
export const baseTunnelOptions = ['SSH - Direct', 'TLS - SNI', 'WS - Cloudfront', 'CDN - WebSocket'];
export const tlsVersions = ['TLS 1.1', 'TLS 1.2', 'TLS 1.3'];
export const bypassUrls = ['m.facebook.com', 'v.whatsapp.net', 'line.me'];
export const connModes = ['Direct', 'Proxy', 'HTTP Payload', 'SSL/TLS (SNI)'];
export const payloadMethods = ['GET', 'POST', 'HEAD', 'CONNECT', 'PUT', 'DELETE'];

