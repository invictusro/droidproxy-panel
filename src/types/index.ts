export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'user' | 'admin';
  balance: number; // Balance in cents
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
  // Server specs (set once when adding)
  vcpus?: number;
  cpu_benchmark_single?: number; // sysbench events/sec single core
  cpu_benchmark_all?: number;    // sysbench events/sec all cores
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

// Plan tier types
export type PlanTier = 'lite' | 'turbo' | 'nitro';

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
  log_retention_weeks?: number; // Access log retention (derived from plan)

  // Plan/License fields
  plan_tier?: PlanTier;
  license_expires_at?: string;
  license_auto_extend?: boolean;
  speed_limit_mbps?: number;
  max_connections?: number;
  has_active_license?: boolean;
  active_connections?: number; // Current active proxy connections (from hub reports)

  // Domain blocking (phone level)
  blocked_domains?: string[];

  // Device metrics
  battery_level?: number;
  battery_health?: string;
  battery_charging?: boolean;
  battery_temp?: number;
  ram_used_mb?: number;
  ram_total_mb?: number;
  device_model?: string;
  os_version?: string;
  metrics_updated_at?: string;

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

// Balance & Transactions
export interface BalanceResponse {
  balance: number;
  balance_formatted: string;
  updated_at?: string;
}

export type TransactionType = 'credit' | 'debit';
export type TransactionReason = 'license_purchase' | 'license_renewal' | 'admin_credit' | 'admin_debit' | 'refund';

export interface BalanceTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  amount_delta: number; // Positive or negative based on type
  reason: TransactionReason;
  reference_id?: string;
  description: string;
  created_at: string;
}

// License
export type LicenseStatus = 'active' | 'expired' | 'cancelled';

export interface PlanLimits {
  speed_limit_mbps: number;
  max_connections: number;
  log_weeks: number;
}

export interface PhoneLicense {
  id: string;
  phone_id: string;
  plan_tier: PlanTier;
  price_paid: number;
  started_at: string;
  expires_at: string;
  auto_extend: boolean;
  status: LicenseStatus;
  days_remaining: number;
  limits: PlanLimits;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  price_cents: number;
  price_formatted: string;
  limits: PlanLimits;
}

export interface PlanChangePreview {
  change_type: 'upgrade' | 'downgrade';
  current_plan: PlanTier;
  new_plan: PlanTier;
  current_price: number;
  new_price: number;
  total_days?: number;
  days_remaining: number;
  price_difference?: number;
  charge_amount?: number;
  refund_amount?: number;
  current_balance?: number;
  balance_after?: number;
  can_afford?: boolean;
  warning?: string;
  requires_confirmation?: boolean;
  expires_at: string;
  new_limits: PlanLimits;
}
