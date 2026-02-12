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
  getMe: () => client.get('/api/me'),
  logout: () => client.post('/api/auth/logout'),
  refreshToken: () => client.post('/api/auth/refresh'),

  // Phones
  getPhones: () => client.get('/api/phones'),
  createPhone: (data: { name: string; hub_server_id: string }) =>
    client.post('/api/phones', data),
  getPhone: (id: string) => client.get(`/api/phones/${id}`),
  deletePhone: (id: string) => client.delete(`/api/phones/${id}`),
  rotateIP: (id: string) => client.post(`/api/phones/${id}/rotate-ip`),
  restartProxy: (id: string) => client.post(`/api/phones/${id}/restart`),
  getPhoneStats: (id: string) => client.get(`/api/phones/${id}/stats`),

  // Connection Credentials
  getCredentials: (phoneId: string) => client.get(`/api/phones/${phoneId}/credentials`),
  createCredential: (phoneId: string, data: {
    name: string;
    auth_type: 'ip' | 'userpass';
    proxy_type?: 'socks5' | 'http' | 'both';
    allowed_ip?: string;
    username?: string;
    password?: string;
    bandwidth_limit?: number;
    expires_at?: string;
  }) => client.post(`/api/phones/${phoneId}/credentials`, data),
  updateCredential: (phoneId: string, credId: string, data: any) =>
    client.patch(`/api/phones/${phoneId}/credentials/${credId}`, data),
  deleteCredential: (phoneId: string, credId: string) =>
    client.delete(`/api/phones/${phoneId}/credentials/${credId}`),

  // Rotation Token
  getRotationToken: (phoneId: string) => client.get(`/api/phones/${phoneId}/rotation-token`),
  regenerateRotationToken: (phoneId: string) =>
    client.post(`/api/phones/${phoneId}/rotation-token/regenerate`),

  // Rotation Settings
  getRotationSettings: (phoneId: string) => client.get(`/api/phones/${phoneId}/rotation-settings`),
  updateRotationSettings: (phoneId: string, data: {
    rotation_mode: 'off' | 'timed' | 'api';
    rotation_interval_minutes?: number;
  }) => client.put(`/api/phones/${phoneId}/rotation-settings`, data),

  // Usage & Uptime
  getPhoneDataUsage: (phoneId: string) => client.get(`/api/phones/${phoneId}/data-usage`),
  getPhoneUptime: (phoneId: string) => client.get(`/api/phones/${phoneId}/uptime`),
  getUsageOverview: () => client.get('/api/usage/overview'),

  // Groups
  getGroups: () => client.get('/api/groups'),
  createGroup: (data: { name: string; color?: string; description?: string; phone_ids?: string[] }) =>
    client.post('/api/groups', data),
  getGroup: (id: string) => client.get(`/api/groups/${id}`),
  updateGroup: (id: string, data: { name?: string; color?: string; description?: string }) =>
    client.put(`/api/groups/${id}`, data),
  deleteGroup: (id: string) => client.delete(`/api/groups/${id}`),
  addPhonesToGroup: (groupId: string, phoneIds: string[]) =>
    client.post(`/api/groups/${groupId}/phones`, { phone_ids: phoneIds }),
  removePhoneFromGroup: (groupId: string, phoneId: string) =>
    client.delete(`/api/groups/${groupId}/phones/${phoneId}`),

  // Mass Actions
  massRotateIP: (phoneIds: string[]) =>
    client.post('/api/phones/actions/mass-rotate', { phone_ids: phoneIds }),
  massUpdateRotationSettings: (phoneIds: string[], data: {
    rotation_mode: 'off' | 'timed' | 'api';
    rotation_interval_minutes?: number;
  }) => client.post('/api/phones/actions/mass-rotation-settings', {
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
  }) => client.post('/api/phones/actions/mass-credentials', {
    phone_ids: phoneIds,
    ...data
  }),
  massDeletePhones: (phoneIds: string[]) =>
    client.post('/api/phones/actions/mass-delete', { phone_ids: phoneIds }),
  exportProxies: (phoneIds: string[], data: {
    format: 'plain' | 'auth' | 'json' | 'csv' | 'curl';
    proxy_type: 'socks5' | 'http';
    include_rotation?: boolean;
    credential_id?: string;
  }) => client.post('/api/phones/actions/export', {
    phone_ids: phoneIds,
    ...data
  }),

  // Servers
  getServers: () => client.get('/api/servers'),
  createServer: (data: any) => client.post('/api/servers', data),
  updateServer: (id: string, data: any) => client.put(`/api/servers/${id}`, data),
  deleteServer: (id: string) => client.delete(`/api/servers/${id}`),
  getServerTelemetry: (id: string) => client.get(`/api/servers/${id}/telemetry`),
  provisionServer: (id: string, data: {
    ssh_host?: string;
    ssh_port?: number;
    ssh_user?: string;
    ssh_password?: string;
    hub_binary_url?: string;
  }) => client.post(`/api/servers/${id}/provision`, data),

  // Users (admin)
  getUsers: () => client.get('/api/users'),
  updateUserRole: (id: string, role: string) =>
    client.put(`/api/users/${id}/role`, { role }),
  deleteUser: (id: string) => client.delete(`/api/users/${id}`),
};

export default client;
