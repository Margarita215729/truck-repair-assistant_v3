import React, { useState } from 'react';
import { entities } from '@/services/entityService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Search, 
  Plus, 
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import ReportCard from '@/components/reports/ReportCard';
import ReportDetail from '@/components/reports/ReportDetail';
import { useLanguage } from '@/lib/LanguageContext';

export default function Reports() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['diagnostic-reports'],
    queryFn: () => entities.DiagnosticReport.list('-created_at', 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.DiagnosticReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-reports'] });
      toast.success(t('reports.reportDeleted'));
    },
    onError: () => {
      toast.error(t('reports.deleteError'));
    }
  });

  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.diagnosis_summary?.toLowerCase().includes(query) ||
      report.truck_info?.make?.toLowerCase().includes(query) ||
      report.truck_info?.model?.toLowerCase().includes(query)
    );
  });

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowDetail(true);
  };

  const handleDeleteReport = (id) => {
    if (confirm(t('reports.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-white/5 sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{t('reports.title')}</h1>
              <p className="text-white/60 text-sm mt-1">
                {reports.length} {reports.length !== 1 ? t('reports.reports_plural') : t('reports.report')}
              </p>
            </div>
            
            <Link to={createPageUrl('Diagnostics')}>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('reports.newDiagnosis')}
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('reports.searchPlaceholder')}
                className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? t('reports.noReportsFound') : t('reports.noReportsYet')}
            </h2>
            <p className="text-white/60 max-w-md mb-6">
              {searchQuery 
                ? t('reports.adjustSearch')
                : t('reports.noReportsDesc')}
            </p>
            {!searchQuery && (
              <Link to={createPageUrl('Diagnostics')}>
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                {t('reports.startDiagnosis')}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ReportCard
                    report={report}
                    onClick={() => handleViewReport(report)}
                    onDelete={handleDeleteReport}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <ReportDetail
        report={selectedReport}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </div>
  );
}
