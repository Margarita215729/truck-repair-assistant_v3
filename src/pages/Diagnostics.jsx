import React, { useState, useRef, useEffect } from 'react';
import { entities } from '@/services/entityService';
import { invokeLLM, uploadFile } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Wrench, MessageSquarePlus, AlertTriangle, AlertCircle, Mic, Lock, History, Info, Eye, Radio, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

import AudioRecorder from '@/components/diagnostics/AudioRecorder';
import SymptomPicker from '@/components/diagnostics/SymptomPicker';
import ErrorCodeInput from '@/components/diagnostics/ErrorCodeInput';
import ChatMessage from '@/components/diagnostics/ChatMessage';
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
import VisualDiagnostics from '@/components/diagnostics/VisualDiagnostics';
import UpgradePrompt from '@/components/subscription/UpgradePrompt';
import { useAiLimit } from '@/hooks/useAiLimit';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useTruck } from '@/lib/TruckContext';
import { buildNormalizedPayload } from '@/utils/normalizeIntake';
import { saveAIPartRecommendations } from '@/services/partsService';
import { searchForums, formatForumContext } from '@/services/forumSearchService';
import { getTruckStateSnapshot, connectProvider } from '@/services/telematics/telematicsService';
import TruckStatePanel from '@/components/diagnostics/TruckStatePanel';
import ScanTruckButton from '@/components/diagnostics/ScanTruckButton';

