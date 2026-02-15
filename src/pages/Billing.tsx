import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Wallet,
  RefreshCw,
  Calendar,
  Building2,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { api } from '../api/client';

interface BillingOverview {
  balance: number;
  balance_formatted: string;
  billing_day: number | null;
  auto_refill_enabled: boolean;
  has_payment_method: boolean;
  default_card: {
    id: string;
    card_brand: string;
    card_last4: string;
    card_exp_month: number;
    card_exp_year: number;
  } | null;
  monthly_burn: number;
  monthly_burn_formatted: string;
  phones_with_auto_extend: number;
  recent_transactions: Array<{
    id: string;
    type: string;
    amount: number;
    reason: string;
    description: string;
    created_at: string;
  }>;
  billing_profile: {
    billing_name: string;
    billing_cui: string;
    billing_reg_com: string;
    billing_address: string;
    billing_city: string;
    billing_county: string;
    billing_country: string;
  };
}

const DEPOSIT_AMOUNTS = [
  { value: 1000, label: '$10' },
  { value: 2500, label: '$25' },
  { value: 5000, label: '$50' },
  { value: 10000, label: '$100' },
  { value: 25000, label: '$250' },
];

export default function Billing() {
  const queryClient = useQueryClient();
  const [selectedAmount, setSelectedAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showBillingProfile, setShowBillingProfile] = useState(false);

  const { data: billing, isLoading } = useQuery<BillingOverview>({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await api.getBillingOverview();
      return res.data;
    },
  });

  const depositMutation = useMutation({
    mutationFn: (amount: number) => api.createDeposit(amount),
    onSuccess: (res) => {
      // Redirect to Stripe checkout
      window.location.href = res.data.checkout_url;
    },
  });

  const toggleAutoRefillMutation = useMutation({
    mutationFn: (enabled: boolean) => api.updateBillingSettings({ auto_refill_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  const handleDeposit = () => {
    const amount = customAmount ? parseInt(customAmount) * 100 : selectedAmount;
    if (amount < 1000) {
      alert('Minimum deposit is $10');
      return;
    }
    depositMutation.mutate(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="text-center py-20 text-zinc-500">
        Failed to load billing information
      </div>
    );
  }

  const nextBillingDate = billing.billing_day
    ? (() => {
        const now = new Date();
        const billingDay = billing.billing_day;
        let nextDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
        if (nextDate <= now) {
          nextDate = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
        }
        return nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      })()
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Billing</h1>
        <p className="text-zinc-500 mt-1">Manage your balance and billing settings</p>
      </div>

      {/* Balance & Monthly Burn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 opacity-80" />
            <span className="text-emerald-100 text-sm">Current Balance</span>
          </div>
          <div className="text-4xl font-bold">{billing.balance_formatted}</div>
          {billing.monthly_burn > 0 && (
            <div className="mt-3 text-emerald-100 text-sm">
              Monthly cost: {billing.monthly_burn_formatted} ({billing.phones_with_auto_extend} phones)
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <span className="text-zinc-500 text-sm">Next Billing Date</span>
          </div>
          {nextBillingDate ? (
            <>
              <div className="text-2xl font-bold text-zinc-900">{nextBillingDate}</div>
              <div className="mt-2 text-sm text-zinc-500">
                Day {billing.billing_day} of each month
              </div>
            </>
          ) : (
            <>
              <div className="text-lg text-zinc-500">Not set</div>
              <div className="mt-2 text-sm text-zinc-400">
                Make a deposit to set your billing day
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-Refill Settings */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Auto-Refill</h3>
              <p className="text-sm text-zinc-500">
                Automatically charge your card on billing day to cover phone costs
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={billing.auto_refill_enabled}
              onChange={(e) => toggleAutoRefillMutation.mutate(e.target.checked)}
              className="sr-only peer"
              disabled={!billing.has_payment_method}
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {!billing.has_payment_method && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              Add a payment method to enable auto-refill. Your card will be saved when you make a deposit.
            </div>
          </div>
        )}

        {billing.has_payment_method && billing.default_card && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-zinc-400" />
            <div className="text-sm">
              <span className="text-zinc-900 font-medium capitalize">{billing.default_card.card_brand}</span>
              <span className="text-zinc-500"> ending in {billing.default_card.card_last4}</span>
              <span className="text-zinc-400 ml-2">
                Expires {billing.default_card.card_exp_month}/{billing.default_card.card_exp_year}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Add Funds */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        <h3 className="font-semibold text-zinc-900 mb-4">Add Funds</h3>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {DEPOSIT_AMOUNTS.map((amt) => (
            <button
              key={amt.value}
              onClick={() => {
                setSelectedAmount(amt.value);
                setCustomAmount('');
              }}
              className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                selectedAmount === amt.value && !customAmount
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {amt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-zinc-500 text-sm">Or enter custom amount:</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
            <input
              type="number"
              min="10"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(0);
              }}
              placeholder="Custom"
              className="w-28 pl-7 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <button
          onClick={handleDeposit}
          disabled={depositMutation.isPending}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {depositMutation.isPending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Continue to Payment
            </>
          )}
        </button>

        <p className="text-xs text-zinc-400 mt-3 text-center">
          You'll be redirected to Stripe to complete payment. VAT will be calculated automatically.
        </p>
      </div>

      {/* Billing Profile */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <button
          onClick={() => setShowBillingProfile(!showBillingProfile)}
          className="w-full p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-zinc-900">Billing Profile</h3>
              <p className="text-sm text-zinc-500">
                {billing.billing_profile.billing_name || 'Not configured'}
                {billing.billing_profile.billing_cui && ` · ${billing.billing_profile.billing_cui}`}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-zinc-400 transition-transform ${showBillingProfile ? 'rotate-90' : ''}`} />
        </button>

        {showBillingProfile && (
          <div className="px-6 pb-6 border-t border-zinc-100">
            <div className="pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Company/Name</span>
                <p className="text-zinc-900">{billing.billing_profile.billing_name || '-'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Tax ID (CUI)</span>
                <p className="text-zinc-900">{billing.billing_profile.billing_cui || '-'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Reg. Com</span>
                <p className="text-zinc-900">{billing.billing_profile.billing_reg_com || '-'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Country</span>
                <p className="text-zinc-900">{billing.billing_profile.billing_country || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500">Address</span>
                <p className="text-zinc-900">
                  {[
                    billing.billing_profile.billing_address,
                    billing.billing_profile.billing_city,
                    billing.billing_profile.billing_county,
                  ].filter(Boolean).join(', ') || '-'}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              Billing profile is automatically synced from Stripe during checkout.
            </p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {billing.recent_transactions && billing.recent_transactions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <h3 className="font-semibold text-zinc-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {billing.recent_transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'credit' ? 'bg-emerald-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'credit' ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{tx.description}</div>
                    <div className="text-xs text-zinc-500">{formatDate(tx.created_at)}</div>
                  </div>
                </div>
                <div className={`font-medium ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.type === 'credit' ? '+' : '-'}${(tx.amount / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
