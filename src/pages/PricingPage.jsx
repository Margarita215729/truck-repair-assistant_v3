import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { subscriptionService } from '@/services/subscriptionService';
import { PLANS } from '@/config/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Check, Crown, Loader2, Gift, Sparkles,
  ArrowRight, Shield, CheckCircle2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { trackEvent } from '@/services/analyticsService';

export default function PricingPage() {
  const { t, language } = useLanguage();
  const { subscription, isProUser, loadSubscription, user } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoResult, setPromoResult] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const isSuccess = searchParams.get('success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';

  React.useEffect(() => {
    trackEvent('pricing_viewed', { category: 'conversion' });
  }, []);

  React.useEffect(() => {
    if (isSuccess || isCanceled) {
      if (isSuccess) {
        trackEvent('checkout_completed', { category: 'conversion' });
      }
      const timeout = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isSuccess, isCanceled, setSearchParams]);

  const handleCheckout = async (priceId) => {
    if (!user) {
      toast.error(t('pricing.loginRequired') || 'Please log in to subscribe');
      return;
    }
    if (!priceId) {
      toast.error('Price configuration error. Please try again later.');
      return;
    }
    setIsCheckingOut(true);
    trackEvent('checkout_started', {
      category: 'conversion',
      props: { priceId },
    });
    try {
      const url = await subscriptionService.createCheckoutSession(priceId);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.message || t('pricing.checkoutFailed'));
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const url = await subscriptionService.openBillingPortal();
      window.location.href = url;
    } catch (err) {
      toast.error(err.message || t('pricing.portalFailed'));
    }
  };

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    setIsRedeeming(true);
    setPromoResult(null);
    try {
      const result = await subscriptionService.redeemPromoCode(promoCode.trim());
      if (result.success) {
        setPromoResult({ success: true, message: result.message });
        await loadSubscription();
        toast.success(t('pricing.promoSuccess'));
      } else {
        setPromoResult({ success: false, message: result.error });
      }
    } catch (err) {
      setPromoResult({ success: false, message: err.message });
    } finally {
      setIsRedeeming(false);
    }
  };

  const getFeatureValue = (f) => {
    if (language === 'ru') return f.valueRu || f.value;
    if (language === 'es') return f.valueEs || f.value;
    return f.value;
  };

  const getPlanName = (plan) => {
    if (language === 'ru') return plan.nameRu || plan.name;
    if (language === 'es') return plan.nameEs || plan.name;
    return plan.name;
  };

  const currentPlan = subscription?.plan || 'free';
  const isCurrentFree = currentPlan === 'free';
  const isCurrentPremium = ['premium', 'pro', 'owner', 'fleet', 'lifetime'].includes(currentPlan);

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-20">
      <div className="max-w-3xl mx-auto">
        {/* Success / Cancel banners */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-400"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">{t('pricing.paymentSuccess')}</p>
              <p className="text-sm text-green-400/70">{t('pricing.welcomeToPro')}</p>
            </div>
          </motion.div>
        )}
        {isCanceled && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            {t('pricing.paymentCanceled')}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            <Sparkles className="w-6 h-6 inline mr-2 text-brand-orange" />
            {t('pricing.title')}
          </h1>
          <p className="text-white/50">{t('pricing.subtitle')}</p>
        </div>

        {/* Plans — 2-column grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="relative p-6 h-full bg-[#111718] border-brand-dark/30">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{getPlanName(PLANS.free)}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-white">$0</span>
                </div>
                <p className="text-white/40 text-sm mt-1">{t('pricing.freeForever')}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {PLANS.free.features.map((f) => (
                  <li key={f.key} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
                    <span className="text-white/80">{getFeatureValue(f)}</span>
                  </li>
                ))}
              </ul>

              {isCurrentFree && (
                <Button disabled className="w-full bg-white/10 text-white/50 border-0">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('pricing.currentPlan')}
                </Button>
              )}
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative p-6 h-full bg-gradient-to-b from-brand-orange/10 to-[#111718] border-brand-orange/30 shadow-xl shadow-brand-orange/5">
              {/* Promo badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-red-500 to-brand-orange text-white border-0 px-3 py-1 animate-pulse">
                  <Clock className="w-3 h-3 mr-1" />
                  {t('pricing.limitedOffer')}
                </Badge>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{getPlanName(PLANS.premium)}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg text-white/40 line-through mr-2">${PLANS.premium.originalPrice}</span>
                  <span className="text-3xl font-bold text-white">${PLANS.premium.price}</span>
                  <span className="text-white/50 text-sm">/{t('pricing.month')}</span>
                </div>
                <p className="text-brand-orange text-sm mt-1 font-medium">{t('pricing.promoSave')}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {PLANS.premium.features.map((f) => (
                  <li key={f.key} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-brand-orange" />
                    <span className="text-white/80">{getFeatureValue(f)}</span>
                  </li>
                ))}
              </ul>

              {isCurrentPremium ? (
                <Button disabled className="w-full bg-white/10 text-white/50 border-0">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('pricing.currentPlan')}
                </Button>
              ) : (
                <Button
                  onClick={() => handleCheckout(PLANS.premium.stripePriceMonthly)}
                  disabled={isCheckingOut}
                  className="w-full border-0 text-white brand-btn"
                >
                  {isCheckingOut ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4 mr-2" />
                  )}
                  {t('pricing.subscribe')}
                </Button>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Manage Subscription (for Pro users) */}
        {isProUser && subscription?.stripe_subscription_id && (
          <div className="text-center mb-10">
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/5"
            >
              <Shield className="w-4 h-4 mr-2" />
              {t('pricing.manageSubscription')}
            </Button>
          </div>
        )}

        {/* Lifetime Badge */}
        {subscription?.plan === 'lifetime' && (
          <div className="text-center mb-10">
            <Badge className="bg-gradient-to-r from-yellow-500/20 to-brand-orange/20 text-yellow-400 border-yellow-500/30 px-4 py-2 text-base">
              <Crown className="w-5 h-5 mr-2" />
              {t('pricing.lifetimeMember')}
            </Badge>
          </div>
        )}

        {/* Promo Code */}
        <Card className="bg-[#111718] border-brand-dark/30 p-6 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-brand-orange" />
            <h3 className="text-white font-semibold">{t('pricing.havePromoCode')}</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder={t('pricing.promoPlaceholder')}
              className="bg-[#0b1012] border-brand-dark/30 text-white placeholder:text-white/25 uppercase"
              onKeyDown={(e) => e.key === 'Enter' && handleRedeemPromo()}
            />
            <Button
              onClick={handleRedeemPromo}
              disabled={isRedeeming || !promoCode.trim()}
              className="brand-btn text-white border-0 shrink-0"
            >
              {isRedeeming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </div>
          {promoResult && (
            <p className={`text-sm mt-2 ${promoResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {promoResult.message}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
