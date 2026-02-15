import { Battery, Cpu, Zap } from 'lucide-react';
import type { PhoneWithStatus, DeviceSubTab } from '../types';
import { formatBytes } from '../utils';

interface Props {
  phone: PhoneWithStatus;
  deviceSubTab: DeviceSubTab;
  onSubTabChange: (tab: DeviceSubTab) => void;
}

export default function DeviceSection({
  phone,
  deviceSubTab,
  onSubTabChange,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900">Device</h3>
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
          {(['metrics', 'info'] as const).map((tab) => (
            <button key={tab} onClick={() => onSubTabChange(tab)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${deviceSubTab === tab ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>
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
          {phone.app_version && (
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <p className="text-xs text-zinc-500 mb-1">App Version</p>
              <p className="text-lg font-medium text-zinc-900">{phone.app_version}</p>
            </div>
          )}
          {phone.metrics_updated_at && (
            <p className="text-xs text-zinc-400">Last updated: {new Date(phone.metrics_updated_at).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
