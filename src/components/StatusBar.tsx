import { useEffect, useState } from 'react';
import { Wallet, Calendar, Wifi, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

interface StatusBarProps {
  user: { name: string; picture: string; role: string } | null;
}

interface PhoneStats {
  online: number;
  total: number;
  expired: number;
}

export default function StatusBar({ user }: StatusBarProps) {
  const [balance, setBalance] = useState<number>(0);
  const [upcomingCharges, setUpcomingCharges] = useState<number>(0);
  const [phoneStats, setPhoneStats] = useState<PhoneStats>({ online: 0, total: 0, expired: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [balanceRes, phonesRes] = await Promise.all([
          api.getBalance(),
          api.getPhones(),
        ]);

        setBalance(balanceRes.data.balance || 0);

        const phones = phonesRes.data.phones || [];

        let online = 0;
        let expired = 0;
        let upcomingTotal = 0;

        phones.forEach((phone: any) => {
          // Count online phones
          if (phone.status === 'online') {
            online++;
          }

          // Count expired/no-license phones
          if (!phone.has_active_license) {
            expired++;
          }

          // Calculate upcoming charges (phones with auto_extend enabled)
          if (phone.license_auto_extend && phone.has_active_license && phone.plan_tier) {
            const prices: Record<string, number> = { lite: 500, turbo: 700, nitro: 900 };
            upcomingTotal += prices[phone.plan_tier] || 0;
          }
        });

        setPhoneStats({ online, total: phones.length, expired });
        setUpcomingCharges(upcomingTotal);
      } catch (error) {
        console.error('Failed to fetch status data:', error);
      }
      setLoading(false);
    };

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || loading) return null;

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="bg-zinc-100 border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10 text-sm">
          <div className="flex items-center gap-6">
            {/* Balance */}
            <div className="flex items-center gap-2 text-zinc-600">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span className="text-zinc-500">Balance:</span>
              <span className="font-semibold text-zinc-900">{formatCents(balance)}</span>
            </div>

            {/* Upcoming Charges */}
            <div className="flex items-center gap-2 text-zinc-600">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-zinc-500">Upcoming:</span>
              <span className="font-semibold text-zinc-900">{formatCents(upcomingCharges)}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Online Phones */}
            <div className="flex items-center gap-2 text-zinc-600">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span className="text-zinc-500">Online:</span>
              <span className="font-semibold text-emerald-600">{phoneStats.online}</span>
              <span className="text-zinc-400">/</span>
              <span className="text-zinc-700">{phoneStats.total}</span>
            </div>

            {/* Expired Phones */}
            {phoneStats.expired > 0 && (
              <div className="flex items-center gap-2 text-zinc-600">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-zinc-500">Expired:</span>
                <span className="font-semibold text-red-600">{phoneStats.expired}</span>
                <span className="text-zinc-400">/</span>
                <span className="text-zinc-700">{phoneStats.total}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
