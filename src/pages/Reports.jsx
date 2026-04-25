import React, { useState, useMemo } from 'react';
import { entities } from '@/services/entityService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import ReportFilters from '@/components/reports/ReportFilters';
import { useLanguage } from '@/lib/LanguageContext';
import { matchesReportSearch, matchesReportFilters } from '@/utils/reportSearch';
import { getVehicleInfo } from '@/utils/reportAdapters';

const PAGE_SIZE = 30;

export default function Reports() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['diagnostic-reports'],
    queryFn: () => entities.DiagnosticReport.list('-created_at', 200),
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

  const uniqueMakes = useMemo(() => {
    const makes = new Set();
    reports.forEach(r => {
      const v = getVehicleInfo(r);
      if (v.make) makes.add(v.make);
    });
    return [...makes].sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter(r =>
      matchesReportSearch(r, searchQuery) && matchesReportFilters(r, filters)
    );
  }, [reports, searchQuery, filters]);

  const visibleReports = filteredReports.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReports.length;

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowDetail(true);
  };

  const handleDeleteReport = (id) => {
    setDeleteTarget(id);
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
                {filteredReports.length === reports.length
                  ? `${reports.length} ${reports.length !== 1 ? t('reports.reports_plural') : t('reports.report')}`
                  : `${filteredReports.length} of ${reports.length} ${t('reports.reports_plural')}`}
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
                onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
                placeholder={t('reports.searchPlaceholder')}
                className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <ReportFilters
              filters={filters}
              onChange={(f) => { setFilters(f); setVisibleCount(PAGE_SIZE); }}
              makes={uniqueMakes}
            />
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
              {visibleReports.map((report, index) => (
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
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  className="border-white/20 hover:bg-white/10 text-white/70"
                  onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                >
                  Load more ({filteredReports.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <ReportDetail
        report={selectedReport}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reports.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('reports.deleteDescription') || 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
