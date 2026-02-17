import { ArrowDown, ArrowUp } from 'lucide-react';
import type { DataUsage, ConnectionCredential, UptimeData } from '../types';
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
  usageDateRange: '7d' | '30d' | '90d';
  selectedCredentialId: string;
  onDateRangeChange: (range: '7d' | '30d' | '90d') => void;
  onCredentialChange: (credentialId: string) => void;
}

export default function TrafficSection({
  dataUsage,
  uptimeData,
  credentials,
  loadingUsage,
  usageDateRange,
  selectedCredentialId,
  onDateRangeChange,
  onCredentialChange,
}: Props) {

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
      </div>

      {loadingUsage ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : dataUsage && (
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

          {/* Daily list view */}
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
        </div>
      )}
    </div>
  );
}
