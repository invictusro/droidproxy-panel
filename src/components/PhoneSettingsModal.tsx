import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, RefreshCw, RotateCw, Power, Check, Clock, Zap, ArrowUp, ArrowDown, Shield, ChevronLeft, ChevronRight, Activity, Database, Download, CreditCard, Smartphone, Battery, Cpu, Info, Settings, AlertTriangle, Calendar } from 'lucide-react';
import { api } from '../api/client';
import type { PhoneWithStatus, ConnectionCredential, RotationToken, ProxyType, AuthType, PhoneLicense, Plan } from '../types';

type RotationMode = 'off' | 'timed' | 'api';
type MainSection = 'overview' | 'license' | 'credentials' | 'rotation' | 'traffic' | 'uptime' | 'restrictions' | 'device' | 'actions';
type TrafficSubTab = 'monthly' | 'daily';
type DeviceSubTab = 'metrics' | 'info';

interface DataUsage {
  phone_id: string;
  phone_name: string;
  start_date: string;
  end_date: string;
  total: { bytes_in: number; bytes_out: number; total: number };
  daily: { date: string; bytes_in: number; bytes_out: number; total: number }[];
}

interface UptimeData {
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

interface Props {
  phone: PhoneWithStatus;
  onClose: () => void;
  onRotateIP: () => void;
  onRestart: () => void;
  onDelete: () => void;
  isRotating: boolean;
  isRestarting: boolean;
}

export default function PhoneSettingsModal({
  phone,
  onClose,
  onRotateIP,
  onRestart,
  onDelete,
  isRotating,
  isRestarting
}: Props) {
  // Auto-select license tab if phone has no license
  const [hasLicense, setHasLicense] = useState(phone.has_active_license);
  const [activeSection, setActiveSection] = useState<MainSection>(hasLicense ? 'overview' : 'license');
  const [trafficSubTab, setTrafficSubTab] = useState<TrafficSubTab>('monthly');
  const [deviceSubTab, setDeviceSubTab] = useState<DeviceSubTab>('metrics');

  const [credentials, setCredentials] = useState<ConnectionCredential[]>([]);
  const [rotationToken, setRotationToken] = useState<RotationToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // License state
  const [license, setLicense] = useState<PhoneLicense | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingLicense, setLoadingLicense] = useState(false);
  const [purchasingLicense, setPurchasingLicense] = useState(false);

  // Phone-level blocked domains
  const [phoneBlockedDomains, setPhoneBlockedDomains] = useState<string[]>([]);
  const [newPhoneDomainPattern, setNewPhoneDomainPattern] = useState('');
  const [savingPhoneBlockedDomains, setSavingPhoneBlockedDomains] = useState(false);

  // Usage & Uptime state
  const [dataUsage, setDataUsage] = useState<DataUsage | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageDateRange, setUsageDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [uptimeSelectedDate, setUptimeSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Rotation settings state
  const [rotationMode, setRotationMode] = useState<RotationMode>('off');
  const [rotationInterval, setRotationInterval] = useState(30);
  const [savingRotation, setSavingRotation] = useState(false);

  // Form state for credentials
  const [formData, setFormData] = useState({
    name: '',
    auth_type: 'ip' as AuthType,
    proxy_type: 'socks5' as ProxyType,
    allowed_ip: '',
    username: '',
    password: '',
    expires_at: '',
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    planTier?: string;
    planPrice?: string;
    isError?: boolean;
  }>({ show: false, title: '', message: '' });
  const [purchaseAutoExtend, setPurchaseAutoExtend] = useState(true);

  // Access Logs state
  const [exportingLogs, setExportingLogs] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [phone.id]);

  // Force license tab when phone has no license
  useEffect(() => {
    if (!hasLicense && activeSection !== 'license') {
      setActiveSection('license');
    }
  }, [hasLicense, activeSection]);

  useEffect(() => {
    if (activeSection === 'traffic' || activeSection === 'uptime') {
      loadUsageData();
    }
  }, [activeSection, usageDateRange, uptimeSelectedDate]);

  useEffect(() => {
    if (activeSection === 'license') {
      loadLicenseData();
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'restrictions') {
      setPhoneBlockedDomains(phone.blocked_domains || []);
    }
  }, [activeSection, phone.blocked_domains]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [credRes, tokenRes, rotationRes] = await Promise.all([
        api.getCredentials(phone.id),
        api.getRotationToken(phone.id),
        api.getRotationSettings(phone.id),
      ]);
      setCredentials(credRes.data.credentials || []);
      setRotationToken(tokenRes.data.rotation_token);
      setRotationMode(rotationRes.data.rotation_mode || 'off');
      setRotationInterval(rotationRes.data.rotation_interval_minutes || 30);
    } catch (error) {
      console.error('Failed to load phone settings:', error);
    }
    setLoading(false);
  };

  const loadLicenseData = async () => {
    setLoadingLicense(true);
    try {
      const res = await api.getPhoneLicense(phone.id);
      if (res.data.has_license) {
        setLicense(res.data.license);
      } else {
        setLicense(null);
      }
      setPlans(res.data.plans || []);
    } catch (error) {
      console.error('Failed to load license:', error);
    }
    setLoadingLicense(false);
  };

