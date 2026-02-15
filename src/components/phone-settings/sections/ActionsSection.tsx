import { useState } from 'react';
import { RotateCw, Power, Trash2, Download, Pencil, Bell } from 'lucide-react';
import { api } from '../../../api/client';
import type { PhoneWithStatus } from '../types';
import { getLocalDateString, getMinExportDate } from '../utils';

interface Props {
  phone: PhoneWithStatus;
  isRotating: boolean;
  isRestarting: boolean;
  onRotateIP: () => void;
  onRestart: () => void;
  onDelete: () => void;
  onRefetch?: () => void;
}

export default function ActionsSection({
  phone,
  isRotating,
  isRestarting,
  onRotateIP,
  onRestart,
  onDelete,
  onRefetch,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [newPhoneName, setNewPhoneName] = useState(phone.name);
  const [savingName, setSavingName] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [findingPhone, setFindingPhone] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [exportEndDate, setExportEndDate] = useState(() => getLocalDateString());

  const savePhoneName = async () => {
    if (!newPhoneName.trim() || newPhoneName === phone.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await api.updatePhone(phone.id, { name: newPhoneName.trim() });
      setEditingName(false);
      onRefetch?.();
    } catch (error) {
      console.error('Failed to update phone name:', error);
    } finally {
      setSavingName(false);
    }
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

  const handleFindPhone = async () => {
    setFindingPhone(true);
    try {
      await api.findPhone(phone.id);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to find phone';
      alert(msg);
    }
    setFindingPhone(false);
  };

  const isNitro = phone.plan_tier === 'nitro';

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">Actions</h3>

      <div className="p-4 border border-zinc-200 rounded-xl bg-white">
        <h4 className="font-semibold text-zinc-900 mb-2">Rename Phone</h4>
        <p className="text-sm text-zinc-600 mb-3">Change the display name of this phone.</p>
        {editingName ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newPhoneName}
              onChange={(e) => setNewPhoneName(e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Phone name"
              autoFocus
            />
            <button
              onClick={savePhoneName}
              disabled={savingName}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingName ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setEditingName(false); setNewPhoneName(phone.name); }}
              className="px-4 py-2 border border-zinc-200 text-zinc-600 text-sm rounded-lg hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-700 font-medium">{phone.name}</span>
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center px-3 py-1.5 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border border-zinc-200 rounded-xl bg-white">
        <h4 className="font-semibold text-zinc-900 mb-2">Rotate IP</h4>
        {phone.rotation_capability && !phone.rotation_capability.includes('not available') ? (
          <>
            <p className="text-sm text-zinc-600 mb-3">Toggle mobile data to get a new IP address.</p>
            {phone.status !== 'online' && (
              <p className="text-xs text-amber-600 mb-2">Phone appears offline - action may not work</p>
            )}
            <button onClick={onRotateIP} disabled={isRotating} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
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
        {phone.status !== 'online' && (
          <p className="text-xs text-amber-600 mb-2">Phone appears offline - action may not work</p>
        )}
        <button onClick={onRestart} disabled={isRestarting} className="flex items-center px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50">
          <Power className={`w-4 h-4 mr-2 ${isRestarting ? 'animate-pulse' : ''}`} />
          {isRestarting ? 'Restarting...' : 'Restart Proxy'}
        </button>
      </div>

      {/* Find Phone - Nitro only */}
      <div className={`p-4 border rounded-xl bg-white ${isNitro ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-semibold text-zinc-900">Find Phone</h4>
          {!isNitro && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Nitro only</span>
          )}
        </div>
        <p className="text-sm text-zinc-600 mb-3">Play a loud sound on the phone to help locate it.</p>
        {isNitro && phone.status !== 'online' && (
          <p className="text-xs text-amber-600 mb-2">Phone appears offline - action may not work</p>
        )}
        <button
          onClick={handleFindPhone}
          disabled={!isNitro || findingPhone}
          className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Bell className={`w-4 h-4 mr-2 ${findingPhone ? 'animate-pulse' : ''}`} />
          {findingPhone ? 'Finding...' : 'Find Phone'}
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
            <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} min={exportStartDate} max={getLocalDateString()} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg" />
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
  );
}
