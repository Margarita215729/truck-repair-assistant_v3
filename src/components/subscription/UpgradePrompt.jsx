import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { Zap, Crown, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * UpgradePrompt — shown when free user hits a limit.
 * @param {'ai' | 'trucks'} type — Which limit was hit
 * @param {function} onDismiss — Optional dismiss handler
 */
export default function UpgradePrompt({ type = 'ai', onDismiss }) {
  const { t } = useLanguage();
  const { aiUsage } = useAuth();

  const isAi = type === 'ai';

  return (
    <div className="bg-gradient-to-r from-brand-orange/10 to-yellow-500/5 border border-brand-orange/20 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-orange/20 flex items-center justify-center shrink-0">
          {isAi ? <Zap className="w-5 h-5 text-brand-orange" /> : <AlertTriangle className="w-5 h-5 text-brand-orange" />}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm mb-1">
            {isAi ? t('upgrade.aiLimitReached') : t('upgrade.truckLimitReached')}
          </h3>
          <p className="text-white/50 text-xs mb-3">
            {isAi
              ? t('upgrade.aiLimitDesc', { used: aiUsage.used, limit: aiUsage.limit })
              : t('upgrade.truckLimitDesc')
            }
          </p>
          <div className="flex items-center gap-2">
            <Link to="/Pricing">
              <Button size="sm" className="brand-btn text-white border-0 text-xs h-8">
                <Crown className="w-3 h-3 mr-1" />
                {t('upgrade.upgradeToPro')}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-white/40 hover:text-white/60 text-xs h-8"
              >
                {t('common.close')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
