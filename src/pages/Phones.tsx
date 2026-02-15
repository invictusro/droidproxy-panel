import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, RefreshCw, Settings, Wifi, WifiOff, Copy, Check, Smartphone,
  Filter, X, CheckSquare, Square, FolderPlus, ChevronDown, Trash2, RotateCw,
  MoreHorizontal, Folder, Pencil
} from 'lucide-react';
import { usePhones, useDeletePhone, useRotateIP, useRestartProxy } from '../hooks/usePhones';
import { useCentrifugo } from '../hooks/useCentrifugo';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import PhoneSettingsModal from '../components/PhoneSettingsModal';
import MassActionsModal from '../components/MassActionsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Phone, PhoneWithStatus, PhoneGroup } from '../types';
import Flags from 'country-flag-icons/react/3x2';

// Predefined colors for groups
const GROUP_COLORS = [
  '#059669', '#0891b2', '#7c3aed', '#d97706', '#dc2626', '#db2777', '#4f46e5', '#0d9488'
];

// Country flag component using SVG (works on all platforms)
const CountryFlag = ({ countryCode, className }: { countryCode: string; className?: string }) => {
  if (!countryCode || countryCode.length !== 2) return null;
  const code = countryCode.toUpperCase() as keyof typeof Flags;
  const FlagComponent = Flags[code];
  if (!FlagComponent) return <span className="text-xs text-muted-foreground">{countryCode}</span>;
  return <FlagComponent className={className || "w-5 h-auto rounded-sm"} />;
};

