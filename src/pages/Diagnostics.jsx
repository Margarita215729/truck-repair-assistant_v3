import React, { useState, useRef, useEffect } from 'react';
import { entities } from '@/services/entityService';
import { invokeLLM, uploadFile } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, FileText, Wrench, Plus, AlertTriangle, History } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

import TruckSelector from '@/components/diagnostics/TruckSelector';
import AudioRecorder from '@/components/diagnostics/AudioRecorder';
import SymptomPicker from '@/components/diagnostics/SymptomPicker';
import ErrorCodeInput from '@/components/diagnostics/ErrorCodeInput';
import ChatMessage from '@/components/diagnostics/ChatMessage';
import QuickPrompts from '@/components/diagnostics/QuickPrompts';
import DiagnosticTools from '@/components/diagnostics/DiagnosticTools';
import ToolkitSelector from '@/components/diagnostics/ToolkitSelector';
import ToolkitManager from '@/components/diagnostics/ToolkitManager';
import SuggestedParts from '@/components/diagnostics/SuggestedParts';
import PartDetailModal from '@/components/parts/PartDetailModal';
import RepairInstructions from '@/components/diagnostics/RepairInstructions.jsx';
import ClarifyingQuestions from '@/components/diagnostics/ClarifyingQuestions.jsx';
import PartPhotoAnalyzer from '@/components/diagnostics/PartPhotoAnalyzer';
import InteractiveRepairGuide from '@/components/diagnostics/InteractiveRepairGuide';
import ChatHistory from '@/components/diagnostics/ChatHistory';
import UpgradePrompt from '@/components/subscription/UpgradePrompt';
import { useAiLimit } from '@/hooks/useAiLimit';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { buildNormalizedPayload } from '@/utils/normalizeIntake';
import { saveAIPartRecommendations } from '@/services/partsService';

