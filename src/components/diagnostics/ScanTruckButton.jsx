import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, Radio, X, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getTruckStateSnapshot, connectProvider } from '@/services/telematics/telematicsService';
import CredentialConnectDialog from './CredentialConnectDialog';

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
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [credentialMeta, setCredentialMeta] = useState(null);
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);

  const handleScan = useCallback(async () => {
    if (isGuest) {
      onGuestBlocked?.();
      return;
    }

    setScanning(true);
    try {
      const result = await getTruckStateSnapshot(vehicleProfileId || '_auto');

      if (!result.ok) {
        if (result.code === 'unauthenticated') {
          onGuestBlocked?.();
          return;
        }
        if (result.code === 'network') {
          toast.message('Unable to reach the scan service. Check your connection and try again.');
          return;
        }
        toast.message(result.message || 'Scan is temporarily unavailable. Please try again later.');
        return;
      }

      if (result.meta?.connected === false) {
        setShowProviderPicker(true);
        return;
      }

      if (!result.snapshot) {
        toast.message(
          'Telematics connected. Waiting for truck data — map your vehicle in Profile if you have not already.'
        );
        return;
      }

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
        toast.warning(`Truck scanned — ${faultCount} critical fault(s) detected`);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      toast.message('Scan is temporarily unavailable. Please try again later.');
    } finally {
      setScanning(false);
    }
  }, [vehicleProfileId, onScanComplete, isGuest, onGuestBlocked]);

  const handleConnect = async (provider) => {
    setShowProviderPicker(false);
    try {
      const result = await connectProvider(provider);
      if (result?.authType === 'credentials') {
        setCredentialMeta(result);
        setShowCredentialDialog(true);
      }
    } catch (err) {
      console.error('Connect failed:', err);
      toast.message('Could not start provider connection. Please try again from Profile → Telematics.');
    }
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

        {scanning && (
          <div className="absolute inset-0 rounded-2xl">
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/30 animate-ping" />
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {showProviderPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowProviderPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#141a1e] border border-white/10 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">Connect Telematics</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProviderPicker(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-white/60">
                Connect a telematics provider to enable truck computer scan.
              </p>

              <div className="space-y-3">
                {[
                  { id: 'motive', name: 'Motive (KeepTruckin)', icon: Wifi, gradient: 'from-blue-600 to-blue-800', credential: false },
                  { id: 'samsara', name: 'Samsara', icon: Wifi, gradient: 'from-green-600 to-green-800', credential: false },
                  { id: 'geotab', name: 'Geotab', icon: KeyRound, gradient: 'from-orange-500 to-orange-700', credential: true },
                  { id: 'verizonconnect', name: 'Verizon Connect', icon: KeyRound, gradient: 'from-red-600 to-red-800', credential: true },
                  { id: 'omnitracs', name: 'Omnitracs', icon: KeyRound, gradient: 'from-purple-600 to-purple-800', credential: true },
                ].map((prov) => {
                  const Icon = prov.icon;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handleConnect(prov.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-cyan-500/40 bg-white/5 hover:bg-cyan-500/10 transition-all text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${prov.gradient} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{prov.name}</div>
                        <div className="text-xs text-white/40">ELD, GPS, fault codes, engine data</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowProviderPicker(false);
                  navigate('/Profile');
                }}
                className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300"
              >
                Manage connections in Profile
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CredentialConnectDialog
        open={showCredentialDialog}
        onOpenChange={setShowCredentialDialog}
        providerMeta={credentialMeta}
        onSuccess={() => {
          toast.success('Provider connected! Try scanning again.');
        }}
      />
    </>
  );
}
