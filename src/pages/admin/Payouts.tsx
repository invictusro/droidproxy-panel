import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bitcoin, Check, X, Copy, ExternalLink } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Withdrawal {
  id: string;
  amount: number;
  address: string;
  telegram: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

export default function Payouts() {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-withdrawals'],
    queryFn: async () => {
      const res = await api.getAffiliateWithdrawals();
      return res.data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.completeAffiliateWithdrawal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-withdrawals'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.rejectAffiliateWithdrawal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-withdrawals'] });
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const withdrawals: Withdrawal[] = data?.withdrawals || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <Bitcoin className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Affiliate Payouts</h1>
          <p className="text-zinc-500">Pending crypto withdrawal requests</p>
        </div>
      </div>

      {withdrawals.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-zinc-200 text-center">
          <Bitcoin className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
          <p className="text-zinc-500">No pending withdrawal requests</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Wallet</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Telegram</th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Date</th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {withdrawals.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-zinc-900">{w.user_name}</p>
                    <p className="text-xs text-zinc-500">{w.user_email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-bold text-orange-600">${w.amount.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono max-w-[200px] truncate">
                        {w.address}
                      </code>
                      <button
                        onClick={() => copyToClipboard(w.address, w.id + '-addr')}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        {copiedId === w.id + '-addr' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`https://t.me/${w.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      @{w.telegram}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {w.created_at}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => completeMutation.mutate(w.id)}
                        disabled={completeMutation.isPending || rejectMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(w.id)}
                        disabled={completeMutation.isPending || rejectMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
