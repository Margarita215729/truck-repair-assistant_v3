import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Mic, MicOff, Play, Pause, Volume2, AlertTriangle, Wrench, Car, Settings, Droplets, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticResult {
  component: string;
  confidence: number;
  status: 'normal' | 'warning' | 'critical';
  description: string;
  recommendation: string;
  icon: any;
}

export function SoundDiagnostic() {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<DiagnosticResult[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Компоненты для диагностики
  const engineComponents = [
    { id: 'engine', name: 'Engine Block', icon: Car, description: 'Main engine performance' },
    { id: 'transmission', name: 'Transmission', icon: Settings, description: 'Gear shifting system' },
    { id: 'exhaust', name: 'Exhaust System', icon: Volume2, description: 'Exhaust pipe and muffler' },
    { id: 'fuel', name: 'Fuel System', icon: Droplets, description: 'Fuel pump and injectors' },
    { id: 'electrical', name: 'Electrical', icon: Zap, description: 'Alternator and electrical components' },
    { id: 'cooling', name: 'Cooling System', icon: Wrench, description: 'Radiator and cooling fans' },
  ];

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started - let your engine run!');
    } catch (error) {
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      toast.success('Recording completed!');
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const analyzeAudio = async () => {
    if (!audioUrl) {
      toast.error('Please record audio first');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      toast.info('Processing audio recording...');
      
      // Convert audio URL to blob for analysis
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      
      // Import and use the real AudioAnalysisService
      const { AudioAnalysisService } = await import('../services/AudioAnalysisService');
      const audioService = new AudioAnalysisService();
      
      // Perform real audio analysis
      const componentAnalysis = await audioService.analyzeAudioBlob(audioBlob);
      
      // Convert to UI format
      const analysisResults: DiagnosticResult[] = [
        {
          component: componentAnalysis.component.charAt(0).toUpperCase() + componentAnalysis.component.slice(1),
          confidence: Math.round(componentAnalysis.confidence * 100),
          status: componentAnalysis.severity === 'critical' || componentAnalysis.severity === 'severe' ? 'critical' :
                  componentAnalysis.severity === 'moderate' ? 'warning' : 'normal',
          description: this.generateDescription(componentAnalysis),
          recommendation: this.generateRecommendation(componentAnalysis),
          icon: this.getComponentIcon(componentAnalysis.component)
        }
      ];
      
      // Add additional component analysis based on frequency patterns
      const additionalComponents = this.analyzeAdditionalComponents(componentAnalysis);
      analysisResults.push(...additionalComponents);

      setAnalysisResults(analysisResults);
      toast.success(`AI analysis complete! ${componentAnalysis.component} analyzed with ${Math.round(componentAnalysis.confidence * 100)}% confidence`);
      
    } catch (error) {
      console.error('Audio analysis failed:', error);
      toast.error('Audio analysis failed: ' + error.message);
      
      // Fallback to basic analysis
      const fallbackResults: DiagnosticResult[] = [
        {
          component: 'Audio Analysis',
          confidence: 50,
          status: 'warning',
          description: 'Audio analysis encountered an error, but basic recording was successful',
          recommendation: 'Try recording again or describe symptoms manually',
          icon: Volume2
        }
      ];
      setAnalysisResults(fallbackResults);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Generate human-readable description based on analysis
   */
  private generateDescription(analysis: any): string {
    const { component, failure_type, severity, confidence } = analysis;
    
    const descriptions = {
      engine: {
        rod_bearing_failure: 'Deep knocking sound indicates worn rod bearings - critical engine damage',
        valve_adjustment_needed: 'Valve train noise suggests timing or clearance issues',
        turbocharger_bearing_wear: 'High-pitched whine from turbocharger bearing wear',
        normal_operation: 'Engine sounds healthy with normal compression and timing'
      },
      transmission: {
        gear_whine: 'Gear whine indicates worn gear teeth or bearing issues',
        grinding_gears: 'Grinding noise suggests synchronizer or clutch problems',
        hydraulic_pump_wear: 'Hydraulic pump noise indicates internal wear',
        clutch_slipping: 'Clutch slipping detected - friction material worn',
        normal_operation: 'Transmission operating smoothly with normal gear engagement'
      },
      brakes: {
        brake_pad_wear: 'High-frequency squeal indicates brake pad wear indicators',
        brake_pad_metal_contact: 'Grinding noise - brake pads completely worn, metal-to-metal contact',
        normal_braking: 'Brake system operating normally with proper pad contact'
      },
      air_system: {
        air_leak: 'High-frequency hiss indicates air system leak',
        compressor_malfunction: 'Compressor showing irregular operation patterns',
        valve_malfunction: 'Air valve not operating properly',
        pressure_regulator_issue: 'Pressure regulator producing whistling sound',
        normal_operation: 'Air system maintaining proper pressure and operation'
      }
    };
    
    return descriptions[component]?.[failure_type] || 
           `${component} analysis shows ${severity} condition with ${Math.round(confidence * 100)}% confidence`;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendation(analysis: any): string {
    const { component, failure_type, severity } = analysis;
    
    const recommendations = {
      engine: {
        rod_bearing_failure: 'STOP IMMEDIATELY - Do not drive. Call for tow truck. Engine rebuild required.',
        valve_adjustment_needed: 'Schedule valve adjustment within 1000 miles. Monitor oil consumption.',
        turbocharger_bearing_wear: 'Replace turbocharger within 5000 miles. Check oil supply lines.',
        normal_operation: 'Continue regular maintenance schedule. Monitor for changes.'
      },
      transmission: {
        gear_whine: 'Check transmission fluid level and quality. Schedule inspection.',
        grinding_gears: 'Avoid heavy loads. Check clutch adjustment. Professional diagnosis needed.',
        hydraulic_pump_wear: 'Replace hydraulic pump within 2000 miles. Check fluid contamination.',
        clutch_slipping: 'Replace clutch assembly. Avoid heavy acceleration until repaired.',
        normal_operation: 'Continue normal operation. Follow scheduled maintenance.'
      },
      brakes: {
        brake_pad_wear: 'Replace brake pads within 500 miles. Inspect rotors for scoring.',
        brake_pad_metal_contact: 'STOP DRIVING - Replace pads and rotors immediately. Safety critical.',
        normal_braking: 'Brakes operating normally. Continue regular inspections.'
      },
      air_system: {
        air_leak: 'Locate and repair air leak. Check all fittings and hoses.',
        compressor_malfunction: 'Service air compressor. Check belt tension and oil level.',
        valve_malfunction: 'Replace faulty air valve. Test system pressure.',
        pressure_regulator_issue: 'Replace pressure regulator. Verify system pressure settings.',
        normal_operation: 'Air system operating normally. Maintain regular service intervals.'
      }
    };
    
    return recommendations[component]?.[failure_type] || 
           `Consult professional mechanic for ${component} ${severity} condition diagnosis`;
  }

  /**
   * Get appropriate icon for component
   */
  private getComponentIcon(component: string): any {
    const iconMap = {
      engine: Car,
      transmission: Settings,
      brakes: Volume2,
      air_system: Droplets,
      suspension: Wrench,
      electrical: Zap,
      cooling: Wrench
    };
    
    return iconMap[component] || Car;
  }

  /**
   * Analyze additional components based on frequency patterns
   */
  private analyzeAdditionalComponents(primaryAnalysis: any): DiagnosticResult[] {
    const additionalResults: DiagnosticResult[] = [];
    const { frequency_patterns } = primaryAnalysis;
    
    // If high frequency content, check for air system issues
    if (frequency_patterns.high_freq > 0.6 && primaryAnalysis.component !== 'air_system') {
      additionalResults.push({
        component: 'Air System',
        confidence: 65,
        status: 'warning',
        description: 'High frequency content suggests possible air system activity',
        recommendation: 'Monitor for air leaks or pressure irregularities',
        icon: Droplets
      });
    }
    
    // If low frequency dominance, check for suspension issues
    if (frequency_patterns.low_freq > 0.7 && primaryAnalysis.component !== 'engine') {
      additionalResults.push({
        component: 'Suspension',
        confidence: 55,
        status: 'normal',
        description: 'Low frequency vibrations within normal range',
        recommendation: 'Regular suspension inspection recommended',
        icon: Wrench
      });
    }
    
    return additionalResults;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'warning': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-400/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
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
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Engine Sound Diagnosis</h2>
        <p className="text-white/90 text-sm md:text-base leading-relaxed">
          Record your engine sound and let AI analyze potential issues with your truck's components.
        </p>
      </div>

      {/* Recording Controls */}
      <Card className="border border-white/20 rounded-2xl backdrop-blur-xl" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 md:p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex-shrink-0">
              <Mic className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Record Engine Sound</CardTitle>
              <CardDescription className="text-white/85 text-sm md:text-base">
                Start your engine and record for 10-30 seconds for best results
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording Button and Timer */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isAnalyzing}
              className={`
                relative gap-2 px-6 py-3 rounded-xl font-medium text-base h-auto
                ${isRecording 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                }
                transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-xl
              `}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5" />
                  Stop Recording
                  {isRecording && <div className="absolute inset-0 bg-red-400/20 rounded-xl animate-pulse" />}
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  Start Recording
                </>
              )}
            </Button>

            {isRecording && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-white font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>

          {/* Audio Playback */}
          {audioUrl && (
            <div className="glass-subtle border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={playAudio}
                  variant="outline"
                  className="glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-white/90">Recorded audio ready for analysis</span>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Analyze Button */}
          {audioUrl && !isAnalyzing && (
            <Button
              onClick={analyzeAudio}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-xl font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Analyze Engine Sound
            </Button>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="glass-subtle border border-white/20 rounded-xl p-6 text-center">
              <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl inline-block mb-4">
                <Car className="h-8 w-8 text-white/60 animate-spin" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">AI Analysis in Progress</h3>
              <p className="text-white/85 mb-4">Analyzing sound patterns and frequencies...</p>
              <Progress value={67} className="h-2 bg-white/10" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Components to Monitor */}
      <Card className="border border-white/20 rounded-2xl backdrop-blur-xl" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 md:p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex-shrink-0">
              <Wrench className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl md:text-2xl font-bold text-white">Components Being Monitored</CardTitle>
              <CardDescription className="text-white/85 text-sm md:text-base">
                AI will analyze these truck components from your engine sound
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {engineComponents.map((component) => {
              const Icon = component.icon;
              return (
                <div
                  key={component.id}
                  className="glass-subtle border border-white/20 rounded-xl p-4 hover:bg-white/5 transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex-shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white font-bold text-sm mb-1">{component.name}</h4>
                      <p className="text-white/75 text-xs leading-tight">{component.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <Card className="border border-white/20 rounded-2xl backdrop-blur-xl" style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <CardHeader className="pb-4 md:pb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 md:p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex-shrink-0">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl md:text-2xl font-bold text-white">Diagnostic Results</CardTitle>
                <CardDescription className="text-white/85 text-sm md:text-base">
                  AI analysis of your truck's engine sound
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysisResults.map((result, index) => {
                const Icon = result.icon;
                return (
                  <div
                    key={index}
                    className="glass-subtle border border-white/20 rounded-xl p-4 hover:bg-white/5 transition-all duration-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex-shrink-0">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-white font-bold text-base mb-1">{result.component}</h4>
                          <p className="text-white/85 text-sm mb-2 leading-tight">{result.description}</p>
                          <p className="text-white/75 text-xs leading-tight">
                            <strong>Recommendation:</strong> {result.recommendation}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(result.status)} font-medium px-3 py-1 text-xs`}
                        >
                          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                        </Badge>
                        <div className="text-right">
                          <div className="text-white font-bold text-sm">{result.confidence}%</div>
                          <div className="text-white/75 text-xs">confidence</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}