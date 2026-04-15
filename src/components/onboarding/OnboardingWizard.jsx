import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/LanguageContext';
import { useTruck } from '@/lib/TruckContext';
import { truckData } from '@/data/truckData';
import { Wrench, Search, MapPin, FileText, Crown } from 'lucide-react';

const STEPS = ['language', 'truck', 'features'];

export function useOnboarding() {
  const done = typeof window !== 'undefined' && localStorage.getItem('truck_repair_onboarding_done') === '1';
  return {
    showOnboarding: !done,
    markDone: () => {
      try { localStorage.setItem('truck_repair_onboarding_done', '1'); } catch {}
    },
  };
}

export default function OnboardingWizard({ open, onClose }) {
  const { t, language, setLanguage } = useLanguage();
  const { setTruck } = useTruck();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState(language);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const languages = [
    { code: 'en', label: 'English', flag: '\ud83c\uddfa\ud83c\uddf8' },
    { code: 'es', label: 'Español', flag: '\ud83c\uddf2\ud83c\uddfd' },
    { code: 'ru', label: 'Русский', flag: '\ud83c\uddf7\ud83c\uddfa' },
  ];

  const features = [
    { icon: Wrench, key: 'diagnostics', color: 'text-brand-orange' },
    { icon: Search, key: 'parts', color: 'text-blue-400' },
    { icon: MapPin, key: 'services', color: 'text-green-400' },
    { icon: FileText, key: 'reports', color: 'text-purple-400' },
  ];

  const makes = Object.keys(truckData || {});
  const models = make ? Object.keys(truckData[make] || {}) : [];
  const years = make && model ? (truckData[make]?.[model] || []) : [];

  const handleNext = useCallback(() => {
    if (step === 0) {
      setLanguage(selectedLang);
    }
    if (step === 1 && make && model && year) {
      setTruck({ make, model, year });
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onClose();
    }
  }, [step, selectedLang, make, model, year, setLanguage, setTruck, onClose]);

  const handleBack = () => setStep(s => Math.max(0, s - 1));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#111718] border-brand-dark/30 text-white max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand-orange' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* Step 1: Language */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">{t('onboarding.selectLanguage')}</h2>
            <div className="grid grid-cols-3 gap-3">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`p-4 rounded-lg text-center transition-all ${
                    selectedLang === lang.code
                      ? 'bg-brand-orange/20 border-2 border-brand-orange'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">{lang.flag}</div>
                  <div className="text-sm">{lang.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Truck */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">{t('onboarding.selectTruck')}</h2>
            <p className="text-white/50 text-sm text-center">{t('onboarding.truckHint')}</p>
            <select
              value={make}
              onChange={e => { setMake(e.target.value); setModel(''); setYear(''); }}
              className="w-full p-3 rounded-lg bg-[#0b1012] border border-brand-dark/30 text-white"
            >
              <option value="">{t('onboarding.chooseMake')}</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={model}
              onChange={e => { setModel(e.target.value); setYear(''); }}
              disabled={!make}
              className="w-full p-3 rounded-lg bg-[#0b1012] border border-brand-dark/30 text-white disabled:opacity-50"
            >
              <option value="">{t('onboarding.chooseModel')}</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              disabled={!model}
              className="w-full p-3 rounded-lg bg-[#0b1012] border border-brand-dark/30 text-white disabled:opacity-50"
            >
              <option value="">{t('onboarding.chooseYear')}</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* Step 3: Features */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center">{t('onboarding.features')}</h2>
            <div className="space-y-3">
              {features.map(f => (
                <div key={f.key} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <f.icon className={`w-5 h-5 mt-0.5 ${f.color}`} />
                  <div>
                    <p className="font-medium text-sm">{t(`onboarding.feature_${f.key}`)}</p>
                    <p className="text-xs text-white/50">{t(`onboarding.feature_${f.key}_desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-brand-orange/10 border border-brand-orange/20 rounded-lg text-center">
              <Badge className="bg-brand-orange/20 text-brand-orange border-0 mb-2">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
              <p className="text-sm text-white/70">{t('onboarding.promoHint')}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {step > 0 ? (
            <Button variant="ghost" onClick={handleBack} className="text-white/50 hover:text-white">
              {t('onboarding.back')}
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose} className="text-white/50 hover:text-white">
              {t('onboarding.skip')}
            </Button>
          )}
          <Button onClick={handleNext} className="brand-btn text-white border-0">
            {step === STEPS.length - 1 ? t('onboarding.start') : t('onboarding.next')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
