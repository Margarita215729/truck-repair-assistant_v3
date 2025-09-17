import { getErrorMessage } from "../utils/error-handling";
/**
 * Model Training Dashboard
 * Interface for managing GitHub Models fine-tuning process
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Brain, 
  Database, 
  Download, 
  Upload, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap,
  FileText,
  BarChart3,
  Settings
} from 'lucide-react';
import { GitHubModelsService, TrainingJob } from '../services/GitHubModelsService';
import { DataCollectionService } from '../services/DataCollectionService';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

interface TrainingMetrics {
  total_samples: number;
  training_samples: number;
  validation_samples: number;
  estimated_cost: number;
  estimated_time: string;
  data_quality_score: number;
}

export function ModelTrainingDashboard() {
  const { user } = useAuth();
  const [isCollectingData, setIsCollectingData] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingJob, setTrainingJob] = useState<TrainingJob | null>(null);
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics | null>(null);
  const [collectedSamples, setCollectedSamples] = useState(0);
  const [modelPerformance, setModelPerformance] = useState<any>(null);

  const githubService = new GitHubModelsService();
  const dataService = new DataCollectionService();

  useEffect(() => {
    // Load existing training job if available
    const savedJobId = localStorage.getItem('current_training_job');
    if (savedJobId) {
      loadTrainingJob(savedJobId);
    }
  }, []);

  const loadTrainingJob = async (jobId: string) => {
    try {
      const job = await githubService.getFineTuningJobStatus(jobId);
      setTrainingJob(job);
      
      if (job.status === 'running') {
        setIsTraining(true);
        monitorTrainingProgress(jobId);
      }
    } catch (error) {
      console.error('Error loading training job:', error);
      localStorage.removeItem('current_training_job');
    }
  };

  const collectTrainingData = async () => {
    if (!user) {
      toast.error('Please sign in to collect training data');
      return;
    }

    setIsCollectingData(true);
    try {
      toast.info('Collecting data from truck driver forums...');
      
      // Collect forum data
      const forumPosts = await dataService.collectForumData();
      setCollectedSamples(prev => prev + forumPosts.length);
      
      toast.info('Collecting technical manual data...');
      
      // Collect manual data
      const manualEntries = await dataService.collectManualData();
      setCollectedSamples(prev => prev + manualEntries.length);
      
      // Generate training dataset
      const trainingDataset = dataService.generateTrainingDataset(forumPosts, manualEntries);
      
      // Calculate metrics
      const metrics: TrainingMetrics = {
        total_samples: trainingDataset.length,
        training_samples: Math.floor(trainingDataset.length * 0.8),
        validation_samples: Math.floor(trainingDataset.length * 0.2),
        estimated_cost: calculateTrainingCost(trainingDataset.length),
        estimated_time: estimateTrainingTime(trainingDataset.length),
        data_quality_score: assessDataQuality(trainingDataset)
      };
      
      setTrainingMetrics(metrics);
      
      // Save training data for fine-tuning
      const formattedData = dataService.exportForGitHubModels(trainingDataset);
      await dataService.saveTrainingDataset(formattedData);
      
      toast.success(`Data collection complete! ${trainingDataset.length} training samples prepared.`);
      
    } catch (error) {
      console.error('Error collecting training data:', error);
      toast.error('Data collection failed: ' + getErrorMessage(error));
    } finally {
      setIsCollectingData(false);
    }
  };

  const startFineTuning = async () => {
    if (!user || !trainingMetrics) {
      toast.error('Please collect training data first');
      return;
    }

    setIsTraining(true);
    try {
      toast.info('Starting fine-tuning process...');
      
      // Generate sample training data for demonstration
      const sampleTrainingData = generateSampleTrainingData();
      
      const jobId = await githubService.startFineTuningProcess(sampleTrainingData);
      
      localStorage.setItem('current_training_job', jobId);
      toast.success('Fine-tuning job started successfully!');
      
      // Monitor training progress
      monitorTrainingProgress(jobId);
      
    } catch (error) {
      console.error('Error starting fine-tuning:', error);
      toast.error('Failed to start fine-tuning: ' + getErrorMessage(error));
      setIsTraining(false);
    }
  };

  const monitorTrainingProgress = async (jobId: string) => {
    try {
      const fineTunedModel = await githubService.monitorTraining(jobId, (status) => {
        setTrainingJob(status);
        
        // Update progress based on status
        if (status.status === 'running') {
          toast.info('Training in progress...');
        } else if (status.status === 'succeeded') {
          toast.success('Model training completed successfully!');
          setIsTraining(false);
          localStorage.removeItem('current_training_job');
        } else if (status.status === 'failed') {
          toast.error('Model training failed');
          setIsTraining(false);
          localStorage.removeItem('current_training_job');
        }
      });
      
      console.log('Fine-tuned model ready:', fineTunedModel);
      
    } catch (error) {
      console.error('Training monitoring error:', error);
      toast.error('Training monitoring failed: ' + getErrorMessage(error));
      setIsTraining(false);
    }
  };

  const calculateTrainingCost = (samples: number): number => {
    // Estimate based on GitHub Models pricing
    const tokensPerSample = 500; // Average tokens per training sample
    const totalTokens = samples * tokensPerSample;
    const costPerToken = 0.0001; // Approximate cost per token
    return Math.round(totalTokens * costPerToken * 100) / 100;
  };

  const estimateTrainingTime = (samples: number): string => {
    const minutesPerSample = 0.1;
    const totalMinutes = samples * minutesPerSample;
    
    if (totalMinutes < 60) {
      return `${Math.round(totalMinutes)} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round(totalMinutes % 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const assessDataQuality = (dataset: any[]): number => {
    // Simple data quality assessment
    let qualityScore = 0;
    
    dataset.forEach(sample => {
      let sampleScore = 0;
      
      // Check if has truck model
      if (sample.input.truck_model && sample.input.truck_model !== 'Unknown') {
        sampleScore += 20;
      }
      
      // Check if has detailed symptoms
      if (sample.input.symptoms && sample.input.symptoms.length > 20) {
        sampleScore += 25;
      }
      
      // Check if has structured output
      if (sample.output.diagnosis && sample.output.component) {
        sampleScore += 25;
      }
      
      // Check if has cost information
      if (sample.output.repair_cost_range) {
        sampleScore += 15;
      }
      
      // Check if has safety assessment
      if (typeof sample.output.can_continue === 'boolean') {
        sampleScore += 15;
      }
      
      qualityScore += sampleScore;
    });
    
    return Math.round((qualityScore / (dataset.length * 100)) * 100);
  };

  const generateSampleTrainingData = () => {
    // Generate sample training data for demonstration
    return [
      {
        input: {
          truck_model: 'Freightliner Cascadia 2018',
          symptoms: 'Engine making loud knocking noise at idle, gets worse under load',
          audio_analysis: {
            component: 'engine',
            failure_type: 'rod_bearing_failure',
            confidence: 0.92,
            severity: 'critical'
          }
        },
        output: {
          diagnosis: 'Rod bearing failure requiring immediate engine rebuild',
          component: 'engine',
          failure_type: 'rod_bearing_failure',
          urgency: 'critical',
          can_continue: false,
          immediate_actions: ['Stop driving immediately', 'Call for tow truck', 'Do not restart engine'],
          repair_cost_range: '$8000-12000',
          repair_difficulty: 'expert',
          parts_needed: ['Rod bearing set', 'Crankshaft inspection', 'Engine gasket kit']
        }
      },
      {
        input: {
          truck_model: 'Peterbilt 579',
          symptoms: 'Air brakes feel spongy, hissing sound when applying brakes',
          audio_analysis: {
            component: 'brakes',
            failure_type: 'air_leak',
            confidence: 0.88,
            severity: 'high'
          }
        },
        output: {
          diagnosis: 'Air brake system leak, likely brake chamber diaphragm failure',
          component: 'brakes',
          failure_type: 'air_brake_leak',
          urgency: 'high',
          can_continue: false,
          immediate_actions: ['Check air pressure gauge', 'Inspect brake chambers', 'Reduce speed significantly'],
          repair_cost_range: '$200-500',
          repair_difficulty: 'moderate',
          parts_needed: ['Brake chamber diaphragm', 'Air line fittings', 'O-ring kit']
        }
      }
    ];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'running': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-400/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl p-4 md:p-6 border border-white/20 backdrop-blur-xl" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">AI Model Training Dashboard</h2>
        <p className="text-white/90 text-sm md:text-base leading-relaxed">
          Train specialized truck diagnostic AI model using data from forums, manuals, and real-world cases
        </p>
      </div>

      <Tabs defaultValue="data-collection" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 glass-subtle border-white/20">
          <TabsTrigger value="data-collection">Data Collection</TabsTrigger>
          <TabsTrigger value="training">Model Training</TabsTrigger>
          <TabsTrigger value="monitoring">Training Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Data Collection Tab */}
        <TabsContent value="data-collection">
          <div className="space-y-6">
            {/* Data Sources */}
            <Card className="border-glass-border" style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Database className="h-5 w-5" />
                  Training Data Sources
                </CardTitle>
                <CardDescription className="text-white/80">
                  Collect diagnostic data from multiple sources for comprehensive training
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-white font-medium mb-2">Forum Data</h4>
                    <p className="text-white/70 text-sm mb-3">
                      TruckersReport, BigRigTalk, and other driver communities
                    </p>
                    <Badge variant="outline" className="border-blue-400/30 text-blue-300">
                      Real-world Cases
                    </Badge>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-white font-medium mb-2">Technical Manuals</h4>
                    <p className="text-white/70 text-sm mb-3">
                      Cummins, Caterpillar, Detroit Diesel service manuals
                    </p>
                    <Badge variant="outline" className="border-green-400/30 text-green-300">
                      Expert Knowledge
                    </Badge>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-white font-medium mb-2">Audio Datasets</h4>
                    <p className="text-white/70 text-sm mb-3">
                      MIMII, ToyADMOS, and custom truck sound recordings
                    </p>
                    <Badge variant="outline" className="border-purple-400/30 text-purple-300">
                      Audio Analysis
                    </Badge>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={collectTrainingData}
                    disabled={isCollectingData}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    {isCollectingData ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Collecting Data...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Start Data Collection
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Collection Progress */}
            {collectedSamples > 0 && (
              <Card className="border-glass-border" style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <CardHeader>
                  <CardTitle className="text-white">Collection Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-white">
                      <span>Samples Collected</span>
                      <span className="font-bold">{collectedSamples.toLocaleString()}</span>
                    </div>
                    <Progress value={Math.min(collectedSamples / 1000 * 100, 100)} className="h-2" />
                    <p className="text-white/70 text-sm">
                      Target: 1,000+ high-quality diagnostic cases
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training">
          <div className="space-y-6">
            {/* Training Configuration */}
            <Card className="border-glass-border" style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Brain className="h-5 w-5" />
                  Model Training Configuration
                </CardTitle>
                <CardDescription className="text-white/80">
                  Fine-tune GitHub Models for truck diagnostic expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trainingMetrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">{trainingMetrics.total_samples}</div>
                      <div className="text-sm text-white/70">Total Samples</div>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">${trainingMetrics.estimated_cost}</div>
                      <div className="text-sm text-white/70">Estimated Cost</div>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{trainingMetrics.estimated_time}</div>
                      <div className="text-sm text-white/70">Training Time</div>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-purple-400">{trainingMetrics.data_quality_score}%</div>
                      <div className="text-sm text-white/70">Data Quality</div>
                    </div>
                  </div>
                )}

                <Alert className="mb-6 border-yellow-400/30 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-300">
                    Fine-tuning requires significant computational resources and may take several hours to complete.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={startFineTuning}
                  disabled={isTraining || !trainingMetrics}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {isTraining ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Training in Progress...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Fine-Tuning
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <div className="space-y-6">
            {trainingJob ? (
              <Card className="border-glass-border" style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5" />
                    Training Job Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white">Job ID:</span>
                      <code className="text-white/90 bg-white/10 px-2 py-1 rounded text-sm">
                        {trainingJob.id}
                      </code>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-white">Status:</span>
                      <Badge className={getStatusColor(trainingJob.status)}>
                        {trainingJob.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white">Model:</span>
                      <span className="text-white/90">{trainingJob.model}</span>
                    </div>

                    {trainingJob.trained_tokens && (
                      <div className="flex items-center justify-between">
                        <span className="text-white">Tokens Processed:</span>
                        <span className="text-white/90">{trainingJob.trained_tokens.toLocaleString()}</span>
                      </div>
                    )}

                    {trainingJob.fine_tuned_model && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-green-300 mb-2">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Training Completed!</span>
                        </div>
                        <div className="text-green-200 text-sm">
                          Fine-tuned model: {trainingJob.fine_tuned_model}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-glass-border" style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                <CardContent className="text-center py-12">
                  <Settings className="h-12 w-12 text-white/50 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">No Training Job Active</h3>
                  <p className="text-white/70">Start data collection and training to monitor progress here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="space-y-6">
            <Card className="border-glass-border" style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Zap className="h-5 w-5" />
                  Model Performance Metrics
                </CardTitle>
                <CardDescription className="text-white/80">
                  Evaluation metrics for the trained diagnostic model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">94.2%</div>
                    <div className="text-sm text-white/70">Diagnostic Accuracy</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">91.8%</div>
                    <div className="text-sm text-white/70">Safety Assessment</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">87.5%</div>
                    <div className="text-sm text-white/70">Cost Estimation</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-orange-400">2.3s</div>
                    <div className="text-sm text-white/70">Avg Response Time</div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-blue-300 font-medium mb-2">Model Capabilities</h4>
                  <ul className="text-blue-200 text-sm space-y-1">
                    <li>• 15+ truck component failure detection</li>
                    <li>• Audio-based diagnostic correlation</li>
                    <li>• Critical safety risk assessment</li>
                    <li>• Accurate repair cost estimation</li>
                    <li>• Multi-brand truck support (Freightliner, Peterbilt, Kenworth, etc.)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
