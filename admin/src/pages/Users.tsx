import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  BANNED: 'bg-red-100 text-red-700',
  PENDING_VERIFICATION: 'bg-blue-100 text-blue-700',
};

export const UsersPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, statusFilter],
    queryFn: () =>
      adminAPI.listUsers({ page, search, status: statusFilter || undefined }).then((r) => r.data.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminAPI.updateUserStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </select>
        <div className="text-sm text-gray-500">
          {data?.total ?? 0} users
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasks</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">XP / Level</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reports</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-6 py-4" colSpan={7}>
                    <div className="h-8 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : (
              data?.users.map((user: Record<string, unknown>) => (
                <tr key={user.id as string} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700">
                        {((user.profile as Record<string, unknown>)?.displayName as string)?.[0]?.toUpperCase() ?? (user.email as string)?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {(user.profile as Record<string, unknown>)?.displayName as string ?? 'No name'}
                        </div>
                        <div className="text-xs text-gray-400">{user.email as string}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[user.status as string] ?? 'bg-gray-100 text-gray-700'}`}>
                      {user.status as string}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {(user.profile as Record<string, unknown>)?.tasksCompleted as number ?? 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-indigo-600 font-medium">
                      {(user.gamification as Record<string, unknown>)?.totalXp as number ?? 0} XP
                    </span>
                    <span className="text-gray-400 text-xs ml-1">
                      Lv{(user.gamification as Record<string, unknown>)?.level as number ?? 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {((user._count as Record<string, unknown>)?.reportedBy as number ?? 0) > 0 ? (
                      <span className="text-red-600 font-medium">
                        {(user._count as Record<string, unknown>)?.reportedBy as number}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {format(new Date(user.createdAt as string), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      value={user.status as string}
                      onChange={(e) =>
                        updateStatus.mutate({ id: user.id as string, status: e.target.value })
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspend</option>
                      <option value="BANNED">Ban</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
            <span className="text-sm text-gray-400">
              Page {page} of {Math.ceil(data.total / 20)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.hasMore}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
