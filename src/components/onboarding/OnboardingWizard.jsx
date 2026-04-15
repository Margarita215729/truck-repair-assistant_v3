import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/LanguageContext';
import { useTruck } from '@/lib/TruckContext';
import { truckManufacturers } from '@/data/truckData';
import { Globe, Truck, Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const ONBOARDING_KEY = 'truck_repair_onboarding_done';

export function useOnboarding() {
  const done = localStorage.getItem(ONBOARDING_KEY) === '1';
  const markDone = () => localStorage.setItem(ONBOARDING_KEY, '1');
  return { showOnboarding: !done, markDone };
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const FEATURES = [
  { icon: '🔧', key: 'diagnostics' },
  { icon: '🔍', key: 'parts' },
  { icon: '📍', key: 'services' },
  { icon: '📊', key: 'reports' },
];

export default function OnboardingWizard({ open, onClose }) {
  const { t, language, setLanguage } = useLanguage();
  const { setTruck } = useTruck();
  const [step, setStep] = useState(0);
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const finish = useCallback(() => {
    if (selectedMake) {
      const mfr = truckManufacturers.find(m => m.id === selectedMake);
      const mdl = mfr?.models?.find(m => m.id === selectedModel);
      setTruck({
        make: mfr?.name || selectedMake,
        model: mdl?.name || selectedModel || '',
        year: selectedYear || '',
      });
    }
    localStorage.setItem(ONBOARDING_KEY, '1');
    onClose();
  }, [selectedMake, selectedModel, selectedYear, setTruck, onClose]);

  const models = selectedMake
    ? truckManufacturers.find(m => m.id === selectedMake)?.models || []
    : [];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => String(currentYear - i));

  const steps = [
    // Step 0: Language
    <div key="lang" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Globe className="w-8 h-8 text-brand-orange" />
        <h2 className="text-xl font-bold text-white">{t('onboarding.selectLanguage')}</h2>
      </div>
      <div className="grid gap-3">
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
              language === l.code
                ? 'border-brand-orange bg-brand-orange/10 text-white'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
            }`}
          >
            <span className="text-2xl">{l.flag}</span>
            <span className="font-medium">{l.label}</span>
            {language === l.code && <Check className="w-5 h-5 ml-auto text-brand-orange" />}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Truck
    <div key="truck" className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Truck className="w-8 h-8 text-brand-orange" />
        <h2 className="text-xl font-bold text-white">{t('onboarding.selectTruck')}</h2>
      </div>
      <p className="text-white/60 text-sm">{t('onboarding.truckHint')}</p>
      <div className="space-y-3">
        <select
          value={selectedMake}
          onChange={e => { setSelectedMake(e.target.value); setSelectedModel(''); }}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-orange focus:outline-none"
        >
          <option value="">{t('onboarding.chooseMake')}</option>
          {truckManufacturers.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {selectedMake && (
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-orange focus:outline-none"
          >
            <option value="">{t('onboarding.chooseModel')}</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
        {selectedMake && (
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-orange focus:outline-none"
          >
            <option value="">{t('onboarding.chooseYear')}</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>
    </div>,

    // Step 2: Feature tour
    <div key="features" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="w-8 h-8 text-brand-orange" />
        <h2 className="text-xl font-bold text-white">{t('onboarding.features')}</h2>
      </div>
      <div className="grid gap-3">
        {FEATURES.map(f => (
          <div key={f.key} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <span className="text-2xl mt-0.5">{f.icon}</span>
            <div>
              <p className="font-medium text-white">{t(`onboarding.feature_${f.key}`)}</p>
              <p className="text-sm text-white/50">{t(`onboarding.feature_${f.key}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/20 text-center">
        <Badge className="bg-brand-orange text-white mb-1">Premium $1/mo</Badge>
        <p className="text-sm text-white/70">{t('onboarding.promoHint')}</p>
      </div>
    </div>,
  ];

  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md bg-[#1a1f2e] border-white/10 p-0 [&>button]:hidden"
        onPointerDownOutside={e => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-brand-orange' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <div className="px-6 py-4 min-h-[320px]">
          {steps[step]}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-5">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="text-white/60">
              <ChevronLeft className="w-4 h-4 mr-1" /> {t('onboarding.back')}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={finish} className="text-white/40">
              {t('onboarding.skip')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={isLast ? finish : () => setStep(s => s + 1)}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white"
          >
            {isLast ? t('onboarding.start') : t('onboarding.next')}
            {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
