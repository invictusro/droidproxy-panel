import { useState, useEffect } from 'react';
import { X, Info, CreditCard, Settings, RotateCw, Database, Activity, Shield, Smartphone, Power, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import type {
  PhoneWithStatus,
  ConnectionCredential,
  RotationToken,
  PhoneLicense,
  Plan,
  PlanChangePreview,
  PlanTier,
  MainSection,
  TrafficSubTab,
  DeviceSubTab,
  RotationMode,
  DataUsage,
  UptimeData,
  CredentialFormData,
  ConfirmModalState,
} from './types';
import { getLocalDateString, getDateRange } from './utils';

// Section components
import OverviewSection from './sections/OverviewSection';
import LicenseSection from './sections/LicenseSection';
import CredentialsSection from './sections/CredentialsSection';
import RotationSection from './sections/RotationSection';
import TrafficSection from './sections/TrafficSection';
import UptimeSection from './sections/UptimeSection';
import RestrictionsSection from './sections/RestrictionsSection';
import DeviceSection from './sections/DeviceSection';
import ActionsSection from './sections/ActionsSection';

interface Props {
  phone: PhoneWithStatus;
  onClose: () => void;
  onRotateIP: () => void;
  onRestart: () => void;
  onDelete: () => void;
  onRefetch?: () => void;
  isRotating: boolean;
  isRestarting: boolean;
}

export default function PhoneSettingsModal({
  phone,
  onClose,
  onRotateIP,
  onRestart,
  onDelete,
  onRefetch,
  isRotating,
  isRestarting
}: Props) {
  // Auto-select license tab if phone has no license
  const [hasLicense, setHasLicense] = useState(phone.has_active_license);
  const [activeSection, setActiveSection] = useState<MainSection>(hasLicense ? 'overview' : 'license');
  const [trafficSubTab, setTrafficSubTab] = useState<TrafficSubTab>('monthly');
  const [deviceSubTab, setDeviceSubTab] = useState<DeviceSubTab>('metrics');

  const [credentials, setCredentials] = useState<ConnectionCredential[]>([]);
  const [rotationToken, setRotationToken] = useState<RotationToken | null>(null);
  const [loading, setLoading] = useState(true);

  // License state
  const [license, setLicense] = useState<PhoneLicense | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingLicense, setLoadingLicense] = useState(false);
  const [purchasingLicense, setPurchasingLicense] = useState(false);
  const [planChangePreview, setPlanChangePreview] = useState<PlanChangePreview | null>(null);
  const [loadingPlanChange, setLoadingPlanChange] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);

  // Phone-level blocked domains
  const [phoneBlockedDomains, setPhoneBlockedDomains] = useState<string[]>([]);
  const [newPhoneDomainPattern, setNewPhoneDomainPattern] = useState('');
  const [savingPhoneBlockedDomains, setSavingPhoneBlockedDomains] = useState(false);

  // Usage & Uptime state
  const [dataUsage, setDataUsage] = useState<DataUsage | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null);
  const [uptimePrevDayData, setUptimePrevDayData] = useState<UptimeData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [usageDateRange, setUsageDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [uptimeSelectedDate, setUptimeSelectedDate] = useState<string>(() => getLocalDateString());
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');

  // Rotation settings state
  const [rotationMode, setRotationMode] = useState<RotationMode>('off');
  const [rotationInterval, setRotationInterval] = useState(30);
  const [savingRotation, setSavingRotation] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ show: false, title: '', message: '' });
  const [purchaseAutoExtend, setPurchaseAutoExtend] = useState(true);

  useEffect(() => {
    loadData();
  }, [phone.id]);

  // Force license tab when phone has no license
  useEffect(() => {
    if (!hasLicense && activeSection !== 'license') {
      setActiveSection('license');
    }
  }, [hasLicense, activeSection]);

  useEffect(() => {
    if (activeSection === 'traffic' || activeSection === 'uptime') {
      loadUsageData();
    }
  }, [activeSection, usageDateRange, uptimeSelectedDate, selectedCredentialId]);

  useEffect(() => {
    if (activeSection === 'license') {
      loadLicenseData();
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'restrictions') {
      setPhoneBlockedDomains(phone.blocked_domains || []);
    }
  }, [activeSection, phone.blocked_domains]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [credRes, tokenRes, rotationRes] = await Promise.all([
        api.getCredentials(phone.id),
        api.getRotationToken(phone.id),
        api.getRotationSettings(phone.id),
      ]);
      setCredentials(credRes.data.credentials || []);
      setRotationToken(tokenRes.data.rotation_token);
      setRotationMode(rotationRes.data.rotation_mode || 'off');
      setRotationInterval(rotationRes.data.rotation_interval_minutes || 30);
    } catch (error) {
      console.error('Failed to load phone settings:', error);
    }
    setLoading(false);
  };

  const loadLicenseData = async () => {
    setLoadingLicense(true);
    try {
      const res = await api.getPhoneLicense(phone.id);
      if (res.data.has_license) {
        setLicense(res.data.license);
      } else {
        setLicense(null);
      }
      setPlans(res.data.plans || []);
    } catch (error) {
      console.error('Failed to load license:', error);
    }
    setLoadingLicense(false);
  };

  const loadUsageData = async () => {
    setLoadingUsage(true);
    try {
      const usageRange = getDateRange(usageDateRange);
      // Calculate previous day for timezone handling
      const prevDate = new Date(uptimeSelectedDate + 'T00:00:00');
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = getLocalDateString(prevDate);

      const [usageRes, uptimeRes, uptimePrevRes] = await Promise.all([
        api.getPhoneDataUsage(phone.id, usageRange.start, usageRange.end, selectedCredentialId || undefined),
        api.getPhoneUptime(phone.id, uptimeSelectedDate, uptimeSelectedDate),
        api.getPhoneUptime(phone.id, prevDateStr, prevDateStr),
      ]);
      setDataUsage(usageRes.data);
      setUptimeData(uptimeRes.data);
      setUptimePrevDayData(uptimePrevRes.data);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
    setLoadingUsage(false);
  };

  // License handlers
  const handlePurchaseLicense = (planTier: string) => {
    const plan = plans.find(p => p.tier === planTier);
    setPurchaseAutoExtend(true);
    setConfirmModal({
      show: true,
      title: 'Confirm Purchase',
      message: `Purchase ${planTier.toUpperCase()} plan for this phone?`,
      planTier,
      planPrice: plan?.price_formatted || '',
    });
  };

  const confirmPurchase = async () => {
    if (!confirmModal.planTier) return;
    setConfirmModal(prev => ({ ...prev, show: false }));
    setPurchasingLicense(true);
    try {
      await api.purchaseLicense(phone.id, { plan_tier: confirmModal.planTier as any, auto_extend: purchaseAutoExtend });
      await loadLicenseData();
      setHasLicense(true);
      onRefetch?.();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to purchase license';
      setConfirmModal({
        show: true,
        title: 'Purchase Failed',
        message: msg,
        isError: true,
      });
    }
    setPurchasingLicense(false);
  };

  const handleToggleAutoExtend = async () => {
    if (!license) return;
    try {
      await api.updateLicense(phone.id, { auto_extend: !license.auto_extend });
      await loadLicenseData();
    } catch (error) {
      console.error('Failed to update license:', error);
    }
  };

  const handleCancelLicense = async () => {
    if (!confirm('Are you sure you want to cancel your license? It will remain active until the expiry date but will not renew.')) return;
    try {
      await api.cancelLicense(phone.id);
      await loadLicenseData();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to cancel license';
      alert(msg);
    }
  };

  const handlePreviewPlanChange = async (newTier: PlanTier) => {
    setLoadingPlanChange(true);
    setPlanChangePreview(null);
    try {
      const res = await api.previewPlanChange(phone.id, newTier);
      setPlanChangePreview(res.data);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to preview plan change';
      alert(msg);
    }
    setLoadingPlanChange(false);
  };

  const handleChangePlan = async () => {
    if (!planChangePreview) return;

    if (planChangePreview.change_type === 'downgrade') {
      if (!confirm('Downgrading will immediately reduce your plan limits. No refund will be provided. Continue?')) {
        return;
      }
    }

    setChangingPlan(true);
    try {
      await api.changePlan(phone.id, {
        plan_tier: planChangePreview.new_plan,
        confirm_no_refund: planChangePreview.change_type === 'downgrade',
      });
      setPlanChangePreview(null);
      await loadLicenseData();
      setHasLicense(true);
      onRefetch?.();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to change plan';
      alert(msg);
    }
    setChangingPlan(false);
  };

  // Rotation handlers
  const handleSaveRotationSettings = async (mode: RotationMode, interval?: number) => {
    setSavingRotation(true);
    try {
      await api.updateRotationSettings(phone.id, {
        rotation_mode: mode,
        rotation_interval_minutes: interval || rotationInterval,
      });
      setRotationMode(mode);
      if (interval !== undefined) setRotationInterval(interval);
    } catch (error) {
      console.error('Failed to save rotation settings:', error);
    }
    setSavingRotation(false);
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate rotation token? The old token will stop working.')) return;
    try {
      const res = await api.regenerateRotationToken(phone.id);
      setRotationToken(res.data.rotation_token);
    } catch (error) {
      console.error('Failed to regenerate token:', error);
    }
  };

  // Credentials handlers
  const handleAddCredential = async (formData: CredentialFormData) => {
    const data: any = {
      name: formData.name,
      auth_type: formData.auth_type,
      proxy_type: formData.proxy_type,
    };
    if (formData.auth_type === 'ip') {
      data.allowed_ip = formData.allowed_ip;
    } else {
      data.username = formData.username;
      data.password = formData.password;
    }
    if (formData.expires_at) {
      data.expires_at = formData.expires_at;
    }
    await api.createCredential(phone.id, data);
    loadData();
  };

  const handleDeleteCredential = async (credId: string) => {
    if (!confirm('Delete this credential?')) return;
    try {
      await api.deleteCredential(phone.id, credId);
      loadData();
    } catch (error) {
      console.error('Failed to delete credential:', error);
    }
  };

  const handleToggleCredential = async (cred: ConnectionCredential) => {
    try {
      await api.updateCredential(phone.id, cred.id, { is_active: !cred.is_active });
      loadData();
    } catch (error) {
      console.error('Failed to toggle credential:', error);
    }
  };

  // Phone-level domain blocking
  const handleAddPhoneDomainPattern = () => {
    const pattern = newPhoneDomainPattern.trim();
    if (!pattern) return;
    setPhoneBlockedDomains([...phoneBlockedDomains, pattern]);
    setNewPhoneDomainPattern('');
  };

  const handleRemovePhoneDomainPattern = (index: number) => {
    setPhoneBlockedDomains(phoneBlockedDomains.filter((_, i) => i !== index));
  };

  const handleSavePhoneBlockedDomains = async () => {
    setSavingPhoneBlockedDomains(true);
    try {
      await api.updatePhoneBlockedDomains(phone.id, phoneBlockedDomains);
    } catch (error) {
      console.error('Failed to save blocked domains:', error);
    }
    setSavingPhoneBlockedDomains(false);
  };

  // Uptime navigation
  const navigateUptimeDate = (direction: 'prev' | 'next') => {
    const d = new Date(uptimeSelectedDate);
    d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1));
    setUptimeSelectedDate(d.toISOString().split('T')[0]);
  };

  const menuItems: { id: MainSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
    { id: 'license', label: 'License', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'credentials', label: 'Credentials', icon: <Settings className="w-4 h-4" /> },
    { id: 'rotation', label: 'Rotation', icon: <RotateCw className="w-4 h-4" /> },
    { id: 'traffic', label: 'Traffic', icon: <Database className="w-4 h-4" /> },
    { id: 'uptime', label: 'Uptime', icon: <Activity className="w-4 h-4" /> },
    { id: 'restrictions', label: 'Restrictions', icon: <Shield className="w-4 h-4" /> },
    { id: 'device', label: 'Device', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'actions', label: 'Actions', icon: <Power className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-zinc-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${phone.status === 'online' ? 'bg-emerald-500' : phone.status === 'offline' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">{phone.name}</h2>
              <p className="text-sm text-zinc-500">{phone.hub_server?.location}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Main Content with Left Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-48 bg-zinc-50 border-r border-zinc-200 py-2 shrink-0 overflow-y-auto">
            {menuItems.map((item) => {
              const isLicenseItem = item.id === 'license';
              const isLocked = !hasLicense && !isLicenseItem;
              const needsAttention = !hasLicense && isLicenseItem;
              const currentPlanTier = license?.plan_tier || phone.plan_tier;
              const isRestrictionsLocked = item.id === 'restrictions' && currentPlanTier !== 'turbo' && currentPlanTier !== 'nitro';
              const isDisabled = isLocked || isRestrictionsLocked;

              return (
                <button
                  key={item.id}
                  onClick={() => !isDisabled && setActiveSection(item.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isDisabled
                      ? 'text-zinc-300 cursor-not-allowed'
                      : activeSection === item.id
                        ? 'bg-emerald-100 text-emerald-700 font-medium border-r-2 border-emerald-600'
                        : needsAttention
                          ? 'text-red-600 bg-red-50 border-r-2 border-red-500 font-medium'
                          : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {needsAttention ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    item.icon
                  )}
                  {item.label}
                  {isRestrictionsLocked && (
                    <span className="ml-auto text-[10px] text-zinc-400">Turbo+</span>
                  )}
                  {needsAttention && activeSection !== 'license' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <>
                {activeSection === 'overview' && (
                  <OverviewSection phone={phone} credentials={credentials} />
                )}

                {activeSection === 'license' && (
                  <LicenseSection
                    license={license}
                    plans={plans}
                    loadingLicense={loadingLicense}
                    purchasingLicense={purchasingLicense}
                    planChangePreview={planChangePreview}
                    loadingPlanChange={loadingPlanChange}
                    changingPlan={changingPlan}
                    onPurchaseLicense={handlePurchaseLicense}
                    onToggleAutoExtend={handleToggleAutoExtend}
                    onCancelLicense={handleCancelLicense}
                    onPreviewPlanChange={handlePreviewPlanChange}
                    onChangePlan={handleChangePlan}
                    onCancelPlanChange={() => setPlanChangePreview(null)}
                    onDelete={onDelete}
                  />
                )}

                {activeSection === 'credentials' && (
                  <CredentialsSection
                    phone={phone}
                    credentials={credentials}
                    onAddCredential={handleAddCredential}
                    onDeleteCredential={handleDeleteCredential}
                    onToggleCredential={handleToggleCredential}
                  />
                )}

                {activeSection === 'rotation' && (
                  <RotationSection
                    phone={phone}
                    rotationToken={rotationToken}
                    rotationMode={rotationMode}
                    rotationInterval={rotationInterval}
                    savingRotation={savingRotation}
                    onSaveRotationSettings={handleSaveRotationSettings}
                    onRegenerateToken={handleRegenerateToken}
                  />
                )}

                {activeSection === 'traffic' && (
                  <TrafficSection
                    dataUsage={dataUsage}
                    uptimeData={uptimeData}
                    credentials={credentials}
                    loadingUsage={loadingUsage}
                    trafficSubTab={trafficSubTab}
                    usageDateRange={usageDateRange}
                    selectedCredentialId={selectedCredentialId}
                    onSubTabChange={setTrafficSubTab}
                    onDateRangeChange={setUsageDateRange}
                    onCredentialChange={setSelectedCredentialId}
                  />
                )}

                {activeSection === 'uptime' && (
                  <UptimeSection
                    uptimeData={uptimeData}
                    uptimePrevDayData={uptimePrevDayData}
                    loadingUsage={loadingUsage}
                    uptimeSelectedDate={uptimeSelectedDate}
                    onNavigateDate={navigateUptimeDate}
                    onDateChange={setUptimeSelectedDate}
                  />
                )}

                {activeSection === 'restrictions' && (
                  <RestrictionsSection
                    phoneBlockedDomains={phoneBlockedDomains}
                    newPhoneDomainPattern={newPhoneDomainPattern}
                    savingPhoneBlockedDomains={savingPhoneBlockedDomains}
                    onAddPattern={handleAddPhoneDomainPattern}
                    onRemovePattern={handleRemovePhoneDomainPattern}
                    onPatternChange={setNewPhoneDomainPattern}
                    onSave={handleSavePhoneBlockedDomains}
                  />
                )}

                {activeSection === 'device' && (
                  <DeviceSection
                    phone={phone}
                    deviceSubTab={deviceSubTab}
                    onSubTabChange={setDeviceSubTab}
                  />
                )}

                {activeSection === 'actions' && (
                  <ActionsSection
                    phone={phone}
                    isRotating={isRotating}
                    isRestarting={isRestarting}
                    onRotateIP={onRotateIP}
                    onRestart={onRestart}
                    onDelete={onDelete}
                    onRefetch={onRefetch}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">{confirmModal.title}</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">{confirmModal.message}</p>
              {confirmModal.planTier && confirmModal.planPrice && (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-emerald-900 capitalize">{confirmModal.planTier}</span>
                        <span className="text-emerald-700 ml-2">Plan</span>
                      </div>
                      <div className="text-xl font-bold text-emerald-900">{confirmModal.planPrice}</div>
                    </div>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">Auto-extend license</div>
                      <div className="text-sm text-gray-500">Automatically renew when license expires</div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={purchaseAutoExtend}
                        onChange={(e) => setPurchaseAutoExtend(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${purchaseAutoExtend ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${purchaseAutoExtend ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  </label>
                </>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {confirmModal.isError ? 'Close' : 'Cancel'}
              </button>
              {!confirmModal.isError && (
                <button
                  onClick={confirmPurchase}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Confirm Purchase
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
