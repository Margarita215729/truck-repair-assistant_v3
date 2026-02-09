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
  const issueCount = report.identified_issues?.length || 0;
  const hasHighUrgency = report.identified_issues?.some(i => i.urgency === 'high');

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
                {report.diagnosis_summary?.substring(0, 60)}...
              </h3>
              
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {report.truck_info?.make && (
                  <Badge variant="outline" className="bg-white/5 border-white/20 text-white/70">
                    <Truck className="w-3 h-3 mr-1" />
                    {report.truck_info.year} {report.truck_info.make} {report.truck_info.model}
                  </Badge>
                )}
                
                {issueCount > 0 && (
                  <Badge className={`${hasHighUrgency ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'} border`}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {issueCount} issue{issueCount !== 1 ? 's' : ''} found
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-2 text-sm text-white/40">
                <Calendar className="w-4 h-4" />
                {format(new Date(report.created_date), 'MMM d, yyyy h:mm a')}
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
