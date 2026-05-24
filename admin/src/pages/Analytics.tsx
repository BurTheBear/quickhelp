import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { adminAPI } from '../services/api';

interface AnalyticsData {
  avgCompletionRate: number;
  avgRating: number;
  topCategories: Array<{ category: string; _count: number }>;
  topVolunteers: Array<{ displayName: string; tasksCompleted: number; avgRating: number; userId: string }>;
}

export const AnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminAPI.getAnalytics().then((r) => r.data.data),
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 bg-white rounded-2xl" />
      ))}
    </div>;
  }

  if (!data) return null;

  const categoryData = data.topCategories.map((c) => ({
    name: c.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count: c._count,
  }));

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Avg Completion Rate</div>
          <div className="text-4xl font-bold text-indigo-600">{data.avgCompletionRate}%</div>
          <div className="text-xs text-gray-400 mt-1">of all posted requests</div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${data.avgCompletionRate}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Platform Avg Rating</div>
          <div className="text-4xl font-bold text-yellow-500">
            {data.avgRating.toFixed(2)} ⭐
          </div>
          <div className="text-xs text-gray-400 mt-1">across all completed tasks</div>
        </div>
      </div>

      {/* Top categories chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Completed Categories</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9BA5BE' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7A99' }} width={120} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="count" fill="#6C63FF" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top volunteers */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Top Volunteers</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wide">Rank</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wide">Volunteer</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wide">Tasks Completed</th>
              <th className="text-left px-6 py-3 text-xs text-gray-500 uppercase tracking-wide">Avg Rating</th>
            </tr>
          </thead>
          <tbody>
            {data.topVolunteers.map((v, i) => (
              <tr key={v.userId} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className={`font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{v.displayName}</td>
                <td className="px-6 py-4 text-indigo-600 font-semibold">{v.tasksCompleted}</td>
                <td className="px-6 py-4">
                  <span className="text-yellow-500">⭐</span> {v.avgRating.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
