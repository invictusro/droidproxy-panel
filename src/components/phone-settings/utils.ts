import type { ConnectionCredential, ProxyType, PhoneWithStatus } from './types';

export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getProxyTypeLabel = (type: ProxyType): string => {
  switch (type) {
    case 'socks5': return 'SOCKS5';
    case 'http': return 'HTTP';
    case 'both': return 'Both';
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getConnectionStrings = (cred: ConnectionCredential, phone: PhoneWithStatus) => {
  const serverHost = cred.proxy_domain || phone.hub_server_ip;
  const proxyPort = cred.port;
  const strings: { type: string; value: string }[] = [];

  if (cred.auth_type === 'userpass') {
    if (cred.proxy_type === 'socks5') {
      strings.push({ type: 'SOCKS5', value: `socks5://${cred.username}:${cred.password}@${serverHost}:${proxyPort}` });
    }
    if (cred.proxy_type === 'http') {
      strings.push({ type: 'HTTP', value: `http://${cred.username}:${cred.password}@${serverHost}:${proxyPort}` });
    }
  } else {
    if (cred.proxy_type === 'socks5') {
      strings.push({ type: 'SOCKS5', value: `socks5://${serverHost}:${proxyPort}` });
    }
    if (cred.proxy_type === 'http') {
      strings.push({ type: 'HTTP', value: `http://${serverHost}:${proxyPort}` });
    }
  }
  return strings;
};

export const getDateRange = (range: string): { start: string; end: string } => {
  const today = new Date();
  const end = getLocalDateString(today);
  let start = end;
  if (range === '7d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    start = getLocalDateString(d);
  } else if (range === '30d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    start = getLocalDateString(d);
  } else if (range === '90d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    start = getLocalDateString(d);
  }
  return { start, end };
};

export const getMinExportDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - (12 * 7));
  return getLocalDateString(d);
};
