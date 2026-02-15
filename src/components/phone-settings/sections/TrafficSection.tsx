import { ArrowDown, ArrowUp } from 'lucide-react';
import type { DataUsage, ConnectionCredential, TrafficSubTab } from '../types';
import { formatBytes, formatDate } from '../utils';

interface Props {
  dataUsage: DataUsage | null;
  credentials: ConnectionCredential[];
  loadingUsage: boolean;
  trafficSubTab: TrafficSubTab;
  usageDateRange: '7d' | '30d' | '90d';
  onSubTabChange: (tab: TrafficSubTab) => void;
  onDateRangeChange: (range: '7d' | '30d' | '90d') => void;
}

export default function TrafficSection({
  dataUsage,
  credentials,
  loadingUsage,
  trafficSubTab,
  usageDateRange,
  onSubTabChange,
  onDateRangeChange,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">Traffic</h3>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
          {(['monthly', 'daily'] as const).map((tab) => (
            <button key={tab} onClick={() => onSubTabChange(tab)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${trafficSubTab === tab ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
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
                  <button key={period} onClick={() => onDateRangeChange(period)} className={`px-2 py-1 text-xs rounded-md ${usageDateRange === period ? 'bg-emerald-100 text-emerald-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>
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
