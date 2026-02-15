import { useState } from 'react';
import { X, CreditCard, Wallet, Loader2, Check, Trash2, Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import type { PaymentMethod } from '@/types';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess?: () => void;
}

const TOPUP_AMOUNTS = [
  { value: 500, label: '$5' },
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  if (!isOpen) return null;

  const loadPaymentMethods = async () => {
    setLoadingMethods(true);
    try {
      const response = await api.getPaymentMethods();
      setPaymentMethods(response.data.payment_methods || []);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleAmountContinue = () => {
    const amount = selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);
    if (amount < 500) {
      return; // Min $5
    }
    loadPaymentMethods();
    setStep('method');
  };

  const handleStripePayment = async () => {
    const amount = selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);
    if (amount < 500) return;

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

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm('Remove this payment method?')) return;

    try {
      await api.deletePaymentMethod(methodId);
      setPaymentMethods(methods => methods.filter(m => m.id !== methodId));
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await api.setDefaultPaymentMethod(methodId);
      setPaymentMethods(methods =>
        methods.map(m => ({ ...m, is_default: m.id === methodId }))
      );
    } catch (error) {
      console.error('Failed to set default payment method:', error);
    }
  };

  const getAmount = () => selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);
  const isValidAmount = getAmount() >= 500;

  const getCardBrandIcon = (brand: string) => {
    // Simple text representation - could be replaced with actual card brand icons
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

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
                    min="5"
                    step="0.01"
                    placeholder="Min $5.00"
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

              <p className="text-sm font-medium text-gray-700">Select payment method:</p>

              {/* Saved Payment Methods */}
              {loadingMethods ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Saved Cards</p>
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">
                            {getCardBrandIcon(method.card_brand)} ****{method.card_last4}
                          </p>
                          <p className="text-xs text-gray-500">
                            Expires {method.card_exp_month}/{method.card_exp_year}
                          </p>
                        </div>
                        {method.is_default && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!method.is_default && (
                          <button
                            onClick={() => handleSetDefault(method.id)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Set as default"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Remove card"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Payment Options */}
              <div className="space-y-3">
                {/* Stripe Payment */}
                <div className="border-2 border-gray-200 rounded-lg hover:border-emerald-500 transition-colors">
                  <button
                    onClick={handleStripePayment}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">Pay with Card</p>
                      <p className="text-sm text-gray-500">
                        {paymentMethods.length > 0
                          ? 'Use saved card or add new'
                          : 'Card will be saved for auto-renewal'}
                      </p>
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  </button>

                  {/* Payment method icons */}
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <img src="/assets/payments/visa.svg" alt="Visa" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/mastercard.svg" alt="Mastercard" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/unionpay.svg" alt="UnionPay" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/amex.svg" alt="American Express" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/applepay.svg" alt="Apple Pay" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/googlepay.svg" alt="Google Pay" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/wechatpay.svg" alt="WeChat Pay" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/discover.svg" alt="Discover" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/jcb.svg" alt="JCB" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/diners.svg" alt="Diners Club" className="h-7 w-11 object-contain" />
                      <img src="/assets/payments/klarna.svg" alt="Klarna" className="h-7 w-11 object-contain" />
                    </div>
                  </div>

                  {/* Terms disclaimer */}
                  <div className="px-4 pb-4">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      By choosing this payment method, you agree to the Terms of Payment and a subscription setup.
                      If your balance is insufficient to renew Connections, the missing amount will be charged
                      automatically from your card every 30 days.
                    </p>
                  </div>
                </div>

                {/* Crypto Payment (Coming Soon) */}
                <button
                  disabled
                  className="w-full flex items-center gap-3 p-4 border-2 border-gray-100 rounded-lg opacity-50 cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Bitcoin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-400">Pay with Crypto</p>
                    <p className="text-sm text-gray-400">Coming soon</p>
                  </div>
                </button>
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
