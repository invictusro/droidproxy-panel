import { useState } from 'react';
import { X, Download, Shield, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface APKDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APK_LINK = 'droidproxy.com/apk';
const APK_FULL_URL = 'https://droidproxy.com/apk';

export default function APKDownloadModal({ isOpen, onClose }: APKDownloadModalProps) {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Download DroidProxy</h2>
              <p className="text-sm text-gray-500">Android App</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
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
        </div>
      </div>
    </div>
  );
}
