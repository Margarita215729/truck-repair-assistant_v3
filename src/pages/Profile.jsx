import React, { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { entities } from '@/services/entityService';
import { uploadFile } from '@/services/aiService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Camera,
  Save,
  LogOut,
  Bell,
  Loader2,
  Crown,
  CreditCard,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { subscriptionService } from '@/services/subscriptionService';
import { useNavigate } from 'react-router-dom';

import ProfileStats from '@/components/profile/ProfileStats';
import TruckGarage from '@/components/profile/TruckGarage';
import SavedShops from '@/components/profile/SavedShops';

export default function Profile() {
  const { t } = useLanguage();
  const { subscription, isProUser, planLimits, aiUsage } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company_name: '',
    notification_preferences: {
      email_reports: true,
      maintenance_reminders: true
    }
  });

  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => authService.me(),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['user-conversations'],
    queryFn: () => entities.Conversation.list('-created_at', 200),
    enabled: !!user
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['user-reports'],
    queryFn: () => entities.DiagnosticReport.list('-created_at', 200),
    enabled: !!user
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => entities.Truck.list(),
    enabled: !!user
  });

  const { data: savedShops = [] } = useQuery({
    queryKey: ['preferred-shops'],
    queryFn: () => entities.PreferredShop.list(),
    enabled: !!user
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        company_name: user.company_name || '',
        notification_preferences: user.notification_preferences || {
          email_reports: true,
          maintenance_reminders: true
        }
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authService.updateMe({
        full_name: formData.full_name,
        phone: formData.phone,
        company_name: formData.company_name,
        notification_preferences: formData.notification_preferences
      });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setIsEditing(false);
      toast.success(t('profile.profileUpdated'));
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrucksUpdate = async (trucks) => {
    try {
      // Trucks are managed via entityService (user_id scoped via RLS)
      // The TruckGarage component already handles CRUD via entities.Truck
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast.success(t('profile.trucksUpdated'));
    } catch (error) {
      toast.error(t('profile.saveError'));
    }
  };

  const handleShopsUpdate = async (shops) => {
    try {
      // Shops are managed via entityService (user_id scoped via RLS)
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['service-reviews'] });
      toast.success(t('profile.servicesUpdated'));
    } catch (error) {
      toast.error(t('profile.saveError'));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await uploadFile({ file });
      await authService.updateMe({ avatar_url: file_url });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      toast.success(t('profile.photoUpdated'));
    } catch (error) {
      toast.error(t('profile.photoUploadError'));
    }
  };

  const handleLogout = () => {
    authService.logout();
  };

  const stats = {
    conversationsCount: conversations.length,
    reportsCount: reports.length,
    trucksCount: trucks.length,
    savedShopsCount: savedShops.length
  };

  if (userLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-xl bg-white/5" />
          <Skeleton className="h-20 rounded-xl bg-white/5" />
          <Skeleton className="h-60 rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Profile Header */}
        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-white/10">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-orange-500/20 text-orange-500 text-2xl">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {user?.full_name || t('common.user')}
              </h1>
              <p className="text-white/60 flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              {user?.company_name && (
                <p className="text-white/50 flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" />
                  {user.company_name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="border-white/20 hover:bg-white/10"
              >
                {isEditing ? t('common.cancel') : t('profile.editProfile')}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-white/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-white/10"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-white/60 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('profile.name')}
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder={t('profile.namePlaceholder')}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/60 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t('profile.phone')}
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm text-white/60 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {t('profile.company')}
                  </label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder={t('profile.companyPlaceholder')}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t('common.save')}
                </Button>
              </div>
            </motion.div>
          )}
        </Card>

        {/* Stats */}
        <ProfileStats stats={stats} />

        {/* Subscription */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-orange-500" />
            {t('profile.subscription')}
          </h3>
          
          <div className="space-y-4">
            {/* Current Plan */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white/60">{t('profile.currentPlan')}</span>
                <Badge 
                  variant={isProUser ? 'default' : 'secondary'}
                  className={isProUser ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-white/10 text-white/60'}
                >
                  {isProUser && <Crown className="w-3 h-3 mr-1" />}
                  {subscription?.plan === 'lifetime' 
                    ? t('profile.lifetimePlan')
                    : (subscription?.plan === 'owner' || subscription?.plan === 'fleet')
                      ? (subscription.plan === 'fleet' ? t('profile.fleetPlan') : t('profile.proPlan'))
                      : t('profile.freePlan')}
                </Badge>
              </div>
              
              {isProUser && subscription?.plan !== 'lifetime' ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isManagingSubscription}
                  className="border-white/20 hover:bg-white/10"
                  onClick={async () => {
                    setIsManagingSubscription(true);
                    try {
                      const url = await subscriptionService.openBillingPortal();
                      if (url) window.location.href = url;
                    } catch (err) {
                      toast.error(t('pricing.portalFailed'));
                    } finally {
                      setIsManagingSubscription(false);
                    }
                  }}
                >
                  {isManagingSubscription ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {t('profile.manageSubscription')}
                </Button>
              ) : !isProUser && (
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => navigate('/Pricing')}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {t('profile.upgradeToPro')}
                </Button>
              )}
            </div>

            {/* Next payment date for paid plans */}
            {isProUser && subscription?.plan !== 'lifetime' && subscription?.current_period_end && (
              <>
                <Separator className="bg-white/10" />
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{t('profile.nextPayment')}</span>
                  <span className="text-white">
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}

            <Separator className="bg-white/10" />

            {/* AI Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/60">{t('profile.aiRequestsToday')}</span>
                <span className="text-white">
                  {isProUser 
                    ? t('profile.unlimited')
                    : `${aiUsage?.used || 0} ${t('profile.of')} ${planLimits?.ai_requests_per_day || 10}`}
                </span>
              </div>
              {!isProUser && (
                <Progress 
                  value={((aiUsage?.used || 0) / (planLimits?.ai_requests_per_day || 10)) * 100} 
                  className="h-2 bg-white/10"
                />
              )}
            </div>

            {/* Truck Usage */}
            <div className="flex items-center justify-between">
              <span className="text-white/60">{t('profile.trucksUsed')}</span>
              <span className="text-white">
                {isProUser 
                  ? `${stats.trucksCount} — ${t('profile.unlimited')}`
                  : `${stats.trucksCount} ${t('profile.of')} ${planLimits?.max_trucks || 3}`}
              </span>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-orange-500" />
            {t('profile.notifications')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">{t('profile.emailReports')}</p>
                <p className="text-sm text-white/50">{t('profile.emailReportsDesc')}</p>
              </div>
              <Switch
                checked={formData.notification_preferences.email_reports}
                onCheckedChange={(checked) => {
                  const newPrefs = { ...formData.notification_preferences, email_reports: checked };
                  setFormData({ ...formData, notification_preferences: newPrefs });
                  authService.updateMe({ notification_preferences: newPrefs });
                }}
              />
            </div>
            <Separator className="bg-white/10" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">{t('profile.maintenanceReminders')}</p>
                <p className="text-sm text-white/50">{t('profile.maintenanceRemindersDesc')}</p>
              </div>
              <Switch
                checked={formData.notification_preferences.maintenance_reminders}
                onCheckedChange={(checked) => {
                  const newPrefs = { ...formData.notification_preferences, maintenance_reminders: checked };
                  setFormData({ ...formData, notification_preferences: newPrefs });
                  authService.updateMe({ notification_preferences: newPrefs });
                }}
              />
            </div>
          </div>
        </Card>

        {/* Truck Garage */}
        <TruckGarage />

        {/* Saved Shops */}
        <SavedShops />
      </motion.div>
    </div>
  );
}
