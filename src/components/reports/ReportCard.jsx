import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Truck, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { isNewFormatReport, getVehicleInfo, getReportUrgency, getFaultCodes, getReportSummary } from '../../../utils/reportAdapters';

export default function ReportCard({ report, onClick, onDelete }) {
  const isNew = isNewFormatReport(report);
  const vehicle = getVehicleInfo(report);
  const urgency = getReportUrgency(report);
  const codes = getFaultCodes(report);
  const summary = getReportSummary(report);
  const reportDate = report.created_date || report.created_at || Date.now();

  // Fallbacks
  const vehicleText = vehicle.make ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle info incomplete';
  const summaryText = summary || 'Insufficient structured data';
  const urgencyBadge = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onClick}>
      <Card className="p-5 bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 cursor-pointer transition-all group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate pr-4">
                {summaryText?.substring(0, 80)}{summaryText?.length > 80 ? '...' : ''}
              </h3>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="outline" className="bg-white/5 border-white/20 text-white/70">
                  {isNew ? 'New' : 'Legacy'}
                </Badge>
                {vehicle.make ? (
                  <Badge variant="outline" className="bg-white/5 border-white/20 text-white/70">
                    <Truck className="w-3 h-3 mr-1" />
                    {vehicleText}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/10 border-white/20 text-white/40">Vehicle info incomplete</Badge>
                )}
                {urgency && (
                  <Badge className={`${urgencyBadge[urgency] || urgencyBadge.medium} border`}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {urgency.toUpperCase()}
                  </Badge>
                )}
                {codes.active && codes.active.length > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border text-xs">Active codes</Badge>
                )}
                {codes.history && codes.history.length > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border text-xs">History codes</Badge>
                )}
                {urgency === undefined && (!codes.active || codes.active.length === 0) && (!codes.history || codes.history.length === 0) && (
                  <Badge className="bg-gray-500/10 text-white/40 border border-gray-500/20">No fault codes provided</Badge>
                )}
                {/* Tow tag */}
                {isNew && report.report_data?.severity_triage?.tow_recommended && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">TOW</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-white/40">
                <Calendar className="w-4 h-4" />
                {format(new Date(reportDate), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={e => {
                e.stopPropagation();
                onDelete(report.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
