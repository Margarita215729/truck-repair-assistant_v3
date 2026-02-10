import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Calendar, 
  Truck, 
  AlertCircle, 
  ChevronRight,
  Download,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function ReportCard({ report, onClick, onDelete }) {
  const rd = report.report_data || {};
  const isNewFormat = rd.report_type === 'INTAKE_Triage_Roadside';
  
  // New format: use severity_triage; old format: use identified_issues
  const urgency = rd.severity_triage?.overall_urgency;
  const issueCount = report.identified_issues?.length || rd.conclusions?.length || 0;

  const urgencyBadge = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  // Card summary text
  const summaryText = isNewFormat
    ? (rd.conclusions?.[0]?.statement || rd.verified_facts?.[0] || report.diagnosis_summary || 'Intake & Triage Report')
    : report.diagnosis_summary;

  const vehicleInfo = isNewFormat
    ? rd.vehicle_info
    : report.truck_info;

  const reportDate = report.created_date || report.created_at || Date.now();

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
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
                {vehicleInfo?.make && (
                  <Badge variant="outline" className="bg-white/5 border-white/20 text-white/70">
                    <Truck className="w-3 h-3 mr-1" />
                    {vehicleInfo.year_reported || vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
                  </Badge>
                )}

                {urgency && (
                  <Badge className={`${urgencyBadge[urgency] || urgencyBadge.medium} border`}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {urgency.toUpperCase()}
                  </Badge>
                )}
                
                {!urgency && issueCount > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {issueCount} item{issueCount !== 1 ? 's' : ''}
                  </Badge>
                )}

                {rd.severity_triage?.tow_recommended && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                    TOW
                  </Badge>
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
              onClick={(e) => {
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
