import { useState } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import type { PhoneWithStatus, RotationToken, RotationMode } from '../types';

interface Props {
  phone: PhoneWithStatus;
  rotationToken: RotationToken | null;
  rotationMode: RotationMode;
  rotationInterval: number;
  savingRotation: boolean;
  onSaveRotationSettings: (mode: RotationMode, interval?: number) => Promise<void>;
  onRegenerateToken: () => void;
}

export default function RotationSection({
  phone,
  rotationToken,
  rotationMode,
  rotationInterval: initialInterval,
  savingRotation,
  onSaveRotationSettings,
  onRegenerateToken,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [interval, setInterval] = useState(initialInterval);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">IP Rotation</h3>

      {phone.rotation_capability?.includes('not available') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">IP rotation not configured. Set DroidProxy as Digital Assistant to enable.</p>
        </div>
      )}

      <div className="space-y-3">
        {(['off', 'timed', 'api'] as const).map((mode) => (
          <div
            key={mode}
            className={`p-4 border rounded-xl cursor-pointer transition-all ${rotationMode === mode ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200 hover:border-zinc-300'}`}
            onClick={() => mode !== rotationMode && onSaveRotationSettings(mode)}
          >
            <div className="flex items-center gap-3">
              <input type="radio" checked={rotationMode === mode} readOnly className="text-emerald-600" />
              <div>
                <span className="font-medium text-zinc-900 capitalize">{mode === 'off' ? 'Off' : mode === 'timed' ? 'Timed' : 'API'}</span>
                <p className="text-sm text-zinc-500">{mode === 'off' ? 'Manual rotation only' : mode === 'timed' ? 'Rotate at set intervals' : 'Trigger via API endpoint'}</p>
              </div>
            </div>
            {mode === 'timed' && rotationMode === 'timed' && (
              <div className="mt-4 ml-7">
                <div className="flex items-center gap-3">
                  <input type="range" min="2" max="120" value={interval} onChange={(e) => setInterval(parseInt(e.target.value))} className="flex-1 accent-emerald-600" />
                  <input type="number" min="2" max="120" value={interval} onChange={(e) => setInterval(Math.max(2, Math.min(120, parseInt(e.target.value) || 2)))} className="w-16 px-2 py-1 border border-zinc-200 rounded-lg text-sm text-center" />
                  <span className="text-sm text-zinc-500">min</span>
                </div>
                <button onClick={() => onSaveRotationSettings('timed', interval)} disabled={savingRotation} className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {savingRotation ? 'Saving...' : 'Save Interval'}
                </button>
              </div>
            )}
            {mode === 'api' && rotationMode === 'api' && rotationToken && (
              <div className="mt-4 ml-7 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">API Endpoint</label>
                  <div className="flex gap-2">
                    <input type="text" value={rotationToken.endpoint} readOnly className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-mono" />
                    <button onClick={() => copyToClipboard(rotationToken.endpoint, 'endpoint')} className="px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50">
                      {copied === 'endpoint' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                    </button>
                  </div>
                </div>
                <button onClick={onRegenerateToken} className="flex items-center px-4 py-2 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Token
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
