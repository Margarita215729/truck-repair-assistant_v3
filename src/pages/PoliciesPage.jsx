import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { Shield, Bot, AlertTriangle } from 'lucide-react';

export default function PoliciesPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">{t('policies.title')}</h1>
        <p className="text-white/50 mb-10">{t('policies.subtitle')}</p>

        {/* Disclaimer */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <h2 className="text-xl font-semibold text-white">{t('policies.disclaimerTitle')}</h2>
          </div>
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/70 leading-relaxed">{t('diagnostics.disclaimer')}</p>
          </div>
        </section>

        {/* AI Technology */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-brand-orange" />
            </div>
            <h2 className="text-xl font-semibold text-white">{t('policies.aiTitle')}</h2>
          </div>
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <p className="text-white/70 leading-relaxed">{t('policies.aiDescription')}</p>
            <p className="text-white/70 leading-relaxed">{t('policies.aiLimitations')}</p>
          </div>
        </section>

        {/* Data & Privacy */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">{t('policies.privacyTitle')}</h2>
          </div>
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <p className="text-white/70 leading-relaxed">{t('policies.privacyDescription')}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
