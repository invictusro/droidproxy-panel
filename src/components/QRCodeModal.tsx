import { X, Smartphone, KeyRound, Download } from 'lucide-react';
import { QRCode } from 'react-qrcode-logo';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrData: string;
  phoneName: string;
  pin?: string;
}

export default function QRCodeModal({ isOpen, onClose, qrData, phoneName, pin }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Pair Phone</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
            <Smartphone className="w-5 h-5" />
            <span>Pairing <strong>{phoneName}</strong></span>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
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
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-emerald-700 mb-2">
                <KeyRound className="w-4 h-4" />
                <span className="text-sm font-medium">Pairing PIN</span>
              </div>
              <div className="text-4xl font-mono font-bold tracking-[0.5em] text-emerald-900">
                {pin}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="text-sm font-medium text-gray-700 mb-2">To pair your phone:</p>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Open DroidProxy app on your phone</li>
              <li>2. Tap "Scan QR Code" and scan the code above</li>
              {pin && <li>3. Enter the 4-digit PIN when prompted</li>}
            </ol>
          </div>

          {/* Download Link */}
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>Don't have the app?</span>
            <a
              href="/apk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Download className="w-4 h-4" />
              Download APK
            </a>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
