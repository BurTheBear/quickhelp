import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import { format } from 'date-fns';

const REASON_EMOJI: Record<string, string> = {
  SPAM: '📢',
  INAPPROPRIATE_CONTENT: '🚫',
  FAKE_REQUEST: '❌',
  HARASSMENT: '😡',
  SAFETY_CONCERN: '🚨',
  FRAUD: '💰',
  OTHER: '❓',
};

export const ReportsPage: React.FC = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', statusFilter, page],
    queryFn: () =>
      adminAPI.listReports({ status: statusFilter, page }).then((r) => r.data.data),
  });

  const resolve = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      adminAPI.resolveReport(id, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => adminAPI.dismissReport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-2">
        {['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'PENDING' && '🔴 '}{s}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 h-24 animate-pulse" />
          ))
        ) : data?.reports?.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-gray-700">No {statusFilter.toLowerCase()} reports</p>
            <p className="text-sm text-gray-400 mt-1">All clear in this category.</p>
          </div>
        ) : (
          data?.reports?.map((report: Record<string, unknown>) => (
            <div key={report.id as string} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="text-2xl flex-shrink-0">
                  {REASON_EMOJI[(report.reason as string) ?? 'OTHER'] ?? '❓'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {(report.reason as string).replace(/_/g, ' ')}
                    </span>
                    {report.reportedUser && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">
                        User: {((report.reportedUser as Record<string, unknown>).profile as Record<string, unknown>)?.displayName as string ?? (report.reportedUser as Record<string, unknown>).email as string}
                      </span>
                    )}
                    {report.reportedRequest && (
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg">
                        Request: {(report.reportedRequest as Record<string, unknown>).title as string}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{report.description as string}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>
                      Reported by: {((report.author as Record<string, unknown>).profile as Record<string, unknown>)?.displayName as string ?? 'Unknown'}
                    </span>
                    <span>{format(new Date(report.createdAt as string), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                </div>

                {statusFilter === 'PENDING' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => resolve.mutate({ id: report.id as string, notes: 'Reviewed and resolved.' })}
                      className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors"
                    >
                      ✓ Resolve
                    </button>
                    <button
                      onClick={() => dismiss.mutate(report.id as string)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
