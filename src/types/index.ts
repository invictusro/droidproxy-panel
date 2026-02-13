export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Server {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
  // Admin-only fields
  ip?: string;
  wireguard_port?: number;
  proxy_port_start?: number;
  proxy_port_end?: number;
  hub_api_port?: number;
  has_hub_api_key?: boolean;
  phone_count?: number;
  // Telemetry fields (real-time from hub-agent)
  cpu_percent?: number;
  memory_percent?: number;
  bandwidth_in?: number;
  bandwidth_out?: number;
  last_heartbeat?: string;
  // OTA version tracking
  current_version?: string;
}

export interface ServerTelemetry {
  cpu_percent: number;
  memory_percent: number;
  disk_percent?: number;
  bandwidth_in_rate?: number;
  bandwidth_out_rate?: number;
  wireguard_status: string;
  status: string;
}

// Alias for clarity - API uses "servers" endpoint but model is HubServer
export type HubServer = Server;

export interface CredentialSummary {
  auth_type: AuthType;
  proxy_type: ProxyType;
  username?: string;
  allowed_ip?: string;
  port?: number;
}

// Phone data from API (without real-time status)
export interface Phone {
  id: string;
  name: string;
  paired_at?: string;
  hub_server_ip?: string;
  proxy_domain?: string; // DNS domain for proxy (e.g., "abc123def.cn.yalx.in")
  hub_server?: Server;
  first_credential?: CredentialSummary;
  sim_country?: string;  // ISO country code (e.g., "US", "GB")
  sim_carrier?: string;  // Carrier name
  log_retention_weeks?: number; // Access log retention (1-12 weeks)
  created_at: string;
}

// Real-time status from Centrifugo (not stored in database)
export type PhoneStatus = 'pending' | 'online' | 'offline';

// Phone with real-time status merged from Centrifugo
export interface PhoneWithStatus extends Phone {
  status: PhoneStatus;
  last_seen?: string;
  rotation_capability?: string; // e.g., "IP rotation available (Digital Assistant)" or "not available"
  active_connections?: number;
  total_connections?: number;
}

export interface PhoneWithPairing {
  phone: Phone;
  pairing_code: string;
  pairing_pin: string;
  qr_code_data: string;
}

export interface PhoneStats {
  phone_id: string;
  active_connections: number;
  total_connections: number;
  recorded_at: string;
}

export type ProxyType = 'socks5' | 'http' | 'both';
export type AuthType = 'ip' | 'userpass';

export interface ConnectionCredential {
  id: string;
  phone_id: string;
  name: string;
  auth_type: AuthType;
  proxy_type: ProxyType;
  allowed_ip?: string;
  username?: string;
  password?: string; // Only available right after creation
  has_password: boolean;
  bandwidth_limit?: number;
  bandwidth_used: number;
  connection_count: number;
  expires_at?: string;
  proxy_domain?: string; // DNS domain for this credential (e.g., "abc123.cn.yalx.in")
  blocked_domains?: string[]; // Domain blocking patterns (e.g., "*.example.com", "example.com:443")
  port: number; // Each credential has its own port
  is_active: boolean;
  last_used?: string;
  created_at: string;
}

export interface RotationToken {
  id: string;
  phone_id: string;
  token?: string;
  endpoint: string;
  is_active: boolean;
  last_used?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  centrifugoToken: string | null;
  centrifugoUrl: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface PhoneGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  phone_count: number;
  phone_ids: string[];
  created_at: string;
}

export interface MassActionResult {
  total: number;
  succeeded: number;
  failed: number;
  errors?: string[];
}

export interface ExportResult {
  format: string;
  content: string;
  lines?: string[];
}

export interface AccessLog {
  id: string;
  credential_id: string;
  credential_name?: string;
  phone_id: string;
  phone_name?: string;
  client_ip: string;
  domain: string;
  port: number;
  protocol: string;
  bytes_in: number;
  bytes_out: number;
  duration_ms: number;
  blocked: boolean;
  timestamp: string;
}

export interface DomainStats {
  domain: string;
  access_count: number;
  bytes_in: number;
  bytes_out: number;
  last_access: string;
}

export interface AccessLogFilter {
  phone_id?: string;
  credential_id?: string;
  client_ip?: string;
  domain?: string;
  start_date?: string;
  end_date?: string;
  blocked?: boolean;
  limit?: number;
  offset?: number;
}
