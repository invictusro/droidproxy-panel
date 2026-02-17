import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Search, UserCheck, Users as UsersIcon, DollarSign, Smartphone, TrendingUp, CreditCard, Key, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types';

interface UserWithStats extends User {
  phone_count: number;
}

interface DailyStat {
  date: string;
  new_users: number;
  revenue: number;
  licenses_sold: number;
}

interface UserStats {
  total_users: number;
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  active_users_today: number;
  users_with_balance: number;
  balance_spent_today: number;
  balance_spent_yesterday: number;
  total_balance: number;
  total_phones: number;
  paired_phones: number;
  pending_phones: number;
  active_licenses: number;
  total_credentials: number;
  phones_by_plan: { plan_tier: string; count: number }[];
  revenue_this_week: number;
  revenue_this_month: number;
  total_revenue: number;
  top_users_by_balance: { id: string; name: string; email: string; balance: number }[];
  top_users_by_phones: { id: string; name: string; email: string; phone_count: number }[];
  daily_stats: DailyStat[];
}

export default function Users() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.getUsers();
      return response.data.users as UserWithStats[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await api.getUserStats();
      return response.data as UserStats;
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ['userSearch', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const response = await api.searchUsers(searchQuery);
      return response.data.users as UserWithStats[];
    },
    enabled: searchQuery.length >= 2,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => api.impersonateUser(userId),
    onSuccess: (response) => {
      // Store the original token before replacing
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        localStorage.setItem('originalToken', currentToken);
      }
      // Set the impersonation token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isImpersonating', 'true');
      localStorage.setItem('impersonatingUser', JSON.stringify(response.data.impersonating));
      // Reload to apply new token
      window.location.href = '/';
    },
  });

  const handleRoleChange = (id: string, newRole: string) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      updateRoleMutation.mutate({ id, role: newRole });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user? This will also delete all their phones.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleImpersonate = (user: UserWithStats) => {
    if (confirm(`Impersonate ${user.name} (${user.email})? You will see the dashboard as this user.`)) {
      impersonateMutation.mutate(user.id);
    }
  };

  const displayUsers = searchQuery.length >= 2 ? searchResults : users;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <>
          {/* Row 1: Users & Activity */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <UsersIcon className="w-4 h-4" />
                Total Users
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_users}</div>
              <div className="text-xs text-emerald-600">+{stats.users_today} today</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                New This Month
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.users_this_month}</div>
              <div className="text-xs text-gray-500">{stats.users_this_week} this week</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <UserCheck className="w-4 h-4" />
                Active Today
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.active_users_today}</div>
              {isSuperAdmin && stats.users_with_balance !== undefined && (
                <div className="text-xs text-gray-500">{stats.users_with_balance} with balance</div>
              )}
            </div>

            {/* SuperAdmin-only stats */}
            {isSuperAdmin && stats.balance_spent_today !== undefined && (
              <>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    Spent Today
                  </div>
                  <div className="text-2xl font-bold text-gray-900">${stats.balance_spent_today.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Yesterday: ${stats.balance_spent_yesterday?.toFixed(2) || '0.00'}</div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    Total Balance
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">${stats.total_balance?.toFixed(2) || '0.00'}</div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <CreditCard className="w-4 h-4" />
                    Total Revenue
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">${stats.total_revenue?.toFixed(2) || '0.00'}</div>
                  <div className="text-xs text-gray-500">${stats.revenue_this_month?.toFixed(2) || '0.00'} this month</div>
                </div>
              </>
            )}
          </div>

          {/* Row 2: Phones & Infrastructure */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Smartphone className="w-4 h-4" />
                Total Phones
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_phones}</div>
              <div className="text-xs text-gray-500">{stats.paired_phones} paired, {stats.pending_phones} pending</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Active Licenses
              </div>
              <div className="text-2xl font-bold text-emerald-600">{stats.active_licenses}</div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Key className="w-4 h-4" />
                Total Credentials
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_credentials}</div>
            </div>

            {/* Phones by Plan */}
            {stats.phones_by_plan?.length > 0 && stats.phones_by_plan.map((plan) => (
              <div key={plan.plan_tier} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Smartphone className="w-4 h-4" />
                  {plan.plan_tier.charAt(0).toUpperCase() + plan.plan_tier.slice(1)} Plan
                </div>
                <div className="text-2xl font-bold text-gray-900">{plan.count}</div>
              </div>
            ))}

            {isSuperAdmin && stats.revenue_this_week !== undefined && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Revenue (7d)
                </div>
                <div className="text-2xl font-bold text-emerald-600">${stats.revenue_this_week.toFixed(2)}</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Charts - SuperAdmin only */}
      {isSuperAdmin && stats && stats.daily_stats && stats.daily_stats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily New Users Chart */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Daily New Users (30 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.daily_stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(value) => new Date(value as string).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  formatter={(value) => [value, 'New Users']}
                />
                <Bar dataKey="new_users" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Revenue Chart */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Daily Revenue (30 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.daily_stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  labelFormatter={(value) => new Date(value as string).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Licenses Sold Chart */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Daily Licenses Sold (30 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.daily_stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(value) => new Date(value as string).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  formatter={(value) => [value, 'Licenses']}
                />
                <Bar dataKey="licenses_sold" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Users - SuperAdmin only */}
      {isSuperAdmin && stats && stats.top_users_by_balance && stats.top_users_by_phones && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Top Users by Balance</h3>
            <div className="space-y-2">
              {stats.top_users_by_balance.map((user, idx) => (
                <div key={user.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-4">{idx + 1}.</span>
                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    <span className="text-xs text-gray-400">{user.email}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">${user.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Top Users by Phones</h3>
            <div className="space-y-2">
              {stats.top_users_by_phones.map((user, idx) => (
                <div key={user.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-4">{idx + 1}.</span>
                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    <span className="text-xs text-gray-400">{user.email}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{user.phone_count} phones</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-xs text-gray-400 mt-1">Type at least 2 characters to search</p>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phones</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayUsers?.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=10b981&color=fff`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-medium ${user.balance > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                    ${user.balance?.toFixed(2) || '0.00'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isSuperAdmin ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${
                        user.role === 'superadmin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.role === 'superadmin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'admin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.phone_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleImpersonate(user)}
                      className={`p-1 rounded ${
                        user.role === 'admin' || user.role === 'superadmin'
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50'
                      }`}
                      title={user.role === 'admin' || user.role === 'superadmin' ? 'Cannot impersonate admins' : 'Impersonate user'}
                      disabled={user.role === 'admin' || user.role === 'superadmin'}
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1 rounded text-red-600 hover:text-red-900 hover:bg-red-50"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
