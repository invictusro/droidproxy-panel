import { X, Download, Smartphone, Shield, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface APKDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APK_URL = 'https://github.com/invictusro/droidproxy-apk/releases/latest/download/droidproxy.apk';

export default function APKDownloadModal({ isOpen, onClose }: APKDownloadModalProps) {
  if (!isOpen) return null;

  const handleDownload = () => {
    window.open(APK_URL, '_blank');
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
          {/* Download Button */}
          <Button
            onClick={handleDownload}
            className="w-full h-14 text-lg gap-3 bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="w-6 h-6" />
            Download APK
            <ExternalLink className="w-4 h-4 opacity-60" />
          </Button>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Installation Instructions</h3>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium">1</span>
                <div>
                  <p className="font-medium text-gray-800">Open the link in your browser</p>
                  <p className="text-sm text-gray-500">Use Chrome, Firefox, or your default browser on your Android phone</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium">2</span>
                <div>
                  <p className="font-medium text-gray-800">Download the APK file</p>
                  <p className="text-sm text-gray-500">Tap the download link and wait for it to complete</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium">3</span>
                <div>
                  <p className="font-medium text-gray-800">Enable "Install from unknown sources"</p>
                  <p className="text-sm text-gray-500">When prompted, go to Settings and allow your browser to install apps</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium">4</span>
                <div>
                  <p className="font-medium text-gray-800">Install and open the app</p>
                  <p className="text-sm text-gray-500">Tap the downloaded file and follow the prompts to install</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Security Note</p>
              <p className="text-amber-700">You may see a warning about installing apps from unknown sources. This is normal for APKs downloaded outside the Play Store.</p>
            </div>
          </div>

          {/* Direct Link */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-500 mb-1">Or copy this link to your phone:</p>
            <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-md text-gray-700 select-all block overflow-x-auto">
              proxydroid.com/apk
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