  const handlePurchaseLicense = (planTier: string) => {
    const plan = plans.find(p => p.tier === planTier);
    setPurchaseAutoExtend(true); // Reset to enabled by default
    setConfirmModal({
      show: true,
      title: 'Confirm Purchase',
      message: `Purchase ${planTier.toUpperCase()} plan for this phone?`,
      planTier,
      planPrice: plan?.price_formatted || '',
    });
  };

  const confirmPurchase = async () => {
    if (!confirmModal.planTier) return;
    setConfirmModal(prev => ({ ...prev, show: false }));
    setPurchasingLicense(true);
    try {
      await api.purchaseLicense(phone.id, { plan_tier: confirmModal.planTier as any, auto_extend: purchaseAutoExtend });
      await loadLicenseData();
      // Unlock other sections after successful purchase
      setHasLicense(true);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to purchase license';
      setConfirmModal({
        show: true,
        title: 'Purchase Failed',
        message: msg,
        isError: true,
      });
    }
    setPurchasingLicense(false);
  };

  const handleToggleAutoExtend = async () => {
    if (!license) return;
    try {
      await api.updateLicense(phone.id, { auto_extend: !license.auto_extend });
      await loadLicenseData();
    } catch (error) {
      console.error('Failed to update license:', error);
    }
  };

  const getDateRange = (range: string): { start: string; end: string } => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start = end;
    if (range === '7d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (range === '30d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (range === '90d') {
      const d = new Date(today);
      d.setDate(d.getDate() - 90);
      start = d.toISOString().split('T')[0];
    }
    return { start, end };
  };

