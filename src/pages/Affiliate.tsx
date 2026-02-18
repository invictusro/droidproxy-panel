import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  Link2,
  Copy,
  Check,
  ArrowDownToLine,
  TrendingUp,
  Gift,
  Edit2,
  Save,
  X
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
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
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

  const withdrawMutation = useMutation({
    mutationFn: (amount: number) => api.withdrawAffiliate(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-stats'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setShowWithdrawModal(false);
      setWithdrawAmount('');
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

  const referralLink = statsData?.referral_link || '';
  const referralCode = statsData?.referral_code || '';
  const affiliateSlug = statsData?.affiliate_slug || '';
  const commissionRate = statsData?.commission_rate || 10;

  const referrals: Referral[] = referralsData?.referrals || [];
  const earnings: Earning[] = earningsData?.earnings || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = () => {
    const amount = Math.round(parseFloat(withdrawAmount) * 100);
    if (amount >= 100 && amount <= stats.available_balance) {
      withdrawMutation.mutate(amount);
    }
  };

  const handleSaveSlug = () => {
    if (newSlug.trim()) {
      slugMutation.mutate(newSlug.trim().toLowerCase());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Affiliate Program</h1>
          <p className="text-zinc-500 mt-1">
            Earn {commissionRate}% commission on every deposit from users you refer for 1 year
          </p>
        </div>
        {stats.available_balance > 0 && (
          <Button
            onClick={() => setShowWithdrawModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Withdraw ${(stats.available_balance / 100).toFixed(2)}
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Referrals</p>
              <p className="text-2xl font-bold text-zinc-900">{stats.total_referrals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Active Referrals</p>
              <p className="text-2xl font-bold text-zinc-900">{stats.active_referrals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Earnings</p>
              <p className="text-2xl font-bold text-zinc-900">
                ${(stats.total_earnings / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ${(stats.available_balance / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Your Referral Link
        </h2>

        <div className="space-y-4">
          {/* Main referral link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 font-mono text-sm">
              {referralLink}
            </div>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(referralLink)}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Custom slug section */}
          <div className="border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-zinc-700">Custom Link (optional)</p>
              {!isEditingSlug && (
                <button
                  onClick={() => {
                    setNewSlug(affiliateSlug || '');
                    setIsEditingSlug(true);
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  {affiliateSlug ? 'Edit' : 'Set custom slug'}
                </button>
              )}
            </div>

            {isEditingSlug ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">droidproxy.com/r/</span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => {
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                      setSlugError('');
                    }}
                    placeholder="your-custom-slug"
                    className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    maxLength={30}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveSlug}
                    disabled={slugMutation.isPending || !newSlug.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingSlug(false);
                      setSlugError('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {slugError && (
                  <p className="text-sm text-red-600">{slugError}</p>
                )}
                <p className="text-xs text-zinc-500">
                  3-30 characters. Letters, numbers, hyphens, and underscores only.
                </p>
              </div>
            ) : affiliateSlug ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">droidproxy.com/r/</span>
                <span className="font-medium text-emerald-600">{affiliateSlug}</span>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Create a memorable custom link like <span className="font-mono">droidproxy.com/r/john</span>
              </p>
            )}
          </div>

          {/* Referral code */}
          <div className="border-t border-zinc-100 pt-4">
            <p className="text-sm text-zinc-500 mb-1">Referral Code</p>
            <div className="flex items-center gap-2">
              <code className="bg-zinc-100 px-3 py-1.5 rounded font-mono text-sm">
                {referralCode}
              </code>
              <button
                onClick={() => copyToClipboard(referralCode)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals and Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referrals List */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Recent Referrals</h2>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
              <p>No referrals yet</p>
              <p className="text-sm mt-1">Share your link to start earning</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.slice(0, 10).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{referral.user_email}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-600">
                      ${(referral.total_earnings / 100).toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      referral.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {referral.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Earnings List */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Recent Earnings</h2>
          {earnings.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
              <p>No earnings yet</p>
              <p className="text-sm mt-1">Earnings appear when referrals deposit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {earnings.slice(0, 10).map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{earning.user_email}</p>
                    <p className="text-xs text-zinc-500">
                      From ${(earning.original_amount / 100).toFixed(2)} deposit
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-600">
                      +${(earning.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(earning.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-zinc-900">Share your link</p>
              <p className="text-sm text-zinc-600 mt-1">
                Send your unique referral link to friends, post it on social media, or add it to your website.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-zinc-900">They sign up & deposit</p>
              <p className="text-sm text-zinc-600 mt-1">
                When someone clicks your link and creates an account, they're linked to you permanently.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-zinc-900">Earn {commissionRate}% lifetime</p>
              <p className="text-sm text-zinc-600 mt-1">
                Every time they add balance, you earn {commissionRate}% commission. Forever.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              Withdraw to Balance
            </h3>
            <p className="text-sm text-zinc-600 mb-4">
              Transfer your affiliate earnings to your main balance to use for phone subscriptions.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Amount to withdraw
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input
                  type="number"
                  min="1"
                  max={stats.available_balance / 100}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Max: ${(stats.available_balance / 100).toFixed(2)}`}
                  className="w-full pl-7 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Available: ${(stats.available_balance / 100).toFixed(2)} (min $1.00)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={
                  withdrawMutation.isPending ||
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) < 1 ||
                  parseFloat(withdrawAmount) * 100 > stats.available_balance
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {withdrawMutation.isPending ? 'Processing...' : 'Withdraw'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
