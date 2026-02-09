import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Truck, 
  AlertCircle, 
  DollarSign, 
  ExternalLink,
  Download,
  X,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

const urgencyConfig = {
  high: { icon: AlertCircle, color: 'text-red-500 bg-red-500/20 border-red-500/30', label: 'High Priority' },
  medium: { icon: AlertTriangle, color: 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30', label: 'Medium' },
  low: { icon: Clock, color: 'text-blue-500 bg-blue-500/20 border-blue-500/30', label: 'Low' }
};

const severityConfig = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30'
};

export default function ReportDetail({ report, open, onClose }) {
  if (!report) return null;

  const handleExport = () => {
    const content = `
TRUCK DIAGNOSTIC REPORT
Generated: ${format(new Date(report.created_date), 'MMMM d, yyyy h:mm a')}

${report.truck_info?.make ? `VEHICLE INFORMATION
${report.truck_info.year} ${report.truck_info.make} ${report.truck_info.model}
` : ''}
DIAGNOSIS SUMMARY
${report.diagnosis_summary}

${report.error_codes_analysis?.length ? `ERROR CODES
${report.error_codes_analysis.map(code => `
- ${code.code}: ${code.description}
  Severity: ${code.severity}
  Action: ${code.recommended_action}
`).join('')}` : ''}

${report.identified_issues?.length ? `IDENTIFIED ISSUES
${report.identified_issues.map(issue => `
- ${issue.issue}
  Confidence: ${issue.confidence}
  Urgency: ${issue.urgency}
`).join('')}` : ''}

${report.recommendations?.length ? `RECOMMENDATIONS
${report.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
` : ''}

${report.estimated_costs ? `ESTIMATED COSTS
Low: $${report.estimated_costs.low}
High: $${report.estimated_costs.high}
` : ''}

${report.sources?.length ? `SOURCES
${report.sources.map(s => `- ${s.title}: ${s.url}`).join('\n')}
` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-report-${format(new Date(report.created_date), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <span className="text-lg">Diagnostic Report</span>
                <p className="text-sm font-normal text-white/50">
                  {format(new Date(report.created_date), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-white/20 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 pt-4">
          {/* Truck Info */}
          {report.truck_info?.make && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Truck className="w-4 h-4" />
                Vehicle Information
              </div>
              <p className="text-lg font-semibold text-white">
                {report.truck_info.year} {report.truck_info.make} {report.truck_info.model}
              </p>
            </div>
          )}

          {/* Summary */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 mb-2">Diagnosis Summary</h3>
            <p className="text-white/90 leading-relaxed">{report.diagnosis_summary}</p>
          </div>

          {/* Error Codes */}
          {report.error_codes_analysis?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">Error Codes Analysis</h3>
              <div className="space-y-3">
                {report.error_codes_analysis.map((code, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                        {code.code}
                      </Badge>
                      <Badge variant="outline" className={severityConfig[code.severity] || severityConfig.medium}>
                        {code.severity}
                      </Badge>
                    </div>
                    <p className="text-white/80 text-sm mb-2">{code.description}</p>
                    <p className="text-white/60 text-sm">
                      <span className="text-white/40">Recommended: </span>
                      {code.recommended_action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {report.identified_issues?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">Identified Issues</h3>
              <div className="space-y-2">
                {report.identified_issues.map((issue, i) => {
                  const config = urgencyConfig[issue.urgency] || urgencyConfig.medium;
                  const Icon = config.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className={`p-2 rounded-lg ${config.color} border`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-white/90 font-medium">{issue.issue}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                          <span>Confidence: {issue.confidence}</span>
                          <span>•</span>
                          <span>{config.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">Recommendations</h3>
              <div className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    </div>
                    <p className="text-white/80">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Estimate */}
          {report.estimated_costs && (
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <DollarSign className="w-4 h-4" />
                Estimated Repair Cost
              </div>
              <p className="text-2xl font-bold text-white">
                ${report.estimated_costs.low?.toLocaleString()} - ${report.estimated_costs.high?.toLocaleString()}
              </p>
              <p className="text-sm text-white/50 mt-1">
                Actual costs may vary based on location and parts availability
              </p>
            </div>
          )}

          {/* Sources */}
          {report.sources?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">Sources</h3>
              <div className="space-y-2">
                {report.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-sm text-white/70 truncate">{source.title}</span>
                    <Badge variant="outline" className="ml-auto text-xs border-white/20">
                      {source.type}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
