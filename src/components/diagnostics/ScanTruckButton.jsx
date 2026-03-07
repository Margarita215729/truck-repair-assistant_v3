import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, CheckCircle2, AlertTriangle, Radio, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getTruckStateSnapshot, connectProvider } from '@/services/telematics/telematicsService';

/**
 * ScanTruckButton
 *
 * A prominent button that:
 * 1. Checks if a telematics provider (Motive / Samsara) is connected
 * 2. If not → shows a provider-picker overlay to initiate OAuth (one-time)
 * 3. If connected → fetches live truck state and sends it to the chat
 *
 * Props:
 *   vehicleProfileId – truck profile ID from TruckContext
 *   onScanComplete({ snapshot, interpretation }) – callback to inject data into chat
 *   disabled – external disable flag (e.g. no truck selected)
 *   className – optional wrapper class
 */
export default function ScanTruckButton({ vehicleProfileId, onScanComplete, disabled, className }) {
  const [scanning, setScanning] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const handleScan = useCallback(async () => {
    if (!vehicleProfileId) {
      toast.info('Select a truck first');
      return;
    }

    setScanning(true);
    try {
      const result = await getTruckStateSnapshot(vehicleProfileId);

      if (!result) {
        // Not authenticated at all
        toast.error('Please log in to scan your truck');
        return;
      }

      if (!result.meta?.connected && result.meta?.connected === false) {
        // No telematics provider linked → show provider picker
        setShowProviderPicker(true);
        return;
      }

      if (!result.snapshot) {
        // Connected but no data yet (vehicle not mapped or no signals)
        toast.info('Telematics connected but no data yet. Make sure your vehicle is mapped in Profile.');
        return;
      }

      // Success – relay data to parent
      onScanComplete?.({
        snapshot: result.snapshot,
        interpretation: result.interpretation,
      });

      const faultCount = result.snapshot.stats?.total_active_faults || 0;
      const status = result.snapshot.summary_status;
      if (status === 'green') {
        toast.success('Truck scanned — all systems OK');
      } else if (status === 'amber') {
        toast.warning(`Truck scanned — ${faultCount} warning(s) found`);
      } else {
        toast.error(`Truck scanned — ${faultCount} critical fault(s) detected`);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      toast.error('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setScanning(false);
    }
  }, [vehicleProfileId, onScanComplete]);

  const handleConnect = (provider) => {
    setShowProviderPicker(false);
    // connectProvider redirects the browser to OAuth — tokens are stored server-side,
    // so the user only needs to authorize once.
    connectProvider(provider);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={disabled ? undefined : handleScan}
        disabled={disabled || scanning}
        className={`relative flex flex-col items-center gap-2 p-3 sm:p-5 rounded-2xl border transition-all duration-200
          ${disabled
            ? 'border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent opacity-40 cursor-not-allowed'
            : scanning
              ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-500/15 to-cyan-400/5 cursor-wait'
              : 'border-cyan-500/20 hover:border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-cyan-400/5 cursor-pointer'
          } ${className || ''}`}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5">
          {scanning ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          ) : (
            <Radio className="w-5 h-5 text-cyan-400" />
          )}
        </div>
        <span className={`text-sm font-semibold ${disabled ? 'text-white/30' : 'text-white/90'}`}>
          {scanning ? 'Scanning...' : 'SCAN TRUCK'}
        </span>
        <span className={`text-[11px] leading-tight text-center ${disabled ? 'text-white/15' : 'text-white/40'}`}>
          {scanning ? 'Reading ECU data' : 'Live data from truck computer'}
        </span>

        {/* Pulsing ring animation while scanning */}
        {scanning && (
          <div className="absolute inset-0 rounded-2xl">
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/30 animate-ping" />
          </div>
        )}
      </motion.button>

      {/* Provider picker overlay */}
      <AnimatePresence>
        {showProviderPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowProviderPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 rounded-2xl bg-[#141a1e] border border-white/10 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Connect Telematics</h3>
                </div>
                <button
                  onClick={() => setShowProviderPicker(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-white/50">
                Connect your ELD / telematics provider to read live data from the truck computer.
                You only need to authorize once.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleConnect('motive')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-white/5 hover:bg-cyan-500/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Motive (KeepTruckin)</div>
                    <div className="text-xs text-white/40">ELD, GPS, fault codes, engine data</div>
                  </div>
                </button>

                <button
                  onClick={() => handleConnect('samsara')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-green-500/40 bg-white/5 hover:bg-green-500/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Samsara</div>
                    <div className="text-xs text-white/40">ELD, GPS, fault codes, engine data</div>
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-white/30 text-center">
                Your credentials are encrypted and stored securely. You won't need to log in again.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
