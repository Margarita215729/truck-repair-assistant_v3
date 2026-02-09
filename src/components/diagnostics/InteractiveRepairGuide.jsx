import React, { useState, useEffect } from 'react';
import { entities } from '@/services/entityService';
import { invokeLLM } from '@/services/aiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, Circle, AlertTriangle, Clock, Wrench, Star, 
  ThumbsUp, ThumbsDown, Flag, Loader2, ChevronDown, ChevronUp,
  Users, Video, Image as ImageIcon, ExternalLink, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function InteractiveRepairGuide({ 
  open, 
  onClose, 
  problem,
  truck,
  errorCodes = [],
  symptoms = []
}) {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [expandedSteps, setExpandedSteps] = useState(new Set([0]));
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFlag, setShowFlag] = useState(false);
  const [flagType, setFlagType] = useState('');
  const [flagDetails, setFlagDetails] = useState('');
  const [communitySolutions, setCommunitySolutions] = useState([]);

  const queryClient = useQueryClient();

  // Fetch community solutions
  const { data: communityData } = useQuery({
    queryKey: ['community-solutions', truck?.make, errorCodes],
    queryFn: async () => {
      const solutions = await entities.KnowledgeBase.list('-upvotes', 50);
      return solutions.filter(s => {
        if (truck && s.truck_make !== truck.make) return false;
        if (errorCodes.length > 0 && s.error_codes?.some(code => errorCodes.includes(code))) return true;
        if (symptoms.length > 0 && s.symptoms?.some(sym => symptoms.includes(sym))) return true;
        return false;
      });
    },
    enabled: open && (!!truck || errorCodes.length > 0)
  });

  useEffect(() => {
    if (open && problem) {
      generateGuide();
    }
  }, [open, problem]);

  useEffect(() => {
    if (communityData) {
      setCommunitySolutions(communityData);
    }
  }, [communityData]);

  const generateGuide = async () => {
    setLoading(true);
    try {
      let contextPrompt = `Generate a comprehensive, interactive repair guide for the following problem:\n\n${problem}`;
      
      if (truck) {
        contextPrompt += `\n\nTruck: ${truck.year} ${truck.make} ${truck.model}`;
      }
      
      if (errorCodes.length > 0) {
        contextPrompt += `\n\nError Codes: ${errorCodes.join(', ')}`;
      }
      
      if (symptoms.length > 0) {
        contextPrompt += `\n\nSymptoms: ${symptoms.join(', ')}`;
      }

      const response = await invokeLLM({
        prompt: `${contextPrompt}

Create a detailed, step-by-step repair guide with:
1. Title and overview
2. Required tools and parts
3. Estimated time and difficulty
4. Safety warnings
5. Step-by-step instructions with detailed descriptions
6. For each step, suggest relevant image/video search terms
7. Troubleshooting tips
8. What to check after repair

Make it practical and easy to follow for someone with basic mechanical skills.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            overview: { type: "string" },
            difficulty: { type: "string", enum: ["easy", "moderate", "difficult", "professional"] },
            estimated_time: { type: "string" },
            required_tools: { type: "array", items: { type: "string" } },
            required_parts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  part_number: { type: "string" },
                  estimated_cost: { type: "string" }
                }
              }
            },
            safety_warnings: { type: "array", items: { type: "string" } },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  image_search_terms: { type: "string" },
                  video_search_terms: { type: "string" },
                  tips: { type: "array", items: { type: "string" } },
                  warnings: { type: "array", items: { type: "string" } }
                }
              }
            },
            troubleshooting: { type: "array", items: { type: "string" } },
            verification_steps: { type: "array", items: { type: "string" } }
          }
        }
      });

      setGuide({ ...response, id: Date.now().toString() });
    } catch (error) {
      console.error('Guide generation error:', error);
      toast.error('Failed to generate repair guide');
    } finally {
      setLoading(false);
    }
  };

  const submitRating = useMutation({
    mutationFn: async () => {
      return await entities.RepairGuideRating.create({
        guide_id: guide.id,
        rating,
        helpful: rating >= 4,
        feedback
      });
    },
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setShowRating(false);
    }
  });

  const submitFlag = useMutation({
    mutationFn: async () => {
      return await entities.RepairGuideRating.create({
        guide_id: guide.id,
        flag_type: flagType,
        flag_details: flagDetails
      });
    },
    onSuccess: () => {
      toast.success('Issue reported. Thank you for helping improve our guides!');
      setShowFlag(false);
    }
  });

  const toggleStep = (index) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleComplete = (index) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const difficultyColors = {
    easy: 'text-green-400 border-green-500/30',
    moderate: 'text-yellow-400 border-yellow-500/30',
    difficult: 'text-orange-400 border-orange-500/30',
    professional: 'text-red-400 border-red-500/30'
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-orange-400" />
            Interactive Repair Guide
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : guide ? (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{guide.title}</h2>
              <p className="text-white/70 mb-3">{guide.overview}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={difficultyColors[guide.difficulty]}>
                  {guide.difficulty}
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white/70">
                  <Clock className="w-3 h-3 mr-1" />
                  {guide.estimated_time}
                </Badge>
              </div>
            </div>

            {/* Safety Warnings */}
            {guide.safety_warnings?.length > 0 && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="font-semibold text-red-400">Safety First!</h3>
                </div>
                <ul className="space-y-1">
                  {guide.safety_warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Required Tools & Parts */}
            <div className="grid md:grid-cols-2 gap-4">
              {guide.required_tools?.length > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-400" />
                    Required Tools
                  </h3>
                  <ul className="space-y-1">
                    {guide.required_tools.map((tool, i) => (
                      <li key={i} className="text-sm text-white/70">• {tool}</li>
                    ))}
                  </ul>
                </div>
              )}

              {guide.required_parts?.length > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-semibold text-white mb-2">Required Parts</h3>
                  <div className="space-y-2">
                    {guide.required_parts.map((part, i) => (
                      <div key={i} className="text-sm">
                        <div className="text-white/80">{part.name}</div>
                        {part.part_number && (
                          <code className="text-xs text-white/50">{part.part_number}</code>
                        )}
                        {part.estimated_cost && (
                          <span className="text-green-400 text-xs ml-2">{part.estimated_cost}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Community Tips */}
            {communitySolutions.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-blue-400">Community Tips for This Issue</h3>
                </div>
                <div className="space-y-2">
                  {communitySolutions.slice(0, 3).map((sol, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{sol.title}</span>
                        <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                          {sol.upvotes - sol.downvotes} ↑
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 line-clamp-2">{sol.solution}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-3">
              <h3 className="font-semibold text-white text-lg">Step-by-Step Instructions</h3>
              {guide.steps?.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-white/10 rounded-xl overflow-hidden"
                >
                  <div
                    onClick={() => toggleStep(index)}
                    className="p-4 bg-white/5 hover:bg-white/10 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(index);
                        }}
                        className="shrink-0"
                      >
                        {completedSteps.has(index) ? (
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        ) : (
                          <Circle className="w-6 h-6 text-white/40" />
                        )}
                      </button>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Step {step.step_number}</div>
                        <div className={`font-medium ${completedSteps.has(index) ? 'line-through text-white/50' : 'text-white'}`}>
                          {step.title}
                        </div>
                      </div>
                    </div>
                    {expandedSteps.has(index) ? (
                      <ChevronUp className="w-5 h-5 text-white/40" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/40" />
                    )}
                  </div>

                  <AnimatePresence>
                    {expandedSteps.has(index) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-3 border-t border-white/10">
                          <p className="text-white/80 text-sm leading-relaxed">{step.description}</p>

                          {/* Visual Resources */}
                          <div className="flex gap-2">
                            {step.image_search_terms && (
                              <a
                                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(step.image_search_terms)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-400 hover:bg-purple-500/20 transition-colors"
                              >
                                <ImageIcon className="w-3 h-3" />
                                View Images
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {step.video_search_terms && (
                              <a
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(step.video_search_terms)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                              >
                                <Video className="w-3 h-3" />
                                Watch Videos
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {step.tips?.length > 0 && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-semibold text-blue-400">Pro Tips</span>
                              </div>
                              <ul className="space-y-1">
                                {step.tips.map((tip, i) => (
                                  <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {step.warnings?.length > 0 && (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                              <ul className="space-y-1">
                                {step.warnings.map((warning, i) => (
                                  <li key={i} className="text-xs text-yellow-400 flex items-start gap-2">
                                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                    {warning}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Verification */}
            {guide.verification_steps?.length > 0 && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <h3 className="font-semibold text-green-400 mb-2">After Repair - Verify Everything Works</h3>
                <ul className="space-y-1">
                  {guide.verification_steps.map((step, i) => (
                    <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Troubleshooting */}
            {guide.troubleshooting?.length > 0 && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <h3 className="font-semibold text-orange-400 mb-2">Troubleshooting</h3>
                <ul className="space-y-1">
                  {guide.troubleshooting.map((tip, i) => (
                    <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                      <span className="text-orange-400 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <span className="text-sm text-white/70">Was this guide helpful?</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRating(true)}
                  className="border-white/20 hover:bg-white/10"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Rate Guide
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFlag(true)}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report Issue
                </Button>
              </div>
            </div>

            {/* Rating Modal */}
            {showRating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-white/10 border border-white/20"
              >
                <h4 className="font-semibold text-white mb-3">Rate This Guide</h4>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional: Share your experience (what worked, what didn't)..."
                  className="bg-white/5 border-white/10 text-white mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => submitRating.mutate()}
                    disabled={rating === 0 || submitRating.isPending}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {submitRating.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Rating'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowRating(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Flag Modal */}
            {showFlag && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
              >
                <h4 className="font-semibold text-white mb-3">Report an Issue</h4>
                <select
                  value={flagType}
                  onChange={(e) => setFlagType(e.target.value)}
                  className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white mb-3"
                >
                  <option value="">Select issue type...</option>
                  <option value="inaccurate">Inaccurate Information</option>
                  <option value="outdated">Outdated Procedure</option>
                  <option value="unsafe">Safety Concern</option>
                  <option value="incomplete">Missing Steps</option>
                  <option value="other">Other</option>
                </select>
                <Textarea
                  value={flagDetails}
                  onChange={(e) => setFlagDetails(e.target.value)}
                  placeholder="Please describe the issue..."
                  className="bg-white/5 border-white/10 text-white mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => submitFlag.mutate()}
                    disabled={!flagType || !flagDetails || submitFlag.isPending}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {submitFlag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowFlag(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
