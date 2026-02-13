import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Log the API URL being used
console.log('========== WEB-UI API CONFIG ==========');
console.log('VITE_API_URL env:', import.meta.env.VITE_API_URL);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('========================================');

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    client.post('/auth/register', { email, password, name }),
  getMe: () => client.get('/me'),
  logout: () => client.post('/auth/logout'),
  refreshToken: () => client.post('/auth/refresh'),

  // Phones
  getPhones: () => client.get('/phones'),
  createPhone: (data: { name: string; hub_server_id: string }) =>
    client.post('/phones', data),
  getPhone: (id: string) => client.get(`/phones/${id}`),
  deletePhone: (id: string) => client.delete(`/phones/${id}`),
  rotateIP: (id: string) => client.post(`/phones/${id}/rotate-ip`),
  restartProxy: (id: string) => client.post(`/phones/${id}/restart`),
  getPhoneStats: (id: string) => client.get(`/phones/${id}/stats`),

  // Connection Credentials
  getCredentials: (phoneId: string) => client.get(`/phones/${phoneId}/credentials`),
  createCredential: (phoneId: string, data: {
    name: string;
    auth_type: 'ip' | 'userpass';
    proxy_type?: 'socks5' | 'http' | 'both';
    allowed_ip?: string;
    username?: string;
    password?: string;
    bandwidth_limit?: number;
    expires_at?: string;
  }) => client.post(`/phones/${phoneId}/credentials`, data),
  updateCredential: (phoneId: string, credId: string, data: any) =>
    client.patch(`/phones/${phoneId}/credentials/${credId}`, data),
  deleteCredential: (phoneId: string, credId: string) =>
    client.delete(`/phones/${phoneId}/credentials/${credId}`),

  // Rotation Token
  getRotationToken: (phoneId: string) => client.get(`/phones/${phoneId}/rotation-token`),
  regenerateRotationToken: (phoneId: string) =>
    client.post(`/phones/${phoneId}/rotation-token/regenerate`),

  // Rotation Settings
  getRotationSettings: (phoneId: string) => client.get(`/phones/${phoneId}/rotation-settings`),
  updateRotationSettings: (phoneId: string, data: {
    rotation_mode: 'off' | 'timed' | 'api';
    rotation_interval_minutes?: number;
  }) => client.put(`/phones/${phoneId}/rotation-settings`, data),

  // Usage & Uptime (supports date range: start_date, end_date in YYYY-MM-DD format)
  getPhoneDataUsage: (phoneId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString();
    return client.get(`/phones/${phoneId}/data-usage${query ? `?${query}` : ''}`);
  },
  getPhoneUptime: (phoneId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const query = params.toString();
    return client.get(`/phones/${phoneId}/uptime${query ? `?${query}` : ''}`);
  },
  getUsageOverview: () => client.get('/usage/overview'),

  // Groups
  getGroups: () => client.get('/groups'),
  createGroup: (data: { name: string; color?: string; description?: string; phone_ids?: string[] }) =>
    client.post('/groups', data),
  getGroup: (id: string) => client.get(`/groups/${id}`),
  updateGroup: (id: string, data: { name?: string; color?: string; description?: string }) =>
    client.put(`/groups/${id}`, data),
  deleteGroup: (id: string) => client.delete(`/groups/${id}`),
  addPhonesToGroup: (groupId: string, phoneIds: string[]) =>
    client.post(`/groups/${groupId}/phones`, { phone_ids: phoneIds }),
  removePhoneFromGroup: (groupId: string, phoneId: string) =>
    client.delete(`/groups/${groupId}/phones/${phoneId}`),

  // Mass Actions
  massRotateIP: (phoneIds: string[]) =>
    client.post('/phones/actions/mass-rotate', { phone_ids: phoneIds }),
  massUpdateRotationSettings: (phoneIds: string[], data: {
    rotation_mode: 'off' | 'timed' | 'api';
    rotation_interval_minutes?: number;
  }) => client.post('/phones/actions/mass-rotation-settings', {
    phone_ids: phoneIds,
    ...data
  }),
  massCreateCredentials: (phoneIds: string[], data: {
    auth_type: 'ip_whitelist' | 'username_password';
    proxy_type: 'socks5' | 'http' | 'both';
    allowed_ip?: string;
    username?: string;
    password?: string;
    bandwidth_limit?: number;
    expires_at?: string;
  }) => client.post('/phones/actions/mass-credentials', {
    phone_ids: phoneIds,
    ...data
  }),
  massDeletePhones: (phoneIds: string[]) =>
    client.post('/phones/actions/mass-delete', { phone_ids: phoneIds }),
  exportProxies: (phoneIds: string[], data: {
    format: 'plain' | 'auth' | 'json' | 'csv' | 'curl';
    proxy_type: 'socks5' | 'http';
    include_rotation?: boolean;
    credential_id?: string;
  }) => client.post('/phones/actions/export', {
    phone_ids: phoneIds,
    ...data
  }),

  // Servers
  getServers: () => client.get('/servers'),
  createServer: (data: any) => client.post('/servers', data),
  updateServer: (id: string, data: any) => client.put(`/servers/${id}`, data),
  deleteServer: (id: string) => client.delete(`/servers/${id}`),
  getServerTelemetry: (id: string) => client.get(`/servers/${id}/telemetry`),
  provisionServer: (id: string, data: {
    ssh_host?: string;
    ssh_port?: number;
    ssh_user?: string;
    ssh_password?: string;
    hub_binary_url?: string;
  }) => client.post(`/servers/${id}/provision`, data),

  // Users (admin)
  getUsers: () => client.get('/users'),
  updateUserRole: (id: string, role: string) =>
    client.put(`/users/${id}/role`, { role }),
  deleteUser: (id: string) => client.delete(`/users/${id}`),
};

export default client;
