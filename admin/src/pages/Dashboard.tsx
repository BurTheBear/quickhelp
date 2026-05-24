import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { adminAPI } from '../services/api';
import { format } from 'date-fns';

const CATEGORY_COLORS = [
  '#6C63FF', '#FF6B6B', '#4ECDC4', '#48BB78', '#F6AD55',
  '#63B3ED', '#FC8181', '#EF233C', '#9BA5BE',
];

interface DashboardData {
  users: { total: number; today: number; thisWeek: number };
  requests: { total: number; open: number; completed: number; completedToday: number; flagged: number };
  matches: { total: number };
  moderation: { pendingReports: number; flaggedRequests: number };
  gamification: { totalXpAwarded: number };
  charts: {
    requestsByDay: Array<{ date: string; count: number }>;
    categoryBreakdown: Array<{ category: string; count: number }>;
  };
}

export const DashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminAPI.getDashboard().then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!data) return null;

  const completionRate = data.requests.total > 0
    ? Math.round((data.requests.completed / data.requests.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Alert banner for moderation */}
      {data.moderation.pendingReports > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">🚨</span>
          <div>
            <p className="font-semibold text-red-700">Moderation Required</p>
            <p className="text-sm text-red-600">
              {data.moderation.pendingReports} pending reports and {data.moderation.flaggedRequests} flagged requests need review.
            </p>
          </div>
          <a href="/reports" className="ml-auto text-sm font-medium text-red-700 underline">
            Review now →
          </a>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Users"
          value={data.users.total.toLocaleString()}
          sub={`+${data.users.today} today · +${data.users.thisWeek} this week`}
          icon="👥"
          color="indigo"
        />
        <KPICard
          title="Open Requests"
          value={data.requests.open.toLocaleString()}
          sub={`${data.requests.completedToday} completed today`}
          icon="📋"
          color="blue"
        />
        <KPICard
          title="Completion Rate"
          value={`${completionRate}%`}
          sub={`${data.requests.completed} total completed`}
          icon="✅"
          color="green"
        />
        <KPICard
          title="Total XP Awarded"
          value={`${(data.gamification.totalXpAwarded / 1000).toFixed(1)}K`}
          sub={`Across ${data.users.total} users`}
          icon="⚡"
          color="yellow"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests over time */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Request Volume (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.charts.requestsByDay}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9BA5BE' }}
                tickFormatter={(d) => format(new Date(d), 'MMM d')}
                interval={4}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9BA5BE' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6C63FF"
                strokeWidth={2}
                fill="url(#colorRequests)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Requests by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.charts.categoryBreakdown}
                dataKey="_count"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.charts.categoryBreakdown.map((_, index) => (
                  <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, String(name).replace(/_/g, ' ')]}
                contentStyle={{ borderRadius: 12, border: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {data.charts.categoryBreakdown.slice(0, 4).map((item, i) => (
              <div key={item.category} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                <span className="text-gray-600 flex-1 truncate">{item.category.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-900">{item._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatRow label="Total Matches" value={data.matches.total.toLocaleString()} icon="🤝" />
        <StatRow label="Pending Reports" value={data.moderation.pendingReports.toString()} icon="📋" urgent={data.moderation.pendingReports > 0} />
        <StatRow label="Flagged Content" value={data.moderation.flaggedRequests.toString()} icon="🚩" urgent={data.moderation.flaggedRequests > 0} />
      </div>
    </div>
  );
};

const KPICard: React.FC<{
  title: string;
  value: string;
  sub: string;
  icon: string;
  color: 'indigo' | 'blue' | 'green' | 'yellow';
}> = ({ title, value, sub, icon, color }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <span className={`text-lg w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; icon: string; urgent?: boolean }> = ({
  label, value, icon, urgent,
}) => (
  <div className={`bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4 ${urgent ? 'border-red-200' : 'border-gray-100'}`}>
    <span className="text-2xl">{icon}</span>
    <div>
      <div className={`text-xl font-bold ${urgent ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  </div>
);

const LoadingState = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl p-5 h-32 animate-pulse">
        <div className="bg-gray-100 rounded h-4 w-24 mb-3" />
        <div className="bg-gray-100 rounded h-8 w-16 mb-2" />
        <div className="bg-gray-100 rounded h-3 w-32" />
      </div>
    ))}
  </div>
);
