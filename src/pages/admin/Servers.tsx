import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, Server as ServerIcon, Cpu, HardDrive, Activity, Wifi, RefreshCw, Terminal, Download, Upload, ArrowUpCircle } from 'lucide-react';
import { api } from '../../api/client';
import type { Server, ServerTelemetry } from '../../types';

interface ServerForm {
  name: string;
  location: string;
  ip: string;
  wireguard_port: number;
  proxy_port_start: number;
  proxy_port_end: number;
  hub_api_port: number;
  ssh_port: number;
  ssh_user: string;
  ssh_password: string;
  vcpus: number;
  cpu_benchmark_single: number;
  cpu_benchmark_all: number;
}

const initialForm: ServerForm = {
  name: '',
  location: '',
  ip: '',
  wireguard_port: 51820,
  proxy_port_start: 10000,
  proxy_port_end: 19999,
  hub_api_port: 8081,
  ssh_port: 22,
  ssh_user: 'root',
  ssh_password: '',
  vcpus: 0,
  cpu_benchmark_single: 0,
  cpu_benchmark_all: 0,
};

// GitHub URL for hub-agent binary (placeholder)
const HUB_AGENT_BINARY_URL = 'https://github.com/invictusro/droidproxy-hub-agent/releases/latest/download/hub-agent-linux-amd64';

