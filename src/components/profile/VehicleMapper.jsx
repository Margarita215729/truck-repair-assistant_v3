import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Check,
  Link2,
  Loader2,
  Radio,
  RefreshCw,
  Truck,
  Unlink,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getProviderVehicles, mapVehicle } from '@/services/telematics/telematicsService';

const PROVIDER_LABELS = {
  motive: { name: 'Motive (KeepTruckin)', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  samsara: { name: 'Samsara', color: 'text-green-400', bg: 'bg-green-500/20' },
  geotab: { name: 'Geotab', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  verizonconnect: { name: 'Verizon Connect', color: 'text-red-400', bg: 'bg-red-500/20' },
  omnitracs: { name: 'Omnitracs', color: 'text-purple-400', bg: 'bg-purple-500/20' },
};

export default function VehicleMapper({ onMappingComplete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [selections, setSelections] = useState({});

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProviderVehicles();
      setData(result);

      // Pre-fill selections with current mappings
      const initial = {};
      for (const prov of result.providers || []) {
        if (prov.currentMappedVehicleId) {
          const key = `${prov.connectionId}`;
          initial[key] = {
            providerVehicleId: prov.currentMappedVehicleId,
            vehicleProfileId: null, // Will be resolved from existing connections
          };
        }
      }
      setSelections(prev => ({ ...initial, ...prev }));
    } catch (err) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleSelectProviderVehicle = (connectionId, providerVehicleId) => {
    setSelections(prev => ({
      ...prev,
      [connectionId]: { ...prev[connectionId], providerVehicleId },
    }));
  };

  const handleSelectTruckProfile = (connectionId, vehicleProfileId) => {
    setSelections(prev => ({
      ...prev,
      [connectionId]: { ...prev[connectionId], vehicleProfileId },
    }));
  };

  const handleSaveMapping = async (connectionId) => {
    const sel = selections[connectionId];
    if (!sel?.providerVehicleId) {
      toast.error('Select a provider vehicle first');
      return;
    }

    setSaving(prev => ({ ...prev, [connectionId]: true }));
    try {
      await mapVehicle(connectionId, sel.providerVehicleId, sel.vehicleProfileId || null);
      toast.success('Vehicle mapped successfully');
      onMappingComplete?.();
      await fetchVehicles();
    } catch (err) {
      toast.error(err.message || 'Failed to save mapping');
    } finally {
      setSaving(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10 p-4 space-y-3">
        <Skeleton className="h-5 w-40 bg-white/10" />
        <Skeleton className="h-20 w-full bg-white/10" />
        <Skeleton className="h-20 w-full bg-white/10" />
      </Card>
    );
  }

  if (!data?.providers?.length) {
    return (
      <Card className="bg-white/5 border-white/10 p-6 text-center">
        <Unlink className="w-8 h-8 mx-auto mb-2 text-white/20" />
        <p className="text-sm text-white/50">No telematics providers connected</p>
        <p className="text-xs text-white/30 mt-1">Connect Motive or Samsara in your Profile to map vehicles</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Link2 className="w-4 h-4 text-white/50" />
          Vehicle Mapping
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchVehicles}
          disabled={loading}
          className="h-7 px-2 text-white/40 hover:text-white/70"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {data.providers.map((prov) => {
        const label = PROVIDER_LABELS[prov.provider] || { name: prov.provider, color: 'text-white/60', bg: 'bg-white/10' };
        const sel = selections[prov.connectionId] || {};
        const isSaving = saving[prov.connectionId];
        const isCurrentMapping = sel.providerVehicleId === prov.currentMappedVehicleId;

        return (
          <Card key={prov.connectionId} className="bg-white/5 border-white/10 overflow-hidden">
            {/* Provider header */}
            <div className="flex items-center justify-between p-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${label.color}`} />
                <span className="text-sm font-medium text-white">{label.name}</span>
              </div>
              <Badge
                className={`text-[10px] ${prov.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}
              >
                {prov.status}
              </Badge>
            </div>

            {prov.status !== 'active' ? (
              <div className="p-4 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                <p className="text-xs text-white/50">
                  {prov.status === 'needs_reauth'
                    ? 'Re-authorization needed. Reconnect in Profile.'
                    : `Status: ${prov.status}`}
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {prov.vehicles.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-2">No vehicles found in this account</p>
                ) : (
                  <>
                    {/* Provider vehicle selector */}
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block">Provider Vehicle</label>
                      <Select
                        value={sel.providerVehicleId || ''}
                        onValueChange={(val) => handleSelectProviderVehicle(prov.connectionId, val)}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                          <SelectValue placeholder="Select a vehicle from provider..." />
                        </SelectTrigger>
                        <SelectContent>
                          {prov.vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              <div className="flex flex-col">
                                <span>{v.name || v.id}</span>
                                {v.vin && <span className="text-xs text-white/40">VIN: {v.vin}</span>}
                                {(v.year || v.make || v.model) && (
                                  <span className="text-xs text-white/40">
                                    {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="w-4 h-4 text-white/20" />
                    </div>

                    {/* Truck profile selector */}
                    <div>
                      <label className="text-xs text-white/50 mb-1.5 block">Map to Truck Profile</label>
                      <Select
                        value={sel.vehicleProfileId || '_none'}
                        onValueChange={(val) => handleSelectTruckProfile(prov.connectionId, val === '_none' ? null : val)}
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm">
                          <SelectValue placeholder="Select a truck from your garage..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">
                            <span className="text-white/40">— No mapping (provider vehicle only) —</span>
                          </SelectItem>
                          {(data.truckProfiles || []).map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex flex-col">
                                <span>{t.name || t.id}</span>
                                {t.vin && <span className="text-xs text-white/40">VIN: {t.vin}</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Save button */}
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleSaveMapping(prov.connectionId)}
                        disabled={!sel.providerVehicleId || isSaving}
                        className="bg-brand-orange hover:bg-brand-orange-light text-white text-xs"
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        Save Mapping
                      </Button>
                    </div>

                    {/* Current mapping indicator */}
                    {prov.currentMappedVehicleId && (
                      <div className="flex items-center gap-1.5 text-[10px] text-white/30 border-t border-white/5 pt-2">
                        <Check className="w-3 h-3 text-green-500/50" />
                        Currently mapped to: {prov.currentMappedVehicleId}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
