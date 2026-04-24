import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/LanguageContext';
import { useTruck } from '@/lib/TruckContext';
import { truckManufacturers } from '@/data/truckData';
import { Globe, Truck, Sparkles, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const ONBOARDING_KEY = 'truck_repair_onboarding_done';

const ONBOARDING_COPY = {
  selectLanguage: 'Choose your language',
  selectTruck: 'Select your truck',
  truckHint: 'You can change this later in settings',
  chooseMake: 'Select manufacturer...',
  chooseModel: 'Select model...',
  chooseYear: 'Select year...',
  features: 'What you can do',
  feature_diagnostics: 'AI Diagnostics',
  feature_diagnostics_desc: 'Describe symptoms or enter fault codes to get repair guidance.',
  feature_parts: 'Parts Search',
  feature_parts_desc: 'Find compatible parts and compare pricing quickly.',
  feature_services: 'Service Finder',
  feature_services_desc: 'Locate nearby repair shops and mobile mechanics.',
  feature_reports: 'Diagnostic Reports',
  feature_reports_desc: 'Save and export structured reports when you need them.',
  promoHint: 'Unlock unlimited diagnostics and premium tools for just $1/month.',
  back: 'Back',
  skip: 'Skip',
  start: 'Get Started',
  next: 'Next',
  stepLabel: 'Step {current} of {total}',
  languageIntro: 'Start in the language that feels most natural for roadside use.',
  truckIntro: 'Your truck profile helps the app tailor diagnostics and parts matching.',
  featuresIntro: 'Here is what the assistant can help you do from your phone.',
};

export function useOnboarding() {
  const done = typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY) === '1';
  const markDone = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {}
  };
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

  const models = selectedMake
    ? truckManufacturers.find(manufacturer => manufacturer.id === selectedMake)?.models || []
    : [];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, index) => String(currentYear - index));
  const canAdvanceFromTruck = Boolean(selectedMake);
  const isLast = step === 2;

  const translateOnboarding = useCallback((key, params) => {
    const translated = t(`onboarding.${key}`, params);
    if (translated === `onboarding.${key}`) {
      const fallback = ONBOARDING_COPY[key];
      if (typeof fallback === 'string' && params) {
        return Object.entries(params).reduce(
          (value, [param, replacement]) => value.replace(new RegExp(`\\{${param}\\}`, 'g'), String(replacement ?? '')),
          fallback
        );
      }
      return fallback ?? key;
    }
    return translated;
  }, [t]);

  const progressLabel = translateOnboarding('stepLabel', { current: step + 1, total: 3 });

  const finish = useCallback(() => {
    if (selectedMake) {
      const manufacturer = truckManufacturers.find(item => item.id === selectedMake);
      const model = manufacturer?.models?.find(item => item.id === selectedModel);
      setTruck({
        make: manufacturer?.name || selectedMake,
        model: model?.name || selectedModel || '',
        year: selectedYear || '',
      });
    }
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {}
    onClose();
  }, [selectedMake, selectedModel, selectedYear, setTruck, onClose]);

  const goNext = () => {
    if (step === 1 && !canAdvanceFromTruck) return;
    if (isLast) {
      finish();
      return;
    }
    setStep(currentStep => currentStep + 1);
  };

  const steps = [
    <div key="lang" className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">
          <Globe className="h-6 w-6" />
        </div>
        <h2 className="text-[1.35rem] font-bold leading-tight text-white">{translateOnboarding('selectLanguage')}</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">{translateOnboarding('languageIntro')}</p>
      </div>
      <div className="grid gap-3">
        {LANGUAGES.map(item => (
          <button
            key={item.code}
            onClick={() => setLanguage(item.code)}
            className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all ${
              language === item.code
                ? 'border-brand-orange bg-brand-orange/12 text-white shadow-[0_12px_32px_rgba(249,115,22,0.14)]'
                : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:bg-white/[0.07]'
            }`}
          >
            <span className="text-2xl">{item.flag}</span>
            <div>
              <div className="font-semibold">{item.label}</div>
              <div className="text-xs text-white/50">{item.code.toUpperCase()}</div>
            </div>
            {language === item.code && <Check className="ml-auto h-5 w-5 text-brand-orange" />}
          </button>
        ))}
      </div>
    </div>,

    <div key="truck" className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">
          <Truck className="h-6 w-6" />
        </div>
        <h2 className="text-[1.35rem] font-bold leading-tight text-white">{translateOnboarding('selectTruck')}</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">{translateOnboarding('truckIntro')}</p>
      </div>
      <div className="rounded-2xl border border-brand-orange/15 bg-brand-orange/10 px-4 py-3 text-sm text-white/75">
        {translateOnboarding('truckHint')}
      </div>
      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/10 p-4">
        <select
          value={selectedMake}
          onChange={event => {
            setSelectedMake(event.target.value);
            setSelectedModel('');
            setSelectedYear('');
          }}
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:border-brand-orange focus:outline-none"
        >
          <option value="">{translateOnboarding('chooseMake')}</option>
          {truckManufacturers.map(manufacturer => (
            <option key={manufacturer.id} value={manufacturer.id}>{manufacturer.name}</option>
          ))}
        </select>
        {selectedMake && (
          <select
            value={selectedModel}
            onChange={event => {
              setSelectedModel(event.target.value);
              setSelectedYear('');
            }}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:border-brand-orange focus:outline-none"
          >
            <option value="">{translateOnboarding('chooseModel')}</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        )}
        {selectedMake && (
          <select
            value={selectedYear}
            onChange={event => setSelectedYear(event.target.value)}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:border-brand-orange focus:outline-none"
          >
            <option value="">{translateOnboarding('chooseYear')}</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
      </div>
    </div>,

    <div key="features" className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-[1.35rem] font-bold leading-tight text-white">{translateOnboarding('features')}</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">{translateOnboarding('featuresIntro')}</p>
      </div>
      <div className="grid gap-3">
        {FEATURES.map(feature => (
          <div key={feature.key} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <span className="mt-0.5 text-2xl">{feature.icon}</span>
            <div>
              <p className="font-medium text-white">{translateOnboarding(`feature_${feature.key}`)}</p>
              <p className="text-sm leading-6 text-white/55">{translateOnboarding(`feature_${feature.key}_desc`)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-brand-orange/25 bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(249,115,22,0.06))] p-4 text-center">
        <Badge className="mb-2 bg-brand-orange px-3 py-1 text-white">Premium $1/mo</Badge>
        <p className="text-sm leading-6 text-white/80">{translateOnboarding('promoHint')}</p>
      </div>
    </div>,
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="flex h-[100dvh] w-[100vw] max-w-none flex-col overflow-hidden border-0 bg-[#111827] p-0 text-white sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-[28px] sm:border sm:border-white/10 sm:bg-[#1a1f2e] [&>button]:hidden"
        onPointerDownOutside={event => event.preventDefault()}
      >
        <div className="bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_48%)] px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/40">
            <span>Truck Repair Assistant</span>
            <span>{progressLabel}</span>
          </div>
          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index <= step ? 'bg-brand-orange' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-28 sm:px-6 sm:pb-6">
          {steps[step]}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-[#0f172acc] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:static sm:bg-transparent sm:px-6 sm:pb-5 sm:pt-0 sm:backdrop-blur-0">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(currentStep => currentStep - 1)} className="h-11 rounded-xl px-4 text-white/70">
              <ChevronLeft className="mr-1 h-4 w-4" /> {translateOnboarding('back')}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={finish} className="h-11 rounded-xl px-4 text-white/50">
              {translateOnboarding('skip')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={goNext}
            disabled={step === 1 && !canAdvanceFromTruck}
            className="h-11 min-w-32 rounded-xl bg-brand-orange px-5 text-white hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:bg-brand-orange/40"
          >
            {isLast ? translateOnboarding('start') : translateOnboarding('next')}
            {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}