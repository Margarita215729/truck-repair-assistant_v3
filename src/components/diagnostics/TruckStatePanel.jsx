import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Cpu,
  Droplets,
  Fuel,
  Gauge,
  MapPin,
  RefreshCw,
  Thermometer,
  Truck,
  Wifi,
  WifiOff,
  Wind,
  Wrench,
  XCircle,
  Zap,
  ShieldAlert,
  RotateCw,
  Disc,
  CircleDot,
  Cog,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTruckStateSnapshot, getStatusBadge } from '@/services/telematics/telematicsService';

const STATUS_COLORS = {
  green: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-500' },
  amber: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  red: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' },
  gray: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', dot: 'bg-white/30' },
  unknown: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', dot: 'bg-white/30' },
};

function SignalGauge({ label, value, unit, icon: Icon, min = 0, max = 100, warningThreshold, criticalThreshold, invert = false }) {
  if (value == null) return null;
  const numVal = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numVal)) return null;

  const pct = Math.min(100, Math.max(0, ((numVal - min) / (max - min)) * 100));
  let color = 'bg-green-500';
  if (criticalThreshold != null) {
    const isCritical = invert ? numVal < criticalThreshold : numVal > criticalThreshold;
    if (isCritical) color = 'bg-red-500';
    else if (warningThreshold != null) {
      const isWarning = invert ? numVal < warningThreshold : numVal > warningThreshold;
      if (isWarning) color = 'bg-yellow-500';
    }
  }

  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-white/60 text-xs">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          <span>{label}</span>
        </div>
        <span className="text-sm font-mono text-white">
          {typeof numVal === 'number' ? numVal.toFixed(numVal % 1 ? 1 : 0) : value}
          {unit && <span className="text-white/40 text-xs ml-0.5">{unit}</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FaultCard({ fault, interpretation }) {
  const [expanded, setExpanded] = useState(false);
  const code = fault.dtc || fault.oem_code || `SPN ${fault.spn} / FMI ${fault.fmi}`;
  const severityColor = fault.severity === 'critical' ? 'red' : fault.severity === 'warning' ? 'yellow' : 'blue';

  const aiAnalysis = interpretation?.fault_analysis?.find(
    fa => fa.code === code || fa.code === fault.dtc || fa.code === fault.oem_code
  );

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 bg-${severityColor}-500`} />
          <div className="min-w-0">
            <p className="text-sm font-mono text-white truncate">{code}</p>
            <p className="text-xs text-white/40">{fault.code_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-${severityColor}-400 bg-${severityColor}-500/20 border-${severityColor}-500/30 text-[10px]`}>
            {fault.severity}
          </Badge>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-white/40">First seen:</span> <span className="text-white/70">{new Date(fault.first_seen_at).toLocaleString()}</span></div>
                <div><span className="text-white/40">Last seen:</span> <span className="text-white/70">{new Date(fault.last_seen_at).toLocaleString()}</span></div>
              </div>
              {aiAnalysis && (
                <div className="space-y-1.5 mt-2">
                  <p className="text-xs text-white/40">System Analysis:</p>
                  {aiAnalysis.system && <p className="text-xs text-white/60">System: <span className="text-white/80">{aiAnalysis.system}</span></p>}
                  {aiAnalysis.description && <p className="text-xs text-white/80">{aiAnalysis.description}</p>}
                  {aiAnalysis.probable_cause && (
                    <p className="text-xs text-orange-400/80">Probable cause: {aiAnalysis.probable_cause}</p>
                  )}
                  {aiAnalysis.recommended_action && (
                    <p className="text-xs text-blue-400/80">Action: {aiAnalysis.recommended_action}</p>
                  )}
                  {aiAnalysis.urgency && (
                    <Badge className="mt-1 text-[10px]" variant="outline">
                      {aiAnalysis.urgency.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimelineEvent({ event }) {
  const iconMap = {
    fault: <AlertTriangle className="w-3 h-3 text-yellow-400" />,
    operational: <Activity className="w-3 h-3 text-blue-400" />,
    defect: <Wrench className="w-3 h-3 text-orange-400" />,
  };

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="mt-0.5">{iconMap[event.type] || <Clock className="w-3 h-3 text-white/30" />}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/70 truncate">
          {event.type === 'fault' && `${event.severity?.toUpperCase()} — ${event.code}`}
          {event.type === 'operational' && event.subtype?.replace(/_/g, ' ')}
          {event.type === 'defect' && `${event.subtype} (${event.severity})`}
        </p>
        <p className="text-[10px] text-white/30">{new Date(event.at).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function TruckStatePanel({ vehicleProfileId, className = '' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchSnapshot = useCallback(async () => {
    if (!vehicleProfileId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getTruckStateSnapshot(vehicleProfileId);
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vehicleProfileId]);

  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  const snapshot = data?.snapshot;
  const interpretation = data?.interpretation;
  const meta = data?.meta;

  if (!meta?.connected && !loading) {
    return null; // No telematics connected — don't show panel
  }

  const statusColors = STATUS_COLORS[snapshot?.summary_status] || STATUS_COLORS.gray;
  const badge = snapshot ? getStatusBadge(snapshot) : { text: 'Loading...', color: 'gray' };
  const signals = snapshot?.current_signals || {};
  const activeFaults = snapshot?.active_faults || [];
  const recurringFaults = snapshot?.recurring_faults || [];
  const openDefects = snapshot?.open_defects || [];
  const timeline = snapshot?.timeline || [];
  const stats = snapshot?.stats || {};

  const safeAssessment = interpretation?.overall_assessment;

  return (
    <Card className={`bg-white/5 border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${statusColors.bg} ${statusColors.border} border flex items-center justify-center`}>
            <Cpu className={`w-4 h-4 ${statusColors.text}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Truck Computer State
              {loading && <RefreshCw className="w-3 h-3 animate-spin text-white/30" />}
            </h3>
            <p className="text-xs text-white/40">
              {meta?.provider ? `via ${meta.provider}` : 'Live telematics'}
              {lastRefresh && ` • ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {safeAssessment?.safe_to_drive === false && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs animate-pulse">
              <ShieldAlert className="w-3 h-3 mr-1" />
              NOT SAFE
            </Badge>
          )}
          <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} text-xs`}>
            {badge.text}
          </Badge>
          {collapsed ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronUp className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* AI Assessment Banner */}
              {safeAssessment && (
                <div className={`rounded-lg p-3 ${safeAssessment.safe_to_drive ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <div className="flex items-start gap-2">
                    {safeAssessment.safe_to_drive
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <p className={`text-sm font-medium ${safeAssessment.safe_to_drive ? 'text-green-400' : 'text-red-400'}`}>
                        {safeAssessment.summary}
                      </p>
                      {safeAssessment.immediate_actions?.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {safeAssessment.immediate_actions.map((a, i) => (
                            <li key={i} className="text-xs text-white/60 flex items-center gap-1.5">
                              <span className="text-orange-400">→</span> {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <Tabs defaultValue="signals" className="w-full">
                <TabsList className="w-full bg-white/5 border border-white/10">
                  <TabsTrigger value="signals" className="flex-1 text-xs">
                    <Gauge className="w-3.5 h-3.5 mr-1" />
                    Signals
                    <Badge className="ml-1.5 text-[9px] bg-white/10" variant="secondary">{stats.signal_count || 0}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="faults" className="flex-1 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Faults
                    {stats.total_active_faults > 0 && (
                      <Badge className="ml-1.5 text-[9px] bg-red-500/20 text-red-400">{stats.total_active_faults}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="flex-1 text-xs">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Timeline
                  </TabsTrigger>
                </TabsList>

                {/* Signals Tab */}
                <TabsContent value="signals" className="mt-3 space-y-3">
                  {/* Engine Section */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/40 flex items-center gap-1"><Cog className="w-3 h-3" /> Engine</p>
                    <div className="grid grid-cols-2 gap-2">
                      <SignalGauge label="RPM" value={signals.engine_rpm?.value} unit="rpm" icon={Gauge} min={0} max={3000} warningThreshold={2200} criticalThreshold={2800} />
                      <SignalGauge label="Load" value={signals.engine_load_pct?.value} unit="%" icon={Activity} min={0} max={100} warningThreshold={85} criticalThreshold={95} />
                      <SignalGauge label="Coolant Temp" value={signals.engine_coolant_temp_c?.value} unit="°C" icon={Thermometer} min={0} max={130} warningThreshold={100} criticalThreshold={110} />
                      <SignalGauge label="Oil Pressure" value={signals.engine_oil_pressure_kpa?.value} unit="kPa" icon={Droplets} min={0} max={700} warningThreshold={150} criticalThreshold={100} invert />
                      <SignalGauge label="Oil Temp" value={signals.engine_oil_temp_c?.value} unit="°C" icon={Thermometer} min={0} max={150} warningThreshold={120} criticalThreshold={135} />
                      <SignalGauge label="Torque" value={signals.engine_torque_pct?.value} unit="%" icon={Activity} min={0} max={100} />
                      <SignalGauge label="Throttle" value={signals.throttle_position_pct?.value} unit="%" icon={Gauge} min={0} max={100} />
                      <SignalGauge label="Turbo Boost" value={signals.turbo_boost_pressure_kpa?.value} unit="kPa" icon={Wind} min={0} max={300} warningThreshold={250} criticalThreshold={280} />
                      <SignalGauge label="Intake Manifold" value={signals.intake_manifold_pressure_kpa?.value} unit="kPa" icon={Wind} min={0} max={300} />
                      <SignalGauge label="Intake Temp" value={signals.intake_manifold_temp_c?.value} unit="°C" icon={Thermometer} min={-20} max={80} warningThreshold={60} criticalThreshold={70} />
                      <SignalGauge label="Exhaust Temp" value={signals.exhaust_gas_temp_c?.value} unit="°C" icon={Thermometer} min={0} max={800} warningThreshold={650} criticalThreshold={750} />
                      <SignalGauge label="Coolant Level" value={signals.coolant_level_pct?.value} unit="%" icon={Droplets} min={0} max={100} warningThreshold={30} criticalThreshold={15} invert />
                      <SignalGauge label="Ambient Temp" value={signals.ambient_air_temp_c?.value} unit="°C" icon={Thermometer} min={-40} max={60} />
                    </div>
                  </div>

                  {/* Fuel Section */}
                  {(signals.fuel_pct || signals.fuel_rate_lph || signals.fuel_economy_kpl) && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/40 flex items-center gap-1"><Fuel className="w-3 h-3" /> Fuel</p>
                      <div className="grid grid-cols-2 gap-2">
                        <SignalGauge label="Fuel Level" value={signals.fuel_pct?.value} unit="%" icon={Fuel} min={0} max={100} warningThreshold={15} criticalThreshold={5} invert />
                        <SignalGauge label="Fuel Rate" value={signals.fuel_rate_lph?.value} unit="L/h" icon={Droplets} min={0} max={60} />
                        <SignalGauge label="Fuel Economy" value={signals.fuel_economy_kpl?.value} unit="km/L" icon={Gauge} min={0} max={8} />
                        <SignalGauge label="Total Fuel Used" value={signals.fuel_used_liters?.value} unit="L" icon={Fuel} min={0} max={50000} />
                      </div>
                    </div>
                  )}

                  {/* Aftertreatment / DPF / SCR Section */}
                  {(signals.def_level_pct || signals.dpf_soot_load_pct || signals.scr_efficiency_pct || signals.dpf_regen_status) && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/40 flex items-center gap-1"><Wind className="w-3 h-3" /> Aftertreatment</p>
                      <div className="grid grid-cols-2 gap-2">
                        <SignalGauge label="DEF Level" value={signals.def_level_pct?.value} unit="%" icon={Droplets} min={0} max={100} warningThreshold={15} criticalThreshold={5} invert />
                        <SignalGauge label="DPF Soot" value={signals.dpf_soot_load_pct?.value} unit="%" icon={CircleDot} min={0} max={100} warningThreshold={80} criticalThreshold={95} />
                        <SignalGauge label="DPF Ash" value={signals.dpf_ash_load_pct?.value} unit="%" icon={CircleDot} min={0} max={100} warningThreshold={70} criticalThreshold={90} />
                        <SignalGauge label="SCR Efficiency" value={signals.scr_efficiency_pct?.value} unit="%" icon={Activity} min={0} max={100} warningThreshold={85} criticalThreshold={70} invert />
                        <SignalGauge label="SCR Inlet Temp" value={signals.scr_inlet_temp_c?.value} unit="°C" icon={Thermometer} min={0} max={600} />
                        <SignalGauge label="SCR Outlet Temp" value={signals.scr_outlet_temp_c?.value} unit="°C" icon={Thermometer} min={0} max={600} />
                        <SignalGauge label="DPF Outlet Temp" value={signals.dpf_outlet_temp_c?.value} unit="°C" icon={Thermometer} min={0} max={700} />
                        <SignalGauge label="DPF Δ Pressure" value={signals.dpf_differential_pressure_kpa?.value} unit="kPa" icon={Gauge} min={0} max={30} warningThreshold={20} criticalThreshold={25} />
                        <SignalGauge label="EGR Valve" value={signals.egr_valve_position_pct?.value} unit="%" icon={Cog} min={0} max={100} />
                        <SignalGauge label="DEF Rate" value={signals.def_consumption_rate_lph?.value} unit="L/h" icon={Droplets} min={0} max={10} />
                      </div>
                      {signals.dpf_regen_status?.value && (
                        <Badge variant="outline" className="text-xs text-white/60 border-white/10">
                          Regen: {signals.dpf_regen_status.value}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Transmission Section */}
                  {(signals.transmission_gear || signals.transmission_oil_temp_c) && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/40 flex items-center gap-1"><Cog className="w-3 h-3" /> Transmission</p>
                      <div className="grid grid-cols-2 gap-2">
                        <SignalGauge label="Gear" value={signals.transmission_gear?.value} unit="" icon={Cog} min={-1} max={18} />
                        <SignalGauge label="Trans Oil Temp" value={signals.transmission_oil_temp_c?.value} unit="°C" icon={Thermometer} min={0} max={150} warningThreshold={110} criticalThreshold={130} />
                        <SignalGauge label="Trans Oil Press" value={signals.transmission_oil_pressure_kpa?.value} unit="kPa" icon={Droplets} min={0} max={2500} />
                        <SignalGauge label="Output Shaft" value={signals.output_shaft_speed_rpm?.value} unit="rpm" icon={Gauge} min={0} max={3000} />
                      </div>
                    </div>
                  )}

                  {/* Brakes Section */}
                  {(signals.brake_air_pressure_primary_kpa || signals.parking_brake_engaged) && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/40 flex items-center gap-1"><Disc className="w-3 h-3" /> Brakes</p>
                      <div className="grid grid-cols-2 gap-2">
                        <SignalGauge label="Air Primary" value={signals.brake_air_pressure_primary_kpa?.value} unit="kPa" icon={Gauge} min={0} max={900} warningThreshold={550} criticalThreshold={480} invert />
                        <SignalGauge label="Air Secondary" value={signals.brake_air_pressure_secondary_kpa?.value} unit="kPa" icon={Gauge} min={0} max={900} warningThreshold={550} criticalThreshold={480} invert />
                        <SignalGauge label="Pad Wear" value={signals.brake_pad_wear_pct?.value} unit="%" icon={Disc} min={0} max={100} warningThreshold={25} criticalThreshold={10} invert />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {signals.parking_brake_engaged?.value != null && (
                          <Badge variant="outline" className={`text-xs ${signals.parking_brake_engaged.value ? 'text-yellow-400 border-yellow-500/30' : 'text-white/50 border-white/10'}`}>
                            P-Brake: {signals.parking_brake_engaged.value ? 'Engaged' : 'Released'}
                          </Badge>
                        )}
                        {signals.abs_active?.value != null && (
                          <Badge variant="outline" className={`text-xs ${signals.abs_active.value ? 'text-red-400 border-red-500/30' : 'text-white/50 border-white/10'}`}>
                            ABS: {signals.abs_active.value ? 'Active' : 'OK'}
                          </Badge>
                        )}
                        {signals.traction_control_active?.value != null && (
                          <Badge variant="outline" className={`text-xs ${signals.traction_control_active.value ? 'text-yellow-400 border-yellow-500/30' : 'text-white/50 border-white/10'}`}>
                            TC: {signals.traction_control_active.value ? 'Active' : 'OK'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tires Section */}
                  {(signals.tire_pressure_lf_kpa || signals.tire_pressure_rf_kpa) && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/40 flex items-center gap-1"><Circle className="w-3 h-3" /> Tires (TPMS)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <SignalGauge label="LF Pressure" value={signals.tire_pressure_lf_kpa?.value} unit="kPa" icon={Circle} min={0} max={900} warningThreshold={650} criticalThreshold={550} invert />
                        <SignalGauge label="RF Pressure" value={signals.tire_pressure_rf_kpa?.value} unit="kPa" icon={Circle} min={0} max={900} warningThreshold={650} criticalThreshold={550} invert />
                        <SignalGauge label="LR Outer" value={signals.tire_pressure_lro_kpa?.value} unit="kPa" icon={Circle} min={0} max={900} warningThreshold={650} criticalThreshold={550} invert />
                        <SignalGauge label="RR Outer" value={signals.tire_pressure_rro_kpa?.value} unit="kPa" icon={Circle} min={0} max={900} warningThreshold={650} criticalThreshold={550} invert />
                        <SignalGauge label="LR Inner" value={signals.tire_pressure_lri_kpa?.value} unit="kPa" icon={Circle} min={0} max={900} warningThreshold={650} criticalThreshold={550} invert />
                        <SignalGauge label="RR Inner" value={signals.tire_pressure_rri_kpa?.value} unit="kPa" icon={Circle} min={0} max={900} warningThreshold={650} criticalThreshold={550} invert />
                        <SignalGauge label="LF Temp" value={signals.tire_temp_lf_c?.value} unit="°C" icon={Thermometer} min={0} max={120} warningThreshold={90} criticalThreshold={105} />
                        <SignalGauge label="RF Temp" value={signals.tire_temp_rf_c?.value} unit="°C" icon={Thermometer} min={0} max={120} warningThreshold={90} criticalThreshold={105} />
                        <SignalGauge label="LR Outer Temp" value={signals.tire_temp_lro_c?.value} unit="°C" icon={Thermometer} min={0} max={120} warningThreshold={90} criticalThreshold={105} />
                        <SignalGauge label="RR Outer Temp" value={signals.tire_temp_rro_c?.value} unit="°C" icon={Thermometer} min={0} max={120} warningThreshold={90} criticalThreshold={105} />
                      </div>
                    </div>
                  )}

                  {/* Electrical Section */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/40 flex items-center gap-1"><Zap className="w-3 h-3" /> Electrical</p>
                    <div className="grid grid-cols-2 gap-2">
                      <SignalGauge label="Battery" value={signals.battery_voltage?.value} unit="V" icon={Zap} min={10} max={16} warningThreshold={11.5} criticalThreshold={11} invert />
                      <SignalGauge label="Alternator" value={signals.alternator_voltage?.value} unit="V" icon={Zap} min={10} max={16} warningThreshold={12.8} criticalThreshold={12} invert />
                    </div>
                  </div>

                  {/* Speed / Location */}
                  <div className="grid grid-cols-2 gap-2">
                    <SignalGauge label="Speed" value={signals.speed_mph?.value} unit="mph" icon={Gauge} min={0} max={80} />
                  </div>

                  {/* Text/bool signals */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {signals.engine_state?.value && (
                      <Badge variant="outline" className="text-xs text-white/60 border-white/10">
                        Engine: {signals.engine_state.value}
                      </Badge>
                    )}
                    {signals.cruise_control_active?.value != null && (
                      <Badge variant="outline" className={`text-xs ${signals.cruise_control_active.value ? 'text-blue-400 border-blue-500/30' : 'text-white/50 border-white/10'}`}>
                        Cruise: {signals.cruise_control_active.value ? `ON${signals.cruise_control_set_speed_mph?.value ? ` @ ${signals.cruise_control_set_speed_mph.value} mph` : ''}` : 'OFF'}
                      </Badge>
                    )}
                    {signals.gateway_connected?.value != null && (
                      <Badge variant="outline" className={`text-xs ${signals.gateway_connected.value ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>
                        {signals.gateway_connected.value
                          ? <><Wifi className="w-3 h-3 mr-1" /> Gateway Online</>
                          : <><WifiOff className="w-3 h-3 mr-1" /> Gateway Offline</>
                        }
                      </Badge>
                    )}
                  </div>

                  {/* Location */}
                  {(signals.latitude?.value && signals.longitude?.value) && (
                    <div className="flex items-center gap-1.5 text-xs text-white/40 mt-1">
                      <MapPin className="w-3 h-3" />
                      {Number(signals.latitude.value).toFixed(4)}, {Number(signals.longitude.value).toFixed(4)}
                      {signals.heading_deg?.value != null && ` • HDG ${Number(signals.heading_deg.value).toFixed(0)}°`}
                    </div>
                  )}

                  {/* Signal anomalies from AI */}
                  {interpretation?.signal_anomalies?.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-orange-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Signal Anomalies
                      </p>
                      {interpretation.signal_anomalies.map((a, i) => (
                        <div key={i} className="text-xs p-2 rounded bg-orange-500/10 border border-orange-500/20 text-white/70">
                          <span className="font-medium text-orange-400">{a.signal_name}:</span> {a.current_value} — {a.note}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Faults Tab */}
                <TabsContent value="faults" className="mt-3 space-y-3">
                  {activeFaults.length === 0 && recurringFaults.length === 0 && openDefects.length === 0 ? (
                    <div className="text-center py-6 text-white/30 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                      No active faults
                    </div>
                  ) : (
                    <ScrollArea className="max-h-80">
                      {activeFaults.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-white/50">Active Faults ({activeFaults.length})</p>
                          {activeFaults.map((f, i) => (
                            <FaultCard key={f.id || i} fault={f} interpretation={interpretation} />
                          ))}
                        </div>
                      )}

                      {recurringFaults.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs font-medium text-orange-400 flex items-center gap-1">
                            <RotateCw className="w-3 h-3" /> Recurring ({recurringFaults.length})
                          </p>
                          {recurringFaults.map((r, i) => {
                            const code = r.dtc || `SPN ${r.spn} / FMI ${r.fmi}`;
                            return (
                              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <span className="text-xs font-mono text-white/80">{code}</span>
                                <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">
                                  {r.occurrences}× in 72h
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {openDefects.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs font-medium text-white/50">Inspection Defects ({openDefects.length})</p>
                          {openDefects.map((d, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white/70">{d.defect_type}</span>
                                <Badge variant="outline" className="text-[10px]">{d.severity}</Badge>
                              </div>
                              {d.notes && <p className="text-xs text-white/40 mt-1">{d.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Patterns */}
                      {interpretation?.patterns_detected?.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs font-medium text-purple-400">Patterns Detected</p>
                          {interpretation.patterns_detected.map((p, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-xs text-white/70">{p.description}</p>
                              <Badge className="mt-1 text-[10px]" variant="outline">
                                {p.pattern_type.replace(/_/g, ' ')} • {p.risk_level}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  )}

                  {/* Maintenance Recommendations */}
                  {interpretation?.maintenance_recommendations?.length > 0 && (
                    <>
                      <Separator className="bg-white/10" />
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-white/50">Maintenance Recommendations</p>
                        {interpretation.maintenance_recommendations.slice(0, 5).map((m, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-orange-400 font-medium flex-shrink-0">#{m.priority}</span>
                            <div>
                              <p className="text-white/70">{m.action}</p>
                              <p className="text-white/40">{m.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-3">
                  {timeline.length === 0 ? (
                    <div className="text-center py-6 text-white/30 text-sm">
                      No events in the last 72 hours
                    </div>
                  ) : (
                    <ScrollArea className="max-h-80">
                      <div className="space-y-0.5">
                        {timeline.slice(0, 50).map((event, i) => (
                          <TimelineEvent key={i} event={event} />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>

              {/* Footer — stats + refresh */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-3 text-[10px] text-white/30">
                  <span>{stats.total_active_faults || 0} faults</span>
                  <span>{stats.signal_count || 0} signals</span>
                  <span>{stats.total_open_defects || 0} defects</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-white/40 hover:text-white/70"
                        onClick={(e) => { e.stopPropagation(); fetchSnapshot(); }}
                        disabled={loading}
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh truck state</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
