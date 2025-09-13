import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { 
  FileText, 
  Download, 
  Share2, 
  Calendar as CalendarIcon,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Clock,
  Printer,
  Mail,
  BarChart3
} from 'lucide-react';
import { reportsAPI } from '../utils/api';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

export function Reports() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reportType, setReportType] = useState('diagnostic');
  const [timeRange, setTimeRange] = useState('month');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);

  const mockReports = [
    {
      id: 1,
      title: 'Fleet Diagnostic Summary - November 2024',
      type: 'Diagnostic Report',
      date: '2024-11-30',
      vehicles: 12,
      issues: 8,
      resolved: 6,
      status: 'Completed',
      cost: '$2,450'
    },
    {
      id: 2,
      title: 'Preventive Maintenance Schedule',
      type: 'Maintenance Report',
      date: '2024-11-28',
      vehicles: 15,
      issues: 0,
      resolved: 12,
      status: 'In Progress',
      cost: '$1,890'
    },
    {
      id: 3,
      title: 'Weekly Performance Analysis',
      type: 'Performance Report',
      date: '2024-11-25',
      vehicles: 8,
      issues: 3,
      resolved: 3,
      status: 'Completed',
      cost: '$780'
    }
  ];

  const reportStats = {
    totalReports: 47,
    thisMonth: 12,
    avgResolutionTime: '2.3 hours',
    totalCostSaved: '$18,450',
    diagnosticAccuracy: '94%',
    issuesPreventedAI: 23
  };

  const costAnalysis = [
    { category: 'Engine Repairs', amount: 4250, percentage: 35 },
    { category: 'Brake Services', amount: 2100, percentage: 17 },
    { category: 'Transmission', amount: 1800, percentage: 15 },
    { category: 'Electrical', amount: 1450, percentage: 12 },
    { category: 'Preventive Maintenance', amount: 2550, percentage: 21 }
  ];

  const handleGenerateReport = async () => {
    if (!user) {
      toast.error('Please sign in to generate reports');
      return;
    }

    setIsGenerating(true);
    try {
      const endDate = selectedDate || new Date();
      const startDate = new Date(endDate);
      
      // Calculate start date based on time range
      switch (timeRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
      
      const reportConfig = {
        reportType,
        timeRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
      
      const response = await reportsAPI.generate(reportConfig);
      setGeneratedReport(response.report);
      toast.success('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = (format: string, reportId?: number) => {
    console.log(`Exporting ${reportId ? `report ${reportId}` : 'new report'} as ${format}`);
  };

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2>Diagnostic Reports & Analytics</h2>
        <p className="text-muted-foreground">
          Generate comprehensive reports, analyze costs, and track maintenance history.
        </p>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate New Report
          </CardTitle>
          <CardDescription>
            Create custom diagnostic and maintenance reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label>Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diagnostic">Diagnostic Summary</SelectItem>
                  <SelectItem value="maintenance">Maintenance Report</SelectItem>
                  <SelectItem value="performance">Performance Analysis</SelectItem>
                  <SelectItem value="cost">Cost Analysis</SelectItem>
                  <SelectItem value="predictive">Predictive Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label>Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label>Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? selectedDate.toLocaleDateString() : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerateReport} className="flex-1" disabled={isGenerating}>
              <FileText className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('excel')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recent">Recent Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <div className="space-y-4">
            {generatedReport && (
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {generatedReport.reportType.charAt(0).toUpperCase() + generatedReport.reportType.slice(1)} Report - {new Date().toLocaleDateString()}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">Generated Report</Badge>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {new Date(generatedReport.timestamp).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant="default">Fresh</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{generatedReport.vehicles}</div>
                      <div className="text-sm text-muted-foreground">Vehicles</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{generatedReport.issues}</div>
                      <div className="text-sm text-muted-foreground">Issues</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{generatedReport.resolved}</div>
                      <div className="text-sm text-muted-foreground">Resolved</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">${generatedReport.costEstimate.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Cost</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportReport('pdf')}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {mockReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <Badge variant="outline">{report.type}</Badge>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {new Date(report.date).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={report.status === 'Completed' ? 'default' : 'secondary'}>
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{report.vehicles}</div>
                      <div className="text-sm text-muted-foreground">Vehicles</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{report.issues}</div>
                      <div className="text-sm text-muted-foreground">Issues</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{report.resolved}</div>
                      <div className="text-sm text-muted-foreground">Resolved</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{report.cost}</div>
                      <div className="text-sm text-muted-foreground">Cost</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportReport('pdf', report.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats.totalReports}</div>
                <p className="text-xs text-muted-foreground">
                  +{reportStats.thisMonth} this month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats.avgResolutionTime}</div>
                <p className="text-xs text-muted-foreground">
                  15% faster than last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportStats.diagnosticAccuracy}</div>
                <p className="text-xs text-muted-foreground">
                  +2% improvement
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Issues Prevented by AI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{reportStats.issuesPreventedAI}</div>
                  <p className="text-muted-foreground">Potential failures predicted and prevented</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{reportStats.totalCostSaved}</div>
                  <p className="text-muted-foreground">Total saved through preventive maintenance</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Breakdown Analysis
              </CardTitle>
              <CardDescription>
                Maintenance and repair costs by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costAnalysis.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.category}</span>
                        <span className="font-bold">${item.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <div className="text-right text-sm text-muted-foreground mt-1">
                        {item.percentage}% of total
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="mb-2">Cost Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Maintenance Cost:</span>
                    <div className="font-bold">${costAnalysis.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Average per Vehicle:</span>
                    <div className="font-bold">${Math.round(costAnalysis.reduce((sum, item) => sum + item.amount, 0) / 12).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Diagnostic Requests</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>+15%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Resolution Rate</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>+8%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Cost</span>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>+3%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Predictive Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="font-medium text-yellow-800">Engine Services Trend</div>
                    <div className="text-sm text-yellow-700">
                      Expect 20% increase in engine diagnostics next month
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-800">Seasonal Pattern</div>
                    <div className="text-sm text-blue-700">
                      Winter maintenance typically increases by 35%
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-green-800">Cost Optimization</div>
                    <div className="text-sm text-green-700">
                      Preventive maintenance could save $2,100 next quarter
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}