import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Bitcoin,
  CheckCircle2,
  X,
  ChevronDown,
  FileText,
  Download
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
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  amount_formatted: string;
  currency: string;
  description: string;
  invoice_pdf: string;
  hosted_url: string;
  created_at: number;
  paid_at?: number;
}

const DEPOSIT_AMOUNTS = [
  { value: 1000, label: '$10' },
  { value: 2500, label: '$25' },
  { value: 5000, label: '$50' },
  { value: 10000, label: '$100' },
  { value: 25000, label: '$250' },
];

const INITIAL_TRANSACTIONS_SHOWN = 5;

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAmount, setSelectedAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const { data: billing, isLoading } = useQuery<BillingOverview>({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await api.getBillingOverview();
      return res.data;
    },
  });

  const { data: invoicesData } = useQuery<{ invoices: Invoice[] }>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.getInvoices();
      return res.data;
    },
  });

  // Check for success/cancelled params
  useEffect(() => {
    if (searchParams.get('deposit') === 'success') {
      setShowSuccess(true);
      // Clear the URL param
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getAmount = () => {
    return customAmount ? parseInt(customAmount) * 100 : selectedAmount;
  };

  const handleStripeDeposit = async () => {
    const amount = getAmount();
    if (amount < 1000) {
      alert('Minimum deposit is $10');
      return;
    }
    setIsStripeLoading(true);
    try {
      const res = await api.createDeposit(amount);
      window.location.href = res.data.checkout_url;
    } catch {
      alert('Failed to create checkout session');
      setIsStripeLoading(false);
    }
  };

  const handleCryptoDeposit = () => {
    const amount = getAmount();
    if (amount < 1000) {
      alert('Minimum deposit is $10');
      return;
    }
    // TODO: Implement crypto deposit flow
    alert('Crypto deposits coming soon! Contact support for manual crypto payments.');
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

  const formatInvoiceDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const visibleTransactions = showAllTransactions
    ? billing.recent_transactions
    : billing.recent_transactions?.slice(0, INITIAL_TRANSACTIONS_SHOWN);

  const hasMoreTransactions = billing.recent_transactions && billing.recent_transactions.length > INITIAL_TRANSACTIONS_SHOWN;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Success Banner */}
      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900">Payment successful!</p>
              <p className="text-sm text-emerald-700">Your balance has been updated.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Billing</h1>
        <p className="text-zinc-500 mt-1">Manage your balance and add funds</p>
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
                Pay with card to enable auto-refill
              </div>
            </>
          )}
        </div>
      </div>

      {/* Saved Card Info */}
      {billing.has_payment_method && billing.default_card && (
        <div className="bg-white rounded-2xl p-4 border border-zinc-200">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-zinc-400" />
            <div className="text-sm">
              <span className="text-zinc-900 font-medium capitalize">{billing.default_card.card_brand}</span>
              <span className="text-zinc-500"> ending in {billing.default_card.card_last4}</span>
              <span className="text-zinc-400 ml-2">
                Expires {billing.default_card.card_exp_month}/{billing.default_card.card_exp_year}
              </span>
            </div>
            <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">
              Auto-refill enabled
            </span>
          </div>
        </div>
      )}

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

        <div className="flex items-center gap-2 mb-6">
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

        {/* Payment Method Selection */}
        <div className="space-y-3">
          {/* Card Payment - entire card is clickable */}
          <button
            onClick={handleStripeDeposit}
            disabled={isStripeLoading}
            className="w-full text-left border-2 border-zinc-200 rounded-xl hover:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-zinc-900">Pay with Card</p>
                <p className="text-sm text-zinc-500">
                  {billing.has_payment_method
                    ? 'Use saved card or add new'
                    : 'Card will be saved for auto-renewal'}
                </p>
              </div>
              {isStripeLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" />
              )}
            </div>

            {/* Payment method icons */}
            <div className="px-4 pb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <img src="/assets/payments/visa.svg" alt="Visa" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/mastercard.svg" alt="Mastercard" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/unionpay.svg" alt="UnionPay" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/amex.svg" alt="American Express" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/applepay.svg" alt="Apple Pay" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/googlepay.svg" alt="Google Pay" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/jcb.svg" alt="JCB" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/diners.svg" alt="Diners Club" className="h-7 w-11 object-contain" />
                <img src="/assets/payments/klarna.svg" alt="Klarna" className="h-7 w-11 object-contain" />
              </div>
            </div>

            {/* Terms disclaimer */}
            <div className="px-4 pb-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                By choosing this payment method, you agree to the Terms of Payment and a subscription setup.
                If your balance is insufficient to renew phones with auto-renew enabled, the missing amount
                will be charged automatically from your card monthly.
              </p>
            </div>
          </button>

          {/* Crypto Payment - entire card is clickable */}
          <button
            onClick={handleCryptoDeposit}
            className="w-full text-left border-2 border-zinc-200 rounded-xl hover:border-orange-500 transition-colors"
          >
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-zinc-900">Pay with Crypto</p>
                <p className="text-sm text-zinc-500">BTC, ETH, USDT accepted</p>
              </div>
            </div>

            {/* Crypto disclaimer */}
            <div className="px-4 pb-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Crypto payments do not enable auto-renewal. You will need to manually top up your balance
                before it runs out to avoid service interruption.
              </p>
            </div>
          </button>
        </div>

        {/* VAT notice */}
        <p className="text-xs text-zinc-500 text-center mt-4">
          <span className="font-medium">Fees charged by payment systems and VAT</span> are applied during payment processing and are not included in the DroidProxy subscription price.
        </p>
      </div>

      {/* Invoices - only show if there are invoices (limited to 5) */}
      {invoicesData?.invoices && invoicesData.invoices.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <h3 className="font-semibold text-zinc-900 mb-4">Invoices</h3>
          <div className="space-y-3">
            {invoicesData.invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-900">
                      Invoice #{invoice.number}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatInvoiceDate(invoice.paid_at || invoice.created_at)} · {invoice.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-900">{invoice.amount_formatted}</span>
                  <a
                    href={invoice.invoice_pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions - Last 30 Days */}
      {billing.recent_transactions && billing.recent_transactions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-zinc-200">
          <h3 className="font-semibold text-zinc-900 mb-4">Transactions (Last 30 Days)</h3>
          <div className="space-y-3">
            {visibleTransactions?.map((tx) => (
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

          {/* Show more button */}
          {hasMoreTransactions && !showAllTransactions && (
            <button
              onClick={() => setShowAllTransactions(true)}
              className="w-full mt-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              Show all {billing.recent_transactions.length} transactions
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {showAllTransactions && hasMoreTransactions && (
            <button
              onClick={() => setShowAllTransactions(false)}
              className="w-full mt-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 flex items-center justify-center gap-1 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
