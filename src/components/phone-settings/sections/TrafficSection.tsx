import { useState } from 'react';
import { ArrowDown, ArrowUp, Calendar, List } from 'lucide-react';
import type { DataUsage, ConnectionCredential, TrafficSubTab, UptimeData } from '../types';
import { formatBytes, formatDate } from '../utils';

interface CredentialUsage {
  credential_id: string;
  credential_name: string;
  bytes_in: number;
  bytes_out: number;
  total: number;
}

interface Props {
  dataUsage: DataUsage & { by_credential?: CredentialUsage[] } | null;
  uptimeData: UptimeData | null;
  credentials: ConnectionCredential[];
  loadingUsage: boolean;
  trafficSubTab: TrafficSubTab;
  usageDateRange: '7d' | '30d' | '90d';
  selectedCredentialId: string;
  onSubTabChange: (tab: TrafficSubTab) => void;
  onDateRangeChange: (range: '7d' | '30d' | '90d') => void;
  onCredentialChange: (credentialId: string) => void;
}

type ViewMode = 'calendar' | 'list';

export default function TrafficSection({
  dataUsage,
  uptimeData,
  credentials,
  loadingUsage,
  trafficSubTab,
  usageDateRange,
  selectedCredentialId,
  onSubTabChange,
  onDateRangeChange,
  onCredentialChange,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // Merge uptime data with daily traffic data
  const getDailyWithUptime = () => {
    if (!dataUsage?.daily) return [];

    const uptimeMap = new Map<string, number>();
    if (uptimeData?.daily) {
      uptimeData.daily.forEach(d => {
        uptimeMap.set(d.date, d.uptime_percentage);
      });
    }

    return dataUsage.daily.map(day => ({
      ...day,
      uptime: uptimeMap.get(day.date) ?? null,
    }));
  };

  const dailyWithUptime = getDailyWithUptime();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">Traffic</h3>
        <div className="flex gap-2">
          {/* View mode toggle */}
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
              title="Calendar view"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {/* Tab toggle */}
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {(['monthly', 'daily'] as const).map((tab) => (
              <button key={tab} onClick={() => onSubTabChange(tab)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${trafficSubTab === tab ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
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
              {/* Filters row */}
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex gap-1">
                  {(['7d', '30d', '90d'] as const).map((period) => (
                    <button key={period} onClick={() => onDateRangeChange(period)} className={`px-2 py-1 text-xs rounded-md ${usageDateRange === period ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                      {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                    </button>
                  ))}
                </div>
                <select
                  value={selectedCredentialId}
                  onChange={(e) => onCredentialChange(e.target.value)}
                  className="px-2 py-1 text-xs border border-zinc-200 rounded-md bg-white"
                >
                  <option value="">All Credentials</option>
                  {credentials.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (:{c.port})</option>
                  ))}
                </select>
              </div>

              {/* Total summary */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600">Total {selectedCredentialId ? '(filtered)' : ''}</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatBytes(dataUsage.total.total)}</p>
                  </div>
                  <div className="text-right text-xs text-emerald-600">
                    <div className="flex items-center gap-1 justify-end"><ArrowDown className="w-3 h-3" />{formatBytes(dataUsage.total.bytes_in)}</div>
                    <div className="flex items-center gap-1 justify-end mt-1"><ArrowUp className="w-3 h-3" />{formatBytes(dataUsage.total.bytes_out)}</div>
                  </div>
                </div>
              </div>

              {/* Per-credential breakdown (only when not filtered) */}
              {!selectedCredentialId && dataUsage.by_credential && dataUsage.by_credential.length > 0 && (
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <p className="text-xs font-medium text-zinc-500 mb-3">Per Credential</p>
                  <div className="space-y-2">
                    {dataUsage.by_credential.map((cu) => (
                      <div key={cu.credential_id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                        <span className="text-sm font-medium text-zinc-700">{cu.credential_name || 'Unknown'}</span>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><ArrowDown className="w-3 h-3" />{formatBytes(cu.bytes_in)}</span>
                          <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" />{formatBytes(cu.bytes_out)}</span>
                          <span className="font-semibold text-zinc-700">{formatBytes(cu.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar view */}
              {viewMode === 'calendar' && (
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <p className="text-xs font-medium text-zinc-500 mb-3">Daily Breakdown</p>
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-[10px] text-zinc-400 text-center py-1">{d}</div>
                    ))}
                    {dataUsage.daily.slice(-30).map((day, idx) => {
                      const maxTotal = Math.max(...dataUsage.daily.map(d => d.total), 1);
                      const intensity = day.total / maxTotal;
                      const uptimeInfo = dailyWithUptime.find(d => d.date === day.date);
                      return (
                        <div key={idx} className={`aspect-square rounded-sm flex flex-col items-center justify-center text-[9px] cursor-pointer transition-all hover:ring-2 hover:ring-emerald-400 ${intensity > 0.7 ? 'bg-emerald-500 text-white' : intensity > 0.3 ? 'bg-emerald-300 text-emerald-900' : intensity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`} title={`${formatDate(day.date)}\nTraffic: ${formatBytes(day.total)}${uptimeInfo?.uptime != null ? `\nUptime: ${uptimeInfo.uptime.toFixed(0)}%` : ''}`}>
                          <span>{new Date(day.date + 'T00:00:00').getDate()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* List view */}
              {viewMode === 'list' && (
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <p className="text-xs font-medium text-zinc-500 mb-3">Daily Details</p>
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-5 gap-2 text-[10px] text-zinc-400 font-medium pb-2 border-b border-zinc-200 sticky top-0 bg-zinc-50">
                      <span>Date</span>
                      <span className="text-right">Download</span>
                      <span className="text-right">Upload</span>
                      <span className="text-right">Total</span>
                      <span className="text-right">Uptime</span>
                    </div>
                    {dailyWithUptime.map((day, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 text-xs py-1.5 border-b border-zinc-100 last:border-0 hover:bg-zinc-100 rounded">
                        <span className="text-zinc-700 font-medium">{formatDate(day.date)}</span>
                        <span className="text-right text-zinc-500">{formatBytes(day.bytes_in)}</span>
                        <span className="text-right text-zinc-500">{formatBytes(day.bytes_out)}</span>
                        <span className="text-right text-zinc-700 font-medium">{formatBytes(day.total)}</span>
                        <span className={`text-right font-medium ${day.uptime != null ? (day.uptime >= 90 ? 'text-emerald-600' : day.uptime >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-zinc-400'}`}>
                          {day.uptime != null ? `${day.uptime.toFixed(0)}%` : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

              {/* Port filter */}
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
  );
}
