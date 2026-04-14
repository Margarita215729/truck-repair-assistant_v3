import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const ONBOARDING_STEPS = [
  { key: 'auth_signup_completed', label: 'Signup' },
  { key: 'truck_added', label: 'Truck Added' },
  { key: 'diagnostic_started', label: 'Start Diagnostic' },
  { key: 'diagnostic_completed', label: 'Complete Diagnostic' },
  { key: 'report_saved', label: 'Save Report' },
  { key: 'checkout_completed', label: 'Paid Conversion' },
];

function startOfDay(daysAgo = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function formatPct(current, prev) {
  if (!prev) return 'n/a';
  const delta = ((current - prev) / prev) * 100;
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta.toFixed(1)}%`;
}

export default function AdminDashboard() {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-dashboard-events'],
    queryFn: async () => {
      const fromDate = startOfDay(45);
      const { data, error } = await supabase
        .from('marketing_events')
        .select('user_id,event_name,happened_at,event_props')
        .gte('happened_at', fromDate)
        .order('happened_at', { ascending: true })
        .limit(30000);

      if (error) throw new Error(error.message || 'Failed to load analytics events');
      return data || [];
    },
  });

  const analytics = useMemo(() => {
    const now = Date.now();
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d14 = now - 14 * 24 * 60 * 60 * 1000;
    const d30 = now - 30 * 24 * 60 * 60 * 1000;

    const users7 = new Set();
    const users14prev = new Set();
    const converted7 = new Set();
    const active30 = new Set();

    const funnelSets = ONBOARDING_STEPS.reduce((acc, step) => {
      acc[step.key] = new Set();
      return acc;
    }, {});

    const firstSeen = new Map();
    const activeByDay = new Map();

    for (const e of events) {
      const ts = new Date(e.happened_at).getTime();
      const userId = e.user_id;
      if (!userId) continue;

      if (!firstSeen.has(userId) || ts < firstSeen.get(userId)) {
        firstSeen.set(userId, ts);
      }

      const day = e.happened_at.slice(0, 10);
      if (!activeByDay.has(day)) activeByDay.set(day, new Set());
      activeByDay.get(day).add(userId);

      if (ts >= d30) active30.add(userId);
      if (ts >= d7) users7.add(userId);
      if (ts >= d14 && ts < d7) users14prev.add(userId);
      if (ts >= d7 && e.event_name === 'checkout_completed') converted7.add(userId);

      if (ts >= d30 && funnelSets[e.event_name]) {
        funnelSets[e.event_name].add(userId);
      }
    }

    const cohortSeeds = [];
    firstSeen.forEach((ts, userId) => {
      if (ts >= d30) cohortSeeds.push({ userId, ts });
    });

    const retentionBuckets = {
      D1: { returned: 0, total: cohortSeeds.length },
      D7: { returned: 0, total: cohortSeeds.length },
      D30: { returned: 0, total: cohortSeeds.length },
    };

    const userEventsByDay = new Map();
    for (const e of events) {
      if (!e.user_id) continue;
      const dayTs = new Date(e.happened_at).setHours(0, 0, 0, 0);
      if (!userEventsByDay.has(e.user_id)) userEventsByDay.set(e.user_id, new Set());
      userEventsByDay.get(e.user_id).add(dayTs);
    }

    for (const seed of cohortSeeds) {
      const start = new Date(seed.ts);
      start.setHours(0, 0, 0, 0);
      const days = userEventsByDay.get(seed.userId) || new Set();

      if (days.has(start.getTime() + 1 * 24 * 60 * 60 * 1000)) retentionBuckets.D1.returned += 1;
      if (days.has(start.getTime() + 7 * 24 * 60 * 60 * 1000)) retentionBuckets.D7.returned += 1;
      if (days.has(start.getTime() + 30 * 24 * 60 * 60 * 1000)) retentionBuckets.D30.returned += 1;
    }

    const funnelData = ONBOARDING_STEPS.map((s, idx) => {
      const count = funnelSets[s.key].size;
      const prevCount = idx === 0 ? count : funnelSets[ONBOARDING_STEPS[idx - 1].key].size;
      return {
        step: s.label,
        users: count,
        conversion: prevCount ? Number(((count / prevCount) * 100).toFixed(1)) : 100,
      };
    });

    const activeTrend = Array.from(activeByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([day, set]) => ({ day: day.slice(5), activeUsers: set.size }));

    const retentionChart = [
      {
        day: 'D1',
        retentionPct: retentionBuckets.D1.total
          ? Number(((retentionBuckets.D1.returned / retentionBuckets.D1.total) * 100).toFixed(1))
          : 0,
      },
      {
        day: 'D7',
        retentionPct: retentionBuckets.D7.total
          ? Number(((retentionBuckets.D7.returned / retentionBuckets.D7.total) * 100).toFixed(1))
          : 0,
      },
      {
        day: 'D30',
        retentionPct: retentionBuckets.D30.total
          ? Number(((retentionBuckets.D30.returned / retentionBuckets.D30.total) * 100).toFixed(1))
          : 0,
      },
    ];

    return {
      weeklyActiveUsers: users7.size,
      weeklyActiveTrend: formatPct(users7.size, users14prev.size),
      paidConversions7d: converted7.size,
      paidConversionRate7d: users7.size ? `${((converted7.size / users7.size) * 100).toFixed(1)}%` : '0%',
      monthlyActiveUsers: active30.size,
      funnelData,
      activeTrend,
      retentionChart,
    };
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">
          {isRu ? 'Маркетинг Админка' : 'Marketing Admin Dashboard'}
        </h1>
        <p className="text-white/60 mt-1">
          {isRu
            ? 'Onboarding funnel, retention и ключевые продуктовые метрики.'
            : 'Onboarding funnel, retention and core product metrics.'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white/5 border-white/10">
            <p className="text-white/50 text-sm">{isRu ? 'WAU (7 дней)' : 'WAU (7 days)'}</p>
            <p className="text-3xl font-bold text-white mt-2">{analytics.weeklyActiveUsers}</p>
            <p className="text-xs text-white/40 mt-2">{isRu ? 'Изменение к прошлой неделе:' : 'Vs previous week:'} {analytics.weeklyActiveTrend}</p>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <p className="text-white/50 text-sm">{isRu ? 'Платежи (7 дней)' : 'Paid conversions (7 days)'}</p>
            <p className="text-3xl font-bold text-white mt-2">{analytics.paidConversions7d}</p>
            <p className="text-xs text-white/40 mt-2">{isRu ? 'CR от активных:' : 'CR from active users:'} {analytics.paidConversionRate7d}</p>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <p className="text-white/50 text-sm">{isRu ? 'MAU (30 дней)' : 'MAU (30 days)'}</p>
            <p className="text-3xl font-bold text-white mt-2">{analytics.monthlyActiveUsers}</p>
            <p className="text-xs text-white/40 mt-2">{isRu ? 'Основа для retention оценки' : 'Baseline for retention analysis'}</p>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4 bg-white/5 border-white/10">
          <h2 className="text-lg font-semibold text-white mb-3">
            {isRu ? 'Onboarding Funnel (30 дней)' : 'Onboarding Funnel (30 days)'}
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="step" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{ background: '#111718', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                />
                <Bar dataKey="users" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 bg-white/5 border-white/10">
          <h2 className="text-lg font-semibold text-white mb-3">
            {isRu ? 'Retention Snapshot' : 'Retention Snapshot'}
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.retentionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Retention']}
                  contentStyle={{ background: '#111718', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="retentionPct" stroke="#22c55e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-white/5 border-white/10">
        <h2 className="text-lg font-semibold text-white mb-3">
          {isRu ? 'Active Users Trend (30 дней)' : 'Active Users Trend (30 days)'}
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.activeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{ background: '#111718', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
              />
              <Line type="monotone" dataKey="activeUsers" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
