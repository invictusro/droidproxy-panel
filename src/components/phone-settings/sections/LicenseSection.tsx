import { Zap, Activity, Database, RotateCw, Shield, Cpu, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import type { PhoneLicense, Plan, PlanChangePreview, PlanTier } from '../types';

interface Props {
  license: PhoneLicense | null;
  plans: Plan[];
  loadingLicense: boolean;
  purchasingLicense: boolean;
  planChangePreview: PlanChangePreview | null;
  loadingPlanChange: boolean;
  changingPlan: boolean;
  onPurchaseLicense: (planTier: string) => void;
  onToggleAutoExtend: () => void;
  onCancelLicense: () => void;
  onPreviewPlanChange: (newTier: PlanTier) => void;
  onChangePlan: () => void;
  onCancelPlanChange: () => void;
  onDelete: () => void;
}

export default function LicenseSection({
  license,
  plans,
  loadingLicense,
  purchasingLicense,
  planChangePreview,
  loadingPlanChange,
  changingPlan,
  onPurchaseLicense,
  onToggleAutoExtend,
  onCancelLicense,
  onPreviewPlanChange,
  onChangePlan,
  onCancelPlanChange,
  onDelete,
}: Props) {
  if (loadingLicense) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-900">License</h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  // Active license
  if (license && license.status === 'active') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-900">License</h3>
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Active Plan</p>
                <p className="text-2xl font-bold text-emerald-700">{license.plan_tier.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-700">Expires {new Date(license.expires_at).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-emerald-200">
              <div>
                <p className="text-xs text-emerald-600">Speed</p>
                <p className="font-medium text-emerald-800">{license.limits.speed_limit_mbps} Mbit/s</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Connections</p>
                <p className="font-medium text-emerald-800">{license.limits.max_connections}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">Log Retention</p>
                <p className="font-medium text-emerald-800">{license.limits.log_weeks} weeks</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-zinc-700">Auto-Extend License</p>
                <p className="text-xs text-zinc-500 mt-0.5">Automatically renew from balance when license expires</p>
              </div>
              <button
                onClick={onToggleAutoExtend}
                className={`w-12 h-6 rounded-full transition-colors ${license.auto_extend ? 'bg-emerald-500' : 'bg-zinc-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${license.auto_extend ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          {license.auto_extend && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Cancel License</p>
                  <p className="text-xs text-amber-600 mt-0.5">License stays active until {new Date(license.expires_at).toLocaleDateString('en-GB')} but won't renew.</p>
                </div>
                <button
                  onClick={onCancelLicense}
                  className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Change Plan Options */}
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
            <p className="text-sm font-medium text-zinc-700 mb-3">Change Plan</p>
            <div className="flex gap-2">
              {plans.filter(p => p.tier !== license.plan_tier).map((plan) => {
                const isUpgrade = plan.price_cents > (plans.find(p => p.tier === license.plan_tier)?.price_cents || 0);
                return (
                  <button
                    key={plan.tier}
                    onClick={() => onPreviewPlanChange(plan.tier)}
                    disabled={loadingPlanChange}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                      isUpgrade
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                    }`}
                  >
                    {isUpgrade ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {plan.name} ({plan.price_formatted})
                  </button>
                );
              })}
            </div>

            {/* Plan Change Preview */}
            {loadingPlanChange && (
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            )}

            {planChangePreview && (
              <div className={`mt-4 p-4 rounded-lg border ${
                planChangePreview.change_type === 'upgrade'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {planChangePreview.change_type === 'upgrade' ? (
                    <ArrowUp className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ArrowDown className="w-5 h-5 text-amber-600" />
                  )}
                  <span className={`font-semibold ${
                    planChangePreview.change_type === 'upgrade' ? 'text-emerald-800' : 'text-amber-800'
                  }`}>
                    {planChangePreview.change_type === 'upgrade' ? 'Upgrade' : 'Downgrade'} to {planChangePreview.new_plan.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Days remaining:</span>
                    <span className="font-medium">{planChangePreview.days_remaining}</span>
                  </div>
                  {planChangePreview.change_type === 'upgrade' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Prorated charge:</span>
                        <span className="font-medium text-emerald-700">
                          ${((planChangePreview.charge_amount || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Your balance:</span>
                        <span className={`font-medium ${planChangePreview.can_afford ? 'text-emerald-700' : 'text-red-600'}`}>
                          ${((planChangePreview.current_balance || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      {!planChangePreview.can_afford && (
                        <p className="text-red-600 text-xs mt-2">
                          Insufficient balance. Add ${(((planChangePreview.charge_amount || 0) - (planChangePreview.current_balance || 0)) / 100).toFixed(2)} more.
                        </p>
                      )}
                    </>
                  )}
                  {planChangePreview.change_type === 'downgrade' && planChangePreview.warning && (
                    <p className="text-amber-700 text-xs mt-2">{planChangePreview.warning}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-4 p-2 bg-white/50 rounded-lg">
                  <div>
                    <span className="text-zinc-500">Speed</span>
                    <p className="font-semibold">{planChangePreview.new_limits.speed_limit_mbps} Mbit/s</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Connections</span>
                    <p className="font-semibold">{planChangePreview.new_limits.max_connections}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Logs</span>
                    <p className="font-semibold">{planChangePreview.new_limits.log_weeks} weeks</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onCancelPlanChange}
                    className="flex-1 py-2 text-sm text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onChangePlan}
                    disabled={changingPlan || (planChangePreview.change_type === 'upgrade' && !planChangePreview.can_afford)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg disabled:opacity-50 ${
                      planChangePreview.change_type === 'upgrade'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    {changingPlan ? 'Processing...' : planChangePreview.change_type === 'upgrade' ? 'Confirm Upgrade' : 'Confirm Downgrade'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Expired license
  if (license && license.status === 'expired') {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-zinc-900">License</h3>
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-red-600 font-medium">Expired Plan</p>
                <p className="text-2xl font-bold text-red-700">{license.plan_tier.toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-600">Expired</p>
                <p className="text-sm text-red-700">{new Date(license.expires_at).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-red-200 mb-4">
              <div>
                <p className="text-xs text-red-600">Speed</p>
                <p className="font-medium text-red-800">{license.limits.speed_limit_mbps} Mbit/s</p>
              </div>
              <div>
                <p className="text-xs text-red-600">Connections</p>
                <p className="font-medium text-red-800">{license.limits.max_connections}</p>
              </div>
              <div>
                <p className="text-xs text-red-600">Log Retention</p>
                <p className="font-medium text-red-800">{license.limits.log_weeks} weeks</p>
              </div>
            </div>
            <button
              onClick={() => onPurchaseLicense(license.plan_tier)}
              disabled={purchasingLicense}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {purchasingLicense ? 'Processing...' : `Extend ${license.plan_tier.toUpperCase()} Plan`}
            </button>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
            <p className="text-sm text-zinc-600 mb-2">Or switch to a different plan:</p>
            <div className="flex gap-2">
              {plans.filter(p => p.tier !== license.plan_tier).map((plan) => (
                <button
                  key={plan.tier}
                  onClick={() => onPurchaseLicense(plan.tier)}
                  disabled={purchasingLicense}
                  className="flex-1 py-2 px-3 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
                >
                  {plan.name} ({plan.price_formatted})
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Your proxy credentials have been disabled. Extend your license to re-enable them.
              Phone data will be deleted in 14 days if not renewed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No license - show plan selection
  const planDescriptions: Record<string, string> = {
    lite: 'Basic browsing & light usage',
    turbo: 'Streaming & daily use',
    nitro: 'Reselling & API access',
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-900">License</h3>
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-amber-800">No active license. Select a plan below to activate proxy features.</p>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Delete Phone
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isPopular = plan.tier === 'nitro';
            return (
              <div
                key={plan.tier}
                className={`relative p-4 bg-white rounded-xl border-2 transition-colors ${
                  isPopular
                    ? 'border-emerald-400 ring-2 ring-emerald-100'
                    : 'border-zinc-200 hover:border-emerald-400'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                <h4 className="text-lg font-bold text-zinc-900 mb-1">{plan.name}</h4>
                <p className="text-xs text-zinc-500 mb-2">{planDescriptions[plan.tier]}</p>
                <p className="text-2xl font-bold text-emerald-600 mb-4">{plan.price_formatted}</p>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-zinc-700"><strong>{plan.limits.speed_limit_mbps}</strong> Mbit/s max speed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-zinc-700">Up to <strong>{plan.limits.max_connections}</strong> connections</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-500" />
                    <span className="text-zinc-700">Logs for up to <strong>{plan.limits.log_weeks}</strong> weeks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-rose-500" />
                    <span className="text-zinc-700">IP rotation</span>
                  </div>
                  {(plan.tier === 'turbo' || plan.tier === 'nitro') ? (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span className="text-zinc-700">Domain blocking</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-zinc-300" />
                      <span className="text-zinc-400 line-through">Domain blocking</span>
                    </div>
                  )}
                  {plan.tier === 'nitro' ? (
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      <span className="text-zinc-700">Reselling API</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-zinc-300" />
                      <span className="text-zinc-400 line-through">Reselling API</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onPurchaseLicense(plan.tier)}
                  disabled={purchasingLicense}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                    isPopular
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {purchasingLicense ? 'Processing...' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
