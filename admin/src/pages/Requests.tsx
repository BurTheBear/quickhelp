import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  MATCHED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-red-100 text-red-600',
};

const URGENCY_COLORS: Record<string, string> = {
  LOW: 'text-teal-600',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600',
  EMERGENCY: 'text-red-600 font-bold',
};

export const RequestsPage: React.FC = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'requests', page, statusFilter, flaggedOnly],
    queryFn: () =>
      adminAPI.listRequests({ page, status: statusFilter || undefined, flagged: flaggedOnly }).then((r) => r.data.data),
  });

  const flagReq = useMutation({
    mutationFn: (id: string) => adminAPI.flagRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'requests'] }),
  });

  const unflagReq = useMutation({
    mutationFn: (id: string) => adminAPI.unflagRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'requests'] }),
  });

  const deleteReq = useMutation({
    mutationFn: (id: string) => adminAPI.deleteRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'requests'] }),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 flex-wrap">
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="MATCHED">Matched</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => { setFlaggedOnly(e.target.checked); setPage(1); }}
            className="rounded"
          />
          🚩 Flagged only
        </label>

        <div className="ml-auto text-sm text-gray-400">{data?.total ?? 0} requests</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Request</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Author</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Posted</th>
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
              data?.requests.map((req: Record<string, unknown>) => (
                <tr key={req.id as string} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${req.isFlagged ? 'bg-red-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {req.isFlagged && <span title="Flagged">🚩</span>}
                      <div>
                        <div className="font-medium text-gray-900 line-clamp-1">{req.title as string}</div>
                        <div className="text-xs text-gray-400">{(req._count as Record<string, unknown>)?.reports as number ?? 0} reports</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {(req.category as string).replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${URGENCY_COLORS[req.urgency as string] ?? ''}`}>
                      {req.urgency as string}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[req.status as string] ?? 'bg-gray-100 text-gray-700'}`}>
                      {req.status as string}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {((req.author as Record<string, unknown>).profile as Record<string, unknown>)?.displayName as string ?? (req.author as Record<string, unknown>).email as string}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {format(new Date(req.createdAt as string), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {req.isFlagged ? (
                        <button
                          onClick={() => unflagReq.mutate(req.id as string)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                        >
                          Unflag
                        </button>
                      ) : (
                        <button
                          onClick={() => flagReq.mutate(req.id as string)}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          Flag
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Delete this request?')) deleteReq.mutate(req.id as string);
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data && data.total > 20 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
            <span className="text-sm text-gray-400">Page {page} of {Math.ceil(data.total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">← Prev</button>
              <button onClick={() => setPage(page + 1)} disabled={!data.hasMore}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
