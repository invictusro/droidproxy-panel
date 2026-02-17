import { useEffect, useState, useMemo } from 'react';
import { Wallet, Calendar, Wifi, AlertTriangle, X, Plus, CreditCard } from 'lucide-react';
import { api } from '../api/client';
import { useCentrifugo } from '../hooks/useCentrifugo';
import TopUpModal from './TopUpModal';

interface StatusBarProps {
  user: { name: string; picture: string; role: string } | null;
  centrifugoToken: string | null;
  centrifugoUrl: string | null;
}


interface UpcomingCharge {
  phoneId: string;
  phoneName: string;
  planTier: string;
  price: number;
  expiresAt: string;
  autoExtend: boolean;
}

const PLAN_PRICES: Record<string, number> = { lite: 500, turbo: 700, nitro: 900 };

export default function StatusBar({ user, centrifugoToken, centrifugoUrl }: StatusBarProps) {
  const [balance, setBalance] = useState<number>(0);
  const [upcomingCharges, setUpcomingCharges] = useState<UpcomingCharge[]>([]);
  const [phones, setPhones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  // Get phone IDs for Centrifugo subscription
  const phoneIds = useMemo(() => phones.map(p => p.id), [phones]);
  const { statuses } = useCentrifugo(phoneIds, centrifugoToken, centrifugoUrl);

  // Calculate phone stats using real-time Centrifugo status
  const phoneStats = useMemo(() => {
    let online = 0;
    let expired = 0;

    phones.forEach((phone: any) => {
      // Get real-time status from Centrifugo
      const liveStatus = statuses[phone.id];
      const status = liveStatus?.status || (phone.paired_at ? 'offline' : 'pending');

      if (status === 'online') {
        online++;
      }

      if (!phone.has_active_license) {
        expired++;
      }
    });

    return { online, total: phones.length, expired };
  }, [phones, statuses]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [balanceRes, phonesRes] = await Promise.all([
          api.getBalance(),
          api.getPhones(),
        ]);

        setBalance(balanceRes.data.balance || 0);

        const phonesData = phonesRes.data.phones || [];
        setPhones(phonesData);

        const charges: UpcomingCharge[] = [];

        phonesData.forEach((phone: any) => {
          // Track all phones with active licenses (exclude free trials)
          if (phone.has_active_license && phone.plan_tier && !phone.is_trial) {
            charges.push({
              phoneId: phone.id,
              phoneName: phone.name,
              planTier: phone.plan_tier,
              price: PLAN_PRICES[phone.plan_tier] || 0,
              expiresAt: phone.license_expires_at,
              autoExtend: phone.license_auto_extend || false,
            });
          }
        });

        setUpcomingCharges(charges);
      } catch (error) {
        console.error('Failed to fetch status data:', error);
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || loading) return null;

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Only show charges expiring within 7 days
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const soonExpiringCharges = upcomingCharges.filter(c => {
    const expiresAt = new Date(c.expiresAt).getTime();
    return expiresAt - now <= sevenDaysMs;
  });
  const totalUpcoming = soonExpiringCharges.reduce((sum, c) => sum + c.price, 0);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="bg-zinc-100 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-10 text-sm">
            <div className="flex items-center gap-6">
              {/* Balance - Clickable */}
              <button
                onClick={() => setShowTopUpModal(true)}
                className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-zinc-500">Balance:</span>
                <span className="font-semibold text-zinc-900">{formatCents(balance)}</span>
                <Plus className="w-3 h-3 text-emerald-600" />
              </button>

              {/* Upcoming Charges - Always visible */}
              <button
                onClick={() => setShowUpcomingModal(true)}
                className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                <Calendar className={`w-4 h-4 ${soonExpiringCharges.length > 0 ? 'text-amber-600' : 'text-zinc-400'}`} />
                <span className="text-zinc-500">Upcoming:</span>
                <span className={`font-semibold ${soonExpiringCharges.length > 0 ? 'text-amber-700' : 'text-zinc-600'}`}>
                  {formatCents(totalUpcoming)}
                </span>
                {soonExpiringCharges.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                    {soonExpiringCharges.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-6">
              {/* Online Phones */}
              <div className="flex items-center gap-2 text-zinc-600">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span className="text-zinc-500">Online:</span>
                <span className="font-semibold text-emerald-600">{phoneStats.online}</span>
                <span className="text-zinc-400">/</span>
                <span className="text-zinc-700">{phoneStats.total}</span>
              </div>

              {/* Expired Phones */}
              {phoneStats.expired > 0 && (
                <div className="flex items-center gap-2 text-zinc-600">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-zinc-500">Expired:</span>
                  <span className="font-semibold text-red-600">{phoneStats.expired}</span>
                  <span className="text-zinc-400">/</span>
                  <span className="text-zinc-700">{phoneStats.total}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top-Up Modal */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentBalance={balance}
        onSuccess={() => {
          // Refresh balance after successful top-up
          api.getBalance().then(res => setBalance(res.data.balance || 0));
        }}
      />

      {/* Upcoming Charges Modal */}
      {showUpcomingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900">Expiring Soon</h2>
              <button onClick={() => setShowUpcomingModal(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {soonExpiringCharges.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                <p>No licenses expiring soon</p>
                <p className="text-sm mt-1">Licenses expiring within 7 days will appear here</p>
              </div>
            ) : (
              <>
                {/* Auto-billing phones */}
                {soonExpiringCharges.filter(c => c.autoExtend).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Auto-Renew</p>
                    <div className="space-y-2">
                      {soonExpiringCharges.filter(c => c.autoExtend).map((charge) => (
                        <div key={charge.phoneId} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div>
                            <p className="font-medium text-zinc-900">{charge.phoneName}</p>
                            <p className="text-sm text-emerald-600">
                              {charge.planTier.charAt(0).toUpperCase() + charge.planTier.slice(1)} plan
                              <span className="mx-2">·</span>
                              Renews {formatDate(charge.expiresAt)}
                            </p>
                          </div>
                          <p className="font-semibold text-zinc-900">{formatCents(charge.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual billing phones */}
                {soonExpiringCharges.filter(c => !c.autoExtend).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Manual Renewal</p>
                    <div className="space-y-2">
                      {soonExpiringCharges.filter(c => !c.autoExtend).map((charge) => (
                        <div key={charge.phoneId} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div>
                            <p className="font-medium text-zinc-900">{charge.phoneName}</p>
                            <p className="text-sm text-amber-600">
                              {charge.planTier.charAt(0).toUpperCase() + charge.planTier.slice(1)} plan
                              <span className="mx-2">·</span>
                              Expires {formatDate(charge.expiresAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-zinc-900">{formatCents(charge.price)}</p>
                            <button className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700">
                              Renew
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-zinc-200 pt-4">
                  {/* Totals */}
                  <div className="space-y-2 mb-4">
                    {soonExpiringCharges.filter(c => c.autoExtend).length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Auto-Renew ({soonExpiringCharges.filter(c => c.autoExtend).length})</span>
                        <span className="font-medium text-zinc-700">
                          {formatCents(soonExpiringCharges.filter(c => c.autoExtend).reduce((sum, c) => sum + c.price, 0))}
                        </span>
                      </div>
                    )}
                    {soonExpiringCharges.filter(c => !c.autoExtend).length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Manual ({soonExpiringCharges.filter(c => !c.autoExtend).length})</span>
                        <span className="font-medium text-zinc-700">
                          {formatCents(soonExpiringCharges.filter(c => !c.autoExtend).reduce((sum, c) => sum + c.price, 0))}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                      <span className="text-zinc-900 font-medium">Total</span>
                      <span className="text-xl font-bold text-zinc-900">{formatCents(totalUpcoming)}</span>
                    </div>
                  </div>

                  {balance < totalUpcoming && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        Insufficient balance. You need {formatCents(totalUpcoming - balance)} more to cover all renewals.
                      </p>
                      <button
                        onClick={() => {
                          setShowUpcomingModal(false);
                          setShowTopUpModal(true);
                        }}
                        className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-900"
                      >
                        Top up now →
                      </button>
                    </div>
                  )}

                  <button
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Pay All {formatCents(totalUpcoming)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
