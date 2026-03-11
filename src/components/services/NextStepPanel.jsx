import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Truck,
  Phone,
  Shield,
  ArrowRight,
  OctagonAlert,
  CircleAlert,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

const TYPE_CONFIG = {
  stop_now: {
    icon: OctagonAlert,
    color: 'border-red-500/50 bg-red-500/10',
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    badgeLabel: 'STOP — Do Not Drive',
  },
  tow: {
    icon: Truck,
    color: 'border-red-500/40 bg-red-500/5',
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    badgeLabel: 'Towing Needed',
  },
  mobile_repair: {
    icon: Phone,
    color: 'border-orange-500/40 bg-orange-500/5',
    iconColor: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    badgeLabel: 'Call Mobile Repair',
  },
  drive_short: {
    icon: CircleAlert,
    color: 'border-yellow-500/40 bg-yellow-500/5',
    iconColor: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    badgeLabel: 'Limited Driving',
  },
  inspect_first: {
    icon: Eye,
    color: 'border-blue-500/40 bg-blue-500/5',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    badgeLabel: 'Inspect First',
  },
  safe_parking: {
    icon: Shield,
    color: 'border-green-500/40 bg-green-500/5',
    iconColor: 'text-green-400',
    badge: 'bg-green-500/20 text-green-400 border-green-500/40',
    badgeLabel: 'Find Safe Parking',
  },
  continue_cautious: {
    icon: CheckCircle,
    color: 'border-green-500/40 bg-green-500/5',
    iconColor: 'text-green-400',
    badge: 'bg-green-500/20 text-green-400 border-green-500/40',
    badgeLabel: 'Continue With Caution',
  },
};

export default function NextStepPanel({ nextStep, onFindServices, issueCategory }) {
  const { t } = useLanguage();
  if (!nextStep) return null;

  const config = TYPE_CONFIG[nextStep.type] || TYPE_CONFIG.inspect_first;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`p-5 ${config.color} border`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-black/20`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={`${config.badge} text-xs font-semibold`}>
                {config.badgeLabel}
              </Badge>
              {issueCategory && issueCategory !== 'general' && (
                <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20 text-xs">
                  {issueCategory.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mt-1">{nextStep.action}</h3>
            <p className="text-sm text-white/70 mt-1 leading-relaxed">{nextStep.description}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              {(nextStep.type === 'stop_now' || nextStep.type === 'tow') && (
                <Button
                  size="sm"
                  onClick={() => onFindServices?.('towing_heavy_duty')}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Truck className="w-4 h-4 mr-1.5" />
                  {t('getHelpNow.findTowing') || 'Find Heavy-Duty Towing'}
                </Button>
              )}
              {nextStep.type !== 'continue_cautious' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFindServices?.('mobile_mechanic')}
                  className="border-white/20 hover:bg-white/10 text-white"
                >
                  <Phone className="w-4 h-4 mr-1.5" />
                  {t('getHelpNow.callMobile') || 'Call Mobile Mechanic'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFindServices?.()}
                className="border-white/20 hover:bg-white/10 text-white"
              >
                <ArrowRight className="w-4 h-4 mr-1.5" />
                {t('getHelpNow.seeAllOptions') || 'See All Options'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
