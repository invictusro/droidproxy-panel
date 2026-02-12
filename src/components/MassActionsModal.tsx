import { useState, useEffect } from 'react';
import { RotateCw, Settings, Key, Download, Trash2, Loader2, Folder } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MassActionResult, PhoneGroup } from '../types';

interface MassActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onComplete: () => void;
}

export default function MassActionsModal({
  isOpen,
  onClose,
  selectedIds,
  onComplete,
}: MassActionsModalProps) {
  const [activeTab, setActiveTab] = useState('rotation');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MassActionResult | null>(null);

  // Rotation settings state
  const [rotationMode, setRotationMode] = useState<'off' | 'timed' | 'api'>('off');
  const [rotationInterval, setRotationInterval] = useState(10);

  // Credentials state
  const [authType, setAuthType] = useState<'ip_whitelist' | 'username_password'>('username_password');
  const [proxyType, setProxyType] = useState<'socks5' | 'http' | 'both'>('both');
  const [allowedIp, setAllowedIp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Export state
  const [exportFormat, setExportFormat] = useState<'plain' | 'auth' | 'json' | 'csv' | 'curl'>('auth');
  const [exportProxyType, setExportProxyType] = useState<'socks5' | 'http'>('socks5');
  const [includeRotation, setIncludeRotation] = useState(false);
  const [exportContent, setExportContent] = useState('');

  // Group state
  const [groups, setGroups] = useState<PhoneGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [removeFromOthers, setRemoveFromOthers] = useState(true);

  // Fetch groups when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen]);

  const fetchGroups = async () => {
    try {
      const response = await api.getGroups();
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const resetState = () => {
    setResult(null);
    setExportContent('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleMassRotate = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await api.massRotateIP(selectedIds);
      setResult(response.data);
      if (response.data.succeeded > 0) {
        onComplete();
      }
    } catch (error: any) {
      setResult({
        total: selectedIds.length,
        succeeded: 0,
        failed: selectedIds.length,
        errors: [error.message || 'Failed to rotate IPs'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMassRotationSettings = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await api.massUpdateRotationSettings(selectedIds, {
        rotation_mode: rotationMode,
        rotation_interval_minutes: rotationMode === 'timed' ? rotationInterval : undefined,
      });
      setResult(response.data);
      if (response.data.succeeded > 0) {
        onComplete();
      }
    } catch (error: any) {
      setResult({
        total: selectedIds.length,
        succeeded: 0,
        failed: selectedIds.length,
        errors: [error.message || 'Failed to update rotation settings'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMassCredentials = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await api.massCreateCredentials(selectedIds, {
        auth_type: authType,
        proxy_type: proxyType,
        allowed_ip: authType === 'ip_whitelist' ? allowedIp : undefined,
        username: authType === 'username_password' ? username : undefined,
        password: authType === 'username_password' ? password : undefined,
      });
      setResult(response.data);
      if (response.data.succeeded > 0) {
        onComplete();
      }
    } catch (error: any) {
      setResult({
        total: selectedIds.length,
        succeeded: 0,
        failed: selectedIds.length,
        errors: [error.message || 'Failed to create credentials'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    setExportContent('');
    try {
      const response = await api.exportProxies(selectedIds, {
        format: exportFormat,
        proxy_type: exportProxyType,
        include_rotation: includeRotation,
      });
      setExportContent(response.data.content);
    } catch (error: any) {
      setExportContent(`Error: ${error.message || 'Failed to export'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMassDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} phones? This cannot be undone.`)) {
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const response = await api.massDeletePhones(selectedIds);
      setResult(response.data);
      if (response.data.succeeded > 0) {
        onComplete();
        handleClose();
      }
    } catch (error: any) {
      setResult({
        total: selectedIds.length,
        succeeded: 0,
        failed: selectedIds.length,
        errors: [error.message || 'Failed to delete phones'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMassSetGroup = async () => {
    if (!selectedGroupId) return;
    setIsLoading(true);
    setResult(null);
    try {
      // If removing from other groups, we need to do that first
      if (removeFromOthers) {
        // Remove from all groups first
        for (const group of groups) {
          if (group.id !== selectedGroupId) {
            const phonesInGroup = selectedIds.filter(id => group.phone_ids?.includes(id));
            for (const phoneId of phonesInGroup) {
              try {
                await api.removePhoneFromGroup(group.id, phoneId);
              } catch (e) {
                // Ignore errors for phones not in group
              }
            }
          }
        }
      }

      // Add to selected group
      await api.addPhonesToGroup(selectedGroupId, selectedIds);

      setResult({
        total: selectedIds.length,
        succeeded: selectedIds.length,
        failed: 0,
      });
      onComplete();
    } catch (error: any) {
      setResult({
        total: selectedIds.length,
        succeeded: 0,
        failed: selectedIds.length,
        errors: [error.message || 'Failed to set group'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromAllGroups = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      let removed = 0;
      for (const group of groups) {
        const phonesInGroup = selectedIds.filter(id => group.phone_ids?.includes(id));
        for (const phoneId of phonesInGroup) {
          try {
            await api.removePhoneFromGroup(group.id, phoneId);
            removed++;
          } catch (e) {
            // Ignore errors
          }
        }
      }

      setResult({
        total: selectedIds.length,
        succeeded: removed > 0 ? selectedIds.length : 0,
        failed: 0,
      });
      onComplete();
    } catch (error: any) {
      setResult({
        total: selectedIds.length,
        succeeded: 0,
        failed: selectedIds.length,
        errors: [error.message || 'Failed to remove from groups'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportContent);
  };

  const downloadExport = () => {
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxies-${exportFormat}.${exportFormat === 'json' ? 'json' : exportFormat === 'csv' ? 'csv' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mass Actions</DialogTitle>
          <DialogDescription>
            Perform actions on {selectedIds.length} selected phones
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetState(); }}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="group" className="text-xs">
              <Folder className="w-3.5 h-3.5 mr-1" />
              Group
            </TabsTrigger>
            <TabsTrigger value="rotation" className="text-xs">
              <Settings className="w-3.5 h-3.5 mr-1" />
              Rotation
            </TabsTrigger>
            <TabsTrigger value="credentials" className="text-xs">
              <Key className="w-3.5 h-3.5 mr-1" />
              Credentials
            </TabsTrigger>
            <TabsTrigger value="rotate-now" className="text-xs">
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              Rotate IP
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              <Download className="w-3.5 h-3.5 mr-1" />
              Export
            </TabsTrigger>
            <TabsTrigger value="delete" className="text-xs text-red-600">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </TabsTrigger>
          </TabsList>

          {/* Group Tab */}
          <TabsContent value="group" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Assign to Group</Label>
                {groups.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedGroupId === group.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: selectedGroupId === group.id ? 'white' : group.color }}
                          />
                          <span className="text-sm font-medium truncate">{group.name}</span>
                        </div>
                        <span className={`text-xs ${selectedGroupId === group.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {group.phone_count} phones
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No groups available</p>
                    <p className="text-xs">Create a group first from the Groups menu</p>
                  </div>
                )}
              </div>

              {groups.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remove-from-others"
                      checked={removeFromOthers}
                      onChange={(e) => setRemoveFromOthers(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="remove-from-others" className="font-normal cursor-pointer text-sm">
                      Remove from other groups first
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleMassSetGroup}
                      disabled={isLoading || !selectedGroupId}
                      className="flex-1"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add to Group
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRemoveFromAllGroups}
                      disabled={isLoading}
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Remove from All
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Rotation Settings Tab */}
          <TabsContent value="rotation" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rotation Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['off', 'timed', 'api'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setRotationMode(mode)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        rotationMode === mode
                          ? 'bg-primary text-white border-primary'
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {mode === 'off' && 'Off'}
                      {mode === 'timed' && 'Timed'}
                      {mode === 'api' && 'API Only'}
                    </button>
                  ))}
                </div>
              </div>

              {rotationMode === 'timed' && (
                <div className="space-y-2">
                  <Label>Rotation Interval (minutes)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={120}
                      value={rotationInterval}
                      onChange={(e) => setRotationInterval(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-mono">{rotationInterval}m</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleMassRotationSettings}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Apply to {selectedIds.length} Phones
              </Button>
            </div>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Authentication Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAuthType('username_password')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      authType === 'username_password'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    Username/Password
                  </button>
                  <button
                    onClick={() => setAuthType('ip_whitelist')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      authType === 'ip_whitelist'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    IP Whitelist
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Proxy Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['socks5', 'http', 'both'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setProxyType(type)}
                      className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                        proxyType === type
                          ? 'bg-primary text-white border-primary'
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {authType === 'ip_whitelist' ? (
                <div className="space-y-2">
                  <Label htmlFor="allowed-ip">Allowed IP Address</Label>
                  <Input
                    id="allowed-ip"
                    value={allowedIp}
                    onChange={(e) => setAllowedIp(e.target.value)}
                    placeholder="e.g., 192.168.1.100"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleMassCredentials}
                disabled={isLoading || (authType === 'ip_whitelist' ? !allowedIp : !username || !password)}
                className="w-full"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Credentials for {selectedIds.length} Phones
              </Button>
            </div>
          </TabsContent>

          {/* Rotate IP Tab */}
          <TabsContent value="rotate-now" className="space-y-4 mt-4">
            <div className="text-center py-8">
              <RotateCw className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-medium mb-2">Rotate IP for All Selected Phones</p>
              <p className="text-sm text-muted-foreground mb-6">
                This will send a rotate IP command to all {selectedIds.length} selected online phones.
              </p>
              <Button
                onClick={handleMassRotate}
                disabled={isLoading}
                size="lg"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Rotate IP Now
              </Button>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm"
                  >
                    <option value="plain">Plain (host:port)</option>
                    <option value="auth">With Auth (host:port:user:pass)</option>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="curl">cURL Commands</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Proxy Type</Label>
                  <select
                    value={exportProxyType}
                    onChange={(e) => setExportProxyType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm"
                  >
                    <option value="socks5">SOCKS5</option>
                    <option value="http">HTTP</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include-rotation"
                  checked={includeRotation}
                  onChange={(e) => setIncludeRotation(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="include-rotation" className="font-normal cursor-pointer">
                  Include rotation API endpoints
                </Label>
              </div>

              <Button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate Export
              </Button>

              {exportContent && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Export Result</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard}>
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadExport}>
                        Download
                      </Button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={exportContent}
                    className="w-full h-48 p-3 rounded-lg border border-zinc-200 bg-zinc-50 font-mono text-xs resize-none"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Delete Tab */}
          <TabsContent value="delete" className="space-y-4 mt-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-medium mb-2 text-red-600">Delete {selectedIds.length} Phones</p>
              <p className="text-sm text-muted-foreground mb-6">
                This will permanently delete all selected phones, their credentials, and all associated data.
                This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={handleMassDelete}
                disabled={isLoading}
                size="lg"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete {selectedIds.length} Phones
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Result Display */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">
                {result.succeeded}/{result.total} succeeded
              </span>
              {result.failed > 0 && (
                <span className="text-amber-700">{result.failed} failed</span>
              )}
            </div>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 text-xs text-amber-700 list-disc list-inside">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>...and {result.errors.length - 5} more errors</li>
                )}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
