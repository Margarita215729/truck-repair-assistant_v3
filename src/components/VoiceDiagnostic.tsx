import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Brain,
  CheckCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  Wrench,
  Shield,
  Zap
} from 'lucide-react';
import { Textarea } from './ui/textarea';
import { aiAPI } from '../utils/api';
import { useAuth } from './AuthProvider';
import { toast } from 'sonner';

export function VoiceDiagnostic() {
  const { user } = useAuth();
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userInput, setUserInput] = useState('');

  const emergencyQuestions = [
    "My truck won't start at all",
    "Engine is making loud knocking sounds", 
    "Brakes feel spongy or not working",
    "Engine is overheating",
    "Strange grinding noise when turning",
    "Truck is losing power while driving",
    "Warning lights are flashing on dashboard",
    "Steering wheel is shaking badly"
  ];

  const handleAIAnalysis = async (symptoms) => {
    if (!user) {
      toast.error('Please sign in to use AI analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await aiAPI.analyze({
        symptoms,
        truckModel: 'Generic Heavy Duty Truck',
        audioTranscript: symptoms
      });
      
      setAiAnalysis(result.analysis);
      toast.success('AI analysis completed!');
    } catch (error) {
      console.error('Error in AI analysis:', error);
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setUserInput(question);
    handleAIAnalysis(question);
  };

  const parseAiResponse = (response) => {
    if (!response) return null;
    
    // Parse the AI response to extract structured information
    const lines = response.split('\n').filter(line => line.trim());
    const sections = {};
    let currentSection = '';
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      
      // Look for structured sections with emojis
      if (cleanLine.includes('🔍') || cleanLine.toLowerCase().includes('primary diagnosis')) {
        currentSection = 'diagnosis';
        sections[currentSection] = cleanLine.replace(/🔍\s*PRIMARY DIAGNOSIS:?\s*/i, '').trim();
      } else if (cleanLine.includes('⚠️') || cleanLine.toLowerCase().includes('urgency')) {
        currentSection = 'urgency';
        sections[currentSection] = cleanLine.replace(/⚠️\s*URGENCY LEVEL:?\s*/i, '').trim();
      } else if (cleanLine.includes('🚨') || cleanLine.toLowerCase().includes('immediate actions')) {
        currentSection = 'actions';
        sections[currentSection] = cleanLine.replace(/🚨\s*IMMEDIATE ACTIONS:?\s*/i, '').trim();
      } else if (cleanLine.includes('🔧') || cleanLine.toLowerCase().includes('repair recommendations')) {
        currentSection = 'repair';
        sections[currentSection] = cleanLine.replace(/🔧\s*REPAIR RECOMMENDATIONS:?\s*/i, '').trim();
      } else if (cleanLine.includes('💡') || cleanLine.toLowerCase().includes('prevention tips')) {
        currentSection = 'prevention';
        sections[currentSection] = cleanLine.replace(/💡\s*PREVENTION TIPS:?\s*/i, '').trim();
      } else if (cleanLine.includes('🚨') && cleanLine.toLowerCase().includes('safety warnings')) {
        currentSection = 'safety';
        sections[currentSection] = cleanLine.replace(/🚨\s*SAFETY WARNINGS:?\s*/i, '').trim();
      } else if (currentSection && cleanLine && !cleanLine.match(/^[🔍⚠️🚨🔧💡]/)) {
        // Add to current section if it's not a new section header
        sections[currentSection] += (sections[currentSection] ? ' ' : '') + cleanLine;
      }
    });
    
    return sections;
  };

  const parsedAnalysis = parseAiResponse(aiAnalysis?.aiResponse);

  return (
    <div className="p-2 md:p-4 lg:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-3 md:p-4 lg:p-6 border border-white/20 backdrop-blur-xl">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-metal-silver mb-2">Tell AI What's Wrong</h2>
        <p className="text-white/80 text-xs md:text-sm lg:text-base leading-relaxed">
          Describe your truck's problem in plain English - our AI will help you figure out what to do next.
        </p>
      </div>

      {/* Emergency Questions */}
      <Card className="glass-strong border border-white/20 rounded-2xl backdrop-blur-xl">
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 md:p-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex-shrink-0">
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl md:text-2xl font-bold text-metal-silver">Quick Emergency Help</CardTitle>
              <CardDescription className="text-white/70 text-sm md:text-base">
                Tap any problem to get instant AI help
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-4">
            {emergencyQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                className="p-2 md:p-3 lg:p-4 h-auto text-left justify-start glass-subtle hover:scale-102 hover:bg-white/10 transition-all duration-300 border border-white/20 backdrop-blur-xl"
                onClick={() => handleQuickQuestion(question)}
                disabled={isAnalyzing}
              >
                <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 mr-2 md:mr-3 text-red-400 flex-shrink-0" />
                <span className="text-xs md:text-sm lg:text-base text-white leading-tight">{question}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Problem Description */}
      <Card className="glass-strong border border-white/20 rounded-2xl backdrop-blur-xl">
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 md:p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex-shrink-0">
              <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl md:text-2xl font-bold text-metal-silver">Describe Your Problem</CardTitle>
              <CardDescription className="text-white/70 text-sm md:text-base">
                Tell us what's happening with your truck in your own words
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: My truck is making a weird grinding noise when I brake, and the steering wheel shakes when I go over 50 mph..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={2}
            className="glass-subtle border-glass-border"
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={() => handleAIAnalysis(userInput)}
              disabled={!userInput.trim() || isAnalyzing}
              className="flex-1 btn-metal text-white"
            >
              {isAnalyzing ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-spin" />
                  AI is thinking...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Get AI Help
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setUserInput('')}
              disabled={isAnalyzing}
            >
              Clear
            </Button>
          </div>
          
          {!user && (
            <div className="p-3 glass-subtle rounded-lg border-glass-border">
              <p className="text-sm text-muted-foreground">
                💡 Sign in to save your diagnostic results and get personalized recommendations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Results */}
      {aiAnalysis && parsedAnalysis && (
        <Card className="glass-strong border-glass-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-metal-silver">
              <CheckCircle className="h-5 w-5 text-green-600" />
              AI Emergency Diagnosis
            </CardTitle>
            <CardDescription>
              Here's what our AI thinks is wrong and what you should do
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Diagnosis */}
            {parsedAnalysis.diagnosis && (
              <div className="p-4 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Wrench className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-metal-silver text-lg">What's Wrong</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{parsedAnalysis.diagnosis}</p>
              </div>
            )}

            {/* Urgency Level */}
            {parsedAnalysis.urgency && (
              <div className="p-4 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-metal-silver text-lg">Urgency Level</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{parsedAnalysis.urgency}</p>
              </div>
            )}

            {/* Immediate Actions */}
            {parsedAnalysis.actions && (
              <div className="p-4 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-yellow-500 rounded-lg">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-metal-silver text-lg">What To Do Right Now</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{parsedAnalysis.actions}</p>
              </div>
            )}

            {/* Repair Recommendations */}
            {parsedAnalysis.repair && (
              <div className="p-4 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <span className="text-white text-lg">🔧</span>
                  </div>
                  <span className="font-semibold text-metal-silver text-lg">Repair Information</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{parsedAnalysis.repair}</p>
              </div>
            )}

            {/* Safety Warnings */}
            {parsedAnalysis.safety && (
              <div className="p-4 glass-subtle rounded-lg border-glass-border border-red-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-red-400 text-lg">Safety Warnings</span>
                </div>
                <p className="text-sm text-red-300 leading-relaxed">{parsedAnalysis.safety}</p>
              </div>
            )}

            {/* Prevention Tips */}
            {parsedAnalysis.prevention && (
              <div className="p-4 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <span className="text-white text-lg">💡</span>
                  </div>
                  <span className="font-semibold text-metal-silver text-lg">Prevention Tips</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{parsedAnalysis.prevention}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Raw AI Response (for debugging, can be removed) */}
      {aiAnalysis && !parsedAnalysis && (
        <Card className="glass-strong border-glass-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-metal-silver">
              <CheckCircle className="h-5 w-5 text-green-600" />
              AI Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm bg-muted/50 p-3 rounded-lg">
              {aiAnalysis.aiResponse}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}