  const loadUsageData = async () => {
    setLoadingUsage(true);
    try {
      const usageRange = getDateRange(usageDateRange);
      const [usageRes, uptimeRes] = await Promise.all([
        api.getPhoneDataUsage(phone.id, usageRange.start, usageRange.end),
        api.getPhoneUptime(phone.id, uptimeSelectedDate, uptimeSelectedDate),
      ]);
      setDataUsage(usageRes.data);
      setUptimeData(uptimeRes.data);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
    setLoadingUsage(false);
  };

  const handleSaveRotationSettings = async (mode: RotationMode, interval?: number) => {
    setSavingRotation(true);
    try {
      await api.updateRotationSettings(phone.id, {
        rotation_mode: mode,
        rotation_interval_minutes: interval || rotationInterval,
      });
      setRotationMode(mode);
      if (interval !== undefined) setRotationInterval(interval);
    } catch (error) {
      console.error('Failed to save rotation settings:', error);
    }
    setSavingRotation(false);
  };

  const handleAddCredential = async () => {
    try {
      const data: any = {
        name: formData.name,
        auth_type: formData.auth_type,
        proxy_type: formData.proxy_type,
      };
      if (formData.auth_type === 'ip') {
        data.allowed_ip = formData.allowed_ip;
      } else {
        data.username = formData.username;
        data.password = formData.password;
      }
      if (formData.expires_at) {
        data.expires_at = formData.expires_at;
      }
      await api.createCredential(phone.id, data);
      setShowAddForm(false);
      setFormData({ name: '', auth_type: 'ip', proxy_type: 'socks5', allowed_ip: '', username: '', password: '', expires_at: '' });
      loadData();
    } catch (error) {
      console.error('Failed to create credential:', error);
    }
  };

  const handleDeleteCredential = async (credId: string) => {
    if (!confirm('Delete this credential?')) return;
    try {
      await api.deleteCredential(phone.id, credId);
      loadData();
    } catch (error) {
      console.error('Failed to delete credential:', error);
    }
  };

  const handleToggleCredential = async (cred: ConnectionCredential) => {
    try {
      await api.updateCredential(phone.id, cred.id, { is_active: !cred.is_active });
      loadData();
    } catch (error) {
      console.error('Failed to toggle credential:', error);
    }
  };

  // Phone-level domain blocking
  const handleAddPhoneDomainPattern = () => {
    const pattern = newPhoneDomainPattern.trim();
    if (!pattern) return;
    setPhoneBlockedDomains([...phoneBlockedDomains, pattern]);
    setNewPhoneDomainPattern('');
  };

  const handleRemovePhoneDomainPattern = (index: number) => {
    setPhoneBlockedDomains(phoneBlockedDomains.filter((_, i) => i !== index));
  };

  const handleSavePhoneBlockedDomains = async () => {
    setSavingPhoneBlockedDomains(true);
    try {
      await api.updatePhoneBlockedDomains(phone.id, phoneBlockedDomains);
    } catch (error) {
      console.error('Failed to save blocked domains:', error);
    }
    setSavingPhoneBlockedDomains(false);
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate rotation token? The old token will stop working.')) return;
    try {
      const res = await api.regenerateRotationToken(phone.id);
      setRotationToken(res.data.rotation_token);
    } catch (error) {
      console.error('Failed to regenerate token:', error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getProxyTypeLabel = (type: ProxyType) => {
    switch (type) {
      case 'socks5': return 'SOCKS5';
      case 'http': return 'HTTP';
      case 'both': return 'Both';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getConnectionStrings = (cred: ConnectionCredential) => {
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

  const exportLogsCSV = async () => {
    setExportingLogs(true);
    try {
      let allLogs: any[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const res = await api.getPhoneAccessLogs(phone.id, { limit, offset, start_date: exportStartDate, end_date: exportEndDate });
        const logs = res.data.logs || [];
        allLogs = allLogs.concat(logs);
        hasMore = logs.length === limit;
        offset += limit;
      }

      if (allLogs.length === 0) {
        alert('No logs found for the selected date range.');
        setExportingLogs(false);
        return;
      }

      const headers = ['Timestamp', 'Domain', 'Port', 'Protocol', 'Client IP', 'Credential', 'Bytes In', 'Bytes Out', 'Duration (ms)', 'Blocked'];
      const rows = allLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.domain, log.port, log.protocol, log.client_ip, log.credential_name || '',
        log.bytes_in, log.bytes_out, log.duration_ms, log.blocked ? 'Yes' : 'No'
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `access-logs-${phone.name}-${exportStartDate}-to-${exportEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export access logs:', error);
      alert('Failed to export logs.');
    }
    setExportingLogs(false);
  };

  const getMinExportDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - (12 * 7));
    return d.toISOString().split('T')[0];
  };

  // Generate 5-minute intervals for uptime display
  const get5MinIntervals = () => {
    const intervals: { time: string; status: 'online' | 'offline' | 'nodata' }[] = [];
    // For now, we simulate based on hourly data. In production, backend would provide 5-min data.
    if (uptimeData?.hourly) {
      for (let hour = 0; hour < 24; hour++) {
        const hourData = uptimeData.hourly.find(h => h.hour === hour);
        for (let min = 0; min < 60; min += 5) {
          const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          if (!hourData) {
            intervals.push({ time: timeStr, status: 'nodata' });
          } else if (hourData.uptime >= 80) {
            intervals.push({ time: timeStr, status: 'online' });
          } else if (hourData.uptime > 0) {
            // Partial uptime - simulate some offline periods
            intervals.push({ time: timeStr, status: min < 30 && hourData.uptime < 50 ? 'offline' : 'online' });
          } else {
            intervals.push({ time: timeStr, status: 'offline' });
          }
        }
      }
    } else {
      for (let hour = 0; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 5) {
          intervals.push({ time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`, status: 'nodata' });
        }
      }
    }
    return intervals;
  };

  const navigateUptimeDate = (direction: 'prev' | 'next') => {
    const d = new Date(uptimeSelectedDate);
    d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1));
    setUptimeSelectedDate(d.toISOString().split('T')[0]);
  };

  const menuItems: { id: MainSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
    { id: 'license', label: 'License', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'credentials', label: 'Credentials', icon: <Settings className="w-4 h-4" /> },
    { id: 'rotation', label: 'Rotation', icon: <RotateCw className="w-4 h-4" /> },
    { id: 'traffic', label: 'Traffic', icon: <Database className="w-4 h-4" /> },
    { id: 'uptime', label: 'Uptime', icon: <Activity className="w-4 h-4" /> },
    { id: 'restrictions', label: 'Restrictions', icon: <Shield className="w-4 h-4" /> },
    { id: 'device', label: 'Device', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'actions', label: 'Actions', icon: <Power className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-zinc-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${phone.status === 'online' ? 'bg-emerald-500' : phone.status === 'offline' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">{phone.name}</h2>
              <p className="text-sm text-zinc-500">{phone.hub_server?.location}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Main Content with Left Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-48 bg-zinc-50 border-r border-zinc-200 py-2 shrink-0 overflow-y-auto">
            {menuItems.map((item) => {
              const isLicenseItem = item.id === 'license';
              const isLocked = !hasLicense && !isLicenseItem;
              const needsAttention = !hasLicense && isLicenseItem;
              // Restrictions only available for Turbo/Nitro plans - use license state for live updates
              const currentPlanTier = license?.plan_tier || phone.plan_tier;
              const isRestrictionsLocked = item.id === 'restrictions' && currentPlanTier !== 'turbo' && currentPlanTier !== 'nitro';
              const isDisabled = isLocked || isRestrictionsLocked;

              return (
                <button
                  key={item.id}
                  onClick={() => !isDisabled && setActiveSection(item.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isDisabled
                      ? 'text-zinc-300 cursor-not-allowed'
                      : activeSection === item.id
                        ? 'bg-emerald-100 text-emerald-700 font-medium border-r-2 border-emerald-600'
                        : needsAttention
                          ? 'text-red-600 bg-red-50 border-r-2 border-red-500 font-medium'
                          : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {needsAttention ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    item.icon
                  )}
                  {item.label}
                  {isRestrictionsLocked && (
                    <span className="ml-auto text-[10px] text-zinc-400">Turbo+</span>
                  )}
                  {needsAttention && activeSection !== 'license' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <>
                {/* Overview Section */}
                {activeSection === 'overview' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-zinc-900">Phone Overview</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <p className="text-xs text-zinc-500 mb-1">Status</p>
                        <p className={`text-lg font-semibold ${phone.status === 'online' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {phone.status === 'online' ? 'Online' : phone.status === 'offline' ? 'Offline' : 'Pending'}
                        </p>
                      </div>
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <p className="text-xs text-zinc-500 mb-1">Plan</p>
                        <p className={`text-lg font-semibold ${phone.plan_tier ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {phone.plan_tier ? phone.plan_tier.charAt(0).toUpperCase() + phone.plan_tier.slice(1) : 'No Plan'}
                        </p>
                      </div>
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <p className="text-xs text-zinc-500 mb-1">Credentials</p>
                        <p className="text-lg font-semibold text-zinc-900">{credentials.length}</p>
                      </div>
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <p className="text-xs text-zinc-500 mb-1">Active Connections</p>
                        <p className="text-lg font-semibold text-zinc-900">{phone.active_connections || 0}</p>
                      </div>
                    </div>

                    {/* License Warning */}
                    {!phone.has_active_license && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">No Active License</p>
                          <p className="text-xs text-amber-600 mt-1">This phone requires a license to use proxy features. Go to the License tab to purchase a plan.</p>
                        </div>
                      </div>
                    )}

                    {/* Device Info Summary */}
                    {phone.device_model && (
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <h4 className="text-sm font-medium text-zinc-700 mb-2">Device</h4>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Smartphone className="w-4 h-4" />
                            <span>{phone.device_model}</span>
                          </div>
                          {phone.os_version && (
                            <span className="text-zinc-400">{phone.os_version}</span>
                          )}
                          {phone.battery_level !== undefined && (
                            <div className="flex items-center gap-1 text-zinc-600">
                              <Battery className="w-4 h-4" />
                              <span>{phone.battery_level}%</span>
                              {phone.battery_charging && <Zap className="w-3 h-3 text-amber-500" />}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* License Section */}
                {activeSection === 'license' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-zinc-900">License</h3>

                    {loadingLicense ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      </div>
                    ) : license && license.status === 'active' ? (
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-xs text-emerald-600 font-medium">Active Plan</p>
                              <p className="text-2xl font-bold text-emerald-700">{license.plan_tier.toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-emerald-700">Expires {new Date(license.expires_at).toLocaleDateString('en-GB')}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-emerald-200">
                            <div>
                              <p className="text-xs text-emerald-600">Speed</p>
                              <p className="font-medium text-emerald-800">{license.limits.speed_limit_mbps} Mbit/s</p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600">Connections</p>
                              <p className="font-medium text-emerald-800">{license.limits.max_connections}</p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600">Log Retention</p>
                              <p className="font-medium text-emerald-800">{license.limits.log_weeks} weeks</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                          <label className="flex items-center justify-between cursor-pointer">
                            <div>
                              <p className="text-sm font-medium text-zinc-700">Auto-Extend License</p>
                              <p className="text-xs text-zinc-500 mt-0.5">Automatically renew from balance when license expires</p>
                            </div>
                            <button
                              onClick={handleToggleAutoExtend}
                              className={`w-12 h-6 rounded-full transition-colors ${license.auto_extend ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${license.auto_extend ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                          </label>
                        </div>
                      </div>
                    ) : license && license.status === 'expired' ? (
                      /* Expired License */
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-xs text-red-600 font-medium">Expired Plan</p>
                              <p className="text-2xl font-bold text-red-700">{license.plan_tier.toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-red-600">Expired</p>
                              <p className="text-sm text-red-700">{new Date(license.expires_at).toLocaleDateString('en-GB')}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-red-200 mb-4">
                            <div>
                              <p className="text-xs text-red-600">Speed</p>
                              <p className="font-medium text-red-800">{license.limits.speed_limit_mbps} Mbit/s</p>
                            </div>
                            <div>
                              <p className="text-xs text-red-600">Connections</p>
                              <p className="font-medium text-red-800">{license.limits.max_connections}</p>
                            </div>
                            <div>
                              <p className="text-xs text-red-600">Log Retention</p>
                              <p className="font-medium text-red-800">{license.limits.log_weeks} weeks</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePurchaseLicense(license.plan_tier)}
                            disabled={purchasingLicense}
                            className="w-full py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                          >
                            {purchasingLicense ? 'Processing...' : `Extend ${license.plan_tier.toUpperCase()} Plan`}
                          </button>
                        </div>

                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                          <p className="text-sm text-zinc-600 mb-2">Or switch to a different plan:</p>
                          <div className="flex gap-2">
                            {plans.filter(p => p.tier !== license.plan_tier).map((plan) => (
                              <button
                                key={plan.tier}
                                onClick={() => handlePurchaseLicense(plan.tier)}
                                disabled={purchasingLicense}
                                className="flex-1 py-2 px-3 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
                              >
                                {plan.name} ({plan.price_formatted})
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-sm text-amber-800">
                            <strong>Note:</strong> Your proxy credentials have been disabled. Extend your license to re-enable them.
                            Phone data will be deleted in 14 days if not renewed.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-sm text-amber-800">No active license. Select a plan below to activate proxy features.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          {plans.map((plan) => {
                            const isPopular = plan.tier === 'nitro';
                            const planDescriptions: Record<string, string> = {
                              lite: 'Basic browsing & light usage',
                              turbo: 'Streaming & daily use',
                              nitro: 'Reselling & API access',
                            };
                            return (
                              <div
                                key={plan.tier}
                                className={`relative p-4 bg-white rounded-xl border-2 transition-colors ${
                                  isPopular
                                    ? 'border-emerald-400 ring-2 ring-emerald-100'
                                    : 'border-zinc-200 hover:border-emerald-400'
                                }`}
                              >
                                {isPopular && (
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                      Popular
                                    </span>
                                  </div>
                                )}
                                <h4 className="text-lg font-bold text-zinc-900 mb-1">{plan.name}</h4>
                                <p className="text-xs text-zinc-500 mb-2">{planDescriptions[plan.tier]}</p>
                                <p className="text-2xl font-bold text-emerald-600 mb-4">{plan.price_formatted}</p>

                                <div className="space-y-2 text-sm mb-4">
                                  <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    <span className="text-zinc-700"><strong>{plan.limits.speed_limit_mbps}</strong> Mbit/s max speed</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    <span className="text-zinc-700">Up to <strong>{plan.limits.max_connections}</strong> connections</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-violet-500" />
                                    <span className="text-zinc-700">Logs for up to <strong>{plan.limits.log_weeks}</strong> weeks</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RotateCw className="w-4 h-4 text-rose-500" />
                                    <span className="text-zinc-700">IP rotation</span>
                                  </div>
                                  {(plan.tier === 'turbo' || plan.tier === 'nitro') ? (
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4 text-emerald-500" />
                                      <span className="text-zinc-700">Domain blocking</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4 text-zinc-300" />
                                      <span className="text-zinc-400 line-through">Domain blocking</span>
                                    </div>
                                  )}
                                  {plan.tier === 'nitro' ? (
                                    <div className="flex items-center gap-2">
                                      <Cpu className="w-4 h-4 text-indigo-500" />
                                      <span className="text-zinc-700">Reselling API</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Cpu className="w-4 h-4 text-zinc-300" />
                                      <span className="text-zinc-400 line-through">Reselling API</span>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => handlePurchaseLicense(plan.tier)}
                                  disabled={purchasingLicense}
                                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                                    isPopular
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                  }`}
                                >
                                  {purchasingLicense ? 'Processing...' : 'Select Plan'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Credentials Section */}
                {activeSection === 'credentials' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-zinc-900">Credentials</h3>
                      <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </button>
                    </div>

                    {/* Add Form */}
                    {showAddForm && (
                      <div className="mb-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="e.g., Home, Work"
                              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Auth Type</label>
                            <div className="flex gap-4">
                              <label className="flex items-center cursor-pointer">
                                <input type="radio" value="ip" checked={formData.auth_type === 'ip'} onChange={() => setFormData({ ...formData, auth_type: 'ip' })} className="mr-2" />
                                IP Whitelist
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input type="radio" value="userpass" checked={formData.auth_type === 'userpass'} onChange={() => setFormData({ ...formData, auth_type: 'userpass' })} className="mr-2" />
                                User/Pass
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Proxy Type</label>
                            <select value={formData.proxy_type} onChange={(e) => setFormData({ ...formData, proxy_type: e.target.value as ProxyType })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm">
                              <option value="socks5">SOCKS5</option>
                              <option value="http">HTTP</option>
                            </select>
                          </div>
                          {formData.auth_type === 'ip' ? (
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Allowed IP</label>
                              <input type="text" value={formData.allowed_ip} onChange={(e) => setFormData({ ...formData, allowed_ip: e.target.value })} placeholder="192.168.1.100" className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                            </div>
                          ) : (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
                                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                                <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                              </div>
                            </>
                          )}
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Expires At (optional)</label>
                            <input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button onClick={() => setShowAddForm(false)} className="px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
                          <button onClick={handleAddCredential} disabled={!formData.name || (formData.auth_type === 'ip' ? !formData.allowed_ip : !formData.username || !formData.password)} className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Add Credential</button>
                        </div>
                      </div>
                    )}

                    {/* Credentials List */}
                    {credentials.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500">No credentials yet. Add one to enable proxy connections.</div>
                    ) : (
                      <div className="space-y-3">
                        {credentials.map((cred) => (
                          <div key={cred.id} className={`p-4 border rounded-xl ${cred.is_active ? 'bg-white border-zinc-200' : 'bg-zinc-50 border-zinc-100 opacity-60'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-900">{cred.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-md ${cred.auth_type === 'ip' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
                                  {cred.auth_type === 'ip' ? 'IP' : 'User/Pass'}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">{getProxyTypeLabel(cred.proxy_type)}</span>
                                {cred.expires_at && (
                                  <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(cred.expires_at).toLocaleDateString('en-GB')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleToggleCredential(cred)} className={`px-3 py-1 text-xs rounded-md ${cred.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                                  {cred.is_active ? 'Active' : 'Disabled'}
                                </button>
                                <button onClick={() => handleDeleteCredential(cred.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              {getConnectionStrings(cred).map((conn, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-400 w-12 font-medium">{conn.type}:</span>
                                  <code className="flex-1 text-xs bg-zinc-100 px-2 py-1.5 rounded-md font-mono text-zinc-700 truncate">{conn.value}</code>
                                  <button onClick={() => copyToClipboard(conn.value, `${cred.id}-${conn.type}`)} className="p-1.5 hover:bg-zinc-100 rounded-lg">
                                    {copied === `${cred.id}-${conn.type}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rotation Section */}
                {activeSection === 'rotation' && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4">IP Rotation</h3>

                    {phone.rotation_capability?.includes('not available') && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-800">IP rotation not configured. Set DroidProxy as Digital Assistant to enable.</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {(['off', 'timed', 'api'] as const).map((mode) => (
                        <div key={mode} className={`p-4 border rounded-xl cursor-pointer transition-all ${rotationMode === mode ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200 hover:border-zinc-300'}`} onClick={() => mode !== rotationMode && handleSaveRotationSettings(mode)}>
                          <div className="flex items-center gap-3">
                            <input type="radio" checked={rotationMode === mode} readOnly className="text-emerald-600" />
                            <div>
                              <span className="font-medium text-zinc-900 capitalize">{mode === 'off' ? 'Off' : mode === 'timed' ? 'Timed' : 'API'}</span>
                              <p className="text-sm text-zinc-500">{mode === 'off' ? 'Manual rotation only' : mode === 'timed' ? 'Rotate at set intervals' : 'Trigger via API endpoint'}</p>
                            </div>
                          </div>
                          {mode === 'timed' && rotationMode === 'timed' && (
                            <div className="mt-4 ml-7">
                              <div className="flex items-center gap-3">
                                <input type="range" min="2" max="120" value={rotationInterval} onChange={(e) => setRotationInterval(parseInt(e.target.value))} className="flex-1 accent-emerald-600" />
                                <input type="number" min="2" max="120" value={rotationInterval} onChange={(e) => setRotationInterval(Math.max(2, Math.min(120, parseInt(e.target.value) || 2)))} className="w-16 px-2 py-1 border border-zinc-200 rounded-lg text-sm text-center" />
                                <span className="text-sm text-zinc-500">min</span>
                              </div>
                              <button onClick={() => handleSaveRotationSettings('timed', rotationInterval)} disabled={savingRotation} className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                                {savingRotation ? 'Saving...' : 'Save Interval'}
                              </button>
                            </div>
                          )}
                          {mode === 'api' && rotationMode === 'api' && rotationToken && (
                            <div className="mt-4 ml-7 space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">API Endpoint</label>
                                <div className="flex gap-2">
                                  <input type="text" value={rotationToken.endpoint} readOnly className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono" />
                                  <button onClick={() => copyToClipboard(rotationToken.endpoint, 'endpoint')} className="px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50">
                                    {copied === 'endpoint' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                                  </button>
                                </div>
                              </div>
                              <button onClick={handleRegenerateToken} className="flex items-center px-4 py-2 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Regenerate Token
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Traffic Section */}
                {activeSection === 'traffic' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-zinc-900">Traffic</h3>
                      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
                        {(['monthly', 'daily'] as const).map((tab) => (
                          <button key={tab} onClick={() => setTrafficSubTab(tab)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${trafficSubTab === tab ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {loadingUsage ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      </div>
                    ) : (
                      <>
                        {trafficSubTab === 'monthly' && dataUsage && (
                          <div className="space-y-4">
                            <div className="flex gap-1 mb-4">
                              {(['7d', '30d', '90d'] as const).map((period) => (
                                <button key={period} onClick={() => setUsageDateRange(period)} className={`px-2 py-1 text-xs rounded-md ${usageDateRange === period ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                                  {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                                </button>
                              ))}
                            </div>

                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-emerald-600">Total</p>
                                  <p className="text-2xl font-bold text-emerald-700">{formatBytes(dataUsage.total.total)}</p>
                                </div>
                                <div className="text-right text-xs text-emerald-600">
                                  <div className="flex items-center gap-1 justify-end"><ArrowDown className="w-3 h-3" />{formatBytes(dataUsage.total.bytes_in)}</div>
                                  <div className="flex items-center gap-1 justify-end mt-1"><ArrowUp className="w-3 h-3" />{formatBytes(dataUsage.total.bytes_out)}</div>
                                </div>
                              </div>
                            </div>

                            {/* Calendar-style monthly view */}
                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                              <p className="text-xs font-medium text-zinc-500 mb-3">Daily Breakdown</p>
                              <div className="grid grid-cols-7 gap-1">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                  <div key={d} className="text-[10px] text-zinc-400 text-center py-1">{d}</div>
                                ))}
                                {dataUsage.daily.slice(-30).map((day, idx) => {
                                  const maxTotal = Math.max(...dataUsage.daily.map(d => d.total), 1);
                                  const intensity = day.total / maxTotal;
                                  return (
                                    <div key={idx} className={`aspect-square rounded-sm flex flex-col items-center justify-center text-[9px] cursor-pointer transition-all hover:ring-2 hover:ring-emerald-400 ${intensity > 0.7 ? 'bg-emerald-500 text-white' : intensity > 0.3 ? 'bg-emerald-300 text-emerald-900' : intensity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`} title={`${formatDate(day.date)}: ${formatBytes(day.total)}`}>
                                      <span>{new Date(day.date + 'T00:00:00').getDate()}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {trafficSubTab === 'daily' && dataUsage && (
                          <div className="space-y-4">
                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                              <p className="text-xs font-medium text-zinc-500 mb-3">Hourly Usage (Today)</p>
                              <div className="flex items-end gap-1 h-32">
                                {Array.from({ length: 24 }, (_, hour) => {
                                  // Simulated hourly data - in production, backend would provide this
                                  const usage = Math.random() * 100000000;
                                  const maxUsage = 100000000;
                                  const height = (usage / maxUsage) * 100;
                                  return (
                                    <div key={hour} className="flex-1 flex flex-col items-center group">
                                      <div className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors" style={{ height: `${Math.max(4, height)}%` }} title={`${hour}:00 - ${formatBytes(usage)}`} />
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex justify-between text-[8px] text-zinc-400 mt-1">
                                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                              </div>
                            </div>

                            {/* Port filter would go here */}
                            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                              <p className="text-xs font-medium text-zinc-500 mb-2">Filter by Port</p>
                              <select className="px-3 py-2 border border-zinc-200 rounded-lg text-sm w-full">
                                <option value="">All Ports</option>
                                {credentials.map(c => <option key={c.id} value={c.port}>Port {c.port} ({c.name})</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Uptime Section */}
                {activeSection === 'uptime' && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4">Uptime</h3>

                    {/* Date Picker */}
                    <div className="flex items-center gap-4 mb-4">
                      <button onClick={() => navigateUptimeDate('prev')} className="p-2 hover:bg-zinc-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <input type="date" value={uptimeSelectedDate} onChange={(e) => setUptimeSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm" />
                      </div>
                      <button onClick={() => navigateUptimeDate('next')} disabled={uptimeSelectedDate >= new Date().toISOString().split('T')[0]} className="p-2 hover:bg-zinc-100 rounded-lg disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
                    </div>

                    {loadingUsage ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      </div>
                    ) : (
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm font-medium text-zinc-700">{new Date(uptimeSelectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Online</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500"></span> Offline</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-zinc-200"></span> No data</span>
                          </div>
                        </div>

                        {/* 5-minute intervals grid: 24 columns (hours) x 12 rows (5-min blocks) */}
                        <div className="space-y-1">
                          {Array.from({ length: 12 }, (_, row) => (
                            <div key={row} className="flex gap-0.5">
                              <span className="w-8 text-[8px] text-zinc-400 text-right pr-1">{String(row * 5).padStart(2, '0')}m</span>
                              {Array.from({ length: 24 }, (_, hour) => {
                                const intervals = get5MinIntervals();
                                const idx = hour * 12 + row;
                                const interval = intervals[idx];
                                return (
                                  <div
                                    key={hour}
                                    className={`flex-1 h-4 rounded-sm transition-colors ${
                                      interval?.status === 'online' ? 'bg-emerald-500' :
                                      interval?.status === 'offline' ? 'bg-red-500' : 'bg-zinc-200'
                                    }`}
                                    title={`${interval?.time}: ${interval?.status}`}
                                  />
                                );
                              })}
                            </div>
                          ))}
                          <div className="flex gap-0.5 mt-2">
                            <span className="w-8"></span>
                            {Array.from({ length: 24 }, (_, h) => (
                              <div key={h} className="flex-1 text-[8px] text-zinc-400 text-center">{String(h).padStart(2, '0')}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Restrictions Section */}
                {activeSection === 'restrictions' && (
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4">Restrictions</h3>
                    <p className="text-sm text-zinc-600 mb-4">Block domains for all credentials on this phone. Patterns: <code className="bg-zinc-200 px-1 rounded">example.com</code>, <code className="bg-zinc-200 px-1 rounded">*.example.com</code></p>

                    {/* Current blocked domains */}
                    {phoneBlockedDomains.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {phoneBlockedDomains.map((pattern, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                            <span className="font-mono">{pattern}</span>
                            <button onClick={() => handleRemovePhoneDomainPattern(idx)} className="hover:bg-red-200 rounded p-0.5"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add new pattern */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newPhoneDomainPattern}
                        onChange={(e) => setNewPhoneDomainPattern(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPhoneDomainPattern()}
                        placeholder="*.stripe.com"
                        className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                      />
                      <button onClick={handleAddPhoneDomainPattern} disabled={!newPhoneDomainPattern.trim()} className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300 disabled:opacity-50">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button onClick={handleSavePhoneBlockedDomains} disabled={savingPhoneBlockedDomains} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                      {savingPhoneBlockedDomains ? 'Saving...' : 'Save Restrictions'}
                    </button>
                  </div>
                )}

                {/* Device Section */}
                {activeSection === 'device' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-zinc-900">Device</h3>
                      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
                        {(['metrics', 'info'] as const).map((tab) => (
                          <button key={tab} onClick={() => setDeviceSubTab(tab)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${deviceSubTab === tab ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {deviceSubTab === 'metrics' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Battery className="w-5 h-5 text-emerald-600" />
                            <span className="text-sm font-medium text-zinc-700">Battery</span>
                          </div>
                          <p className="text-2xl font-bold text-zinc-900">{phone.battery_level ?? '--'}%</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                            {phone.battery_charging && <span className="flex items-center gap-1 text-amber-600"><Zap className="w-3 h-3" /> Charging</span>}
                            {phone.battery_health && <span>Health: {phone.battery_health}</span>}
                          </div>
                          {phone.battery_temp && <p className="text-xs text-zinc-400 mt-1">Temperature: {phone.battery_temp}°C</p>}
                        </div>

                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Cpu className="w-5 h-5 text-violet-600" />
                            <span className="text-sm font-medium text-zinc-700">Memory</span>
                          </div>
                          {phone.ram_total_mb ? (
                            <>
                              <p className="text-2xl font-bold text-zinc-900">{Math.round((phone.ram_used_mb || 0) / (phone.ram_total_mb || 1) * 100)}%</p>
                              <p className="text-sm text-zinc-500">{formatBytes((phone.ram_used_mb || 0) * 1024 * 1024)} / {formatBytes((phone.ram_total_mb || 0) * 1024 * 1024)}</p>
                            </>
                          ) : (
                            <p className="text-2xl font-bold text-zinc-400">--</p>
                          )}
                        </div>
                      </div>
                    )}

                    {deviceSubTab === 'info' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                          <p className="text-xs text-zinc-500 mb-1">Model</p>
                          <p className="text-lg font-medium text-zinc-900">{phone.device_model || 'Unknown'}</p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                          <p className="text-xs text-zinc-500 mb-1">Operating System</p>
                          <p className="text-lg font-medium text-zinc-900">{phone.os_version || 'Unknown'}</p>
                        </div>
                        {phone.sim_carrier && (
                          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                            <p className="text-xs text-zinc-500 mb-1">Carrier</p>
                            <p className="text-lg font-medium text-zinc-900">{phone.sim_carrier} {phone.sim_country && `(${phone.sim_country})`}</p>
                          </div>
                        )}
                        {phone.metrics_updated_at && (
                          <p className="text-xs text-zinc-400">Last updated: {new Date(phone.metrics_updated_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Section */}
                {activeSection === 'actions' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-4">Actions</h3>

                    <div className="p-4 border border-zinc-200 rounded-xl bg-white">
                      <h4 className="font-semibold text-zinc-900 mb-2">Rotate IP</h4>
                      {phone.rotation_capability && !phone.rotation_capability.includes('not available') ? (
                        <>
                          <p className="text-sm text-zinc-600 mb-3">Toggle mobile data to get a new IP address.</p>
                          <button onClick={onRotateIP} disabled={phone.status !== 'online' || isRotating} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                            <RotateCw className={`w-4 h-4 mr-2 ${isRotating ? 'animate-spin' : ''}`} />
                            {isRotating ? 'Rotating...' : 'Rotate IP'}
                          </button>
                        </>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800">IP rotation not available. Set DroidProxy as Digital Assistant.</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 border border-zinc-200 rounded-xl bg-white">
                      <h4 className="font-semibold text-zinc-900 mb-2">Restart Proxy</h4>
                      <p className="text-sm text-zinc-600 mb-3">Restart the proxy service on the phone.</p>
                      <button onClick={onRestart} disabled={isRestarting} className="flex items-center px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50">
                        <Power className={`w-4 h-4 mr-2 ${isRestarting ? 'animate-pulse' : ''}`} />
                        {isRestarting ? 'Restarting...' : 'Restart Proxy'}
                      </button>
                    </div>

                    <div className="p-4 border border-zinc-200 rounded-xl bg-white">
                      <h4 className="font-semibold text-zinc-900 mb-2">Export Logs</h4>
                      <div className="flex items-end gap-3">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">From</label>
                          <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} min={getMinExportDate()} max={exportEndDate} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">To</label>
                          <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} min={exportStartDate} max={new Date().toISOString().split('T')[0]} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg" />
                        </div>
                        <button onClick={exportLogsCSV} disabled={exportingLogs} className="flex items-center px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                          {exportingLogs ? 'Exporting...' : <><Download className="w-4 h-4 mr-2" /> Export CSV</>}
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-red-200 rounded-xl bg-red-50">
                      <h4 className="font-semibold text-red-800 mb-2">Danger Zone</h4>
                      <p className="text-sm text-red-600 mb-3">Delete this phone. This cannot be undone.</p>
                      <button onClick={onDelete} className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Phone
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">{confirmModal.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">{confirmModal.message}</p>
              {confirmModal.planTier && confirmModal.planPrice && (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-emerald-900 capitalize">{confirmModal.planTier}</span>
                        <span className="text-emerald-700 ml-2">Plan</span>
                      </div>
                      <div className="text-xl font-bold text-emerald-900">{confirmModal.planPrice}</div>
                    </div>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">Auto-extend license</div>
                      <div className="text-sm text-gray-500">Automatically renew when license expires</div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={purchaseAutoExtend}
                        onChange={(e) => setPurchaseAutoExtend(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${purchaseAutoExtend ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${purchaseAutoExtend ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  </label>
                </>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {confirmModal.isError ? 'Close' : 'Cancel'}
              </button>
              {!confirmModal.isError && (
                <button
                  onClick={confirmPurchase}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Confirm Purchase
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
