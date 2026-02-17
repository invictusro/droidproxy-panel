import { useState } from 'react';
import { UserX, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  impersonatingUser: { name: string; email: string } | null;
}

export default function ImpersonationBanner({ impersonatingUser }: Props) {
  const [isExiting, setIsExiting] = useState(false);

  if (!impersonatingUser) return null;

  const handleExit = async () => {
    setIsExiting(true);
    try {
      const response = await api.stopImpersonation();
      // Restore the admin token
      localStorage.setItem('token', response.data.token);
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonatingUser');
      localStorage.removeItem('originalToken');
      // Reload to apply new token
      window.location.href = '/admin/users';
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
      // Fallback: restore original token if available
      const originalToken = localStorage.getItem('originalToken');
      if (originalToken) {
        localStorage.setItem('token', originalToken);
        localStorage.removeItem('isImpersonating');
        localStorage.removeItem('impersonatingUser');
        localStorage.removeItem('originalToken');
        window.location.href = '/admin/users';
      }
    }
    setIsExiting(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">
            Impersonating: <span className="font-bold">{impersonatingUser.name}</span>
            <span className="text-amber-800 ml-1">({impersonatingUser.email})</span>
          </span>
          <span className="text-sm text-amber-800">
            All actions will be recorded under this user's account
          </span>
        </div>
        <button
          onClick={handleExit}
          disabled={isExiting}
          className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <UserX className="w-4 h-4" />
          {isExiting ? 'Exiting...' : 'Exit Impersonation'}
        </button>
      </div>
    </div>
  );
}