export default function Phones() {
  const { data: phones, isLoading, refetch } = usePhones();
  const { centrifugoToken, centrifugoUrl } = useAuth();
  const deletePhone = useDeletePhone();
  const rotateIP = useRotateIP();
  const restartProxy = useRestartProxy();

  const [selectedPhone, setSelectedPhone] = useState<PhoneWithStatus | null>(null);
  const [rotatingIds, setRotatingIds] = useState<Set<string>>(new Set());
  const [restartingIds, setRestartingIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterServer, setFilterServer] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterCredentials, setFilterCredentials] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Groups state (from backend)
  const [groups, setGroups] = useState<PhoneGroup[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [editingGroup, setEditingGroup] = useState<PhoneGroup | null>(null);

  // Mass actions modal
  const [showMassActions, setShowMassActions] = useState(false);

  // Fetch groups from backend
  const fetchGroups = async () => {
    try {
      const response = await api.getGroups();
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Generate connection string for a phone (using first credential)
  const getConnectionString = (phone: Phone): string | null => {
    if (!phone.first_credential || !phone.hub_server_ip) return null;

    const cred = phone.first_credential;
    const serverIp = phone.hub_server_ip;
    const port = cred.port || 0;

    if (!port) return null;

    if (cred.auth_type === 'userpass' && cred.username) {
      return `socks5://${cred.username}:PASSWORD@${serverIp}:${port}`;
    } else if (cred.auth_type === 'ip') {
      return `socks5://${serverIp}:${port}`;
    }
    return null;
  };

  const copyConnectionString = (phone: Phone, e: React.MouseEvent) => {
    e.stopPropagation();
    const connStr = getConnectionString(phone);
    if (connStr) {
      navigator.clipboard.writeText(connStr);
      setCopiedId(phone.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Get phone IDs for Centrifugo subscription
  const phoneIds = useMemo(() => phones?.map(p => p.id) || [], [phones]);
  const { statuses, connected } = useCentrifugo(phoneIds, centrifugoToken, centrifugoUrl);

  // Merge API data with real-time status from Centrifugo
  // Status comes from Centrifugo only - not stored in database
  const phonesWithStatus = useMemo((): PhoneWithStatus[] => {
    if (!phones) return [];
    return phones.map(phone => {
      const liveStatus = statuses[phone.id];
      // Determine status: Centrifugo data > derived from paired_at
      const status = liveStatus?.status || (phone.paired_at ? 'offline' : 'pending');
      const last_seen = liveStatus?.timestamp ? new Date(liveStatus.timestamp).toISOString() : undefined;
      // Map rotation capability codes to human-readable strings
      const rawCapability = liveStatus?.rotation_capability;
      let rotation_capability: string | undefined;
      if (rawCapability) {
        switch (rawCapability) {
          case 'root':
            rotation_capability = 'IP rotation available (Root)';
            break;
          case 'assistant':
            rotation_capability = 'IP rotation available (Digital Assistant)';
            break;
          case 'cmd':
            rotation_capability = 'IP rotation available (CMD)';
            break;
          case 'none':
            rotation_capability = 'IP rotation not available';
            break;
          default:
            // If it's already a human-readable string, use as-is
            rotation_capability = rawCapability.includes('available') ? rawCapability : 'IP rotation not available';
        }
      }
      // Get SIM info from Centrifugo status (real-time) or fallback to API data (stored)
      const sim_country = liveStatus?.sim_country || phone.sim_country;
      const sim_carrier = liveStatus?.sim_carrier || phone.sim_carrier;
      // Get active connections from API (hub reports every ~60s) - more accurate than APK's Centrifugo value
      const active_connections = phone.active_connections ?? 0;
      const total_connections = liveStatus?.total_connections;
      return {
        ...phone,
        status,
        last_seen,
        rotation_capability,
        sim_country,
        sim_carrier,
        active_connections,
        total_connections,
      } as PhoneWithStatus;
    });
  }, [phones, statuses]);

  // Get unique servers for filter
  const uniqueServers = useMemo(() => {
    const servers = new Set<string>();
    phonesWithStatus.forEach(p => {
      if (p.hub_server?.location) servers.add(p.hub_server.location);
    });
    return Array.from(servers);
  }, [phonesWithStatus]);

  // Get group for a phone
  const getPhoneGroup = (phoneId: string): PhoneGroup | undefined => {
    return groups.find(g => g.phone_ids?.includes(phoneId));
  };

  // Filter phones
  const filteredPhones = useMemo(() => {
    return phonesWithStatus.filter(phone => {
      // Filter by server
      if (filterServer !== 'all' && phone.hub_server?.location !== filterServer) return false;

      // Filter by group
      if (filterGroup === 'ungrouped') {
        if (groups.some(g => g.phone_ids?.includes(phone.id))) return false;
      } else if (filterGroup !== 'all') {
        const group = groups.find(g => g.id === filterGroup);
        if (!group || !group.phone_ids?.includes(phone.id)) return false;
      }

      // Filter by credentials
      if (filterCredentials === 'no_credentials' && phone.first_credential) return false;
      if (filterCredentials === 'has_credentials' && !phone.first_credential) return false;

      // Filter by status
      if (filterStatus !== 'all' && phone.status !== filterStatus) return false;

      return true;
    });
  }, [phonesWithStatus, filterServer, filterGroup, filterCredentials, filterStatus, groups]);

  // Handle selection
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredPhones.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  // Group management (using backend API)
  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.createGroup({
        name: newGroupName.trim(),
        color: newGroupColor,
        phone_ids: Array.from(selectedIds),
      });
      await fetchGroups();
      setNewGroupName('');
      setShowCreateGroup(false);
      clearSelection();
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group');
    }
  };

  const updateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;
    try {
      await api.updateGroup(editingGroup.id, {
        name: newGroupName.trim(),
        color: newGroupColor,
      });
      await fetchGroups();
      setEditingGroup(null);
      setNewGroupName('');
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? Phones will not be deleted.')) return;
    try {
      await api.deleteGroup(groupId);
      await fetchGroups();
      if (filterGroup === groupId) {
        setFilterGroup('all');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const startEditGroup = (group: PhoneGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupColor(group.color);
  };

  const cancelEditGroup = () => {
    setEditingGroup(null);
    setNewGroupName('');
    setNewGroupColor(GROUP_COLORS[0]);
  };

  const addToGroup = async (groupId: string) => {
    try {
      await api.addPhonesToGroup(groupId, Array.from(selectedIds));
      await fetchGroups();
      clearSelection();
    } catch (error) {
      console.error('Failed to add phones to group:', error);
      alert('Failed to add phones to group');
    }
  };

  const handleRotateIP = async (id: string) => {
    setRotatingIds(prev => new Set(prev).add(id));
    try {
      await rotateIP.mutateAsync(id);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to rotate IP';
      alert(`Rotate IP failed: ${message}`);
      console.error('Rotate IP error:', error);
    } finally {
      setRotatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRestart = async (id: string) => {
    setRestartingIds(prev => new Set(prev).add(id));
    try {
      await restartProxy.mutateAsync(id);
    } finally {
      setRestartingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this phone?')) {
      await deletePhone.mutateAsync(id);
      setSelectedPhone(null);
    }
  };

  // Mass actions
  const handleMassRotate = async () => {
    for (const id of selectedIds) {
      const phone = phonesWithStatus.find(p => p.id === id);
      if (phone?.status === 'online') {
        await handleRotateIP(id);
      }
    }
  };

  const handleMassDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} phones? This cannot be undone.`)) return;
    for (const id of selectedIds) {
      await deletePhone.mutateAsync(id);
    }
    clearSelection();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Online
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="secondary" className="bg-red-50 text-red-700 border border-red-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
            Offline
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
            Pending
          </Badge>
        );
    }
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return '-';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const hasActiveFilters = filterServer !== 'all' || filterGroup !== 'all' || filterCredentials !== 'all' || filterStatus !== 'all';

  const clearFilters = () => {
    setFilterServer('all');
    setFilterGroup('all');
    setFilterCredentials('all');
    setFilterStatus('all');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading phones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Phones</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filteredPhones.length} of {phonesWithStatus.length} devices
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Selection mode toggle */}
          {phonesWithStatus.length > 0 && (
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds(new Set());
              }}
              className={isSelectionMode ? "bg-primary text-white" : "border-border hover:bg-accent"}
            >
              <CheckSquare className="w-4 h-4 mr-1.5" />
              {isSelectionMode ? 'Done' : 'Select'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`border-border hover:bg-accent ${hasActiveFilters ? 'bg-primary/10 border-primary/30' : ''}`}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            {hasActiveFilters && (
              <Badge className="ml-1.5 h-5 px-1.5 bg-primary text-white text-[10px]">
                {[filterServer !== 'all', filterGroup !== 'all', filterCredentials !== 'all', filterStatus !== 'all'].filter(Boolean).length}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManageGroups(true)}
            className="border-border hover:bg-accent"
          >
            <Folder className="w-4 h-4 mr-1.5" />
            Groups
            {groups.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 bg-zinc-200 text-zinc-700 text-[10px]">
                {groups.length}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-border hover:bg-accent"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Link to="/phones/add">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Phone
            </Button>
          </Link>
        </div>
      </div>

      {/* Selection Actions Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedIds.size} selected
                </span>
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                  Select All ({filteredPhones.length})
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-xs">
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <FolderPlus className="w-4 h-4" />
                      Add to Group
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowCreateGroup(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Group
                    </DropdownMenuItem>
                    {groups.length > 0 && <DropdownMenuSeparator />}
                    {groups.map(group => (
                      <DropdownMenuItem key={group.id} onClick={() => addToGroup(group.id)}>
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMassRotate}
                  className="gap-1.5"
                >
                  <RotateCw className="w-4 h-4" />
                  Rotate IP
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowMassActions(true)}
                  className="gap-1.5"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  More Actions
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMassDelete}
                  className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card className="bg-zinc-50/50 border-zinc-200">
          <CardContent className="py-4 px-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Server</Label>
                <select
                  value={filterServer}
                  onChange={(e) => setFilterServer(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="all">All Servers</option>
                  {uniqueServers.map(server => (
                    <option key={server} value={server}>{server}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Group</Label>
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="all">All Groups</option>
                  <option value="ungrouped">Ungrouped</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Credentials</Label>
                <select
                  value={filterCredentials}
                  onChange={(e) => setFilterCredentials(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="all">All</option>
                  <option value="has_credentials">Has Credentials</option>
                  <option value="no_credentials">No Credentials</option>
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <option value="all">All</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Bar */}
      {groups.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map(group => (
            <div
              key={group.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                filterGroup === group.id
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
              onClick={() => setFilterGroup(filterGroup === group.id ? 'all' : group.id)}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="font-medium">{group.name}</span>
              <span className="text-muted-foreground text-xs">
                {group.phone_ids?.filter(id => phonesWithStatus.some(p => p.id === id)).length || 0}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete group "${group.name}"?`)) {
                    deleteGroup(group.id);
                  }
                }}
                className="ml-1 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Table */}
      {filteredPhones.length > 0 ? (
        <Card className="bg-white border border-zinc-200 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gradient-to-b from-zinc-50 to-white border-b border-zinc-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Devices</CardTitle>
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${connected ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-muted-foreground bg-muted'}`}>
                {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {connected ? 'Live' : 'Connecting...'}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Group</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">License</TableHead>
                    <TableHead className="font-semibold text-foreground">Server</TableHead>
                    <TableHead className="font-semibold text-foreground">SIM</TableHead>
                    <TableHead className="font-semibold text-foreground">Connections</TableHead>
                    <TableHead className="font-semibold text-foreground">Proxy</TableHead>
                    <TableHead className="font-semibold text-foreground">Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhones.map((phone) => {
                    const group = getPhoneGroup(phone.id);
                    const isSelected = selectedIds.has(phone.id);

                    return (
                      <TableRow
                        key={phone.id}
                        className={`border-zinc-100 hover:bg-zinc-50 cursor-pointer group transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleSelection(phone.id, { stopPropagation: () => {} } as React.MouseEvent);
                          } else {
                            setSelectedPhone(phone);
                          }
                        }}
                      >
                        <TableCell>
                          {isSelectionMode ? (
                            <button
                              onClick={(e) => toggleSelection(phone.id, e)}
                              className="h-8 w-8 flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5 text-zinc-300 hover:text-zinc-400" />
                              )}
                            </button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-50 group-hover:opacity-100 hover:bg-zinc-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhone(phone);
                              }}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 flex items-center justify-center shadow-sm">
                              <Smartphone className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span className="font-medium text-foreground">{phone.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {group ? (
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="text-sm text-muted-foreground">{group.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(phone.status)}</TableCell>
                        <TableCell>
                          {phone.has_active_license && phone.plan_tier ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                              {phone.plan_tier.charAt(0).toUpperCase() + phone.plan_tier.slice(1)}
                              {phone.license_expires_at && (
                                <span className="ml-1 text-emerald-600">
                                  ({Math.max(0, Math.ceil((new Date(phone.license_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d)
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200">
                              No License
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {phone.hub_server?.location || '-'}
                        </TableCell>
                        <TableCell>
                          {phone.sim_country ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CountryFlag countryCode={phone.sim_country} className="w-5 h-auto rounded-sm shadow-sm" />
                              <span className="text-xs text-muted-foreground">{phone.sim_country}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {phone.status === 'online' ? (
                            <span className="text-sm font-medium">
                              <span className={phone.active_connections && phone.active_connections > 0 ? 'text-emerald-600' : 'text-zinc-600'}>
                                {phone.active_connections ?? 0}
                              </span>
                              <span className="text-zinc-400">/{phone.max_connections || '-'}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {phone.first_credential ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => copyConnectionString(phone, e)}
                              className="h-7 gap-1.5 text-xs font-mono bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-600"
                            >
                              {copiedId === phone.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-medium">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="max-w-[100px] truncate">
                                    {phone.first_credential.auth_type === 'userpass'
                                      ? phone.first_credential.username
                                      : phone.first_credential.allowed_ip}
                                  </span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No credentials</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatLastSeen(phone.last_seen)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : phonesWithStatus.length > 0 ? (
        <Card className="bg-white border border-zinc-200 shadow-md rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
              <Filter className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-zinc-600 font-medium mb-1">No phones match your filters</p>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your filter criteria</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border border-zinc-200 shadow-lg rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 flex items-center justify-center mb-4 shadow-sm">
              <Smartphone className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-xl font-semibold mb-2 text-foreground">No phones yet</p>
            <p className="text-center mb-6 max-w-sm text-muted-foreground">
              Add your first Android device to start using mobile proxies
            </p>
            <Link to="/phones/add">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4" />
                Add Your First Phone
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to organize your phones. Selected phones will be added to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Production, Testing"
                className="bg-zinc-50 border-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {GROUP_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewGroupColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${newGroupColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
              Cancel
            </Button>
            <Button onClick={createGroup} disabled={!newGroupName.trim()}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Settings Modal */}
      {selectedPhone && (
        <PhoneSettingsModal
          phone={selectedPhone}
          onClose={() => setSelectedPhone(null)}
          onRotateIP={() => handleRotateIP(selectedPhone.id)}
          onRestart={() => handleRestart(selectedPhone.id)}
          onDelete={() => handleDelete(selectedPhone.id)}
          onRefetch={() => refetch()}
          isRotating={rotatingIds.has(selectedPhone.id)}
          isRestarting={restartingIds.has(selectedPhone.id)}
        />
      )}

      {/* Mass Actions Modal */}
      <MassActionsModal
        isOpen={showMassActions}
        onClose={() => setShowMassActions(false)}
        selectedIds={Array.from(selectedIds)}
        onComplete={() => {
          refetch();
          fetchGroups();
        }}
      />

      {/* Manage Groups Dialog */}
      <Dialog open={showManageGroups} onOpenChange={setShowManageGroups}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Groups</DialogTitle>
            <DialogDescription>
              Create, edit, or delete phone groups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Create/Edit Group Form */}
            <div className="space-y-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <Label>{editingGroup ? 'Edit Group' : 'New Group'}</Label>
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Color:</Label>
                <div className="flex gap-1">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewGroupColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        newGroupColor === color ? 'ring-2 ring-offset-2 ring-zinc-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {editingGroup ? (
                  <>
                    <Button size="sm" onClick={updateGroup} disabled={!newGroupName.trim()}>
                      Save Changes
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditGroup}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={createGroup} disabled={!newGroupName.trim()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Create Group
                  </Button>
                )}
              </div>
            </div>

            {/* Groups List */}
            {groups.length > 0 ? (
              <div className="space-y-2">
                <Label>Existing Groups</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-200"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <p className="font-medium text-sm">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.phone_count} {group.phone_count === 1 ? 'phone' : 'phones'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditGroup(group)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGroup(group.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Folder className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No groups yet</p>
                <p className="text-xs">Create a group to organize your phones</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowManageGroups(false);
              cancelEditGroup();
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
