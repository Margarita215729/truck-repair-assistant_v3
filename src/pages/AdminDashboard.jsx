import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { marketingService } from '@/services/marketingService';
import { useLanguage } from '@/lib/LanguageContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const funnelSteps = [
  { key: 'auth_signup_completed', label: 'Signup' },
  { key: 'truck_added', label: 'Truck Added' },
  { key: 'diagnostic_started', label: 'Diagnostic Start' },
  { key: 'diagnostic_completed', label: 'Diagnostic Complete' },
  { key: 'report_saved', label: 'Report Saved' },
  { key: 'checkout_completed', label: 'Paid Conversion' },
];

function pct(value) {
  return `${value.toFixed(1)}%`;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const [strategyForm, setStrategyForm] = useState({
    name: '',
    objective: '',
    north_star_metric: '',
    channelsCsv: 'email,in-app',
  });

  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    eventName: 'diagnostic_completed',
    minCount: '1',
  });

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    channel: 'in-app',
    trigger_event: 'diagnostic_completed',
    strategy_id: '',
    segment_id: '',
    message_template: '',
    budget_usd: '0',
  });

  const [experimentForm, setExperimentForm] = useState({
    campaign_id: '',
    hypothesis: '',
    success_metric: 'checkout_conversion_rate',
    variant_a: '{"title":"Current"}',
    variant_b: '{"title":"New"}',
  });

  const [alertForm, setAlertForm] = useState({
    name: '',
    metric_key: 'd7_retention',
    comparator: 'lt',
    threshold_value: '20',
    lookback_days: '7',
  });

  const [bizInputs, setBizInputs] = useState({
    marketingSpend: '',
    monthlyPrice: '',
    infraCost: '',
  });

  const [selectedUserId, setSelectedUserId] = useState(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['marketing-events-recent'],
    queryFn: () => marketingService.getRecentEvents(45),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: subStats = null } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: marketingService.getSubscriptionStats,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: userActivity = [] } = useQuery({
    queryKey: ['user-activity-summary'],
    queryFn: marketingService.getUserActivitySummary,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: userEvents = [], isFetching: userEventsFetching } = useQuery({
    queryKey: ['user-events', selectedUserId],
    queryFn: () => marketingService.getUserEvents(selectedUserId),
    enabled: !!selectedUserId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ['marketing-strategies'],
    queryFn: marketingService.listStrategies,
  });

  const { data: segments = [] } = useQuery({
    queryKey: ['marketing-segments'],
    queryFn: marketingService.listSegments,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: marketingService.listCampaigns,
  });

  const { data: experiments = [] } = useQuery({
    queryKey: ['marketing-experiments'],
    queryFn: marketingService.listExperiments,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['marketing-alerts'],
    queryFn: marketingService.listAlerts,
  });

  const createStrategyMutation = useMutation({
    mutationFn: marketingService.createStrategy,
    onSuccess: () => {
      toast.success(t('admin.toast.strategyCreated'));
      queryClient.invalidateQueries({ queryKey: ['marketing-strategies'] });
      setStrategyForm({ name: '', objective: '', north_star_metric: '', channelsCsv: 'email,in-app' });
    },
    onError: (e) => toast.error(e.message || t('admin.toast.strategyCreateFailed')),
  });

  const createSegmentMutation = useMutation({
    mutationFn: marketingService.createSegment,
    onSuccess: () => {
      toast.success(t('admin.toast.segmentCreated'));
      queryClient.invalidateQueries({ queryKey: ['marketing-segments'] });
      setSegmentForm({ name: '', description: '', eventName: 'diagnostic_completed', minCount: '1' });
    },
    onError: (e) => toast.error(e.message || t('admin.toast.segmentCreateFailed')),
  });

  const createCampaignMutation = useMutation({
    mutationFn: marketingService.createCampaign,
    onSuccess: () => {
      toast.success(t('admin.toast.campaignCreated'));
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setCampaignForm({
        name: '',
        channel: 'in-app',
        trigger_event: 'diagnostic_completed',
        strategy_id: '',
        segment_id: '',
        message_template: '',
        budget_usd: '0',
      });
    },
    onError: (e) => toast.error(e.message || t('admin.toast.campaignCreateFailed')),
  });

  const createExperimentMutation = useMutation({
    mutationFn: marketingService.createExperiment,
    onSuccess: () => {
      toast.success(t('admin.toast.experimentCreated'));
      queryClient.invalidateQueries({ queryKey: ['marketing-experiments'] });
      setExperimentForm({
        campaign_id: '',
        hypothesis: '',
        success_metric: 'checkout_conversion_rate',
        variant_a: '{"title":"Current"}',
        variant_b: '{"title":"New"}',
      });
    },
    onError: (e) => toast.error(e.message || t('admin.toast.experimentCreateFailed')),
  });

  const createAlertMutation = useMutation({
    mutationFn: marketingService.createAlert,
    onSuccess: () => {
      toast.success(t('admin.toast.alertCreated'));
      queryClient.invalidateQueries({ queryKey: ['marketing-alerts'] });
      setAlertForm({
        name: '',
        metric_key: 'd7_retention',
        comparator: 'lt',
        threshold_value: '20',
        lookback_days: '7',
      });
    },
    onError: (e) => toast.error(e.message || t('admin.toast.alertCreateFailed')),
  });

  const analytics = useMemo(() => {
    const now = Date.now();
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d14 = now - 14 * 24 * 60 * 60 * 1000;
    const d30 = now - 30 * 24 * 60 * 60 * 1000;

    const users7 = new Set();
    const usersPrev7 = new Set();
    const paid7 = new Set();
    const users30 = new Set();

    const firstSeen = new Map();
    const eventsByUserByDay = new Map();
    const activeByDay = new Map();
    const stepUsers = funnelSteps.reduce((acc, step) => {
      acc[step.key] = new Set();
      return acc;
    }, {});

    for (const event of events) {
      if (!event.user_id) continue;
      const ts = new Date(event.happened_at).getTime();
      const uid = event.user_id;
      const day = event.happened_at.slice(0, 10);

      if (!firstSeen.has(uid) || ts < firstSeen.get(uid)) firstSeen.set(uid, ts);

      if (!eventsByUserByDay.has(uid)) eventsByUserByDay.set(uid, new Set());
      eventsByUserByDay.get(uid).add(day);

      if (!activeByDay.has(day)) activeByDay.set(day, new Set());
      activeByDay.get(day).add(uid);

      if (ts >= d30) users30.add(uid);
      if (ts >= d7) users7.add(uid);
      if (ts >= d14 && ts < d7) usersPrev7.add(uid);
      if (ts >= d7 && event.event_name === 'checkout_completed') paid7.add(uid);

      if (stepUsers[event.event_name] !== undefined && ts >= d30) {
        stepUsers[event.event_name].add(uid);
      }
    }

    const trend = Array.from(activeByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([day, set]) => ({ day: day.slice(5), activeUsers: set.size }));

    // Cohort-based funnel: step N counts only users who also completed all prior steps
    const funnelCohortSets = funnelSteps.map((_, idx) => {
      if (idx === 0) return stepUsers[funnelSteps[0].key];
      const required = funnelSteps.slice(0, idx).map((s) => s.key);
      return new Set(
        [...stepUsers[funnelSteps[idx].key]].filter((uid) =>
          required.every((k) => stepUsers[k].has(uid)),
        ),
      );
    });

    const funnel = funnelSteps.map((s, idx) => ({
      step: s.label,
      users: funnelCohortSets[idx].size,
      conversion:
        idx === 0
          ? 100
          : funnelCohortSets[idx - 1].size
          ? Number(((funnelCohortSets[idx].size / funnelCohortSets[idx - 1].size) * 100).toFixed(1))
          : 0,
    }));

    const newCohortUsers = Array.from(firstSeen.entries()).filter(([, ts]) => ts >= d30);
    const retentionCheck = { D1: 0, D7: 0, D30: 0, total: newCohortUsers.length };
    for (const [uid, ts] of newCohortUsers) {
      const start = new Date(ts);
      start.setHours(0, 0, 0, 0);
      const days = eventsByUserByDay.get(uid) || new Set();
      const day1 = new Date(start); day1.setDate(start.getDate() + 1);
      const day7 = new Date(start); day7.setDate(start.getDate() + 7);
      const day30 = new Date(start); day30.setDate(start.getDate() + 30);

      if (days.has(day1.toISOString().slice(0, 10))) retentionCheck.D1 += 1;
      if (days.has(day7.toISOString().slice(0, 10))) retentionCheck.D7 += 1;
      if (days.has(day30.toISOString().slice(0, 10))) retentionCheck.D30 += 1;
    }

    const retention = [
      { day: 'D1', value: retentionCheck.total ? Number(((retentionCheck.D1 / retentionCheck.total) * 100).toFixed(1)) : 0 },
      { day: 'D7', value: retentionCheck.total ? Number(((retentionCheck.D7 / retentionCheck.total) * 100).toFixed(1)) : 0 },
      { day: 'D30', value: retentionCheck.total ? Number(((retentionCheck.D30 / retentionCheck.total) * 100).toFixed(1)) : 0 },
    ];

    const wauDelta = usersPrev7.size ? ((users7.size - usersPrev7.size) / usersPrev7.size) * 100 : 0;
    const paidCr = users7.size ? (paid7.size / users7.size) * 100 : 0;

    return {
      wau: users7.size,
      mau: users30.size,
      paid7: paid7.size,
      wauDelta,
      paidCr,
      funnel,
      retention,
      trend,
    };
  }, [events]);

  const businessMetrics = useMemo(() => {
    const paying   = subStats?.paying    ?? 0;
    const trialing = subStats?.trialing  ?? 0;
    const canceled = subStats?.canceled  ?? 0;

    const monthlyPrice = parseFloat(bizInputs.monthlyPrice) || 0;
    const spend        = parseFloat(bizInputs.marketingSpend) || 0;
    const infraCost    = parseFloat(bizInputs.infraCost) || 0;

    const mrr             = paying * monthlyPrice;
    const arpu            = paying > 0 ? mrr / paying : 0;
    const grossMargin     = mrr - infraCost;
    const grossMarginPct  = mrr > 0 ? grossMargin / mrr : 0;
    const acquired        = paying + trialing;
    const cac             = acquired > 0 ? spend / acquired : 0;
    const monthlyChurn    = (paying + canceled) > 0 ? canceled / (paying + canceled) : 0;
    const ltv             = monthlyChurn > 0 ? (arpu * grossMarginPct) / monthlyChurn : 0;
    const monthlyGP       = arpu * grossMarginPct;
    const payback         = monthlyGP > 0 ? cac / monthlyGP : 0;
    const trialConversion = trialing > 0 ? paying / trialing : 0;
    const churn           = monthlyChurn;

    return { mrr, cac, ltv, payback, grossMargin, grossMarginPct, trialConversion, churn, paying, trialing, canceled, arpu };
  }, [bizInputs, subStats]);

  const submitStrategy = (e) => {
    e.preventDefault();
    createStrategyMutation.mutate({
      name: strategyForm.name,
      objective: strategyForm.objective,
      north_star_metric: strategyForm.north_star_metric,
      channels: strategyForm.channelsCsv.split(',').map((s) => s.trim()).filter(Boolean),
      target_audience: {},
      status: 'draft',
    });
  };

  const submitSegment = (e) => {
    e.preventDefault();
    createSegmentMutation.mutate({
      name: segmentForm.name,
      description: segmentForm.description,
      filter_definition: {
        type: 'event_count_threshold',
        event: segmentForm.eventName,
        min_count: Number(segmentForm.minCount) || 1,
      },
      is_dynamic: true,
      status: 'active',
    });
  };

  const submitCampaign = (e) => {
    e.preventDefault();
    createCampaignMutation.mutate({
      name: campaignForm.name,
      channel: campaignForm.channel,
      trigger_event: campaignForm.trigger_event,
      strategy_id: campaignForm.strategy_id || null,
      segment_id: campaignForm.segment_id || null,
      message_template: campaignForm.message_template,
      budget_usd: Number(campaignForm.budget_usd) || 0,
      status: 'draft',
      goals: {
        conversion_target_pct: 0,
      },
    });
  };

  const submitExperiment = (e) => {
    e.preventDefault();
    let variantA = {};
    let variantB = {};
    try {
      variantA = JSON.parse(experimentForm.variant_a || '{}');
      variantB = JSON.parse(experimentForm.variant_b || '{}');
    } catch {
      toast.error(t('admin.toast.invalidVariantJson'));
      return;
    }

    createExperimentMutation.mutate({
      campaign_id: experimentForm.campaign_id || null,
      hypothesis: experimentForm.hypothesis,
      success_metric: experimentForm.success_metric,
      variant_a: variantA,
      variant_b: variantB,
      status: 'draft',
      result_summary: {},
    });
  };

  const submitAlert = (e) => {
    e.preventDefault();
    createAlertMutation.mutate({
      name: alertForm.name,
      metric_key: alertForm.metric_key,
      comparator: alertForm.comparator,
      threshold_value: Number(alertForm.threshold_value),
      lookback_days: Number(alertForm.lookback_days) || 7,
      status: 'active',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          ['overview',    t('admin.tabs.overview')],
          ['metrics',     t('admin.tabs.metrics')],
          ['users',       t('admin.tabs.users')],
          ['strategies',  t('admin.tabs.strategies')],
          ['segments',    t('admin.tabs.segments')],
          ['campaigns',   t('admin.tabs.campaigns')],
          ['experiments', t('admin.tabs.experiments')],
          ['alerts',      t('admin.tabs.alerts')],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'outline'}
            onClick={() => setActiveTab(key)}
            className={activeTab === key ? 'brand-btn text-white border-0' : 'border-white/20 text-white/70'}
          >
            {label}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {eventsLoading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4 bg-white/5 border-white/10">
                <p className="text-white/50 text-sm">{t('admin.metrics.wau')}</p>
                <p className="text-3xl text-white font-bold mt-2">{analytics.wau}</p>
                <p className="text-xs text-white/40 mt-1">{t('admin.metrics.delta')}: {pct(analytics.wauDelta)}</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10">
                <p className="text-white/50 text-sm">{t('admin.metrics.mau')}</p>
                <p className="text-3xl text-white font-bold mt-2">{analytics.mau}</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10">
                <p className="text-white/50 text-sm">{t('admin.metrics.paid')}</p>
                <p className="text-3xl text-white font-bold mt-2">{analytics.paid7}</p>
                <p className="text-xs text-white/40 mt-1">CR: {pct(analytics.paidCr)}</p>
              </Card>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-4 bg-white/5 border-white/10">
              <h3 className="text-white font-semibold mb-3">{t('admin.sections.funnel')}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.funnel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="step" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" />
                    <Tooltip contentStyle={{ background: '#111718', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Bar dataKey="users" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 bg-white/5 border-white/10">
              <h3 className="text-white font-semibold mb-3">{t('admin.sections.retention')}</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.retention}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" />
                    <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: '#111718', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.sections.trend')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip contentStyle={{ background: '#111718', border: '1px solid rgba(255,255,255,0.2)' }} />
                  <Line type="monotone" dataKey="activeUsers" stroke="#60a5fa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'strategies' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.strategies.createTitle')}</h3>
            <form onSubmit={submitStrategy} className="space-y-3">
              <Input placeholder={t('admin.fields.name')} value={strategyForm.name} onChange={(e) => setStrategyForm((p) => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.objective')} value={strategyForm.objective} onChange={(e) => setStrategyForm((p) => ({ ...p, objective: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.northStarMetric')} value={strategyForm.north_star_metric} onChange={(e) => setStrategyForm((p) => ({ ...p, north_star_metric: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder={t('admin.fields.channelsCsv')} value={strategyForm.channelsCsv} onChange={(e) => setStrategyForm((p) => ({ ...p, channelsCsv: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Button type="submit" className="brand-btn text-white border-0">{t('admin.actions.saveStrategy')}</Button>
            </form>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.strategies.listTitle')}</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {strategies.map((s) => (
                <div key={s.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-xs text-white/50 mt-1">{s.objective}</p>
                  <p className="text-xs text-white/40 mt-1">{t('admin.labels.status')}: {s.status}</p>
                </div>
              ))}
              {strategies.length === 0 && <p className="text-white/50 text-sm">{t('admin.empty.strategies')}</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.segments.createTitle')}</h3>
            <form onSubmit={submitSegment} className="space-y-3">
              <Input placeholder={t('admin.fields.name')} value={segmentForm.name} onChange={(e) => setSegmentForm((p) => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.description')} value={segmentForm.description} onChange={(e) => setSegmentForm((p) => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder={t('admin.fields.eventName')} value={segmentForm.eventName} onChange={(e) => setSegmentForm((p) => ({ ...p, eventName: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.minCount')} type="number" value={segmentForm.minCount} onChange={(e) => setSegmentForm((p) => ({ ...p, minCount: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Button type="submit" className="brand-btn text-white border-0">{t('admin.actions.saveSegment')}</Button>
            </form>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.segments.listTitle')}</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {segments.map((s) => (
                <div key={s.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-xs text-white/50 mt-1">{s.description || t('admin.empty.noDescription')}</p>
                </div>
              ))}
              {segments.length === 0 && <p className="text-white/50 text-sm">{t('admin.empty.segments')}</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.campaigns.createTitle')}</h3>
            <form onSubmit={submitCampaign} className="space-y-3">
              <Input placeholder={t('admin.fields.name')} value={campaignForm.name} onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.channel')} value={campaignForm.channel} onChange={(e) => setCampaignForm((p) => ({ ...p, channel: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.triggerEvent')} value={campaignForm.trigger_event} onChange={(e) => setCampaignForm((p) => ({ ...p, trigger_event: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <select value={campaignForm.strategy_id} onChange={(e) => setCampaignForm((p) => ({ ...p, strategy_id: e.target.value }))} className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white">
                <option value="">{t('admin.options.noStrategy')}</option>
                {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={campaignForm.segment_id} onChange={(e) => setCampaignForm((p) => ({ ...p, segment_id: e.target.value }))} className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white">
                <option value="">{t('admin.options.noSegment')}</option>
                {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Input placeholder={t('admin.fields.messageTemplate')} value={campaignForm.message_template} onChange={(e) => setCampaignForm((p) => ({ ...p, message_template: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder={t('admin.fields.budgetUsd')} type="number" value={campaignForm.budget_usd} onChange={(e) => setCampaignForm((p) => ({ ...p, budget_usd: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Button type="submit" className="brand-btn text-white border-0">{t('admin.actions.saveCampaign')}</Button>
            </form>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.campaigns.listTitle')}</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {campaigns.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-xs text-white/50 mt-1">{t('admin.labels.channel')}: {c.channel}</p>
                  <p className="text-xs text-white/40 mt-1">{t('admin.labels.status')}: {c.status}</p>
                </div>
              ))}
              {campaigns.length === 0 && <p className="text-white/50 text-sm">{t('admin.empty.campaigns')}</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'experiments' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.experiments.createTitle')}</h3>
            <form onSubmit={submitExperiment} className="space-y-3">
              <select value={experimentForm.campaign_id} onChange={(e) => setExperimentForm((p) => ({ ...p, campaign_id: e.target.value }))} className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white">
                <option value="">{t('admin.options.selectCampaign')}</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Input placeholder={t('admin.fields.hypothesis')} value={experimentForm.hypothesis} onChange={(e) => setExperimentForm((p) => ({ ...p, hypothesis: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.successMetric')} value={experimentForm.success_metric} onChange={(e) => setExperimentForm((p) => ({ ...p, success_metric: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.variantAJson')} value={experimentForm.variant_a} onChange={(e) => setExperimentForm((p) => ({ ...p, variant_a: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.variantBJson')} value={experimentForm.variant_b} onChange={(e) => setExperimentForm((p) => ({ ...p, variant_b: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Button type="submit" className="brand-btn text-white border-0">{t('admin.actions.saveExperiment')}</Button>
            </form>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.experiments.listTitle')}</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {experiments.map((x) => (
                <div key={x.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-medium">{x.hypothesis}</p>
                  <p className="text-xs text-white/50 mt-1">{t('admin.labels.metric')}: {x.success_metric}</p>
                  <p className="text-xs text-white/40 mt-1">{t('admin.labels.status')}: {x.status}</p>
                </div>
              ))}
              {experiments.length === 0 && <p className="text-white/50 text-sm">{t('admin.empty.experiments')}</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.alerts.createTitle')}</h3>
            <form onSubmit={submitAlert} className="space-y-3">
              <Input placeholder={t('admin.fields.ruleName')} value={alertForm.name} onChange={(e) => setAlertForm((p) => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.metricKey')} value={alertForm.metric_key} onChange={(e) => setAlertForm((p) => ({ ...p, metric_key: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <select value={alertForm.comparator} onChange={(e) => setAlertForm((p) => ({ ...p, comparator: e.target.value }))} className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white">
                <option value="lt">&lt;</option>
                <option value="lte">&lt;=</option>
                <option value="eq">=</option>
                <option value="gte">&gt;=</option>
                <option value="gt">&gt;</option>
              </select>
              <Input placeholder={t('admin.fields.threshold')} type="number" value={alertForm.threshold_value} onChange={(e) => setAlertForm((p) => ({ ...p, threshold_value: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder={t('admin.fields.lookbackDays')} type="number" value={alertForm.lookback_days} onChange={(e) => setAlertForm((p) => ({ ...p, lookback_days: e.target.value }))} className="bg-white/5 border-white/10 text-white" required />
              <Button type="submit" className="brand-btn text-white border-0">{t('admin.actions.saveAlertRule')}</Button>
            </form>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.alerts.listTitle')}</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {alerts.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-medium">{a.name}</p>
                  <p className="text-xs text-white/50 mt-1">{a.metric_key} {a.comparator} {a.threshold_value}</p>
                  <p className="text-xs text-white/40 mt-1">{t('admin.labels.lookback')}: {a.lookback_days}d</p>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-white/50 text-sm">{t('admin.empty.alerts')}</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ─── Business Metrics tab ───────────────────────────── */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Manual cost/price inputs */}
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.bizMetrics.inputsTitle')}</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-white/50 text-xs mb-1">{t('admin.bizMetrics.marketingSpend')}</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={bizInputs.marketingSpend}
                  onChange={(e) => setBizInputs((p) => ({ ...p, marketingSpend: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <p className="text-white/50 text-xs mb-1">{t('admin.bizMetrics.monthlyPrice')}</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={bizInputs.monthlyPrice}
                  onChange={(e) => setBizInputs((p) => ({ ...p, monthlyPrice: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <p className="text-white/50 text-xs mb-1">{t('admin.bizMetrics.infraCost')}</p>
                <Input
                  type="number"
                  placeholder="0"
                  value={bizInputs.infraCost}
                  onChange={(e) => setBizInputs((p) => ({ ...p, infraCost: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </Card>

          {/* Subscription counts */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-sm">{t('admin.bizMetrics.payingUsers')}</p>
              <p className="text-3xl text-white font-bold mt-2">{businessMetrics.paying}</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-sm">{t('admin.bizMetrics.trialingUsers')}</p>
              <p className="text-3xl text-white font-bold mt-2">{businessMetrics.trialing}</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-sm">{t('admin.bizMetrics.canceledUsers')}</p>
              <p className="text-3xl text-white font-bold mt-2">{businessMetrics.canceled}</p>
            </Card>
          </div>

          {/* Computed metrics grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">{t('admin.bizMetrics.mrrLabel')}</p>
              <p className="text-xs text-white/30 mb-2">{t('admin.bizMetrics.mrrFormula')}</p>
              <p className="text-2xl text-white font-bold">${businessMetrics.mrr.toFixed(0)}</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">{t('admin.bizMetrics.cacLabel')}</p>
              <p className="text-xs text-white/30 mb-2">{t('admin.bizMetrics.cacFormula')}</p>
              <p className="text-2xl text-white font-bold">${businessMetrics.cac.toFixed(2)}</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">{t('admin.bizMetrics.ltvLabel')}</p>
              <p className="text-xs text-white/30 mb-2">{t('admin.bizMetrics.ltvFormula')}</p>
              <p className="text-2xl text-white font-bold">${businessMetrics.ltv.toFixed(2)}</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">{t('admin.bizMetrics.paybackLabel')}</p>
              <p className="text-xs text-white/30 mb-2">{t('admin.bizMetrics.paybackFormula')}</p>
              <p className="text-2xl text-white font-bold">
                {businessMetrics.payback > 0 ? `${businessMetrics.payback.toFixed(1)}mo` : '—'}
              </p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">{t('admin.bizMetrics.grossMarginLabel')}</p>
              <p className="text-xs text-white/30 mb-2">{t('admin.bizMetrics.grossMarginFormula')}</p>
              <p className="text-2xl text-white font-bold">
                ${businessMetrics.grossMargin.toFixed(0)}
                <span className="text-sm text-white/40 ml-1">({pct(businessMetrics.grossMarginPct * 100)})</span>
              </p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">{t('admin.bizMetrics.trialConversionLabel')}</p>
              <p className="text-xs text-white/30 mb-2">{t('admin.bizMetrics.trialConversionFormula')}</p>
              <p className="text-2xl text-white font-bold">{pct(businessMetrics.trialConversion * 100)}</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">{t('admin.bizMetrics.churnLabel')}</p>
              <p className="text-xs text-white/30 mb-2">{t('admin.bizMetrics.churnFormula')}</p>
              <p className="text-2xl text-white font-bold">{pct(businessMetrics.churn * 100)}</p>
            </Card>
            <Card className="p-4 bg-white/5 border-white/10">
              <p className="text-white/50 text-xs">ARPU</p>
              <p className="text-xs text-white/30 mb-2">MRR / paying users</p>
              <p className="text-2xl text-white font-bold">${businessMetrics.arpu.toFixed(2)}</p>
            </Card>
          </div>
        </div>
      )}

      {/* ─── User Activity tab ──────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">{t('admin.userActivity.listTitle')}</h3>
            <div className="overflow-auto max-h-[560px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-left border-b border-white/10">
                    <th className="pb-2 pr-4">{t('admin.userActivity.colEmail')}</th>
                    <th className="pb-2 pr-4 text-right">{t('admin.userActivity.colEvents')}</th>
                    <th className="pb-2 text-right">{t('admin.userActivity.colLastActive')}</th>
                  </tr>
                </thead>
                <tbody>
                  {userActivity.map((u) => (
                    <tr
                      key={u.user_id}
                      onClick={() => setSelectedUserId(u.user_id === selectedUserId ? null : u.user_id)}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${
                        u.user_id === selectedUserId ? 'bg-brand-orange/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-2 pr-4 text-white/70 truncate max-w-[200px]">
                        {u.email ?? u.user_id.slice(0, 8) + '…'}
                      </td>
                      <td className="py-2 pr-4 text-white text-right font-medium">{u.event_count}</td>
                      <td className="py-2 text-white/40 text-right whitespace-nowrap">
                        {u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {userActivity.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-white/40 text-center">{t('admin.userActivity.empty')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="text-white font-semibold mb-3">
              {selectedUserId
                ? `${t('admin.userActivity.timelineTitle')}: ${
                    userActivity.find((u) => u.user_id === selectedUserId)?.email ??
                    selectedUserId.slice(0, 8) + '…'
                  }`
                : t('admin.userActivity.selectPrompt')}
            </h3>
            {userEventsFetching && (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 rounded bg-white/5" />)}
              </div>
            )}
            {!userEventsFetching && selectedUserId && (
              <div className="overflow-auto max-h-[520px] space-y-1">
                {userEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5">
                    <span className="text-white/30 text-xs whitespace-nowrap pt-0.5">
                      {new Date(ev.happened_at).toLocaleString()}
                    </span>
                    <div className="min-w-0">
                      <span className="text-white/90 text-sm font-medium">{ev.event_name}</span>
                      {ev.event_category && (
                        <span className="ml-2 text-xs text-brand-orange/70">{ev.event_category}</span>
                      )}
                      {ev.event_props && Object.keys(ev.event_props).length > 0 && (
                        <p className="text-white/30 text-xs mt-0.5 truncate">
                          {JSON.stringify(ev.event_props)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {userEvents.length === 0 && (
                  <p className="text-white/40 text-sm">{t('admin.userActivity.noEvents')}</p>
                )}
              </div>
            )}
            {!selectedUserId && !userEventsFetching && (
              <p className="text-white/30 text-sm">{t('admin.userActivity.selectPrompt')}</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
