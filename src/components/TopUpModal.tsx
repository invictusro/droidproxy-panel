import { useState } from 'react';
import { X, CreditCard, Wallet, Loader2, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess?: () => void;
}

const TOPUP_AMOUNTS = [
  { value: 1000, label: '$10' },
  { value: 2000, label: '$20' },
  { value: 5000, label: '$50' },
  { value: 10000, label: '$100' },
];

export default function TopUpModal({ isOpen, onClose, currentBalance, onSuccess: _onSuccess }: TopUpModalProps) {
  const [step, setStep] = useState<'amount' | 'method'>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAmountContinue = () => {
    const amount = selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);
    if (amount < 1000) {
      return; // Min $10
    }
    setStep('method');
  };

  const handleStripePayment = async () => {
    const amount = selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);
    if (amount < 1000) return;

    setIsLoading(true);
    try {
      const response = await api.createTopUp({ amount, payment_method: 'stripe' });
      // Redirect to Stripe checkout
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      }
    } catch (error) {
      console.error('Failed to create top-up:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAmount = () => selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);
  const isValidAmount = getAmount() >= 1000;

  const handleBack = () => {
    setStep('amount');
  };

  const handleClose = () => {
    setStep('amount');
    setSelectedAmount(null);
    setCustomAmount('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Add Balance</h2>
              <p className="text-sm text-gray-500">
                Current: ${(currentBalance / 100).toFixed(2)}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'amount' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select an amount to add to your balance:</p>

              {/* Preset Amounts */}
              <div className="grid grid-cols-3 gap-2">
                {TOPUP_AMOUNTS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSelectedAmount(value);
                      setCustomAmount('');
                    }}
                    className={`py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                      selectedAmount === value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or enter custom amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="10"
                    step="0.01"
                    placeholder="Min $10.00"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="w-full pl-7 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <Button
                onClick={handleAmountContinue}
                disabled={!isValidAmount}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Continue with ${(getAmount() / 100).toFixed(2)}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <span>&larr;</span> Change amount
              </button>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-sm text-emerald-700">Adding to balance:</p>
                <p className="text-2xl font-bold text-emerald-900">${(getAmount() / 100).toFixed(2)}</p>
              </div>

              {/* Payment Options */}
              <div className="space-y-3">
                {/* Stripe Payment - entire card is clickable */}
                <button
                  onClick={handleStripePayment}
                  disabled={isLoading}
                  className="w-full text-left border-2 border-gray-200 rounded-lg hover:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Pay with Card</p>
                      <p className="text-sm text-gray-500">Card will be saved for auto-renewal</p>
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
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
                    <p className="text-xs text-gray-500 leading-relaxed">
                      By choosing this payment method, you agree to the Terms of Payment and a subscription setup.
                      If your balance is insufficient to renew phones with auto-renew enabled, the missing amount
                      will be charged automatically from your card monthly.
                    </p>
                  </div>
                </button>

                {/* Crypto / Manual Payment */}
                <div className="w-full border-2 border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Bitcoin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Pay with Crypto</p>
                      <p className="text-sm text-gray-500">BTC, ETH, USDT accepted</p>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <a
                      href="https://t.me/invictusproxies"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#229ED9] hover:bg-[#1e8dc4] text-white font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Manual Payment via Telegram
                    </a>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Contact us on Telegram for manual crypto payments
                    </p>
                  </div>
                </div>
              </div>

              {/* VAT notice at bottom */}
              <p className="text-xs text-gray-500 text-center mt-4">
                <span className="font-medium">Fees charged by payment systems and VAT</span> are applied during payment processing and are not included in the DroidProxy subscription price.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
