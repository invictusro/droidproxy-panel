import type { PhoneWithStatus, ConnectionCredential, RotationToken, PhoneLicense, Plan, PlanChangePreview, PlanTier, ProxyType, AuthType } from '../../types';

export type RotationMode = 'off' | 'timed' | 'api';
export type MainSection = 'overview' | 'license' | 'credentials' | 'rotation' | 'traffic' | 'uptime' | 'restrictions' | 'device' | 'actions';
export type TrafficSubTab = 'monthly' | 'daily';
export type DeviceSubTab = 'metrics' | 'info';

export interface DataUsage {
  phone_id: string;
  phone_name: string;
  start_date: string;
  end_date: string;
  total: { bytes_in: number; bytes_out: number; total: number };
  daily: { date: string; bytes_in: number; bytes_out: number; total: number }[];
}

export interface UptimeData {
  phone_id: string;
  phone_name: string;
  start_date: string;
  end_date: string;
  last_24_hours: number;
  period_average: number;
  current_status: string;
  daily: { date: string; online_minutes: number; uptime_percentage: number }[];
  hourly: { hour: number; uptime: number; minutes: number }[];
}

export interface CredentialFormData {
  name: string;
  auth_type: AuthType;
  proxy_type: ProxyType;
  allowed_ip: string;
  username: string;
  password: string;
  expires_at: string;
}

export interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  planTier?: string;
  planPrice?: string;
  isError?: boolean;
}

// Re-export types from main types file
export type { PhoneWithStatus, ConnectionCredential, RotationToken, PhoneLicense, Plan, PlanChangePreview, PlanTier, ProxyType, AuthType };
