import { X, Plus } from 'lucide-react';

interface Props {
  phoneBlockedDomains: string[];
  newPhoneDomainPattern: string;
  savingPhoneBlockedDomains: boolean;
  onAddPattern: () => void;
  onRemovePattern: (index: number) => void;
  onPatternChange: (value: string) => void;
  onSave: () => void;
}

export default function RestrictionsSection({
  phoneBlockedDomains,
  newPhoneDomainPattern,
  savingPhoneBlockedDomains,
  onAddPattern,
  onRemovePattern,
  onPatternChange,
  onSave,
}: Props) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">Restrictions</h3>
      <p className="text-sm text-zinc-600 mb-4">Block domains for all credentials on this phone. Patterns: <code className="bg-zinc-200 px-1 rounded">example.com</code>, <code className="bg-zinc-200 px-1 rounded">*.example.com</code></p>

      {/* Current blocked domains */}
      {phoneBlockedDomains.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {phoneBlockedDomains.map((pattern, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              <span className="font-mono">{pattern}</span>
              <button onClick={() => onRemovePattern(idx)} className="hover:bg-red-200 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Add new pattern */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newPhoneDomainPattern}
          onChange={(e) => onPatternChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddPattern()}
          placeholder="*.stripe.com"
          className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm"
        />
        <button onClick={onAddPattern} disabled={!newPhoneDomainPattern.trim()} className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300 disabled:opacity-50">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <button onClick={onSave} disabled={savingPhoneBlockedDomains} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
        {savingPhoneBlockedDomains ? 'Saving...' : 'Save Restrictions'}
      </button>
    </div>
  );
}
