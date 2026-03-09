
import React, { useState, useEffect } from 'react';
import { entities } from '@/services/entityService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Search, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ReportCard from '@/components/reports/ReportCard';
import ReportDetail from '@/components/reports/ReportDetail';
import { useLanguage } from '@/lib/LanguageContext';
import ReportFilters from '@/components/reports/ReportFilters';
import { matchesReportSearch } from '../../utils/reportSearch';
import { isNewFormatReport, getReportUrgency, getFaultCodes } from '../../utils/reportAdapters';


export default function Reports() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [allReports, setAllReports] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const queryClient = useQueryClient();

  // Initial load (first page)
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoadingMore(true);
      try {
        const batch = await entities.DiagnosticReport.list('-created_at', 50, 0);
        if (!cancelled) {
          setAllReports(batch);
          setHasMore(batch.length === 50);
        }
      } finally {
        setLoadingMore(false);
      }
    }
    loadInitial();
    return () => { cancelled = true; };
  }, []);

  // Load more handler
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const batch = await entities.DiagnosticReport.list('-created_at', 50, allReports.length);
      setAllReports(prev => {
        // Avoid duplicates
        const ids = new Set(prev.map(r => r.id));
        return [...prev, ...batch.filter(r => !ids.has(r.id))];
      });
      setHasMore(batch.length === 50);
    } finally {
      setLoadingMore(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.DiagnosticReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-reports'] });
      setAllReports(rpts => rpts.filter(r => r.id !== id));
      toast.success(t('reports.reportDeleted'));
    },
    onError: () => {
      toast.error(t('reports.deleteError'));
    }
  });

  // Filtering and search
  const filteredReports = allReports.filter(report => {
    // Text search
    if (searchQuery && !matchesReportSearch(report, searchQuery)) return false;
    // Urgency filter
    if (filters.urgency && getReportUrgency(report) !== filters.urgency) return false;
    // Format filter
    if (filters.format) {
      if (filters.format === 'Legacy' && isNewFormatReport(report)) return false;
      if (filters.format === 'New' && !isNewFormatReport(report)) return false;
    }
    // Tow filter
    if (filters.tow) {
      const triage = report.report_data?.severity_triage || {};
      const val = triage.tow_recommended;
      if (filters.tow === 'yes' && val !== true) return false;
      if (filters.tow === 'no' && val !== false) return false;
      if (filters.tow === 'unknown' && val !== undefined && val !== null) return false;
    }
    // Drive allowed filter
    if (filters.drive) {
      const triage = report.report_data?.severity_triage || {};
      const val = triage.can_drive;
      if (filters.drive === 'yes' && val !== true) return false;
      if (filters.drive === 'no' && val !== false) return false;
      if (filters.drive === 'unknown' && val !== undefined && val !== null) return false;
    }
    // Date range filter
    if (filters.dateFrom) {
      const dt = new Date(report.created_at || report.created_date);
      if (dt < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      const dt = new Date(report.created_at || report.created_date);
      if (dt > new Date(filters.dateTo)) return false;
    }
    // Truck make/model filter
    if (filters.truck) {
      const val = filters.truck.toLowerCase();
      const v = report.truck_info || report.report_data?.vehicle_info || {};
      if (!(
        (v.make && v.make.toLowerCase().includes(val)) ||
        (v.model && v.model.toLowerCase().includes(val))
      )) return false;
    }
    // Active codes filter
    if (filters.activeCodes) {
      const codes = getFaultCodes(report);
      if (filters.activeCodes === 'yes' && (!codes.active || codes.active.length === 0)) return false;
      if (filters.activeCodes === 'no' && codes.active && codes.active.length > 0) return false;
    }
    // History codes filter
    if (filters.historyCodes) {
      const codes = getFaultCodes(report);
      if (filters.historyCodes === 'yes' && (!codes.history || codes.history.length === 0)) return false;
      if (filters.historyCodes === 'no' && codes.history && codes.history.length > 0) return false;
    }
    return true;
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

  const clearFilters = () => setFilters({});

  // For filter dropdowns
  const urgencies = ['high', 'medium', 'low'];
  const formats = ['Legacy', 'New'];

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

          {/* Search & Filters */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('reports.searchPlaceholder')}
                className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <ReportFilters filters={filters} setFilters={setFilters} clearFilters={clearFilters} urgencies={urgencies} formats={formats} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loadingMore && allReports.length === 0 ? (
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
          <>
            <div className="mb-2 text-xs text-white/60">
              Showing {filteredReports.length} of {allReports.length} loaded reports
            </div>
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
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button onClick={handleLoadMore} disabled={loadingMore} className="px-6 py-2">
                  {loadingMore ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </>
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
