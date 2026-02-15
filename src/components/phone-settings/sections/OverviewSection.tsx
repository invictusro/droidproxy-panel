import { AlertTriangle, Smartphone, Battery, Zap } from 'lucide-react';
import type { PhoneWithStatus, ConnectionCredential } from '../types';

interface Props {
  phone: PhoneWithStatus;
  credentials: ConnectionCredential[];
}

export default function OverviewSection({ phone, credentials }: Props) {
  return (
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
            {phone.app_version && (
              <span className="text-xs px-1.5 py-0.5 bg-zinc-200 text-zinc-600 rounded">v{phone.app_version}</span>
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
  );
}
