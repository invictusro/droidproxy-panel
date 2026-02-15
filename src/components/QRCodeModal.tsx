import { useState } from 'react';
import { X, Smartphone, KeyRound, Download, Check, Copy, Shield, ExternalLink, ChevronRight } from 'lucide-react';
import { QRCode } from 'react-qrcode-logo';
import { Button } from '@/components/ui/button';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: string;
  phoneName: string;
  pin?: string;
}

const APK_LINK = 'droidproxy.com/apk';
const APK_FULL_URL = 'https://droidproxy.com/apk';

export default function QRCodeModal({ isOpen, onClose, qrData, phoneName, pin }: QRCodeModalProps) {
  const [step, setStep] = useState<'download' | 'pair'>('download');
  const [pairMethod, setPairMethod] = useState<'qr' | 'account'>('qr');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(APK_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectDownload = () => {
    window.open(APK_FULL_URL, '_blank');
  };

  const handleClose = () => {
    setStep('download'); // Reset for next time
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-lg w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              {step === 'download' ? (
                <Download className="w-5 h-5 text-emerald-600" />
              ) : (
                <Smartphone className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {step === 'download' ? 'Step 1: Install App' : 'Step 2: Pair Phone'}
              </h2>
              <p className="text-sm text-gray-500">
                {step === 'download' ? 'Download DroidProxy on your Android' : `Pairing "${phoneName}"`}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'download' ? (
            /* Download Step */
            <div className="space-y-4">
              {/* Main Link */}
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                <p className="text-sm text-emerald-700 mb-2 text-center">Open this link on your Android phone:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xl font-bold text-emerald-900 bg-white px-4 py-3 rounded-lg text-center border border-emerald-200">
                    {APK_LINK}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="h-12 w-12 border-emerald-300 hover:bg-emerald-100"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-emerald-600" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-emerald-600 text-center mt-2">Copied to clipboard!</p>
                )}
              </div>

              {/* Alternative: Direct Download */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Or download directly:</p>
                <Button
                  variant="outline"
                  onClick={handleDirectDownload}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download APK
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Installation Instructions</h3>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">1</span>
                    <span className="text-gray-600">Open the link in Chrome or your browser</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">2</span>
                    <span className="text-gray-600">Tap "Download" and wait for completion</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">3</span>
                    <span className="text-gray-600">Open the file and tap "Install"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-medium">4</span>
                    <span className="text-gray-600">If prompted, enable "Install from unknown sources"</span>
                  </li>
                </ol>
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-700">
                  <span className="font-medium">Note:</span> You may see a security warning - this is normal for apps installed outside the Play Store.
                </p>
              </div>

              {/* Continue Button */}
              <Button
                onClick={() => setStep('pair')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                I've Installed the App
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            /* Pair Step */
            <div className="space-y-4">
              {/* Method Selector Tabs */}
              <p className="text-sm text-gray-600 text-center mb-2">Choose how you want to pair your phone</p>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setPairMethod('qr')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    pairMethod === 'qr'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR Code
                </button>
                <button
                  onClick={() => setPairMethod('account')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                    pairMethod === 'account'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account Login
                </button>
              </div>

              {pairMethod === 'qr' ? (
                /* QR Code Method */
                <div className="space-y-4">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-xl shadow-inner border">
                      <QRCode
                        value={qrData}
                        size={200}
                        qrStyle="squares"
                        eyeRadius={5}
                      />
                    </div>
                  </div>

                  {/* PIN Display */}
                  {pin && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 text-emerald-700 mb-2">
                        <KeyRound className="w-4 h-4" />
                        <span className="text-sm font-medium">Pairing PIN</span>
                      </div>
                      <div className="text-4xl font-mono font-bold tracking-[0.5em] text-emerald-900 text-center">
                        {pin}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">To pair with QR code:</p>
                    <ol className="text-sm text-gray-600 space-y-1">
                      <li>1. Open DroidProxy app on your phone</li>
                      <li>2. Tap "Scan QR Code" and scan the code above</li>
                      {pin && <li>3. Enter the PIN when prompted</li>}
                    </ol>
                  </div>
                </div>
              ) : (
                /* Account Login Method */
                <div className="space-y-4">
                  {/* Visual */}
                  <div className="flex justify-center">
                    <div className="w-[200px] h-[200px] bg-blue-50 rounded-xl border-2 border-blue-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-sm text-blue-700 font-medium">Use your panel<br/>credentials</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-800">
                      Login with the same <strong>email</strong> and <strong>password</strong> you use for this dashboard
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">To pair with your account:</p>
                    <ol className="text-sm text-gray-600 space-y-1">
                      <li>1. Open DroidProxy app on your phone</li>
                      <li>2. Tap "Login" instead of Scan QR</li>
                      <li>3. Enter your email and password</li>
                      <li>4. Select this phone from the list</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Back link */}
              <div className="text-center">
                <button
                  onClick={() => setStep('download')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to download instructions
                </button>
              </div>

              {/* Done Button */}
              <Button
                onClick={handleClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
