import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, RefreshCw, RotateCw, Power, Check, Clock, Zap, BarChart3, ArrowUp, ArrowDown, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';
import type { PhoneWithStatus, ConnectionCredential, RotationToken, ProxyType, AuthType } from '../types';

type RotationMode = 'off' | 'timed' | 'api';

interface DataUsage {
  phone_id: string;
  phone_name: string;
  this_month: { bytes_in: number; bytes_out: number; total: number };
  last_month: { bytes_in: number; bytes_out: number; total: number };
  daily_usage: { date: string; bytes_in: number; bytes_out: number; total: number }[];
}

interface UptimeData {
  phone_id: string;
  phone_name: string;
  last_24_hours: number;
  last_7_days: number;
  current_status: string;
  daily_uptime: { date: string; online_minutes: number; uptime_percentage: number }[];
}

interface Props {
  phone: PhoneWithStatus;
  onClose: () => void;
  onRotateIP: () => void;
  onRestart: () => void;
  onDelete: () => void;
  onPhoneUpdate?: (updates: Partial<PhoneWithStatus>) => void;
  isRotating: boolean;
  isRestarting: boolean;
}

export default function PhoneSettingsModal({
  phone,
  onClose,
  onRotateIP,
  onRestart,
  onDelete,
  onPhoneUpdate,
  isRotating,
  isRestarting
}: Props) {
  const [activeTab, setActiveTab] = useState<'credentials' | 'rotation' | 'usage' | 'actions'>('credentials');
  const [credentials, setCredentials] = useState<ConnectionCredential[]>([]);
  const [rotationToken, setRotationToken] = useState<RotationToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Usage & Uptime state
  const [dataUsage, setDataUsage] = useState<DataUsage | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Rotation settings state
  const [rotationMode, setRotationMode] = useState<RotationMode>('off');
  const [rotationInterval, setRotationInterval] = useState(30);
  const [savingRotation, setSavingRotation] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    auth_type: 'ip' as AuthType,
    proxy_type: 'both' as ProxyType,
    allowed_ip: '',
    username: '',
    password: '',
  });

  // Blocked domains state
  const [expandedBlockedDomains, setExpandedBlockedDomains] = useState<string | null>(null);
  const [editingBlockedDomains, setEditingBlockedDomains] = useState<{ [credId: string]: string[] }>({});
  const [newDomainPattern, setNewDomainPattern] = useState('');
  const [savingBlockedDomains, setSavingBlockedDomains] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [phone.id]);

  // Load usage data when usage tab is selected
  useEffect(() => {
    if (activeTab === 'usage' && !dataUsage && !loadingUsage) {
      loadUsageData();
    }
  }, [activeTab]);

  const loadUsageData = async () => {
    setLoadingUsage(true);
    try {
      const [usageRes, uptimeRes] = await Promise.all([
        api.getPhoneDataUsage(phone.id),
        api.getPhoneUptime(phone.id),
      ]);
      setDataUsage(usageRes.data);
      setUptimeData(uptimeRes.data);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
    setLoadingUsage(false);
  };

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
      const response = await api.createCredential(phone.id, data);
      // Update phone ports if they were just assigned
      if (response.data.proxy_port && onPhoneUpdate) {
        onPhoneUpdate({
          proxy_port: response.data.proxy_port,
          http_port: response.data.http_port,
        });
      }
      setShowAddForm(false);
      setFormData({ name: '', auth_type: 'ip', proxy_type: 'both', allowed_ip: '', username: '', password: '' });
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

  const handleToggleBlockedDomains = (credId: string, currentDomains: string[] | undefined) => {
    if (expandedBlockedDomains === credId) {
      setExpandedBlockedDomains(null);
    } else {
      setExpandedBlockedDomains(credId);
      // Initialize editing state with current domains
      setEditingBlockedDomains(prev => ({
        ...prev,
        [credId]: currentDomains || []
      }));
    }
    setNewDomainPattern('');
  };

  const handleAddDomainPattern = (credId: string) => {
    const pattern = newDomainPattern.trim();
    if (!pattern) return;

    setEditingBlockedDomains(prev => ({
      ...prev,
      [credId]: [...(prev[credId] || []), pattern]
    }));
    setNewDomainPattern('');
  };

  const handleRemoveDomainPattern = (credId: string, index: number) => {
    setEditingBlockedDomains(prev => ({
      ...prev,
      [credId]: (prev[credId] || []).filter((_, i) => i !== index)
    }));
  };

  const handleSaveBlockedDomains = async (credId: string) => {
    setSavingBlockedDomains(credId);
    try {
      const domains = editingBlockedDomains[credId] || [];
      await api.updateCredential(phone.id, credId, { blocked_domains: domains });
      await loadData();
      setExpandedBlockedDomains(null);
    } catch (error) {
      console.error('Failed to save blocked domains:', error);
    }
    setSavingBlockedDomains(null);
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

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date to readable string
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Generate connection strings for a credential
  const getConnectionStrings = (cred: ConnectionCredential) => {
    // Use credential's DNS domain (per-credential DNS), fallback to hub server IP
    const serverHost = cred.proxy_domain || phone.hub_server_ip;
    const socks5Port = phone.proxy_port || 1080;
    const httpPort = phone.http_port || 0; // HTTP port is now separate

    const strings: { type: string; value: string }[] = [];

    if (cred.auth_type === 'userpass') {
      if (cred.proxy_type === 'socks5' || cred.proxy_type === 'both') {
        strings.push({
          type: 'SOCKS5',
          value: `socks5://${cred.username}:${cred.password}@${serverHost}:${socks5Port}`
        });
      }
      if ((cred.proxy_type === 'http' || cred.proxy_type === 'both') && httpPort > 0) {
        strings.push({
          type: 'HTTP',
          value: `http://${cred.username}:${cred.password}@${serverHost}:${httpPort}`
        });
      }
    } else {
      // IP whitelist - no auth in connection string
      if (cred.proxy_type === 'socks5' || cred.proxy_type === 'both') {
        strings.push({
          type: 'SOCKS5',
          value: `socks5://${serverHost}:${socks5Port}`
        });
      }
      if ((cred.proxy_type === 'http' || cred.proxy_type === 'both') && httpPort > 0) {
        strings.push({
          type: 'HTTP',
          value: `http://${serverHost}:${httpPort}`
        });
      }
    }

    return strings;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl shadow-zinc-200/50 w-full max-w-2xl max-h-[90vh] overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">{phone.name}</h2>
            <p className="text-sm text-zinc-500">
              {phone.hub_server?.location} - SOCKS5:{phone.proxy_port}
              {phone.http_port ? ` / HTTP:${phone.http_port}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/50">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'credentials'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Credentials
          </button>
          <button
            onClick={() => setActiveTab('rotation')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rotation'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            IP Rotation
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'usage'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Usage
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'actions'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Actions
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <>
              {/* Credentials Tab */}
              {activeTab === 'credentials' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-zinc-600">
                      Add credentials to allow proxy connections. Without credentials, the proxy won't accept any connections.
                    </p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 shadow-sm hover:shadow transition-all"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </button>
                  </div>

                  {/* Add Form */}
                  {showAddForm && (
                    <div className="mb-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200 shadow-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Home, Work"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Auth Type</label>
                          <div className="flex gap-4">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                value="ip"
                                checked={formData.auth_type === 'ip'}
                                onChange={() => setFormData({ ...formData, auth_type: 'ip' })}
                                className="mr-2 text-emerald-600 focus:ring-emerald-500"
                              />
                              IP Whitelist
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                value="userpass"
                                checked={formData.auth_type === 'userpass'}
                                onChange={() => setFormData({ ...formData, auth_type: 'userpass' })}
                                className="mr-2 text-emerald-600 focus:ring-emerald-500"
                              />
                              Username / Password
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-1">Proxy Type</label>
                          <select
                            value={formData.proxy_type}
                            onChange={(e) => setFormData({ ...formData, proxy_type: e.target.value as ProxyType })}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          >
                            <option value="both">Both (SOCKS5 + HTTP)</option>
                            <option value="socks5">SOCKS5 only</option>
                            <option value="http">HTTP only</option>
                          </select>
                        </div>
                        {formData.auth_type === 'ip' ? (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Allowed IP</label>
                            <input
                              type="text"
                              value={formData.allowed_ip}
                              onChange={(e) => setFormData({ ...formData, allowed_ip: e.target.value })}
                              placeholder="e.g., 192.168.1.100"
                              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                            />
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Username</label>
                              <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
                              <input
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddCredential}
                          disabled={!formData.name || (formData.auth_type === 'ip' ? !formData.allowed_ip : !formData.username || !formData.password)}
                          className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-all"
                        >
                          Add Credential
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Credentials List */}
                  {credentials.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      No credentials yet. Add one to enable proxy connections.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {credentials.map((cred) => (
                        <div
                          key={cred.id}
                          className={`p-4 border rounded-xl transition-all ${cred.is_active ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-50 border-zinc-100 opacity-60'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900">{cred.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-md border ${
                                cred.auth_type === 'ip' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-violet-50 text-violet-700 border-violet-200'
                              }`}>
                                {cred.auth_type === 'ip' ? 'IP' : 'User/Pass'}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                                {getProxyTypeLabel(cred.proxy_type)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleCredential(cred)}
                                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                                  cred.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                                }`}
                              >
                                {cred.is_active ? 'Active' : 'Disabled'}
                              </button>
                              <button
                                onClick={() => handleDeleteCredential(cred.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {/* Usage stats */}
                          <div className="flex items-center gap-4 mb-2 text-xs text-zinc-500">
                            <span title="Bandwidth used">
                              📊 {formatBytes(cred.bandwidth_used)}
                              {cred.bandwidth_limit ? ` / ${formatBytes(cred.bandwidth_limit)}` : ''}
                            </span>
                            <span title="Total connections">
                              🔗 {cred.connection_count.toLocaleString()} connections
                            </span>
                          </div>
                          {/* Connection Strings */}
                          <div className="space-y-1.5">
                            {getConnectionStrings(cred).map((conn, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400 w-12 font-medium">{conn.type}:</span>
                                <code className="flex-1 text-xs bg-zinc-100 border border-zinc-200 px-2 py-1.5 rounded-md font-mono text-zinc-700 truncate">
                                  {conn.value}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(conn.value, `${cred.id}-${conn.type}`)}
                                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                                  title="Copy"
                                >
                                  {copied === `${cred.id}-${conn.type}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Blocked Domains Section */}
                          <div className="mt-3 pt-3 border-t border-zinc-100">
                            <button
                              onClick={() => handleToggleBlockedDomains(cred.id, cred.blocked_domains)}
                              className="flex items-center justify-between w-full text-left text-xs hover:bg-zinc-50 -mx-1 px-1 py-1 rounded transition-colors"
                            >
                              <span className="flex items-center gap-1.5 text-zinc-600">
                                <Shield className="w-3.5 h-3.5" />
                                <span className="font-medium">Blocked Domains</span>
                                {cred.blocked_domains && cred.blocked_domains.length > 0 && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">
                                    {cred.blocked_domains.length}
                                  </span>
                                )}
                              </span>
                              {expandedBlockedDomains === cred.id ? (
                                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </button>

                            {expandedBlockedDomains === cred.id && (
                              <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                                <p className="text-[10px] text-zinc-500 mb-2">
                                  Block domains for this credential. Patterns: <code className="bg-zinc-200 px-1 rounded">example.com</code>, <code className="bg-zinc-200 px-1 rounded">*.example.com</code>, <code className="bg-zinc-200 px-1 rounded">example.com:443</code>
                                </p>

                                {/* Current blocked domains */}
                                {(editingBlockedDomains[cred.id] || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {(editingBlockedDomains[cred.id] || []).map((pattern, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-200"
                                      >
                                        <span className="font-mono">{pattern}</span>
                                        <button
                                          onClick={() => handleRemoveDomainPattern(cred.id, idx)}
                                          className="hover:bg-red-200 rounded p-0.5 transition-colors"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Add new pattern */}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={newDomainPattern}
                                    onChange={(e) => setNewDomainPattern(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddDomainPattern(cred.id);
                                      }
                                    }}
                                    placeholder="*.stripe.com"
                                    className="flex-1 px-2 py-1.5 text-xs border border-zinc-200 rounded-md bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                  />
                                  <button
                                    onClick={() => handleAddDomainPattern(cred.id)}
                                    disabled={!newDomainPattern.trim()}
                                    className="px-2 py-1.5 text-xs bg-zinc-200 text-zinc-700 rounded-md hover:bg-zinc-300 disabled:opacity-50 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Save button */}
                                <div className="flex justify-end mt-3 gap-2">
                                  <button
                                    onClick={() => setExpandedBlockedDomains(null)}
                                    className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200 rounded-md transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveBlockedDomains(cred.id)}
                                    disabled={savingBlockedDomains === cred.id}
                                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                  >
                                    {savingBlockedDomains === cred.id ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* IP Rotation Tab */}
              {activeTab === 'rotation' && (
                <div>
                  {phone.rotation_capability?.includes('not available') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        IP rotation is not configured on this phone. Set DroidProxy as Digital Assistant to enable.
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Settings → Apps → Default apps → Digital Assistant → DroidProxy
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-zinc-600 mb-4">
                    Configure how IP rotation works for this phone.
                  </p>

                  {/* Rotation Mode Selection */}
                  <div className="space-y-3 mb-6">
                    {/* Off */}
                    <label
                      className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${
                        rotationMode === 'off'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                      onClick={() => handleSaveRotationSettings('off')}
                    >
                      <input
                        type="radio"
                        name="rotation_mode"
                        checked={rotationMode === 'off'}
                        onChange={() => {}}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="ml-3">
                        <span className="font-medium text-zinc-900">Off</span>
                        <p className="text-sm text-zinc-500 mt-0.5">No automatic rotation. Use manual rotation from Actions tab.</p>
                      </div>
                    </label>

                    {/* Timed */}
                    <div
                      className={`p-4 border rounded-xl transition-all ${
                        rotationMode === 'timed'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <label
                        className="flex items-start cursor-pointer"
                        onClick={() => rotationMode !== 'timed' && handleSaveRotationSettings('timed')}
                      >
                        <input
                          type="radio"
                          name="rotation_mode"
                          checked={rotationMode === 'timed'}
                          onChange={() => {}}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span className="font-medium text-zinc-900">Timed Rotation</span>
                          </div>
                          <p className="text-sm text-zinc-500 mt-0.5">Automatically rotate IP at a set interval.</p>
                        </div>
                      </label>
                      {rotationMode === 'timed' && (
                        <div className="mt-4 ml-7">
                          <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Rotate every
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="2"
                              max="120"
                              value={rotationInterval}
                              onChange={(e) => setRotationInterval(parseInt(e.target.value))}
                              className="flex-1 accent-emerald-600"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="2"
                                max="120"
                                value={rotationInterval}
                                onChange={(e) => setRotationInterval(Math.max(2, Math.min(120, parseInt(e.target.value) || 2)))}
                                className="w-16 px-2 py-1 border border-zinc-200 rounded-lg text-sm text-center"
                              />
                              <span className="text-sm text-zinc-500">min</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSaveRotationSettings('timed', rotationInterval)}
                            disabled={savingRotation}
                            className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {savingRotation ? 'Saving...' : 'Save Interval'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* API */}
                    <div
                      className={`p-4 border rounded-xl transition-all ${
                        rotationMode === 'api'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <label
                        className="flex items-start cursor-pointer"
                        onClick={() => rotationMode !== 'api' && handleSaveRotationSettings('api')}
                      >
                        <input
                          type="radio"
                          name="rotation_mode"
                          checked={rotationMode === 'api'}
                          onChange={() => {}}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-600" />
                            <span className="font-medium text-zinc-900">API Rotation</span>
                          </div>
                          <p className="text-sm text-zinc-500 mt-0.5">Use an API endpoint to trigger rotation programmatically.</p>
                        </div>
                      </label>
                      {rotationMode === 'api' && rotationToken && (
                        <div className="mt-4 ml-7 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">API Endpoint</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={rotationToken.endpoint}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono"
                              />
                              <button
                                onClick={() => copyToClipboard(rotationToken.endpoint, 'endpoint')}
                                className="px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                              >
                                {copied === 'endpoint' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                              </button>
                            </div>
                          </div>
                          {rotationToken.token && (
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 mb-1">Token (shown once)</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={rotationToken.token}
                                  readOnly
                                  className="flex-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-mono"
                                />
                                <button
                                  onClick={() => copyToClipboard(rotationToken.token!, 'token')}
                                  className="px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                                >
                                  {copied === 'token' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                                </button>
                              </div>
                              <p className="text-xs text-amber-600 mt-1 font-medium">Save this token now. It won't be shown again.</p>
                            </div>
                          )}
                          <div className="bg-white p-4 rounded-xl border border-zinc-200">
                            <p className="text-sm font-medium text-zinc-700 mb-2">Usage Example</p>
                            <pre className="text-xs bg-zinc-900 text-emerald-400 p-3 rounded-lg overflow-x-auto">
{`curl -X POST "${rotationToken.endpoint}"

# Response
{"message": "IP rotation initiated"}`}
                            </pre>
                          </div>
                          <button
                            onClick={handleRegenerateToken}
                            className="flex items-center px-4 py-2 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate Token
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Tab */}
              {activeTab === 'usage' && (
                <div>
                  {loadingUsage ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Uptime Section */}
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Uptime
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                            <p className="text-xs text-zinc-500 mb-1">Last 24 Hours</p>
                            <p className="text-2xl font-bold text-zinc-900">
                              {uptimeData ? `${uptimeData.last_24_hours.toFixed(1)}%` : '-'}
                            </p>
                          </div>
                          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                            <p className="text-xs text-zinc-500 mb-1">Last 7 Days</p>
                            <p className="text-2xl font-bold text-zinc-900">
                              {uptimeData ? `${uptimeData.last_7_days.toFixed(1)}%` : '-'}
                            </p>
                          </div>
                        </div>
                        {/* Daily uptime bars */}
                        {uptimeData && uptimeData.daily_uptime.length > 0 && (
                          <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                            <div className="flex items-end gap-1 h-16">
                              {uptimeData.daily_uptime.slice(0, 7).reverse().map((day, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center">
                                  <div
                                    className={`w-full rounded-t transition-all ${
                                      day.uptime_percentage >= 90 ? 'bg-emerald-500' :
                                      day.uptime_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ height: `${Math.max(4, day.uptime_percentage * 0.6)}px` }}
                                    title={`${day.date}: ${day.uptime_percentage.toFixed(1)}%`}
                                  />
                                  <span className="text-[9px] text-zinc-400 mt-1">{formatDate(day.date)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Data Usage Section */}
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                          <ArrowUp className="w-4 h-4" />
                          <ArrowDown className="w-4 h-4 -ml-2" />
                          Data Usage
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                            <p className="text-xs text-zinc-500 mb-1">This Month</p>
                            <p className="text-2xl font-bold text-zinc-900">
                              {dataUsage ? formatBytes(dataUsage.this_month.total) : '-'}
                            </p>
                            {dataUsage && dataUsage.this_month.total > 0 && (
                              <p className="text-xs text-zinc-400 mt-1">
                                <span className="text-emerald-600">{formatBytes(dataUsage.this_month.bytes_in)}</span>
                                {' / '}
                                <span className="text-blue-600">{formatBytes(dataUsage.this_month.bytes_out)}</span>
                              </p>
                            )}
                          </div>
                          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                            <p className="text-xs text-zinc-500 mb-1">Last Month</p>
                            <p className="text-2xl font-bold text-zinc-900">
                              {dataUsage ? formatBytes(dataUsage.last_month.total) : '-'}
                            </p>
                            {dataUsage && dataUsage.last_month.total > 0 && (
                              <p className="text-xs text-zinc-400 mt-1">
                                <span className="text-emerald-600">{formatBytes(dataUsage.last_month.bytes_in)}</span>
                                {' / '}
                                <span className="text-blue-600">{formatBytes(dataUsage.last_month.bytes_out)}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Daily usage list */}
                        {dataUsage && dataUsage.daily_usage.length > 0 && (
                          <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 max-h-48 overflow-y-auto">
                            <p className="text-xs font-medium text-zinc-500 mb-2">Daily Breakdown (Last 30 Days)</p>
                            <div className="space-y-1.5">
                              {dataUsage.daily_usage.slice(0, 14).map((day, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-zinc-500">{formatDate(day.date)}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-emerald-600">{formatBytes(day.bytes_in)}</span>
                                    <span className="text-blue-600">{formatBytes(day.bytes_out)}</span>
                                    <span className="font-medium text-zinc-700 w-16 text-right">{formatBytes(day.total)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!dataUsage || (dataUsage.this_month.total === 0 && dataUsage.daily_usage.length === 0)) && (
                          <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm text-amber-800">
                              No usage data available yet. Data will appear once the phone starts reporting usage.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <div className="p-4 border border-zinc-200 rounded-xl bg-white shadow-sm">
                    <h3 className="font-semibold text-zinc-900 mb-2">Rotate IP</h3>
                    {phone.rotation_capability && !phone.rotation_capability.includes('not available') ? (
                      <>
                        <p className="text-sm text-zinc-600 mb-3">
                          Toggle mobile data to get a new IP address from the carrier.
                        </p>
                        <button
                          onClick={onRotateIP}
                          disabled={phone.status !== 'online' || isRotating}
                          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm hover:shadow transition-all"
                        >
                          <RotateCw className={`w-4 h-4 mr-2 ${isRotating ? 'animate-spin' : ''}`} />
                          {isRotating ? 'Rotating...' : 'Rotate IP'}
                        </button>
                        <p className="text-xs text-zinc-400 mt-2">{phone.rotation_capability}</p>
                      </>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800 mb-2">
                          IP rotation is not available for this phone.
                        </p>
                        <p className="text-xs text-amber-600">
                          To enable IP rotation, set DroidProxy as the Digital Assistant on the phone:
                          <br />
                          <span className="font-medium">Settings → Apps → Default apps → Digital Assistant</span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border border-zinc-200 rounded-xl bg-white shadow-sm">
                    <h3 className="font-semibold text-zinc-900 mb-2">Restart Proxy</h3>
                    <p className="text-sm text-zinc-600 mb-3">
                      Restart the proxy service on the phone.
                    </p>
                    <button
                      onClick={onRestart}
                      disabled={isRestarting}
                      className="flex items-center px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 shadow-sm hover:shadow transition-all"
                    >
                      <Power className={`w-4 h-4 mr-2 ${isRestarting ? 'animate-pulse' : ''}`} />
                      {isRestarting ? 'Restarting...' : 'Restart Proxy'}
                    </button>
                  </div>
                  <div className="p-4 border border-red-200 rounded-xl bg-red-50">
                    <h3 className="font-semibold text-red-800 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-600 mb-3">
                      Delete this phone. This action cannot be undone.
                    </p>
                    <button
                      onClick={onDelete}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm hover:shadow transition-all"
                    >
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
  );
}
