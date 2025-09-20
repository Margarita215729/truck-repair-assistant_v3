/**
 * API Test Dashboard Component
 * Provides UI for running and monitoring API tests
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  RefreshCw,
  Bug,
  Zap,
  Database,
  Brain,
  Volume2,
  Settings
} from 'lucide-react';
import { APITestSuite } from '../tests/APITestSuite';
import { APIHealthCheck } from './APIHealthCheck';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/error-handling';

interface TestResult {
  service: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
  details?: any;
}

interface TestSummary {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
}

export function APITestDashboard() {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testProgress, setTestProgress] = useState(0);

  const testSuite = new APITestSuite();

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    setTestSummary(null);
    setTestProgress(0);
    
    try {
      toast.info('Starting comprehensive API tests...');
      
      // Simulate test progress
      const testSteps = [
        'Audio Analysis Service',
        'GitHub Models Service', 
        'Data Collection Service',
        'Supabase APIs',
        'API Integration'
      ];
      
      for (let i = 0; i < testSteps.length; i++) {
        setCurrentTest(testSteps[i]);
        setTestProgress((i / testSteps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate test time
      }
      
      const results = await testSuite.runAllTests();
      setTestResults(results);
      
      const summary = testSuite.getTestSummary();
      setTestSummary(summary);
      
      setTestProgress(100);
      
      if (summary.failed === 0) {
        toast.success('All API tests passed! System ready for production.');
      } else {
        toast.error(`${summary.failed} test(s) failed. Review issues before deployment.`);
      }
      
    } catch (error) {
      console.error('Test suite error:', error);
      toast.error('Test suite encountered an error: ' + getErrorMessage(error));
    } finally {
      setIsRunningTests(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 'audioanalysisservice': return <Volume2 className="h-4 w-4" />;
      case 'githubmodelsservice': return <Brain className="h-4 w-4" />;
      case 'datacollectionservice': return <Database className="h-4 w-4" />;
      case 'supabaseapi': return <Zap className="h-4 w-4" />;
      case 'integration': return <Settings className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'fail': return 'bg-red-500/20 text-red-300 border-red-400/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  // Group results by service
  const groupedResults = testResults.reduce((acc, result) => {
    if (!acc[result.service]) {
      acc[result.service] = [];
    }
    acc[result.service].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl p-4 md:p-6 border border-white/20 backdrop-blur-xl" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">API Test Dashboard</h2>
        <p className="text-white/90 text-sm md:text-base leading-relaxed">
          Comprehensive testing suite for all API endpoints and services
        </p>
      </div>

      {/* Test Controls */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bug className="h-5 w-5" />
            Test Controls
          </CardTitle>
          <CardDescription className="text-white/80">
            Run comprehensive tests on all API services and integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
            
            {testSummary && (
              <div className="flex items-center gap-4 text-sm">
                <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                  ✅ {testSummary.passed} Passed
                </Badge>
                {testSummary.failed > 0 && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                    ❌ {testSummary.failed} Failed
                  </Badge>
                )}
                {testSummary.warnings > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                    ⚠️ {testSummary.warnings} Warnings
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Test Progress */}
          {isRunningTests && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-white">
                <span>Testing: {currentTest}</span>
                <span>{Math.round(testProgress)}%</span>
              </div>
              <Progress value={testProgress} className="h-2 bg-white/10" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      {testSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-glass-border" style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{testSummary.passed}</div>
              <div className="text-sm text-white/70">Tests Passed</div>
            </CardContent>
          </Card>
          
          <Card className="border-glass-border" style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{testSummary.failed}</div>
              <div className="text-sm text-white/70">Tests Failed</div>
            </CardContent>
          </Card>
          
          <Card className="border-glass-border" style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{testSummary.warnings}</div>
              <div className="text-sm text-white/70">Warnings</div>
            </CardContent>
          </Card>
          
          <Card className="border-glass-border" style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{testSummary.total}</div>
              <div className="text-sm text-white/70">Total Tests</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overall Status Alert */}
      {testSummary && (
        <Alert className={testSummary.failed === 0 ? 
          "border-green-400/30 bg-green-500/10" : 
          "border-red-400/30 bg-red-500/10"
        }>
          {testSummary.failed === 0 ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )}
          <AlertDescription className={testSummary.failed === 0 ? "text-green-300" : "text-red-300"}>
            {testSummary.failed === 0 ? (
              "🎉 All API tests passed! The system is ready for production deployment."
            ) : (
              `⚠️ ${testSummary.failed} test(s) failed. Please review and fix issues before production deployment.`
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Test Results */}
      {Object.keys(groupedResults).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Detailed Test Results</h3>
          
          {Object.entries(groupedResults).map(([service, results]) => (
            <Card key={service} className="border-glass-border" style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  {getServiceIcon(service)}
                  {service}
                  <Badge className="ml-auto">
                    {results.length} tests
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="text-white font-medium text-sm">{result.test}</div>
                          <div className="text-white/70 text-xs">{result.message}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.duration && (
                          <span className="text-white/60 text-xs">{result.duration}ms</span>
                        )}
                        <Badge variant="outline" className={getStatusColor(result.status)}>
                          {result.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* API Health Check */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">Live API Health Monitoring</h3>
        <APIHealthCheck />
      </div>

      {/* Test Coverage Information */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="text-white">Test Coverage</CardTitle>
          <CardDescription className="text-white/80">
            Areas covered by the test suite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="h-4 w-4 text-blue-400" />
                <span className="text-white font-medium">Audio Analysis</span>
              </div>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• Service initialization</li>
                <li>• Component detection</li>
                <li>• Audio processing pipeline</li>
                <li>• Feature extraction</li>
              </ul>
            </div>
            
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-white font-medium">GitHub Models</span>
              </div>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• API key validation</li>
                <li>• Training data preparation</li>
                <li>• Prompt formatting</li>
                <li>• Response parsing</li>
              </ul>
            </div>
            
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-green-400" />
                <span className="text-white font-medium">Data Collection</span>
              </div>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• Forum data extraction</li>
                <li>• Manual processing</li>
                <li>• Dataset generation</li>
                <li>• Export formatting</li>
              </ul>
            </div>
            
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-medium">Supabase APIs</span>
              </div>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• Authentication methods</li>
                <li>• Diagnostics API</li>
                <li>• Fleet management</li>
                <li>• Reports generation</li>
              </ul>
            </div>
            
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-orange-400" />
                <span className="text-white font-medium">Integration</span>
              </div>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• Audio + AI data flow</li>
                <li>• Training data consistency</li>
                <li>• Component type matching</li>
                <li>• Error handling patterns</li>
              </ul>
            </div>
            
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bug className="h-4 w-4 text-red-400" />
                <span className="text-white font-medium">Error Handling</span>
              </div>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• API failure scenarios</li>
                <li>• Network error handling</li>
                <li>• Data validation</li>
                <li>• Graceful degradation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