export default function Diagnostics() {
  const { t } = useLanguage();
  const { isProUser } = useAuth();
  const { canUse, checkAndIncrement, isLimitReached, dismissLimit, usage } = useAiLimit();
  const queryClient = useQueryClient();
  const { truck, setTruck, showTruckSelector, setShowTruckSelector } = useTruck();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState(null);
  
  // Chat history sidebar
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  // Diagnostic tools state
  const [errorCodes, setErrorCodes] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [activeToolkit, setActiveToolkit] = useState(null);
  
  // Roadside context
  const [roadsideContext, setRoadsideContext] = useState({
    whenItHappens: '',
    recentEvents: [],
    dashboardMessage: '',
    checksAlreadyDone: '',
  });
  
  // Modal states
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showSymptomPicker, setShowSymptomPicker] = useState(false);
  const [showErrorCodeInput, setShowErrorCodeInput] = useState(false);
  const [showToolkitSelector, setShowToolkitSelector] = useState(false);
  const [showToolkitManager, setShowToolkitManager] = useState(false);
  const [selectedPartDetail, setSelectedPartDetail] = useState(null);
  const [showPartPhoto, setShowPartPhoto] = useState(false);
  const [showVisualDiagnostics, setShowVisualDiagnostics] = useState(false);
  const [showRepairGuide, setShowRepairGuide] = useState(false);
  const [repairGuideProblem, setRepairGuideProblem] = useState('');
  const [pendingAnswers, setPendingAnswers] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState(new Set());
  const [questionRounds, setQuestionRounds] = useState(0);

  // Telematics truck state
  const [truckStateSnapshot, setTruckStateSnapshot] = useState(null);
  const [truckStateInterpretation, setTruckStateInterpretation] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const inputAreaRef = useRef(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

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
    setTruckStateSnapshot(null);
    setTruckStateInterpretation(null);
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
      setTruckStateSnapshot(null);
      setTruckStateInterpretation(null);
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
      context += `\n\n\uD83D\uDD27 ACTIVE DIAGNOSTIC TOOLKIT: "${activeToolkit.name}"`;
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
      
      context += `\n\n\u26A0\uFE0F CRITICAL: This is a pre-configured toolkit. The user is specifically asking about this combination of truck, codes, and symptoms. Search forums extensively for this EXACT combination. Find trending issues, proven solutions, and community consensus for: ${activeToolkit.truck_make} ${activeToolkit.truck_model} with codes ${activeToolkit.error_codes?.join(', ') || 'N/A'}.`;
    }
    
    if (truck) {
      context += `\n\n\uD83D\uDE9B TRUCK DETAILS: ${truck.year} ${truck.make} ${truck.model}`;
      
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
      context += `\n\n\u26A0\uFE0F Error Codes: ${errorCodes.join(', ')}`;
    }
    
    if (symptoms.length > 0) {
      context += `\n\n\uD83D\uDD0D Symptoms: ${symptoms.join(', ')}`;
    }

    // Roadside context fields
    const rc = roadsideContext || {};
    if (rc.whenItHappens) context += `\n\u23F1\uFE0F When it happens: ${rc.whenItHappens}`;
    if (rc.recentEvents?.length > 0) context += `\n\uD83D\uDCC5 Recent events: ${rc.recentEvents.join(', ')}`;
    if (rc.dashboardMessage) context += `\n\uD83D\uDD14 Dashboard message: ${rc.dashboardMessage}`;
    if (rc.checksAlreadyDone) context += `\n\u2705 Already checked/replaced: ${rc.checksAlreadyDone}`;
    if (truck?.vin) context += `\n\uD83D\uDD11 VIN: ${truck.vin}`;

    // Live telematics truck state
    if (truckStateSnapshot) {
      context += '\n\n\uD83D\uDDA5\uFE0F LIVE TRUCK COMPUTER STATE (from telematics):';
      const snap = truckStateSnapshot;
      if (snap.summary_status) context += `\nOverall Status: ${snap.summary_status.toUpperCase()}`;
      if (snap.stats) {
        context += `\nActive Faults: ${snap.stats.total_active_faults || 0}`;
        context += `\nSignals Tracked: ${snap.stats.total_signals || 0}`;
      }
      if (snap.faults?.length > 0) {
        context += '\nFault Codes from Telematics:';
        snap.faults.forEach(f => {
          context += `\n  - ${f.code_type || 'DTC'} ${f.code}: ${f.description || 'N/A'} [${f.severity || 'unknown'}]`;
        });
      }
      if (snap.signals?.length > 0) {
        context += '\nLive Signals:';
        snap.signals.slice(0, 10).forEach(s => {
          context += `\n  - ${s.signal_name}: ${s.value} ${s.unit || ''}`;
        });
      }
      if (truckStateInterpretation?.overall_assessment) {
        context += `\nAI Assessment: ${truckStateInterpretation.overall_assessment}`;
      }
    }
    
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

  const handleVisualDiagnosisComplete = (result) => {
    const lines = [`Visual diagnosis (${result.image_category || 'photo'}) result:`];
    if (result.probable_diagnosis?.primary) lines.push(`Diagnosis: ${result.probable_diagnosis.primary}`);
    if (result.safety_assessment?.urgency) lines.push(`Urgency: ${result.safety_assessment.urgency}`);
    if (result.dashboard_lights?.length) lines.push(`Dashboard lights: ${result.dashboard_lights.map(l => l.name).join(', ')}`);
    if (result.findings?.length) lines.push(`Findings: ${result.findings.map(f => `${f.item} (${f.severity})`).join('; ')}`);
    if (result.fluid_analysis?.fluid_type) lines.push(`Fluid leak: ${result.fluid_analysis.fluid_type} - ${result.fluid_analysis.probable_source || 'unknown source'}`);
    if (result.probable_diagnosis?.recommended_next_steps?.length) lines.push(`\nRecommended steps:\n${result.probable_diagnosis.recommended_next_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
    lines.push('\nPlease advise on repairs and needed parts.');
    sendMessage(lines.join('\n'));
    setShowVisualDiagnostics(false);
  };

  const handleGenerateGuide = (problem) => {
    setRepairGuideProblem(problem);
    setShowRepairGuide(true);
  };

  /** SCAN TRUCK — fetch live telematics data and inject into chat */
  const handleScanComplete = ({ snapshot, interpretation }) => {
    setTruckStateSnapshot(snapshot);
    setTruckStateInterpretation(interpretation);

    // Build a user-facing summary message
    const status = snapshot?.summary_status || 'unknown';
    const faults = snapshot?.stats?.total_active_faults || 0;
    const signals = snapshot?.stats?.total_signals || 0;

    let summaryLines = [`🖥️ **TRUCK COMPUTER SCAN COMPLETE**`];
    summaryLines.push(`Status: **${status.toUpperCase()}** | Active faults: **${faults}** | Signals: **${signals}**`);

    if (snapshot?.faults?.length > 0) {
      summaryLines.push('\nFault codes detected:');
      snapshot.faults.forEach(f => {
        summaryLines.push(`- ${f.code_type || 'DTC'} ${f.dtc || f.code || 'N/A'}: ${f.description || 'Unknown'} [${f.severity || '?'}]`);
      });
    }

    // Add key live signals
    const snap = snapshot?.current_signals || {};
    const keySignals = ['engine_rpm', 'coolant_temp_c', 'oil_pressure_kpa', 'fuel_level_pct', 'battery_voltage'];
    const signalLines = keySignals
      .filter(k => snap[k])
      .map(k => `- ${k.replace(/_/g, ' ')}: ${snap[k].value} ${snap[k].unit || ''}`);
    if (signalLines.length > 0) {
      summaryLines.push('\nKey live readings:');
      summaryLines.push(...signalLines);
    }

    if (interpretation?.overall_assessment?.summary) {
      summaryLines.push(`\n🤖 AI Assessment: ${interpretation.overall_assessment.summary}`);
      if (interpretation.overall_assessment.safe_to_drive === false) {
        summaryLines.push('⚠️ **NOT SAFE TO DRIVE** — see immediate actions below.');
      }
    }

    summaryLines.push('\nAnalyze the scan data above and advise on any issues found.');

    const scanText = summaryLines.join('\n');
    sendMessage(scanText);
  };

  const [scanningInline, setScanningInline] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const handleInlineScan = async () => {
    setScanningInline(true);
    try {
      const result = await getTruckStateSnapshot(truck?.details?.id || '_auto');
      if (!result) {
        toast.error('Please log in to scan your truck');
        return;
      }
      if (result.meta?.connected === false) {
        setShowProviderPicker(true);
        return;
      }
      if (!result.snapshot) {
        toast.info('Telematics connected but no data yet. Make sure your vehicle is mapped in Profile.');
        return;
      }
      handleScanComplete({ snapshot: result.snapshot, interpretation: result.interpretation });
    } catch (err) {
      console.error('Inline scan failed:', err);
      toast.error('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setScanningInline(false);
    }
  };

  const sendMessage = async (messageText, audioUrl = null) => {
    if (!messageText.trim() && !audioUrl) return;

    // Roadside mode: show gentle nudge if no truck selected (never block)
    if (!truck && messages.length === 0) {
      setShowNudge(true);
      setTimeout(() => setShowNudge(false), 5000);
    } else if (truck && errorCodes.length === 0 && symptoms.length === 0 && messages.length === 0) {
      // Truck selected but no codes/symptoms — lighter nudge
      setShowNudge(true);
      setTimeout(() => setShowNudge(false), 4000);
    }

    // Check AI usage limit before sending (before UI update to avoid ghost messages)
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
      
      // Run community solutions fetch, forum search, and truck state fetch in parallel
      const [communitySolutions, forumSearchResult, truckStateResult] = await Promise.all([
        // Fetch relevant community solutions from local KnowledgeBase
        (async () => {
          try {
            const solutions = await entities.KnowledgeBase.list('-upvotes', 20);
            return solutions.filter(s => {
              if (truck && s.truck_make !== truck.make) return false;
              if (errorCodes.length > 0 && s.error_codes?.some(code => errorCodes.includes(code))) return true;
              if (symptoms.length > 0 && s.symptoms?.some(sym => symptoms.includes(sym))) return true;
              return false;
            }).slice(0, 5);
          } catch (err) {
            console.error('Failed to fetch community solutions:', err);
            return [];
          }
        })(),

        // Search real truck repair forums (non-blocking, 3s timeout)
        searchForums({
          truckMake: truck?.make || activeToolkit?.truck_make,
          truckModel: truck?.model || activeToolkit?.truck_model,
          truckYear: truck?.year || activeToolkit?.truck_year,
          errorCodes,
          symptoms,
          freeText: messageText.substring(0, 100),
        }),

        // Fetch live truck state from telematics (non-blocking)
        (async () => {
          try {
            if (!truck?.details?.id) return null;
            const result = await getTruckStateSnapshot(truck.details.id);
            if (result?.snapshot) {
              setTruckStateSnapshot(result.snapshot);
              setTruckStateInterpretation(result.interpretation);
            }
            return result;
          } catch (err) {
            console.error('Truck state fetch failed:', err);
            return null;
          }
        })(),
      ]);
      
      let communitySolutionsContext = '';
      if (communitySolutions.length > 0) {
        communitySolutionsContext = `\n\n\uD83D\uDCDA RELEVANT COMMUNITY SOLUTIONS (${communitySolutions.length} found):\n`;
        communitySolutions.forEach((sol, i) => {
          communitySolutionsContext += `\n${i + 1}. "${sol.title}" by ${sol.created_by}`;
          communitySolutionsContext += `\n   Truck: ${sol.truck_make} ${sol.truck_model || ''} ${sol.engine_type ? `(${sol.engine_type})` : ''}`;
          communitySolutionsContext += `\n   Rating: ${sol.upvotes - sol.downvotes} (${sol.upvotes}\u2191 ${sol.downvotes}\u2193)`;
          if (sol.verified) communitySolutionsContext += ` \u2713 VERIFIED`;
          communitySolutionsContext += `\n   Problem: ${sol.problem_description.substring(0, 150)}...`;
          communitySolutionsContext += `\n   Solution: ${sol.solution.substring(0, 200)}...`;
          if (sol.cost_saved) communitySolutionsContext += `\n   Cost Saved: $${sol.cost_saved}`;
          communitySolutionsContext += `\n`;
        });
      }
      
      // Format real forum search results (may be empty if CSE not configured or timed out)
      const forumContext = formatForumContext(forumSearchResult?.results || []);

      // Format truck state context for the prompt (direct from fetch result)
      let truckStateContext = '';
      if (truckStateResult?.snapshot) {
        const snap = truckStateResult.snapshot;
        const interp = truckStateResult.interpretation;
        truckStateContext = '\n\n\uD83D\uDDA5\uFE0F LIVE TRUCK COMPUTER STATE (telematics):';
        if (snap.summary_status) truckStateContext += `\nStatus: ${snap.summary_status.toUpperCase()}`;
        if (snap.faults?.length > 0) {
          truckStateContext += '\nActive Faults from Telematics:';
          snap.faults.forEach(f => {
            truckStateContext += `\n- ${f.code_type || 'DTC'} ${f.code}: ${f.description || 'N/A'} [${f.severity || 'unknown'}]`;
          });
        }
        if (snap.signals?.length > 0) {
          truckStateContext += '\nLive Signals:';
          snap.signals.slice(0, 10).forEach(s => {
            truckStateContext += `\n- ${s.signal_name}: ${s.value} ${s.unit || ''}`;
          });
        }
        if (interp?.overall_assessment) {
          truckStateContext += `\nAI Assessment: ${interp.overall_assessment}`;
        }
        if (interp?.maintenance_recommendations?.length > 0) {
          truckStateContext += `\nRecommendations: ${interp.maintenance_recommendations.join('; ')}`;
        }
      }

      let fullPrompt = `DIAGNOSTIC CONTEXT:
${contextPrompt}
${communitySolutionsContext}
${forumContext}
${truckStateContext}

COMMUNICATION RULES:
- Keep initial responses SHORT (2-3 sentences) but ALWAYS informative
- On FIRST message: ask 2-3 targeted clarifying questions AND simultaneously provide your PRELIMINARY diagnosis based on what you already know. Include at least a basic repair_instructions entry with probable steps.
- MAXIMUM 2 rounds of clarifying questions for maximum diagnostic accuracy, then PROVIDE FULL SOLUTION
- Current question round: ${questionRounds + 1}/2
${questionRounds >= 1 ? '- You have gathered initial info. Dig DEEPER \u2014 ask follow-up questions about specific components, sounds, conditions. Provide progressively more detailed repair_instructions with each round.' : ''}
${questionRounds >= 2 ? '- STOP ASKING QUESTIONS. Provide complete detailed diagnosis with FULL repair_instructions (at least 3-5 steps) and suggested_parts NOW. This is mandatory.' : ''}
- NEVER return empty repair_instructions after round 1. If unsure, provide the MOST LIKELY diagnosis.
- ALWAYS fill in "response" with a detailed analysis paragraph \u2014 never a single generic sentence.

DIAGNOSTIC APPROACH:
1. Immediately identify the MOST LIKELY root cause based on truck model + symptoms + error codes
2. Provide specific diagnostic steps the driver can perform RIGHT NOW
3. Give actionable repair instructions with tools, parts, and time estimates
4. If multiple causes are possible, rank them by probability

TELEMATICS DATA:
- When LIVE TRUCK COMPUTER STATE is provided, use it as PRIMARY evidence
- Correlate telematics fault codes with user-reported symptoms
- Reference specific signal values (e.g., coolant temp, oil pressure) in your analysis
- If telematics shows anomalous signals, flag them prominently

INSUFFICIENT INFORMATION HANDLING:
- If the user's message is too vague, incomplete, or lacks critical details (no truck model, no symptoms described, just "help" or "problem"), set "insufficient_info" to true
- When insufficient_info is true: set "response" to explain WHAT specific information is missing and WHY it matters for diagnosis
- ALWAYS provide "preliminary_suggestions" \u2014 a list of general troubleshooting steps the user can do RIGHT NOW even without a precise diagnosis
- Even with insufficient info, try to give SOMETHING useful \u2014 never leave the user empty-handed
- Example: user says "truck broken" \u2192 insufficient_info: true, explain you need make/model/year, symptoms, error codes, and provide general inspection checklist

CRITICAL RULES:
- NEVER say "General truck issue detected" or similar vague phrases
- ALWAYS reference the specific truck make/model and symptoms in your analysis
- For DPF/EGR/emission symptoms, provide the SPECIFIC regeneration procedure or EGR cleaning steps
- For error codes, explain EXACTLY what each code means for THIS truck model
- Include real-world knowledge: common failures for this truck/engine combo, TSBs, recalls

AUDIO ANALYSIS:
- When DSP audio analysis data is provided, use the frequency patterns, anomaly scores, and component classifications to support your diagnostic assessment
- Correlate dominant frequencies with known mechanical failure signatures (e.g., combustion misfire at 20-200Hz, bearing wear at 1500-4000Hz, turbo whine at 2000-8000Hz)
- Combine DSP data with the user's subjective description for a more accurate diagnosis
- If DSP severity is "moderate" or higher, flag it prominently in your response

FORUM REFERENCES:
- When REAL FORUM DISCUSSIONS are provided, reference them with their actual URLs \u2014 these are verified real posts
- Cite relevant forum posts to support your diagnosis (e.g., "According to a discussion on TruckersReport: [url]")
- NEVER invent or fabricate forum URLs \u2014 only cite URLs from the provided forum context
- If no forum context is provided, do NOT mention forums or make up forum references

PARTS SUGGESTIONS:
- For each part: OEM number + aftermarket alternatives
- Quality tiers: OEM, premium aftermarket, economy, remanufactured
- NEVER invent specific prices \u2014 use approximate ranges only

Previous conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${messageText}${audioUrl ? '\n[User has attached an audio recording of engine sound]' : ''}`;

      const response = await invokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: true,
        model: 'openai/gpt-4o',
        response_json_schema: {
          type: "object",
          properties: {
            response: { type: "string", description: "Detailed diagnostic response \u2014 NEVER generic. Always reference specific truck, symptoms, and likely causes." },
            insufficient_info: { type: "boolean", description: "Set to true when the user's message lacks critical details needed for accurate diagnosis (no truck model, vague symptoms, etc.)" },
            missing_details: { type: "array", items: { type: "string" }, description: "List of specific missing pieces of information (e.g. 'Truck make and model', 'Specific symptoms', 'Error codes')" },
            preliminary_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short actionable title" },
                  description: { type: "string", description: "What to do and why" }
                }
              },
              description: "General troubleshooting steps user can take even without full info"
            },
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
        community_matches: response.community_matches || null,
        isFallback: response._isFallback || false,
        insufficient_info: response.insufficient_info || false,
        missing_details: response.missing_details || [],
        preliminary_suggestions: response.preliminary_suggestions || [],
      };

      // Save conversation using functional state to avoid stale closure
      // Save AI part recommendations to user's catalog (non-blocking, no prices)
      if (response.suggested_parts?.length > 0) {
        saveAIPartRecommendations(
          response.suggested_parts,
          truck ? { make: truck.make, model: truck.model, year: truck.year } : {},
          errorCodes || []
        ).catch(err => console.warn('Parts catalog save failed:', err));
      }

      const allMessages = [...messages, userMessage, assistantMessage];
      setMessages(prev => {
        // Use prev (latest state) for the save, not the stale outer `messages`
        const latestAll = [...prev, assistantMessage];
        // Fire save asynchronously using latest messages
        (async () => {
          try {
            if (conversation) {
              await entities.Conversation.update(conversation.id, {
                messages: latestAll,
                truck_make: truck?.make,
                truck_model: truck?.model,
                truck_year: truck?.year,
                error_codes: errorCodes,
                symptoms: symptoms
              });
            } else {
              const newConversation = await entities.Conversation.create({
                title: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
                messages: latestAll,
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
          } catch (err) {
            console.error('Failed to save conversation:', err);
          }
        })();
        return latestAll;
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error(t('diagnostics.responseFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioCaptured = async (blob, localUrl, description, analysisResults = null) => {
    try {
      const file = new File([blob], 'engine-sound.webm', { type: 'audio/webm' });
      const { file_url } = await uploadFile({ file });

      // Format DSP analysis results into structured text for the AI
      let dspSection = '';
      if (analysisResults) {
        const results = Array.isArray(analysisResults) ? analysisResults : [analysisResults];
        dspSection = '\n\n\uD83D\uDCCA DSP AUDIO ANALYSIS (client-side frequency analysis of the recording):\n';
        results.forEach((r, i) => {
          dspSection += `\nComponent ${i + 1}: ${(r.component || 'unknown').toUpperCase()}`;
          dspSection += `\n  Failure type: ${r.failure_type || 'N/A'}`;
          dspSection += `\n  Confidence: ${Math.round((r.confidence || 0) * 100)}%`;
          dspSection += `\n  Anomaly score: ${((r.anomaly_score || 0) * 100).toFixed(0)}%`;
          dspSection += `\n  Severity: ${r.severity || 'unknown'}`;
          if (r.frequency_patterns) {
            dspSection += `\n  Frequency patterns: Low=${r.frequency_patterns.low_freq?.toFixed(0) || '\u2014'}Hz, Mid=${r.frequency_patterns.mid_freq?.toFixed(0) || '\u2014'}Hz, High=${r.frequency_patterns.high_freq?.toFixed(0) || '\u2014'}Hz`;
          }
        });
      }

      const message = `I've recorded my engine sound. Here's what I'm hearing:\n\n${description}${dspSection}\n\nPlease analyze this sound data and help me identify any problems.`;
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

  const generateReport = async () => {
    if (messages.length < 2) {
      toast.error('Need more conversation to generate a report');
      return;
    }

    setIsGeneratingReport(true);
    try {
      // Compute normalized payload \u2014 vin_status and dtc_status are deterministic
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

CONTEXT (PRE-COMPUTED \u2014 do NOT re-derive these values):
${JSON.stringify(normalized, null, 2)}

CONVERSATION HISTORY:
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Generate an INTAKE & TRIAGE REPORT (Roadside) following the exact JSON schema provided.
Focus on:
1. What verified facts exist
2. Most likely hypotheses ranked by probability
3. Actionable conclusions with clear next steps
4. Severity triage \u2014 can the driver continue or should they stop?
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

                {/* \u2500\u2500 Tool cards grid \u2500\u2500 */}
                {(() => {
                  const toolDisabled = !truck;
                  const handleDisabled = () => {
                    toast.info(t('diagnostics.selectTruckFirst') || 'Please select your truck first using the truck button in the top menu');
                    setShowTruckSelector(true);
                  };
                  const cards = [
                    // { icon: Mic,            label: t('diagnostics.sound') || 'Sound',    desc: t('diagnostics.soundDesc') || 'Record engine / brake sounds',    color: 'orange', onClick: () => setShowAudioRecorder(true) },
                    { icon: AlertCircle,     label: t('diagnostics.codes') || 'Codes',    desc: t('diagnostics.codesDesc') || 'Enter DTC / fault codes',         color: 'red',    onClick: () => setShowErrorCodeInput(true) },
                    { icon: AlertTriangle,   label: t('diagnostics.symptoms') || 'Symptoms', desc: t('diagnostics.symptomsDesc') || 'Describe what you notice', color: 'yellow', onClick: () => setShowSymptomPicker(true) },
                    { icon: Eye,             label: t('diagnostics.visual') || 'Visual',  desc: t('diagnostics.visualDesc') || 'Photo / video of the issue',     color: 'emerald', onClick: () => setShowVisualDiagnostics(true) },
                    { icon: null, isScanButton: true },
                  ];
                  const colorMap = {
                    orange:  { bg: 'from-orange-500/10 to-orange-400/5',  border: 'border-orange-500/20 hover:border-orange-500/40',  icon: 'text-orange-400',  text: 'text-orange-300/90' },
                    red:     { bg: 'from-red-500/10 to-red-400/5',        border: 'border-red-500/20 hover:border-red-500/40',        icon: 'text-red-400',     text: 'text-red-300/90' },
                    yellow:  { bg: 'from-yellow-500/10 to-yellow-400/5',  border: 'border-yellow-500/20 hover:border-yellow-500/40',  icon: 'text-yellow-400',  text: 'text-yellow-300/90' },
                    emerald: { bg: 'from-emerald-500/10 to-emerald-400/5', border: 'border-emerald-500/20 hover:border-emerald-500/40', icon: 'text-emerald-400', text: 'text-emerald-300/90' },
                  };
                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {cards.map((card) => {
                        if (card.isScanButton) {
                          return (
                            <ScanTruckButton
                              key="scan-truck"
                              vehicleProfileId={truck?.details?.id}
                              onScanComplete={handleScanComplete}
                            />
                          );
                        }
                        const { icon: Icon, label, desc, color, onClick } = card;
                        const c = colorMap[color];
                        return (
                          <motion.button
                            key={label}
                            whileHover={{ scale: toolDisabled ? 1 : 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={toolDisabled ? handleDisabled : onClick}
                            className={`relative flex flex-col sm:flex-col flex-row items-center gap-2 sm:gap-2 p-3 sm:p-5 rounded-2xl border bg-gradient-to-b sm:bg-gradient-to-b bg-gradient-to-r transition-all duration-200
                              ${toolDisabled ? 'border-white/5 from-white/[0.02] to-transparent opacity-40 cursor-pointer' : `${c.border} ${c.bg}`}`}
                          >
                            <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${toolDisabled ? 'bg-white/5' : 'bg-white/5'}`}>
                              <Icon className={`w-5 h-5 ${toolDisabled ? 'text-white/30' : c.icon}`} />
                            </div>
                            <span className={`text-sm font-semibold ${toolDisabled ? 'text-white/30' : 'text-white/90'}`}>{label}</span>
                            <span className={`text-[11px] leading-tight text-center ${toolDisabled ? 'text-white/15' : 'text-white/40'}`}>{desc}</span>
                            {toolDisabled && <Lock className="absolute top-2 right-2 w-3 h-3 text-white/20" />}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* \u2500\u2500 Chat History (subtle) \u2500\u2500 */}
                <button
                  onClick={() => setShowChatHistory(true)}
                  className="flex items-center gap-1.5 mx-auto mt-2 px-3 py-1 rounded-lg text-white/30 hover:text-white/60 text-[11px] transition-colors"
                >
                  <History className="w-3 h-3" />
                  {t('diagnostics.chatHistory') || 'Chat History'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 pb-4">
              {/* Live Truck Computer State Panel */}
              {truck?.details?.id && (
                <TruckStatePanel vehicleProfileId={truck.details.id} className="mb-2" />
              )}
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
      <div ref={inputAreaRef} className="shrink-0 z-40 bg-[#0b1012] border-t border-white/5 pt-3 safe-bottom">
        <div className="max-w-4xl mx-auto px-4 pb-4">
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

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                <div className="shrink-0">
                  <DiagnosticTools
                    truck={truck}
                    errorCodes={errorCodes}
                    symptoms={symptoms}
                    onAudioClick={() => setShowAudioRecorder(true)}
                    onErrorCodesClick={() => setShowErrorCodeInput(true)}
                    onSymptomsClick={() => setShowSymptomPicker(true)}
                    onClearCodes={() => setErrorCodes([])}
                    onClearSymptoms={() => setSymptoms([])}
                    onDisabledClick={() => {
                      toast.info(t('diagnostics.selectTruckFirst') || 'Please select your truck first using the truck button in the top menu');
                      setShowTruckSelector(true);
                    }}
                  />
                </div>

                {/* Compact SCAN TRUCK button in active-conversation toolbar */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInlineScan}
                  disabled={scanningInline}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {scanningInline ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Radio className="w-3.5 h-3.5" />
                  )}
                  <span>{scanningInline ? 'Scanning...' : 'SCAN'}</span>
                </motion.button>

                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <button
                    onClick={() => setShowChatHistory(true)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 text-xs transition-colors"
                    title={t('diagnostics.chatHistory') || 'Chat History'}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">History</span>
                  </button>
                  {messages.length > 0 && (
                    <button
                      onClick={handleNewChat}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 text-orange-400 hover:from-orange-500/30 hover:to-orange-600/30 text-xs font-medium transition-all"
                      title={t('diagnostics.newChat')}
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{t('diagnostics.newChat')}</span>
                    </button>
                  )}

                  {messages.length >= 2 && (
                    <button
                      onClick={generateReport}
                      disabled={isGeneratingReport}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 text-xs disabled:opacity-40 transition-colors"
                      title={t('diagnostics.generateReport')}
                    >
                      {isGeneratingReport ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden md:inline">{t('diagnostics.generateReport')}</span>
                    </button>
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

          <div>
            {/* Nudge hint when sending without context */}
            <AnimatePresence>
              {showNudge && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-300 text-xs"
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {!truck
                      ? t('diagnostics.hintNudgeNoTruck')
                      : t('diagnostics.hintNudgeNoContext')}
                  </span>
                  <button
                    onClick={() => {
                      setShowNudge(false);
                      if (!truck) {
                        setShowTruckSelector(true);
                      }
                    }}
                    className="ml-auto text-orange-400 hover:text-orange-200 font-medium underline whitespace-nowrap"
                  >
                    {!truck ? (t('diagnostics.hintSelectTruck')) : (t('diagnostics.hintAddCodes'))}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('diagnostics.inputPlaceholder')}
              className="w-full min-h-[60px] max-h-[200px] resize-none bg-white/5 border-brand-dark/30 text-white placeholder:text-white/40 rounded-2xl py-4 px-4 focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange/50"
              disabled={isLoading}
            />
            <Button
              onClick={() => {
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
              disabled={(!truck && isFirstMessage) || (!input.trim() && !(truck && symptoms.length > 0) && pendingAnswers.length === 0) || isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-brand-orange to-brand-orange-light hover:from-[#e8851f] hover:to-[#d67a18] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-orange/20 text-white font-semibold text-sm tracking-wide"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                isFirstMessage ? t('diagnostics.startDiagnostic') : t('diagnostics.send')
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
            <a href="/Policies" className="underline hover:text-white/50 transition-colors">
              {t('policies.viewPolicies')}
            </a>
          </p>
        </div>
      </div>

      {/* Modals */}
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

      <VisualDiagnostics
        open={showVisualDiagnostics}
        onClose={() => setShowVisualDiagnostics(false)}
        onDiagnosisComplete={handleVisualDiagnosisComplete}
      />

      {/* Provider picker overlay for inline scan */}
      <AnimatePresence>
        {showProviderPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowProviderPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 rounded-2xl bg-[#141a1e] border border-white/10 p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Connect Telematics</h3>
                </div>
                <button
                  onClick={() => setShowProviderPicker(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-white/50">
                Connect your ELD / telematics provider to read live data. You only need to authorize once.
              </p>
              <div className="space-y-3">
                {[
                  { id: 'motive', name: 'Motive (KeepTruckin)', desc: 'ELD, GPS, fault codes, engine data', gradient: 'from-blue-600 to-blue-800', hover: 'hover:border-cyan-500/40 hover:bg-cyan-500/10' },
                  { id: 'samsara', name: 'Samsara', desc: 'Coming soon', gradient: 'from-green-600 to-green-800', hover: '', disabled: true },
                ].map(p => (
                  <button
                    key={p.id}
                    disabled={p.disabled}
                    onClick={p.disabled ? undefined : async () => { setShowProviderPicker(false); try { await connectProvider(p.id); } catch(e) { toast.error('Authorization failed: ' + e.message); } }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 ${p.disabled ? 'opacity-40 cursor-not-allowed' : p.hover} bg-white/5 transition-all`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                      <Radio className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-white/40">{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/30 text-center">
                Your credentials are encrypted and stored securely. You won't need to log in again.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
