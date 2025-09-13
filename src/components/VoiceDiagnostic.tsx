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
import { toast } from 'sonner@2.0.3';

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
      if (line.includes('1.') || line.toLowerCase().includes('most likely')) {
        currentSection = 'cause';
        sections[currentSection] = line.replace(/^\d+\.?\s*/, '');
      } else if (line.includes('2.') || line.toLowerCase().includes('urgency')) {
        currentSection = 'urgency';
        sections[currentSection] = line.replace(/^\d+\.?\s*/, '');
      } else if (line.includes('3.') || line.toLowerCase().includes('continue')) {
        currentSection = 'safety';
        sections[currentSection] = line.replace(/^\d+\.?\s*/, '');
      } else if (line.includes('4.') || line.toLowerCase().includes('immediate')) {
        currentSection = 'actions';
        sections[currentSection] = line.replace(/^\d+\.?\s*/, '');
      } else if (line.includes('5.') || line.toLowerCase().includes('cost')) {
        currentSection = 'cost';
        sections[currentSection] = line.replace(/^\d+\.?\s*/, '');
      } else if (line.includes('6.') || line.toLowerCase().includes('professional')) {
        currentSection = 'help';
        sections[currentSection] = line.replace(/^\d+\.?\s*/, '');
      } else if (currentSection && line.trim()) {
        sections[currentSection] += ' ' + line.trim();
      }
    });
    
    return sections;
  };

  const parsedAnalysis = parseAiResponse(aiAnalysis?.aiResponse);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-4 md:p-6 border border-white/20 backdrop-blur-xl">
        <h2 className="text-2xl md:text-3xl font-bold text-metal-silver mb-2">Tell AI What's Wrong</h2>
        <p className="text-white/80 text-sm md:text-base leading-relaxed">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {emergencyQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                className="p-3 md:p-4 h-auto text-left justify-start glass-subtle hover:scale-102 hover:bg-white/10 transition-all duration-300 border border-white/20 backdrop-blur-xl"
                onClick={() => handleQuickQuestion(question)}
                disabled={isAnalyzing}
              >
                <AlertTriangle className="h-4 w-4 mr-2 md:mr-3 text-red-400 flex-shrink-0" />
                <span className="text-sm md:text-base text-white leading-tight">{question}</span>
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
            rows={4}
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
            {/* Urgency Level */}
            {parsedAnalysis.urgency && (
              <div className="p-3 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="font-medium text-metal-silver">Urgency Level</span>
                </div>
                <p className="text-sm">{parsedAnalysis.urgency}</p>
              </div>
            )}

            {/* Safety Assessment */}
            {parsedAnalysis.safety && (
              <div className="p-3 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-metal-silver">Can You Continue Driving?</span>
                </div>
                <p className="text-sm">{parsedAnalysis.safety}</p>
              </div>
            )}

            {/* Most Likely Cause */}
            {parsedAnalysis.cause && (
              <div className="p-3 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-metal-silver">Most Likely Problem</span>
                </div>
                <p className="text-sm">{parsedAnalysis.cause}</p>
              </div>
            )}

            {/* Immediate Actions */}
            {parsedAnalysis.actions && (
              <div className="p-3 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-metal-silver">What To Do Right Now</span>
                </div>
                <p className="text-sm">{parsedAnalysis.actions}</p>
              </div>
            )}

            {/* Cost Estimate */}
            {parsedAnalysis.cost && (
              <div className="p-3 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💰</span>
                  <span className="font-medium text-metal-silver">Estimated Repair Cost</span>
                </div>
                <p className="text-sm">{parsedAnalysis.cost}</p>
              </div>
            )}

            {/* Professional Help */}
            {parsedAnalysis.help && (
              <div className="p-3 glass-subtle rounded-lg border-glass-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👨‍🔧</span>
                  <span className="font-medium text-metal-silver">Do You Need Professional Help?</span>
                </div>
                <p className="text-sm">{parsedAnalysis.help}</p>
              </div>
            )}

            {/* Full AI Response */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View Full AI Analysis
              </summary>
              <div className="mt-2 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                {aiAnalysis.aiResponse}
              </div>
            </details>
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