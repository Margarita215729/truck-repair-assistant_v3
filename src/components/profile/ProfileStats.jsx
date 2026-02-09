import React from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare, FileText, Truck, Wrench } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function ProfileStats({ stats }) {
  const { t } = useLanguage();

  const items = [
    {
      label: t('profileStats.diagnostics'),
      value: stats.conversationsCount || 0,
      icon: MessageSquare,
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-500'
    },
    {
      label: t('profileStats.reports'),
      value: stats.reportsCount || 0,
      icon: FileText,
      color: 'from-orange-500/20 to-orange-600/20',
      iconColor: 'text-orange-500'
    },
    {
      label: t('profileStats.trucks'),
      value: stats.trucksCount || 0,
      icon: Truck,
      color: 'from-green-500/20 to-green-600/20',
      iconColor: 'text-green-500'
    },
    {
      label: t('profileStats.services'),
      value: stats.savedShopsCount || 0,
      icon: Wrench,
      color: 'from-purple-500/20 to-purple-600/20',
      iconColor: 'text-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item, index) => (
        <Card key={index} className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
              <item.icon className={`w-5 h-5 ${item.iconColor}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <p className="text-xs text-white/50">{item.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