export default function Diagnostics() {
  const { t } = useLanguage();
  const { isProUser } = useAuth();
  const { canUse, checkAndIncrement, isLimitReached, dismissLimit, usage } = useAiLimit();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  
  // Chat history sidebar
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  // Diagnostic tools state
  const [truck, setTruck] = useState(null);
  const [errorCodes, setErrorCodes] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [pendingAudio, setPendingAudio] = useState(null);
  const [activeToolkit, setActiveToolkit] = useState(null);
  
  // Roadside context
  const [roadsideContext, setRoadsideContext] = useState({
    whenItHappens: '',
    recentEvents: [],
    dashboardMessage: '',
    checksAlreadyDone: '',
  });
  
  // Modal states
  const [showTruckSelector, setShowTruckSelector] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showSymptomPicker, setShowSymptomPicker] = useState(false);
  const [showErrorCodeInput, setShowErrorCodeInput] = useState(false);
  const [showToolkitSelector, setShowToolkitSelector] = useState(false);
  const [showToolkitManager, setShowToolkitManager] = useState(false);
  const [selectedPartDetail, setSelectedPartDetail] = useState(null);
  const [showPartPhoto, setShowPartPhoto] = useState(false);
  const [showRepairGuide, setShowRepairGuide] = useState(false);
  const [repairGuideProblem, setRepairGuideProblem] = useState('');
  const [pendingAnswers, setPendingAnswers] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState(new Set());
  const [questionRounds, setQuestionRounds] = useState(0);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    }, [messages]);

    const handleNewChat = () => {
    setMessages([]);
    setConversation(null);
    setInput('');
    setActiveToolkit(null);
    setTruck(null);
    setErrorCodes([]);
    setSymptoms([]);
    setPendingAnswers([]);
    setAskedQuestions(new Set());
    setQuestionRounds(0);
    setRoadsideContext({
      whenItHappens: '',
      recentEvents: [],
      dashboardMessage: '',
      checksAlreadyDone: '',
    });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    toast.success(t('diagnostics.newChatStarted'));
    };

    /** Load a conversation from chat history */
    const handleLoadChat = (conv) => {
      setMessages(Array.isArray(conv.messages) ? conv.messages : []);
      setConversation(conv);
      setInput('');
      setPendingAnswers([]);
      setAskedQuestions(new Set());
      setQuestionRounds(0);
      // Restore truck context if available
      if (conv.truck_make || conv.truck_model) {
        setTruck({
          make: conv.truck_make || '',
          model: conv.truck_model || '',
          year: conv.truck_year || '',
        });
      }
      setErrorCodes(conv.error_codes || []);
      setSymptoms(conv.symptoms || []);
      setRoadsideContext({
        whenItHappens: '',
        recentEvents: [],
        dashboardMessage: '',
        checksAlreadyDone: '',
      });
      setActiveToolkit(null);
      // Scroll to the bottom once messages render
      setTimeout(() => scrollToBottom(), 100);
    };

    const buildContextPrompt = () => {
    let context = '';
    
    if (activeToolkit) {
      context += `\n\n🔧 ACTIVE DIAGNOSTIC TOOLKIT: "${activeToolkit.name}"`;
      context += `\nToolkit Truck: ${activeToolkit.truck_year} ${activeToolkit.truck_make} ${activeToolkit.truck_model}`;
      
      if (activeToolkit.description) {
        context += `\nToolkit Focus: ${activeToolkit.description}`;
      }
      
      if (activeToolkit.error_codes?.length > 0) {
        context += `\nToolkit Error Codes: ${activeToolkit.error_codes.join(', ')}`;
      }
      
      if (activeToolkit.symptoms?.length > 0) {
        context += `\nToolkit Symptoms: ${activeToolkit.symptoms.join(', ')}`;
      }
      
      if (activeToolkit.notes) {
        context += `\nToolkit Notes: ${activeToolkit.notes}`;
      }
      
      context += `\n\n⚠️ CRITICAL: This is a pre-configured toolkit. The user is specifically asking about this combination of truck, codes, and symptoms. Search forums extensively for this EXACT combination. Find trending issues, proven solutions, and community consensus for: ${activeToolkit.truck_make} ${activeToolkit.truck_model} with codes ${activeToolkit.error_codes?.join(', ') || 'N/A'}.`;
    }
    
    if (truck) {
      context += `\n\n🚛 TRUCK DETAILS: ${truck.year} ${truck.make} ${truck.model}`;
      
      if (truck.details) {
        const details = truck.details;
        if (details.vin) context += `\nVIN: ${details.vin}`;
        if (details.mileage) context += `\nCurrent Mileage: ${details.mileage.toLocaleString()} miles`;
        if (details.engine_type) context += `\nEngine: ${details.engine_type}`;
        if (details.engine_displacement) context += ` (${details.engine_displacement})`;
        if (details.transmission_model) context += `\nTransmission: ${details.transmission_model}`;
        if (details.fuel_type) context += `\nFuel Type: ${details.fuel_type}`;
        if (details.tire_size) context += `\nTire Size: ${details.tire_size}`;
        
        if (details.fluid_capacities && Object.keys(details.fluid_capacities).length > 0) {
          context += `\nFluid Capacities:`;
          Object.entries(details.fluid_capacities).forEach(([key, value]) => {
            if (value) context += `\n  - ${key.replace('_', ' ')}: ${value}`;
          });
        }
        
        if (details.modifications?.length > 0) {
          context += `\nModifications: ${details.modifications.join(', ')}`;
        }
        
        if (details.maintenance_notes) {
          context += `\nMaintenance Notes: ${details.maintenance_notes}`;
        }
      }
    }
    
    if (errorCodes.length > 0) {
      context += `\n\n⚠️ Error Codes: ${errorCodes.join(', ')}`;
    }
    
    if (symptoms.length > 0) {
      context += `\n\n🔍 Symptoms: ${symptoms.join(', ')}`;
    }

    // Roadside context fields
    const rc = roadsideContext || {};
    if (rc.whenItHappens) context += `\n⏱️ When it happens: ${rc.whenItHappens}`;
    if (rc.recentEvents?.length > 0) context += `\n📅 Recent events: ${rc.recentEvents.join(', ')}`;
    if (rc.dashboardMessage) context += `\n🔔 Dashboard message: ${rc.dashboardMessage}`;
    if (rc.checksAlreadyDone) context += `\n✅ Already checked/replaced: ${rc.checksAlreadyDone}`;
    if (truck?.vin) context += `\n🔑 VIN: ${truck.vin}`;
    
    return context;
  };

  const handleLoadToolkit = (toolkit) => {
    setActiveToolkit(toolkit);
    setTruck({
      make: toolkit.truck_make,
      model: toolkit.truck_model,
      year: toolkit.truck_year
    });
    setErrorCodes(toolkit.error_codes || []);
    setSymptoms(toolkit.symptoms || []);
    toast.success(t('diagnostics.toolkitLoaded'));
  };

  const handleAnswerClarifyingQuestion = (question, answer) => {
    setPendingAnswers(prev => [...prev, { question, answer }]);
    setAskedQuestions(prev => new Set([...prev, question.toLowerCase()]));
  };

  const handlePartIdentified = (partInfo) => {
    const message = `I've identified a part from a photo:\n\nPart: ${partInfo.part_name}\nCondition: ${partInfo.condition}\n${partInfo.oem_numbers?.length ? `OEM Numbers: ${partInfo.oem_numbers.join(', ')}` : ''}\n\nWhat should I know about replacing this part?`;
    sendMessage(message);
    setShowPartPhoto(false);
  };

  const handleGenerateGuide = (problem) => {
    setRepairGuideProblem(problem);
    setShowRepairGuide(true);
  };

  const sendMessage = async (messageText, audioUrl = null) => {
    if (!messageText.trim() && !audioUrl) return;

    // Roadside mode: No truck requirement for first message.
    if (!truck && messages.length === 0) {
      // Suggest truck selection but never block
    }

    // Check AI usage limit before sending
    const allowed = await checkAndIncrement();
    if (!allowed) {
      toast.error(t('diagnostics.aiLimitReached'));
      return;
    }
    
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      audio_url: audioUrl
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const contextPrompt = buildContextPrompt();
      
      // Fetch relevant community solutions
      let communitySolutions = [];
      try {
        const solutions = await entities.KnowledgeBase.list('-upvotes', 20);
        communitySolutions = solutions.filter(s => {
          if (truck && s.truck_make !== truck.make) return false;
          if (errorCodes.length > 0 && s.error_codes?.some(code => errorCodes.includes(code))) return true;
          if (symptoms.length > 0 && s.symptoms?.some(sym => symptoms.includes(sym))) return true;
          return false;
        }).slice(0, 5);
      } catch (err) {
        console.error('Failed to fetch community solutions:', err);
      }
      
      let communitySolutionsContext = '';
      if (communitySolutions.length > 0) {
        communitySolutionsContext = `\n\n📚 RELEVANT COMMUNITY SOLUTIONS (${communitySolutions.length} found):\n`;
        communitySolutions.forEach((sol, i) => {
          communitySolutionsContext += `\n${i + 1}. "${sol.title}" by ${sol.created_by}`;
          communitySolutionsContext += `\n   Truck: ${sol.truck_make} ${sol.truck_model || ''} ${sol.engine_type ? `(${sol.engine_type})` : ''}`;
          communitySolutionsContext += `\n   Rating: ${sol.upvotes - sol.downvotes} (${sol.upvotes}↑ ${sol.downvotes}↓)`;
          if (sol.verified) communitySolutionsContext += ` ✓ VERIFIED`;
          communitySolutionsContext += `\n   Problem: ${sol.problem_description.substring(0, 150)}...`;
          communitySolutionsContext += `\n   Solution: ${sol.solution.substring(0, 200)}...`;
          if (sol.cost_saved) communitySolutionsContext += `\n   Cost Saved: $${sol.cost_saved}`;
          communitySolutionsContext += `\n`;
        });
      }
      
      let fullPrompt = `DIAGNOSTIC CONTEXT:
${contextPrompt}
${communitySolutionsContext}

COMMUNICATION RULES:
- Keep initial responses SHORT (2-3 sentences)
- Lead with clarifying questions FIRST, only provide detailed analysis after gathering info
- NEVER include questions in "response" — use "clarifying_questions" array only
- MAXIMUM 2 rounds of clarifying questions, then PROVIDE SOLUTION with repair_instructions and suggested_parts
- Current question round: ${questionRounds + 1}/2
${questionRounds >= 1 ? '- THIS IS YOUR LAST ROUND OF QUESTIONS. Next response MUST include repair_instructions and suggested_parts.' : ''}
${questionRounds >= 2 ? '- STOP ASKING QUESTIONS. Provide complete diagnosis with repair_instructions and suggested_parts NOW.' : ''}

DIAGNOSTIC APPROACH:
1. TRIAGE: determine urgency + affected system
2. NARROW DOWN: specific component / subsystem
3. SOLUTION: repair instructions, parts, cost-saving tips

PARTS SUGGESTIONS:
- For each part: OEM number + aftermarket alternatives
- Quality tiers: OEM, premium aftermarket, economy, remanufactured
- NEVER invent specific prices — use approximate ranges only

Previous conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${messageText}${audioUrl ? '\n[User has attached an audio recording of engine sound]' : ''}`;

      const response = await invokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            response: { type: "string", description: "The main diagnostic response with forum insights embedded" },
            dtc_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  common_causes: { type: "array", items: { type: "string" } },
                  immediate_action_required: { type: "boolean" },
                  can_drive: { type: "boolean" }
                }
              }
            },
            clarifying_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  quick_answers: { type: "array", items: { type: "string" } },
                  reasoning: { type: "string", description: "Why you're asking this question" }
                }
              }
            },
            diagnostic_progress: {
              type: "object",
              properties: {
                stage: { type: "string", description: "Current stage: triage, system_focus, root_cause, or solution" },
                stage_number: { type: "number", description: "1, 2, or 3" },
                ruled_out: { type: "array", items: { type: "string" }, description: "What's been eliminated" },
                likely_causes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      cause: { type: "string" },
                      probability: { type: "string", description: "high, medium, or low" }
                    }
                  }
                }
              }
            },
            community_matches: {
              type: "object",
              properties: {
                count: { type: "number" },
                preview: { type: "string", description: "Brief preview of matching community solutions" }
              }
            },
            repair_instructions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  procedure_name: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "moderate", "difficult", "professional"] },
                  estimated_time: { type: "string" },
                  tools_required: { type: "array", items: { type: "string" } },
                  steps: { type: "array", items: { type: "string" } },
                  safety_warnings: { type: "array", items: { type: "string" } }
                }
              }
            },
            suggested_parts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  oem_part_number: { type: "string" },
                  description: { type: "string" },
                  compatibility_notes: { type: "string" },
                  interchangeable_parts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        brand: { type: "string" },
                        part_number: { type: "string" },
                        quality_tier: { type: "string", enum: ["OEM", "premium_aftermarket", "economy_aftermarket", "remanufactured"] },
                        estimated_price_range: { type: "string", description: "e.g. $50-$120" },
                        warranty: { type: "string" }
                      }
                    }
                  },
                  fitment_confidence: { type: "string" },
                  installation_difficulty: { type: "string" },
                  why_needed: { type: "string" }
                }
              }
            },
            follow_up_questions: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["response"]
        }
      });

      // Filter out duplicate questions
      const filteredQuestions = (response.clarifying_questions || []).filter(q => {
        const questionLower = q.question.toLowerCase();
        return !askedQuestions.has(questionLower);
      });

      // Track question rounds
      if (filteredQuestions.length > 0) {
        setQuestionRounds(prev => prev + 1);
      }

      const assistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        follow_up_questions: response.follow_up_questions || [],
        suggested_parts: response.suggested_parts || [],
        dtc_analysis: response.dtc_analysis || [],
        clarifying_questions: filteredQuestions,
        repair_instructions: response.repair_instructions || [],
        diagnostic_progress: response.diagnostic_progress || null,
        community_matches: response.community_matches || null
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save AI part recommendations to user's catalog (non-blocking, no prices)
      if (response.suggested_parts?.length > 0) {
        saveAIPartRecommendations(
          response.suggested_parts,
          truck ? { make: truck.make, model: truck.model, year: truck.year } : {},
          errorCodes || []
        ).catch(err => console.warn('Parts catalog save failed:', err));
      }

      // Save conversation
      const allMessages = [...messages, userMessage, assistantMessage];
      if (conversation) {
        await entities.Conversation.update(conversation.id, {
          messages: allMessages,
          truck_make: truck?.make,
          truck_model: truck?.model,
          truck_year: truck?.year,
          error_codes: errorCodes,
          symptoms: symptoms
        });
      } else {
        const newConversation = await entities.Conversation.create({
          title: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
          messages: allMessages,
          truck_make: truck?.make,
          truck_model: truck?.model,
          truck_year: truck?.year,
          error_codes: errorCodes,
          symptoms: symptoms,
          status: 'active'
        });
        setConversation(newConversation);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

    } catch (error) {
      console.error('Error:', error);
      toast.error(t('diagnostics.responseFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioCaptured = async (blob, localUrl, description) => {
    try {
      const file = new File([blob], 'engine-sound.webm', { type: 'audio/webm' });
      const { file_url } = await uploadFile({ file });
      
      const message = `I've recorded my engine sound. Here's what I'm hearing:\n\n${description}\n\nPlease analyze this sound and help me identify any problems.`;
      sendMessage(message, file_url);
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error(t('diagnostics.audioUploadFailed'));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickPrompt = (prompt) => {
    sendMessage(prompt);
  };

  const generateReport = async () => {
    if (messages.length < 2) {
      toast.error('Need more conversation to generate a report');
      return;
    }

    setIsGeneratingReport(true);
    try {
      // Compute normalized payload — vin_status and dtc_status are deterministic
      const normalized = buildNormalizedPayload({
        truck,
        roadsideContext,
        messages,
        errorCodes,
        symptoms,
      });

      const response = await invokeLLM({
        prompt: `You are a roadside truck intake and triage system.

CRITICAL RULES:
- Produce valid JSON only. No markdown. No commentary.
- NEVER hallucinate VINs, fault codes, sensor readings, modules, URLs, or external sources.
- NEVER claim definitive diagnosis. This is roadside intake & triage.
- Missing VIN is NORMAL. Missing fault codes is NORMAL. Work with what you have.
- Perform symptom-driven triage when no codes are available.
- All conclusions must be evidence-based, operational, and honest about confidence.
- The "sources" field must ALWAYS be an empty array.
- The "estimated_costs" field must ALWAYS be null.

CONTEXT (PRE-COMPUTED — do NOT re-derive these values):
${JSON.stringify(normalized, null, 2)}

CONVERSATION HISTORY:
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Generate an INTAKE & TRIAGE REPORT (Roadside) following the exact JSON schema provided.
Focus on:
1. What verified facts exist
2. Most likely hypotheses ranked by probability
3. Actionable conclusions with clear next steps
4. Severity triage — can the driver continue or should they stop?
5. What to tell a mechanic if they need to hand off`,
        response_json_schema: {
          type: "object",
          properties: {
            report_type: { type: "string", enum: ["INTAKE_Triage_Roadside"] },
            generated_at_iso: { type: "string" },
            disclaimer: { type: "string" },
            vehicle_info: {
              type: "object",
              properties: {
                year_reported: { type: ["number", "null"] },
                make: { type: ["string", "null"] },
                model: { type: ["string", "null"] },
                engine: { type: ["string", "null"] },
                transmission: { type: ["string", "null"] },
                mileage_reported: { type: ["string", "null"] },
                vin: { type: ["string", "null"] },
                vin_status: { type: "string", enum: ["provided", "unavailable", "unknown"] }
              }
            },
            fault_codes: {
              type: "object",
              properties: {
                dtc_status: { type: "string", enum: ["active_reported", "history_only", "none_reported", "unknown"] },
                active_codes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      raw_code: { type: "string" },
                      module: { type: ["string", "null"] },
                      system: { type: ["string", "null"] },
                      status: { type: "string", enum: ["active"] },
                      notes: { type: ["string", "null"] }
                    }
                  }
                },
                history_codes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      raw_code: { type: "string" },
                      module: { type: ["string", "null"] },
                      system: { type: ["string", "null"] },
                      status: { type: "string", enum: ["history"] },
                      notes: { type: ["string", "null"] }
                    }
                  }
                },
                notes: { type: ["string", "null"] }
              }
            },
            evidence: {
              type: "object",
              properties: {
                driver_reported_symptoms: { type: "array", items: { type: "string" } },
                when_it_happens: { type: ["string", "null"] },
                recent_events: { type: "array", items: { type: "string" } },
                dashboard_messages: { type: "array", items: { type: "string" } },
                checks_already_done: { type: "array", items: { type: "string" } },
                attachments: {
                  type: "object",
                  properties: {
                    photos: { type: "boolean" },
                    audio: { type: "boolean" }
                  }
                }
              }
            },
            verified_facts: { type: "array", items: { type: "string" } },
            hypotheses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  possible_cause: { type: "string" },
                  confidence: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            conclusions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["primary", "secondary"] },
                  statement: { type: "string" },
                  confidence: { type: "number" },
                  based_on: { type: "array", items: { type: "string" } },
                  recommended_action_now: { type: "string" },
                  success_criteria: { type: "string" },
                  fallback_if_not_confirmed: { type: "string" },
                  escalate_if: { type: "array", items: { type: "string" } }
                }
              }
            },
            next_checks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "number" },
                  action: { type: "string" },
                  why: { type: "string" },
                  how: { type: "string" },
                  expected_result: { type: "string" },
                  if_failed_next: { type: "string" }
                }
              }
            },
            severity_triage: {
              type: "object",
              properties: {
                overall_urgency: { type: "string", enum: ["low", "medium", "high"] },
                tow_recommended: { type: "boolean" },
                do_not_drive_conditions: { type: "array", items: { type: "string" } }
              }
            },
            handoff_to_mechanic: {
              type: "object",
              properties: {
                what_to_tell_shop: { type: "array", items: { type: "string" } },
                questions_for_shop: { type: "array", items: { type: "string" } }
              }
            },
            limitations: { type: "array", items: { type: "string" } },
            estimated_costs: { type: "null" },
            sources: { type: "array", maxItems: 0 }
          },
          required: ["report_type", "disclaimer", "vehicle_info", "fault_codes", "evidence", "verified_facts", "hypotheses", "conclusions", "next_checks", "severity_triage", "handoff_to_mechanic", "limitations"]
        }
      });

      // Override AI-computed status fields with our deterministic values
      if (response.vehicle_info) {
        response.vehicle_info.vin_status = normalized.vehicle_info.vin_status;
        response.vehicle_info.vin = normalized.vehicle_info.vin;
      }
      if (response.fault_codes) {
        response.fault_codes.dtc_status = normalized.fault_codes.dtc_status;
      }
      response.estimated_costs = null;
      response.sources = [];

      await entities.DiagnosticReport.create({
        conversation_id: conversation?.id,
        truck_info: truck ? { make: truck.make, model: truck.model, year: truck.year } : null,
        report_type: 'INTAKE_Triage_Roadside',
        diagnosis_summary: response.conclusions?.[0]?.statement || 'Intake & Triage Report generated',
        report_data: response,
        error_codes_analysis: response.fault_codes?.active_codes || [],
        identified_issues: (response.hypotheses || []).map(h => ({
          issue: h.possible_cause,
          confidence: h.confidence >= 0.7 ? 'high' : h.confidence >= 0.4 ? 'medium' : 'low',
          urgency: response.severity_triage?.overall_urgency || 'medium',
        })),
        recommendations: (response.conclusions || []).map(c => c.recommended_action_now),
        estimated_costs: null,
        sources: [],
      });

      toast.success(t('diagnostics.reportGenerated'));
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(t('diagnostics.reportError'));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const isFirstMessage = messages.length === 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {isFirstMessage ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="relative mb-8">
                <img src="/logo.svg" alt="Truck Repair Assistant" className="w-24 h-24 brand-logo" />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="brand-text-gradient">Truck Repair</span>
                <span className="text-white ml-2">Assistant</span>
              </h1>
              <p className="text-lg text-white/60 max-w-md mb-6">
                {t('diagnostics.welcomeDesc')}
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChatHistory(true)}
                className="mb-6 border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
              >
                <History className="w-4 h-4 mr-2" />
                {t('diagnostics.chatHistory') || 'Chat History'}
              </Button>

              {/* Roadside Context Panel removed — VIN moved to TruckSelector */}

              <div className="w-full max-w-2xl mb-8 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    {activeToolkit && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-brand-orange/10 to-brand-orange-light/10 border border-brand-orange/30"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Wrench className="w-5 h-5 text-brand-orange" />
                            <div>
                              <div className="font-semibold text-white">{activeToolkit.name}</div>
                              <div className="text-xs text-white/60">
                                {activeToolkit.truck_year} {activeToolkit.truck_make} {activeToolkit.truck_model}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveToolkit(null);
                              setTruck(null);
                              setErrorCodes([]);
                              setSymptoms([]);
                            }}
                            className="text-white/60 hover:text-white hover:bg-white/10"
                          >
                            Clear
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <DiagnosticTools
                  truck={truck}
                  errorCodes={errorCodes}
                  symptoms={symptoms}
                  onTruckClick={() => setShowTruckSelector(true)}
                  onAudioClick={() => setShowAudioRecorder(true)}
                  onErrorCodesClick={() => setShowErrorCodeInput(true)}
                  onSymptomsClick={() => setShowSymptomPicker(true)}
                  onToolkitClick={() => setShowToolkitSelector(true)}
                  onPhotoClick={() => setShowPartPhoto(true)}
                  onClearTruck={() => setTruck(null)}
                  onClearCodes={() => setErrorCodes([])}
                  onClearSymptoms={() => setSymptoms([])}
                />
              </div>

              <div className="w-full max-w-2xl">
                <p className="text-sm text-white/40 mb-4">{t('diagnostics.quickStart')}</p>
                <QuickPrompts onSelect={handleQuickPrompt} />
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 pb-32">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <ChatMessage 
                    key={index} 
                    message={message}
                    onPartClick={setSelectedPartDetail}
                    onAnswerQuestion={handleAnswerClarifyingQuestion}
                    onGenerateGuide={handleGenerateGuide}
                  />
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-orange to-brand-orange-light flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-white/60">
                      <span className="text-sm">{t('diagnostics.thinking')}</span>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[#0b1012] via-[#0b1012] to-transparent pt-8">
        <div className="max-w-4xl mx-auto px-4 pb-6">
          {!isFirstMessage && (
            <div className="mb-3 space-y-2">
              {activeToolkit && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-brand-orange/10 to-brand-orange-light/10 border border-brand-orange/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-brand-orange" />
                      <div className="text-sm">
                        <span className="font-medium text-white">{activeToolkit.name}</span>
                        <span className="text-white/50 ml-2">
                          {activeToolkit.truck_year} {activeToolkit.truck_make} {activeToolkit.truck_model}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveToolkit(null);
                        setTruck(null);
                        setErrorCodes([]);
                        setSymptoms([]);
                      }}
                      className="h-7 text-xs text-white/60 hover:text-white hover:bg-white/10"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <DiagnosticTools
                  truck={truck}
                  errorCodes={errorCodes}
                  symptoms={symptoms}
                  onTruckClick={() => setShowTruckSelector(true)}
                  onAudioClick={() => setShowAudioRecorder(true)}
                  onErrorCodesClick={() => setShowErrorCodeInput(true)}
                  onSymptomsClick={() => setShowSymptomPicker(true)}
                  onToolkitClick={() => setShowToolkitSelector(true)}
                  onPhotoClick={() => setShowPartPhoto(true)}
                  onClearTruck={() => setTruck(null)}
                  onClearCodes={() => setErrorCodes([])}
                  onClearSymptoms={() => setSymptoms([])}
                />

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    onClick={() => setShowChatHistory(true)}
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                  >
                    <History className="w-4 h-4 mr-2" />
                    {t('diagnostics.chatHistory') || 'Chat History'}
                  </Button>
                  {messages.length > 0 && (
                    <Button
                      onClick={handleNewChat}
                      variant="outline"
                      size="sm"
                      className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('diagnostics.newChat')}
                    </Button>
                  )}

                  {messages.length >= 2 && (
                    <Button
                      variant="outline"
                      onClick={generateReport}
                      disabled={isGeneratingReport}
                      className="border-white/20 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                    >
                      {isGeneratingReport ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      {t('diagnostics.generateReport')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {pendingAnswers.length > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-400">
                  {pendingAnswers.length} {pendingAnswers.length > 1 ? t('diagnostics.pendingAnswers') : t('diagnostics.pendingAnswer')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingAnswers([])}
                  className="h-6 text-xs text-white/60 hover:text-white hover:bg-white/10"
                >
                  Clear
                </Button>
              </div>
              <div className="space-y-1 text-xs text-white/70">
                {pendingAnswers.map((a, i) => (
                  <div key={i} className="truncate">
                    <span className="text-white/90">Q:</span> {a.question.substring(0, 40)}...
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('diagnostics.inputPlaceholder')}
              className="w-full min-h-[60px] max-h-[200px] resize-none bg-white/5 border-brand-dark/30 text-white placeholder:text-white/40 rounded-2xl pr-14 py-4 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange/50"
              disabled={isLoading}
            />
            <Button
              onClick={() => {
                if (!truck && messages.length === 0) {
                  toast.error(t('diagnostics.selectTruck'));
                  setShowTruckSelector(true);
                  return;
                }

                let messageToSend = input.trim();

                if (pendingAnswers.length > 0) {
                  const answersText = pendingAnswers.map(a => `${a.question}\nAnswer: ${a.answer}`).join('\n\n');
                  messageToSend = messageToSend ? `${answersText}\n\n${messageToSend}` : answersText;
                  setPendingAnswers([]);
                }

                if (!messageToSend && truck && symptoms.length > 0) {
                  messageToSend = `I have a ${truck.year} ${truck.make} ${truck.model} with these symptoms: ${symptoms.join(', ')}. ${errorCodes.length > 0 ? `Error codes: ${errorCodes.join(', ')}. ` : ''}Please help me diagnose the issue.`;
                }

                if (messageToSend) {
                  sendMessage(messageToSend);
                }
              }}
              disabled={(!input.trim() && !(truck && symptoms.length > 0) && pendingAnswers.length === 0) || isLoading}
              className="absolute right-2 bottom-2 w-10 h-10 rounded-xl bg-gradient-to-r from-brand-orange to-brand-orange-light hover:from-[#e8851f] hover:to-[#d67a18] disabled:opacity-50 disabled:cursor-not-allowed p-0 shadow-lg shadow-brand-orange/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* AI Limit Warning */}
          {isLimitReached && (
            <div className="mt-3">
              <UpgradePrompt type="ai" onDismiss={dismissLimit} />
            </div>
          )}

          {/* AI Usage Counter for free users */}
          {!isProUser && usage && !isLimitReached && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <AlertTriangle className="w-3 h-3 text-yellow-500/70" />
              <span className="text-xs text-white/40">
                {usage.remaining} {t('diagnostics.requestsRemaining')}
              </span>
            </div>
          )}
          
          <p className="text-center text-xs text-white/30 mt-3">
            {t('diagnostics.disclaimer')}
          </p>
        </div>
      </div>

      {/* Modals */}
      <TruckSelector
        open={showTruckSelector}
        onClose={() => setShowTruckSelector(false)}
        onSelect={setTruck}
        currentTruck={truck}
      />
      
      <AudioRecorder
        open={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onAudioCaptured={handleAudioCaptured}
      />
      
      <SymptomPicker
        open={showSymptomPicker}
        onClose={() => setShowSymptomPicker(false)}
        onSelect={setSymptoms}
        selectedSymptoms={symptoms}
      />
      
      <ErrorCodeInput
        open={showErrorCodeInput}
        onClose={() => setShowErrorCodeInput(false)}
        onSubmit={setErrorCodes}
        currentCodes={errorCodes}
      />
      
      <ToolkitSelector
        open={showToolkitSelector}
        onClose={() => setShowToolkitSelector(false)}
        onSelect={handleLoadToolkit}
        onManage={() => {
          setShowToolkitSelector(false);
          setShowToolkitManager(true);
        }}
      />
      
      <ToolkitManager
        open={showToolkitManager}
        onClose={() => setShowToolkitManager(false)}
      />

      <PartDetailModal
        part={selectedPartDetail}
        open={!!selectedPartDetail}
        onClose={() => setSelectedPartDetail(null)}
      />

      <PartPhotoAnalyzer
        open={showPartPhoto}
        onClose={() => setShowPartPhoto(false)}
        onPartIdentified={handlePartIdentified}
      />

      <InteractiveRepairGuide
        open={showRepairGuide}
        onClose={() => setShowRepairGuide(false)}
        problem={repairGuideProblem}
        truck={truck}
        errorCodes={errorCodes}
        symptoms={symptoms}
      />

      <ChatHistory
        open={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        onSelectChat={(conv) => {
          handleLoadChat(conv);
          setShowChatHistory(false);
        }}
        activeConversationId={conversation?.id}
        onNewChat={() => {
          handleNewChat();
          setShowChatHistory(false);
        }}
      />
    </div>
  );
}