export default function Servers() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [provisioningServer, setProvisioningServer] = useState<Server | null>(null);
  const [form, setForm] = useState<ServerForm>(initialForm);
  const [telemetryData, setTelemetryData] = useState<Record<string, ServerTelemetry>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = useState('');

  const { data: servers, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await api.getServers();
      return response.data.servers as Server[];
    },
  });

  // Fetch latest binary info for version comparison
  const { data: latestBinary } = useQuery({
    queryKey: ['latestBinary'],
    queryFn: async () => {
      try {
        const response = await api.getLatestBinaryInfo();
        return response.data as { version: string; uploaded_at: string; size: string };
      } catch {
        return null;
      }
    },
  });

  const latestVersion = latestBinary?.version;

  // Fetch telemetry for all servers every 10 seconds
  useEffect(() => {
    const fetchTelemetry = async () => {
      if (!servers) return;

      for (const server of servers) {
        if (server.has_hub_api_key) {
          try {
            const response = await api.getServerTelemetry(server.id);
            setTelemetryData(prev => ({
              ...prev,
              [server.id]: response.data
            }));
          } catch (error) {
            // Server might be offline
            setTelemetryData(prev => ({
              ...prev,
              [server.id]: { status: 'offline', cpu_percent: 0, memory_percent: 0, wireguard_status: 'unknown' }
            }));
          }
        }
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, [servers]);

  const createMutation = useMutation({
    mutationFn: (data: ServerForm) => api.createServer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServerForm> }) =>
      api.updateServer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteServer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });

  const provisionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.provisionServer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setShowProvisionModal(false);
      setProvisioningServer(null);
    },
  });

  // Upload binary mutation
  const uploadBinaryMutation = useMutation({
    mutationFn: ({ file, version }: { file: File; version: string }) =>
      api.uploadHubAgentBinary(file, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latestBinary'] });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadVersion('');
    },
  });

  // Single server update mutation
  const updateServerMutation = useMutation({
    mutationFn: (serverId: string) => api.triggerServerUpdate(serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });

  // Fleet update mutation
  const fleetUpdateMutation = useMutation({
    mutationFn: (targetVersion: string) => api.triggerFleetUpdate(targetVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });

  const openAddModal = () => {
    setEditingServer(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEditModal = (server: Server) => {
    setEditingServer(server);
    setForm({
      name: server.name,
      location: server.location,
      ip: server.ip || '',
      wireguard_port: server.wireguard_port || 51820,
      proxy_port_start: server.proxy_port_start || 10000,
      proxy_port_end: server.proxy_port_end || 19999,
      hub_api_port: server.hub_api_port || 8081,
      ssh_port: 22,
      ssh_user: 'root',
      ssh_password: '',
      vcpus: server.vcpus || 0,
      cpu_benchmark_single: server.cpu_benchmark_single || 0,
      cpu_benchmark_all: server.cpu_benchmark_all || 0,
    });
    setShowModal(true);
  };

  const openProvisionModal = (server: Server) => {
    setProvisioningServer(server);
    setShowProvisionModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingServer(null);
    setForm(initialForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingServer) {
      updateMutation.mutate({ id: editingServer.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisioningServer) return;

    provisionMutation.mutate({
      id: provisioningServer.id,
      data: {
        ssh_host: provisioningServer.ip,
        ssh_port: form.ssh_port,
        ssh_user: form.ssh_user,
        ssh_password: form.ssh_password,
        hub_binary_url: HUB_AGENT_BINARY_URL,
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this server?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUploadBinary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadVersion) return;
    uploadBinaryMutation.mutate({ file: uploadFile, version: uploadVersion });
  };

  const handleUpdateServer = (serverId: string, serverName: string) => {
    if (confirm(`Trigger OTA update for ${serverName}?`)) {
      updateServerMutation.mutate(serverId);
    }
  };

  const handleUpdateAll = () => {
    if (!latestVersion) {
      alert('No binary uploaded yet. Please upload a binary first.');
      return;
    }
    const outdatedCount = servers?.filter(s => s.current_version !== latestVersion && s.has_hub_api_key).length || 0;
    if (outdatedCount === 0) {
      alert('All servers are already on the latest version.');
      return;
    }
    if (confirm(`Update ${outdatedCount} server(s) to version ${latestVersion}?`)) {
      fleetUpdateMutation.mutate(latestVersion);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hub Servers</h1>
          {latestVersion && (
            <p className="text-sm text-gray-500 mt-1">
              Latest version: <span className="font-mono font-medium text-gray-700">{latestVersion}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Binary
          </button>
          <button
            onClick={handleUpdateAll}
            disabled={fleetUpdateMutation.isPending || !latestVersion}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            {fleetUpdateMutation.isPending ? 'Updating...' : 'Update All'}
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </button>
        </div>
      </div>

      {/* Server Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers?.map(server => {
          const telemetry = telemetryData[server.id];
          const isOnline = telemetry?.status === 'ok';

          return (
            <div key={server.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ServerIcon className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">{server.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Location & IP */}
                <div className="space-y-1">
                  <div className="text-sm text-gray-500">{server.location}</div>
                  <div className="font-mono text-sm text-gray-700">{server.ip}</div>
                </div>

                {/* Telemetry Stats */}
                {telemetry && isOnline && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* CPU */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Cpu className="w-3 h-3" />
                        CPU
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {telemetry.cpu_percent?.toFixed(1)}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${telemetry.cpu_percent > 80 ? 'bg-red-500' : telemetry.cpu_percent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(telemetry.cpu_percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Memory */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <HardDrive className="w-3 h-3" />
                        Memory
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {telemetry.memory_percent?.toFixed(1)}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${telemetry.memory_percent > 80 ? 'bg-red-500' : telemetry.memory_percent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(telemetry.memory_percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Bandwidth In */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Activity className="w-3 h-3" />
                        Download
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatBytes(telemetry.bandwidth_in_rate || 0)}/s
                      </div>
                    </div>

                    {/* Bandwidth Out */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Activity className="w-3 h-3" />
                        Upload
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatBytes(telemetry.bandwidth_out_rate || 0)}/s
                      </div>
                    </div>
                  </div>
                )}

                {/* WireGuard Status */}
                {telemetry && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wifi className={`w-4 h-4 ${telemetry.wireguard_status === 'running' ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-gray-600">WireGuard:</span>
                    <span className={telemetry.wireguard_status === 'running' ? 'text-green-600' : 'text-red-600'}>
                      {telemetry.wireguard_status}
                    </span>
                  </div>
                )}

                {/* Phone Count & Ports */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{server.phone_count || 0} phones</span>
                  <span>Ports: {server.proxy_port_start}-{server.proxy_port_end}</span>
                </div>

                {/* CPU Specs - show if benchmark data exists */}
                {(server.vcpus || server.cpu_benchmark_all) && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                      <Cpu className="w-3 h-3" />
                      CPU Benchmark (sysbench)
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{server.vcpus || '-'}</div>
                        <div className="text-xs text-gray-500">vCPUs</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {server.cpu_benchmark_single ? server.cpu_benchmark_single.toLocaleString() : '-'}
                        </div>
                        <div className="text-xs text-gray-500">Single</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {server.cpu_benchmark_all ? server.cpu_benchmark_all.toLocaleString() : '-'}
                        </div>
                        <div className="text-xs text-gray-500">All Cores</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Version */}
                {server.has_hub_api_key && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Version</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono ${
                        server.current_version === latestVersion
                          ? 'text-green-600'
                          : server.current_version === 'unknown' || !server.current_version
                            ? 'text-gray-400'
                            : 'text-yellow-600'
                      }`}>
                        {server.current_version || 'unknown'}
                      </span>
                      {latestVersion && server.current_version !== latestVersion && server.current_version !== 'unknown' && (
                        <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                          outdated
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Hub Agent Status */}
                {!server.has_hub_api_key && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    Hub Agent not installed
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t flex justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(server)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!server.has_hub_api_key && (
                    <button
                      onClick={() => openProvisionModal(server)}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Install Hub Agent"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>
                  )}
                  {/* OTA Update button - show if outdated */}
                  {server.has_hub_api_key && latestVersion && server.current_version !== latestVersion && (
                    <button
                      onClick={() => handleUpdateServer(server.id, server.name)}
                      disabled={updateServerMutation.isPending}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title={`Update to ${latestVersion}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(server.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <RefreshCw className="w-3 h-3" />
                  Updates every 10s
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {servers?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <ServerIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No servers yet</h3>
          <p className="text-gray-500 mb-4">Add your first hub server to get started</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </button>
        </div>
      )}

      {/* Add/Edit Server Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingServer ? 'Edit Server' : 'Add New Server'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Chicago Server"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g., Chicago, US Central"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <input
                    type="text"
                    value={form.ip}
                    onChange={(e) => setForm({ ...form, ip: e.target.value })}
                    placeholder="e.g., 192.168.1.100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WireGuard Port</label>
                    <input
                      type="number"
                      value={form.wireguard_port}
                      onChange={(e) => setForm({ ...form, wireguard_port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hub API Port</label>
                    <input
                      type="number"
                      value={form.hub_api_port}
                      onChange={(e) => setForm({ ...form, hub_api_port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port Start</label>
                    <input
                      type="number"
                      value={form.proxy_port_start}
                      onChange={(e) => setForm({ ...form, proxy_port_start: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port End</label>
                    <input
                      type="number"
                      value={form.proxy_port_end}
                      onChange={(e) => setForm({ ...form, proxy_port_end: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* CPU Benchmark Section */}
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPU Benchmark (sysbench events/sec)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">vCPUs</label>
                      <input
                        type="number"
                        value={form.vcpus}
                        onChange={(e) => setForm({ ...form, vcpus: parseInt(e.target.value) || 0 })}
                        placeholder="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Single Core</label>
                      <input
                        type="number"
                        value={form.cpu_benchmark_single}
                        onChange={(e) => setForm({ ...form, cpu_benchmark_single: parseInt(e.target.value) || 0 })}
                        placeholder="1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">All Cores</label>
                      <input
                        type="number"
                        value={form.cpu_benchmark_all}
                        onChange={(e) => setForm({ ...form, cpu_benchmark_all: parseInt(e.target.value) || 0 })}
                        placeholder="2000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Server Modal */}
      {showProvisionModal && provisioningServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Install Hub Agent</h2>
              <button onClick={() => { setShowProvisionModal(false); setProvisioningServer(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Install the Hub Agent on <strong>{provisioningServer.name}</strong> ({provisioningServer.ip}) via SSH.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
              <strong>Note:</strong> Hub Agent binary will be downloaded from GitHub:
              <div className="font-mono text-xs mt-1 break-all text-blue-600">
                {HUB_AGENT_BINARY_URL}
              </div>
            </div>

            <form onSubmit={handleProvision}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SSH Port</label>
                    <input
                      type="number"
                      value={form.ssh_port}
                      onChange={(e) => setForm({ ...form, ssh_port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SSH User</label>
                    <input
                      type="text"
                      value={form.ssh_user}
                      onChange={(e) => setForm({ ...form, ssh_user: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSH Password</label>
                  <input
                    type="password"
                    value={form.ssh_password}
                    onChange={(e) => setForm({ ...form, ssh_password: e.target.value })}
                    placeholder="Enter SSH password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowProvisionModal(false); setProvisioningServer(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisionMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {provisionMutation.isPending ? 'Installing...' : 'Install Hub Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Binary Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Upload Hub Agent Binary</h2>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadVersion(''); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Upload a new hub-agent binary for OTA updates. Build with version embedded:
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-xs font-mono text-gray-600">
              go build -ldflags="-X 'main.Version=1.0.0'" -o hub-agent ./cmd/main.go
            </div>

            <form onSubmit={handleUploadBinary}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Binary File</label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    placeholder="e.g., 1.0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadVersion(''); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadBinaryMutation.isPending || !uploadFile || !uploadVersion}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadBinaryMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
