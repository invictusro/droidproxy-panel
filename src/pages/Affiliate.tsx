import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  Link2,
  Copy,
  Check,
  ArrowDownRight,
  MousePointerClick,
  Gift,
  Edit2,
  Wallet,
  Bitcoin
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '@/components/ui/button';

interface AffiliateStats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  available_balance: number;
  pending_earnings: number;
  withdrawn_amount: number;
}

interface Referral {
  id: string;
  referred_user_id: string;
  created_at: string;
  status: string;
  total_earnings: number;
  user_email: string;
}

interface Earning {
  id: string;
  amount: number;
  original_amount: number;
  status: string;
  created_at: string;
  user_email: string;
}

export default function Affiliate() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [slugError, setSlugError] = useState('');

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['affiliate-stats'],
    queryFn: async () => {
      const res = await api.getAffiliateStats();
      return res.data;
    },
  });

  const { data: referralsData } = useQuery({
    queryKey: ['affiliate-referrals'],
    queryFn: async () => {
      const res = await api.getAffiliateReferrals();
      return res.data;
    },
  });

  const { data: earningsData } = useQuery({
    queryKey: ['affiliate-earnings'],
    queryFn: async () => {
      const res = await api.getAffiliateEarnings();
      return res.data;
    },
  });

  const withdrawToBalanceMutation = useMutation({
    mutationFn: (amount: number) => api.withdrawAffiliate(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setShowBalanceModal(false);
      setWithdrawAmount('');
    },
  });

  const withdrawToCryptoMutation = useMutation({
    mutationFn: (data: { amount: number; address: string }) => api.withdrawAffiliateCrypto(data.amount, data.address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-stats'] });
      setShowCryptoModal(false);
      setWithdrawAmount('');
      setCryptoAddress('');
    },
  });

  const slugMutation = useMutation({
    mutationFn: (slug: string) => api.setAffiliateSlug(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-stats'] });
      setIsEditingSlug(false);
      setSlugError('');
    },
    onError: (error: any) => {
      setSlugError(error.response?.data?.error || 'Failed to update slug');
    },
  });

  const stats: AffiliateStats = statsData?.stats || {
    total_referrals: 0,
    active_referrals: 0,
    total_earnings: 0,
    available_balance: 0,
    pending_earnings: 0,
    withdrawn_amount: 0,
  };

  const referralCode = statsData?.referral_code || '';
  const affiliateSlug = statsData?.affiliate_slug || '';
  const commissionRate = statsData?.commission_rate || 10;
  const clicks = statsData?.clicks || 0;

  const referrals: Referral[] = referralsData?.referrals || [];
  const earnings: Earning[] = earningsData?.earnings || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdrawToBalance = () => {
    const amount = Math.round(parseFloat(withdrawAmount) * 100);
    if (amount > 0 && amount <= stats.available_balance) {
      withdrawToBalanceMutation.mutate(amount);
    }
  };

  const handleWithdrawToCrypto = () => {
    const amount = Math.round(parseFloat(withdrawAmount) * 100);
    if (amount >= 2500 && amount <= stats.available_balance && cryptoAddress.trim()) {
      withdrawToCryptoMutation.mutate({ amount, address: cryptoAddress.trim() });
    }
  };

  const handleSaveSlug = () => {
    if (newSlug.trim() && newSlug.length >= 3) {
      slugMutation.mutate(newSlug.trim().toLowerCase());
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Affiliate Program</h1>
        <p className="text-zinc-500 mt-1">Earn {commissionRate}% on deposits from users you refer for 1 year</p>
      </div>

      {/* Balance & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 opacity-80" />
            <span className="text-emerald-100 text-xs">Available</span>
          </div>
          <div className="text-2xl font-bold">${(stats.available_balance / 100).toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-500 text-xs">Total Earned</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">${(stats.total_earnings / 100).toFixed(2)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-500 text-xs">Referrals</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">{stats.total_referrals}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <MousePointerClick className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-500 text-xs">Clicks</span>
          </div>
          <div className="text-2xl font-bold text-zinc-900">{clicks}</div>
        </div>
      </div>

      {/* Withdraw Section */}
      {stats.available_balance > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <h3 className="font-semibold text-zinc-900 mb-4">Withdraw Earnings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowBalanceModal(true)}
              className="flex items-center gap-4 p-4 border border-zinc-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-zinc-900">Add to Balance</p>
                <p className="text-xs text-zinc-500">Transfer to your usage balance instantly</p>
              </div>
            </button>

            <button
              onClick={() => setShowCryptoModal(true)}
              disabled={stats.available_balance < 2500}
              className="flex items-center gap-4 p-4 border border-zinc-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-200 disabled:hover:bg-white"
            >
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-zinc-900">Withdraw to Crypto</p>
                <p className="text-xs text-zinc-500">Min $25 &bull; USDT/USDC</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Referral Link */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-zinc-400" />
          <h3 className="font-semibold text-zinc-900">Your Invite Link</h3>
        </div>

        {affiliateSlug ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-mono text-sm text-emerald-700">
              droidproxy.com/i/{affiliateSlug}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(`https://droidproxy.com/i/${affiliateSlug}`)}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <button
              onClick={() => { setNewSlug(affiliateSlug); setIsEditingSlug(true); }}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        ) : isEditingSlug ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">droidproxy.com/i/</span>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => {
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                  setSlugError('');
                }}
                placeholder="yourname"
                className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                maxLength={30}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveSlug}
                disabled={slugMutation.isPending || newSlug.length < 3}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setIsEditingSlug(false); setSlugError(''); }}>
                Cancel
              </Button>
            </div>
            {slugError && <p className="text-sm text-red-600">{slugError}</p>}
            <p className="text-xs text-zinc-500">3-30 characters. Letters, numbers, hyphens, underscores.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-zinc-50 border border-dashed border-zinc-300 rounded-xl px-4 py-3">
            <div className="text-sm text-zinc-500">
              <span className="text-zinc-400">droidproxy.com/i/</span>
              <span className="text-emerald-600 font-medium">yourname</span>
            </div>
            <Button size="sm" onClick={() => setIsEditingSlug(true)} className="bg-emerald-600 hover:bg-emerald-700">
              Create Link
            </Button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-3">
          <span className="text-sm text-zinc-500">Referral code:</span>
          <code className="bg-zinc-100 px-2 py-1 rounded text-sm font-mono">{referralCode}</code>
          <button onClick={() => copyToClipboard(referralCode)} className="text-zinc-400 hover:text-zinc-600">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referrals */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <h3 className="font-semibold text-zinc-900 mb-4">Recent Referrals</h3>
          {referrals.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              No referrals yet
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{r.user_email}</p>
                    <p className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">${(r.total_earnings / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Earnings */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <h3 className="font-semibold text-zinc-900 mb-4">Recent Earnings</h3>
          {earnings.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-sm">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              No earnings yet
            </div>
          ) : (
            <div className="space-y-2">
              {earnings.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">+${(e.amount / 100).toFixed(2)}</p>
                      <p className="text-xs text-zinc-500">from ${(e.original_amount / 100).toFixed(2)} deposit</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">{new Date(e.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add to Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Add to Balance</h3>
                <p className="text-xs text-zinc-500">Transfer to your usage balance</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="number"
                  min="0.01"
                  max={stats.available_balance / 100}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={(stats.available_balance / 100).toFixed(2)}
                  className="w-full pl-7 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Available: ${(stats.available_balance / 100).toFixed(2)}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowBalanceModal(false); setWithdrawAmount(''); }} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleWithdrawToBalance}
                disabled={withdrawToBalanceMutation.isPending || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) * 100 > stats.available_balance}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {withdrawToBalanceMutation.isPending ? 'Processing...' : 'Transfer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw to Crypto Modal */}
      {showCryptoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Withdraw to Crypto</h3>
                <p className="text-xs text-zinc-500">USDT/USDC on any network</p>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-sm text-zinc-700 mb-1 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    min="25"
                    max={stats.available_balance / 100}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="25.00"
                    className="w-full pl-7 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">Min $25 &bull; Available: ${(stats.available_balance / 100).toFixed(2)}</p>
              </div>

              <div>
                <label className="text-sm text-zinc-700 mb-1 block">Wallet Address</label>
                <input
                  type="text"
                  value={cryptoAddress}
                  onChange={(e) => setCryptoAddress(e.target.value)}
                  placeholder="0x... or TRC20 address"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                />
                <p className="text-xs text-zinc-500 mt-1">We'll send USDT/USDC to this address</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowCryptoModal(false); setWithdrawAmount(''); setCryptoAddress(''); }} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleWithdrawToCrypto}
                disabled={withdrawToCryptoMutation.isPending || !withdrawAmount || parseFloat(withdrawAmount) < 25 || parseFloat(withdrawAmount) * 100 > stats.available_balance || !cryptoAddress.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {withdrawToCryptoMutation.isPending ? 'Processing...' : 'Request Withdrawal'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
