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
  register: (email: string, password: string, name: string, telegramUsername?: string) =>
    client.post('/auth/register', { email, password, name, telegram_username: telegramUsername }),
  verifyEmail: (email: string, code: string) =>
    client.post('/auth/verify-email', { email, code }),
  resendVerification: (email: string) =>
    client.post('/auth/resend-verification', { email }),
  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),
  verifyResetCode: (email: string, code: string) =>
    client.post('/auth/verify-reset-code', { email, code }),
  resetPassword: (token: string, newPassword: string) =>
    client.post('/auth/reset-password', { token, new_password: newPassword }),
  getMe: () => client.get('/me'),
  logout: () => client.post('/auth/logout'),
  refreshToken: () => client.post('/auth/refresh'),

  // Balance
  getBalance: () => client.get('/me/balance'),
  getBalanceTransactions: () => client.get('/me/balance/transactions'),
  createTopUp: (data: { amount: number; payment_method: 'stripe' | 'crypto' }) =>
    client.post('/me/balance/topup', data),

  // Payment Methods
  getPaymentMethods: () => client.get('/me/payment-methods'),
  deletePaymentMethod: (id: string) => client.delete(`/me/payment-methods/${id}`),
  setDefaultPaymentMethod: (id: string) => client.put(`/me/payment-methods/${id}/default`),

  // Billing (Anniversary Billing System)
  getBillingOverview: () => client.get('/billing'),
  createDeposit: (amount: number) => client.post('/billing/deposit', { amount }),
  getBillingProfile: () => client.get('/billing/profile'),
  updateBillingProfile: (data: {
    billing_name?: string;
    billing_cui?: string;
    billing_reg_com?: string;
    billing_address?: string;
    billing_city?: string;
    billing_county?: string;
    billing_country?: string;
  }) => client.put('/billing/profile', data),
  getBillingSettings: () => client.get('/billing/settings'),
  updateBillingSettings: (data: { auto_refill_enabled?: boolean }) =>
    client.put('/billing/settings', data),
  getInvoices: () => client.get('/billing/invoices'),

  // Plans
  getPlans: () => client.get('/plans'),

  // Phones
  getPhones: () => client.get('/phones'),
  createPhone: (data: { name: string; hub_server_id: string }) =>
    client.post('/phones', data),
  getPhone: (id: string) => client.get(`/phones/${id}`),
  deletePhone: (id: string) => client.delete(`/phones/${id}`),
  updatePhone: (id: string, data: { name?: string }) => client.patch(`/phones/${id}`, data),
  rotateIP: (id: string) => client.post(`/phones/${id}/rotate-ip`),
  restartProxy: (id: string) => client.post(`/phones/${id}/restart`),
  findPhone: (id: string) => client.post(`/phones/${id}/find`),
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

  // Phone License
  getPhoneLicense: (phoneId: string) => client.get(`/phones/${phoneId}/license`),
  purchaseLicense: (phoneId: string, data: {
    plan_tier: 'lite' | 'turbo' | 'nitro';
    auto_extend?: boolean;
  }) => client.post(`/phones/${phoneId}/license`, data),
  startTrial: (phoneId: string) => client.post(`/phones/${phoneId}/license/trial`),
  updateLicense: (phoneId: string, data: { auto_extend?: boolean }) =>
    client.put(`/phones/${phoneId}/license`, data),
  cancelLicense: (phoneId: string) =>
    client.delete(`/phones/${phoneId}/license`),
  previewPlanChange: (phoneId: string, planTier: 'lite' | 'turbo' | 'nitro') =>
    client.get(`/phones/${phoneId}/license/change-preview?plan_tier=${planTier}`),
  changePlan: (phoneId: string, data: {
    plan_tier: 'lite' | 'turbo' | 'nitro';
    confirm_no_refund?: boolean;
  }) => client.put(`/phones/${phoneId}/license/change`, data),

  // Phone Domain Blocking
  getPhoneBlockedDomains: (phoneId: string) => client.get(`/phones/${phoneId}/blocked-domains`),
  updatePhoneBlockedDomains: (phoneId: string, blockedDomains: string[]) =>
    client.put(`/phones/${phoneId}/blocked-domains`, { blocked_domains: blockedDomains }),

  // Usage & Uptime (supports date range: start_date, end_date in YYYY-MM-DD format)
  getPhoneDataUsage: (phoneId: string, startDate?: string, endDate?: string, credentialId?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (credentialId) params.append('credential_id', credentialId);
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
  searchUsers: (query: string) => client.get(`/users/search?q=${encodeURIComponent(query)}`),
  getUserStats: () => client.get('/users/stats'),
  updateUserRole: (id: string, role: string) =>
    client.put(`/users/${id}/role`, { role }),
  deleteUser: (id: string) => client.delete(`/users/${id}`),
  adjustUserBalance: (userId: string, data: {
    amount: number;
    type: 'credit' | 'debit';
    description?: string;
  }) => client.post(`/admin/users/${userId}/balance`, data),
  impersonateUser: (userId: string) => client.post(`/users/${userId}/impersonate`),
  stopImpersonation: () => client.post('/auth/stop-impersonation'),

  // Fleet Management (admin) - OTA Updates
  uploadHubAgentBinary: (file: File, version: string) => {
    const formData = new FormData();
    formData.append('binary', file);
    formData.append('version', version);
    return client.post('/fleet/binary', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getLatestBinaryInfo: () => client.get('/fleet/binary'),
  getFleetVersions: () => client.get('/fleet/versions'),
  triggerServerUpdate: (serverId: string) =>
    client.post(`/fleet/update/${serverId}`),
  triggerFleetUpdate: (targetVersion: string) =>
    client.post('/fleet/update', { target_version: targetVersion }),

  // Access Logs (per-phone)
  getPhoneAccessLogs: (phoneId: string, params?: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    domain?: string;
    credential_id?: string;
    blocked?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.domain) searchParams.append('domain', params.domain);
    if (params?.credential_id) searchParams.append('credential_id', params.credential_id);
    if (params?.blocked !== undefined) searchParams.append('blocked', String(params.blocked));
    const query = searchParams.toString();
    return client.get(`/phones/${phoneId}/access-logs${query ? `?${query}` : ''}`);
  },
  getPhoneDomainStats: (phoneId: string, params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    const query = searchParams.toString();
    return client.get(`/phones/${phoneId}/domain-stats${query ? `?${query}` : ''}`);
  },

  // Log Retention
  getPhoneLogRetention: (phoneId: string) => client.get(`/phones/${phoneId}/log-retention`),
  updatePhoneLogRetention: (phoneId: string, weeks: number) =>
    client.put(`/phones/${phoneId}/log-retention`, { log_retention_weeks: weeks }),

  // API Keys
  getAPIKeys: () => client.get('/api-keys'),
  createAPIKey: (data: {
    name: string;
    scope?: 'all' | 'groups';
    group_ids?: string[];
  }) => client.post('/api-keys', data),
  updateAPIKey: (id: string, data: {
    name?: string;
    scope?: 'all' | 'groups';
    group_ids?: string[];
    is_active?: boolean;
  }) => client.put(`/api-keys/${id}`, data),
  deleteAPIKey: (id: string) => client.delete(`/api-keys/${id}`),

  // Access Logs (admin - all phones)
  getAllAccessLogs: (params?: {
    limit?: number;
    offset?: number;
    phone_id?: string;
    credential_id?: string;
    client_ip?: string;
    domain?: string;
    start_date?: string;
    end_date?: string;
    blocked?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));
    if (params?.phone_id) searchParams.append('phone_id', params.phone_id);
    if (params?.credential_id) searchParams.append('credential_id', params.credential_id);
    if (params?.client_ip) searchParams.append('client_ip', params.client_ip);
    if (params?.domain) searchParams.append('domain', params.domain);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.blocked !== undefined) searchParams.append('blocked', String(params.blocked));
    const query = searchParams.toString();
    return client.get(`/admin/access-logs${query ? `?${query}` : ''}`);
  },
  getAccessLogStats: () => client.get('/admin/access-logs/stats'),
};

export default client;
