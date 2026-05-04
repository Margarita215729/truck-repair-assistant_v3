import { supabase, hasSupabaseConfig } from '@/api/supabaseClient';

function ensureClient() {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase is not configured.');
  }
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export const marketingService = {
  async listStrategies() {
    ensureClient();
    const { data, error } = await supabase
      .from('marketing_strategies')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createStrategy(payload) {
    ensureClient();
    const ownerId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('marketing_strategies')
      .insert({ ...payload, owner_user_id: ownerId })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateStrategy(id, updates) {
    ensureClient();
    const { data, error } = await supabase
      .from('marketing_strategies')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async listSegments() {
    ensureClient();
    const { data, error } = await supabase
      .from('marketing_segments')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createSegment(payload) {
    ensureClient();
    const ownerId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('marketing_segments')
      .insert({ ...payload, owner_user_id: ownerId })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async listCampaigns() {
    ensureClient();
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createCampaign(payload) {
    ensureClient();
    const ownerId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({ ...payload, owner_user_id: ownerId })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async listExperiments() {
    ensureClient();
    const { data, error } = await supabase
      .from('marketing_experiments')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createExperiment(payload) {
    ensureClient();
    const ownerId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('marketing_experiments')
      .insert({ ...payload, owner_user_id: ownerId })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async listAlerts() {
    ensureClient();
    const { data, error } = await supabase
      .from('marketing_alert_rules')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createAlert(payload) {
    ensureClient();
    const ownerId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('marketing_alert_rules')
      .insert({ ...payload, owner_user_id: ownerId })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getRecentEvents(days = 45) {
    ensureClient();
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('marketing_events')
      .select('user_id,event_name,happened_at,event_category')
      .gte('happened_at', d.toISOString())
      .order('happened_at', { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getSubscriptionStats() {
    ensureClient();
    const { data, error } = await supabase.rpc('get_subscription_stats');
    if (error) throw new Error(error.message);
    return data?.[0] ?? { paying: 0, trialing: 0, free_plan: 0, canceled: 0, past_due: 0 };
  },

  async getUserActivitySummary() {
    ensureClient();
    const { data, error } = await supabase.rpc('get_user_activity_summary');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getUserEvents(userId) {
    ensureClient();
    const { data, error } = await supabase
      .from('marketing_events')
      .select('event_name,event_category,happened_at,event_props')
      .eq('user_id', userId)
      .order('happened_at', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAllAccounts(limit = 500) {
    ensureClient();
    const { data, error } = await supabase.rpc('get_all_accounts', { p_limit: limit });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getLoginSessions(limit = 200) {
    ensureClient();
    const { data, error } = await supabase.rpc('get_login_sessions', { p_limit: limit });
    if (error) throw new Error(error.message);
    return data || [];
  },
};
