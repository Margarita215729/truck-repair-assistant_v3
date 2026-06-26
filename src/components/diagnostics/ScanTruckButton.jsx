import React from 'react';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ScanTruckButton — live telematics scan with graceful setup flows for App Review.
 */
export default function ScanTruckButton({
  vehicleProfileId,
  onScanComplete,
  disabled,
  className,
  isGuest,
  onGuestBlocked,
}) {
  const { t } = useLanguage();
  const forcedDisabled = true;

  return (
    <motion.button
      whileHover={{ scale: 1 }}
      whileTap={{ scale: 1 }}
      disabled={forcedDisabled || disabled}
      className={`relative flex flex-col items-center gap-2 p-3 sm:p-5 rounded-2xl border transition-all duration-200 border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent opacity-40 cursor-not-allowed ${className || ''}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5">
        <Radio className="w-5 h-5 text-white/40" />
      </div>
      <span className="text-sm font-semibold text-white/50">SCAN TRUCK</span>
      <span className="text-[11px] leading-tight text-center text-white/30">
        {t('diagnostics.scanAvailableSoon') || 'Available soon'}
      </span>
    </motion.button>
  );
}
