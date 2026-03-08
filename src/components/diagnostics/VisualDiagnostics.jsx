import React, { useState, useRef, useEffect } from 'react';
import { invokeGeminiVision } from '@/services/aiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Camera, Video, Upload, Loader2, X, AlertTriangle, AlertCircle,
  CheckCircle, Eye, ShieldAlert, Activity, FileText, Square, Circle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { useTruck } from '@/lib/TruckContext';

const MAX_VIDEO_DURATION = 15; // seconds — for live recording
const MAX_UPLOADED_VIDEO_DURATION = 120; // seconds — for pre-recorded uploads
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB — files go to Supabase Storage, not in HTTP body

export default function VisualDiagnostics({ open, onClose, onDiagnosisComplete, isGuest = false }) {
  const { t } = useLanguage();
  const { truck } = useTruck();

  // Media state
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [description, setDescription] = useState('');

  // Video recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [rejected, setRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Cleanup on unmount / close
  useEffect(() => {
    return () => {
      stopRecording();
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  // Auto-stop recording at MAX_VIDEO_DURATION
  useEffect(() => {
    if (recordingTime >= MAX_VIDEO_DURATION && isRecording) {
      stopRecording();
    }
  }, [recordingTime, isRecording]);

  /* ──────── Helpers ──────── */
  const validateVideoDuration = (file, maxDuration = MAX_VIDEO_DURATION) =>
    new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration <= maxDuration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(true); // allow on error — server will handle
      };
      video.src = URL.createObjectURL(file);
    });

  /* ──────── File selection ──────── */
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('visualDiagnostics.fileTooLarge') || 'File is too large (max 15 MB)');
      return;
    }

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(file.name);
    if (!isVideo && !isImage) {
      toast.error(t('visualDiagnostics.unsupportedFormat') || 'Unsupported file format');
      return;
    }

    // Validate video duration — use relaxed limit for uploaded files
    if (isVideo) {
      if (isGuest) {
        toast.error('Video diagnostics require an account. Photos are available in guest mode.');
        return;
      }
      const ok = await validateVideoDuration(file, MAX_UPLOADED_VIDEO_DURATION);
      if (!ok) {
        toast.error(
          (t('visualDiagnostics.videoTooLong') || `Video must be ${MAX_UPLOADED_VIDEO_DURATION} seconds or shorter`)
        );
        return;
      }
    }

    setMediaFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setMediaPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setRejected(false);
  };

  /* ──────── Video recording ──────── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const file = new File([blob], `visual_diag_${Date.now()}.webm`, { type: 'video/webm' });
        setMediaFile(file);
        setMediaType('video');
        setMediaPreviewUrl(URL.createObjectURL(blob));
        cleanupStream();
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error('Camera access error:', err);
      toast.error(t('visualDiagnostics.cameraError') || 'Could not access camera');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    cleanupStream();
  };

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const getSupportedMimeType = () => {
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  };

  /* ──────── Analysis ──────── */
  const handleAnalyze = async () => {
    if (!mediaFile) return;

    setIsAnalyzing(true);
    setResult(null);
    setRejected(false);

    try {
      const truckContext = truck
        ? {
            year: truck.year,
            make: truck.make,
            model: truck.model,
            engine: truck.details?.engine_type,
            vin: truck.details?.vin || truck.vin,
          }
        : null;

      const response = await invokeGeminiVision({
        media: [{ file: mediaFile }],
        prompt: description || undefined,
        truck_context: truckContext,
      });

      if (response.rejected) {
        setRejected(true);
        setRejectionReason(response.reason);
      } else {
        setResult(response);
      }
    } catch (error) {
      const msg = error.message || '';
      if (error.status === 429) {
        toast.error(t('diagnostics.aiLimitReached') || 'Daily request limit reached');
      } else if (msg.includes('not enabled') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) {
        toast.error(msg, { duration: 10000 });
      } else if (msg.includes('Gemini API not configured')) {
        toast.error('Vision service is not configured. Contact support.', { duration: 10000 });
      } else if (error.status === 502) {
        toast.error(msg || 'Vision service temporarily unavailable. Please try again in a moment.', { duration: 8000 });
      } else {
        // Always show the actual error for debugging — not a generic translation
        toast.error(`Analysis failed: ${msg || 'Unknown error. Check console for details.'}`, { duration: 8000 });
      }
      console.error('Visual analysis error:', error.status, error.message, error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ──────── Send result to diagnostic chat ──────── */
  const handleUseDiagnosis = () => {
    if (result && onDiagnosisComplete) {
      onDiagnosisComplete(result);
    }
    onClose();
  };

  /* ──────── Reset ──────── */
  const handleReset = () => {
    stopRecording();
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setDescription('');
    setResult(null);
    setRejected(false);
    setRejectionReason('');
  };

  /* ──────── Severity helpers ──────── */
  const severityConfig = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: ShieldAlert, label: t('visualDiagnostics.critical') || 'Critical' },
    warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, label: t('visualDiagnostics.warning') || 'Warning' },
    informational: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: AlertCircle, label: t('visualDiagnostics.informational') || 'Info' },
  };

  const urgencyConfig = {
    immediate_stop: { color: 'text-red-400', label: t('visualDiagnostics.immediateStop') || 'STOP IMMEDIATELY' },
    service_within_24h: { color: 'text-orange-400', label: t('visualDiagnostics.serviceWithin24h') || 'Service within 24h' },
    service_soon: { color: 'text-amber-400', label: t('visualDiagnostics.serviceSoon') || 'Service soon' },
    monitor: { color: 'text-blue-400', label: t('visualDiagnostics.monitor') || 'Monitor' },
    cosmetic_only: { color: 'text-green-400', label: t('visualDiagnostics.cosmeticOnly') || 'Cosmetic only' },
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-emerald-400" />
            {t('visualDiagnostics.title') || 'Visual Diagnostics'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Upload / Capture Zone ── */}
          {!mediaPreviewUrl && !isRecording && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors">
                <Camera className="w-10 h-10 text-white/40 mx-auto mb-3" />
                <p className="text-white/70 mb-1 text-sm">
                  {isGuest
                    ? (t('visualDiagnostics.uploadHintGuest') || 'Upload a photo of the issue (video requires account)')
                    : (t('visualDiagnostics.uploadHint') || 'Upload photo or video of the issue')}
                </p>
                <p className="text-xs text-white/40 mb-4">
                  {t('visualDiagnostics.examples') || 'Dashboard lights, leaks, smoke, damage, wear, VIN plates'}
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <label htmlFor="visual-file" className="cursor-pointer">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 pointer-events-none">
                      <Upload className="w-4 h-4 mr-2" />
                      {t('visualDiagnostics.uploadFile') || 'Upload File'}
                    </Button>
                    <input
                      id="visual-file"
                      type="file"
                      accept={isGuest ? 'image/*' : 'image/*,video/*'}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  {!isGuest && (
                    <Button
                      variant="outline"
                      onClick={startRecording}
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      {t('visualDiagnostics.recordVideo') || 'Record Video'}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-white/30 text-center">
                {t('visualDiagnostics.truckOnly') || 'Only truck-related images are accepted. Non-truck content will be rejected.'}
              </p>
            </div>
          )}

          {/* ── Video Recording ── */}
          {isRecording && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video ref={videoPreviewRef} muted playsInline className="w-full h-auto max-h-64 object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-sm">
                  <Circle className="w-3 h-3 text-white fill-white animate-pulse" />
                  <span className="text-sm font-medium text-white">
                    {recordingTime}s / {MAX_VIDEO_DURATION}s
                  </span>
                </div>
              </div>
              <div className="flex justify-center">
                <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700">
                  <Square className="w-4 h-4 mr-2" />
                  {t('visualDiagnostics.stopRecording') || 'Stop Recording'}
                </Button>
              </div>
            </div>
          )}

          {/* ── Media Preview ── */}
          {mediaPreviewUrl && !isRecording && (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black/40">
                {mediaType === 'video' ? (
                  <video src={mediaPreviewUrl} controls className="w-full h-auto max-h-64" />
                ) : (
                  <img src={mediaPreviewUrl} alt="Visual" className="w-full h-auto max-h-80 object-contain" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Badge className="absolute top-2 left-2 bg-black/60 text-white border-none">
                  {mediaType === 'video' ? '🎥 Video' : '📷 Photo'}
                </Badge>
              </div>

              {/* Optional description */}
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('visualDiagnostics.descriptionPlaceholder') || 'Optional: describe what you see or when it happens...'}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none h-16"
              />

              {/* Analyze button */}
              {!result && !rejected && (
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('visualDiagnostics.analyzing') || 'Analyzing image...'}
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      {t('visualDiagnostics.analyze') || 'Analyze'}
                    </>
                  )}
                </Button>
              )}
            </>
          )}

          {/* ── Rejection Notice ── */}
          {rejected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-400 mb-1">
                    {t('visualDiagnostics.notTruckRelated') || 'Not truck-related'}
                  </p>
                  <p className="text-xs text-white/60">
                    {rejectionReason || (t('visualDiagnostics.rejectionHint') || 'Please upload a photo or video related to your truck — dashboard, engine, undercarriage, leaks, exhaust, or documentation.')}
                  </p>
                </div>
              </div>
              <Button onClick={handleReset} variant="ghost" size="sm" className="mt-3 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                {t('visualDiagnostics.tryAnother') || 'Try another image'}
              </Button>
            </motion.div>
          )}

          {/* ── Analysis Loading ── */}
          {isAnalyzing && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <div>
                <p className="text-sm font-medium text-white">
                  {t('visualDiagnostics.aiAnalyzing') || 'Analyzing your image...'}
                </p>
                <p className="text-xs text-white/60">
                  {t('visualDiagnostics.aiAnalyzingDesc') || 'Identifying issues, warning lights, damage, and wear patterns'}
                </p>
              </div>
            </div>
          )}

          {/* ── Analysis Results ── */}
          {result && !rejected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Category & Quality badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  {categoryLabel(result.image_category, t)}
                </Badge>
                {result.image_quality && (
                  <Badge variant="outline" className="border-white/20 text-white/60">
                    {t('visualDiagnostics.quality') || 'Quality'}: {result.image_quality}
                  </Badge>
                )}
                {result.confidence && (
                  <Badge variant="outline" className={`border-white/20 ${result.confidence === 'high' ? 'text-green-400' : result.confidence === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                    {t('visualDiagnostics.confidence') || 'Confidence'}: {result.confidence}
                  </Badge>
                )}
              </div>

              {/* Safety Assessment */}
              {result.safety_assessment && (
                <div className={`p-4 rounded-xl border ${result.safety_assessment.can_drive === false ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.safety_assessment.can_drive === false ? (
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    <span className={`text-sm font-semibold ${result.safety_assessment.can_drive === false ? 'text-red-400' : 'text-green-400'}`}>
                      {result.safety_assessment.can_drive === false
                        ? (t('visualDiagnostics.doNotDrive') || 'DO NOT DRIVE')
                        : (t('visualDiagnostics.canDrive') || 'Safe to drive (with caution)')
                      }
                    </span>
                  </div>
                  {result.safety_assessment.urgency && (
                    <p className={`text-xs font-medium mb-2 ${urgencyConfig[result.safety_assessment.urgency]?.color || 'text-white/60'}`}>
                      ⏱ {urgencyConfig[result.safety_assessment.urgency]?.label || result.safety_assessment.urgency}
                    </p>
                  )}
                  {result.safety_assessment.safety_warnings?.length > 0 && (
                    <ul className="space-y-1">
                      {result.safety_assessment.safety_warnings.map((w, i) => (
                        <li key={i} className="text-xs text-white/70 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.safety_assessment.roadside_actions?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-[11px] text-white/40 mb-1">{t('visualDiagnostics.roadsideActions') || 'Roadside actions:'}</p>
                      <ul className="space-y-1">
                        {result.safety_assessment.roadside_actions.map((a, i) => (
                          <li key={i} className="text-xs text-white/70">• {a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Dashboard Lights */}
              {result.dashboard_lights?.length > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    {t('visualDiagnostics.dashboardLights') || 'Dashboard Warning Lights'}
                  </h4>
                  <div className="space-y-2">
                    {result.dashboard_lights.map((light, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                          light.color === 'red' ? 'bg-red-500' :
                          light.color === 'amber' || light.color === 'yellow' || light.color === 'orange' ? 'bg-amber-500' :
                          light.color === 'green' ? 'bg-green-500' : 'bg-blue-500'
                        } ${light.state === 'flashing' ? 'animate-pulse' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{light.name}</span>
                            <span className="text-[10px] text-white/40">({light.state})</span>
                          </div>
                          <p className="text-xs text-white/60 mt-0.5">{light.meaning}</p>
                          {light.action_required && (
                            <p className="text-xs text-amber-400 mt-0.5">→ {light.action_required}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings */}
              {result.findings?.length > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    {t('visualDiagnostics.findings') || 'Findings'}
                  </h4>
                  <div className="space-y-2">
                    {result.findings.map((f, i) => {
                      const sev = severityConfig[f.severity] || severityConfig.informational;
                      const SevIcon = sev.icon;
                      return (
                        <div key={i} className={`p-3 rounded-lg ${sev.bg} border ${sev.border}`}>
                          <div className="flex items-start gap-2">
                            <SevIcon className={`w-4 h-4 ${sev.color} mt-0.5 shrink-0`} />
                            <div>
                              <span className={`text-sm font-medium ${sev.color}`}>{f.item}</span>
                              {f.status && <span className="text-xs text-white/40 ml-2">({f.status})</span>}
                              <p className="text-xs text-white/70 mt-1">{f.interpretation}</p>
                              {f.related_systems?.length > 0 && (
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {f.related_systems.map((s, j) => (
                                    <span key={j} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/50">{s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fluid Analysis */}
              {result.fluid_analysis && result.fluid_analysis.fluid_type && (
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    💧 {t('visualDiagnostics.fluidAnalysis') || 'Fluid Analysis'}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-white/40">{t('visualDiagnostics.fluidType') || 'Type'}:</span> <span className="text-white/80">{result.fluid_analysis.fluid_type}</span></div>
                    <div><span className="text-white/40">{t('visualDiagnostics.color') || 'Color'}:</span> <span className="text-white/80">{result.fluid_analysis.color_observed}</span></div>
                    <div><span className="text-white/40">{t('visualDiagnostics.severity') || 'Severity'}:</span> <span className="text-white/80">{result.fluid_analysis.leak_severity}</span></div>
                    <div><span className="text-white/40">{t('visualDiagnostics.source') || 'Source'}:</span> <span className="text-white/80">{result.fluid_analysis.probable_source}</span></div>
                  </div>
                  {result.fluid_analysis.contamination_signs && (
                    <p className="text-xs text-amber-400 mt-2">⚠ {result.fluid_analysis.contamination_signs}</p>
                  )}
                </div>
              )}

              {/* Smoke Analysis */}
              {result.smoke_analysis && result.smoke_analysis.color && (
                <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/30">
                  <h4 className="text-sm font-semibold text-white mb-2">
                    💨 {t('visualDiagnostics.smokeAnalysis') || 'Smoke Analysis'}
                  </h4>
                  <p className="text-xs text-white/70">
                    <span className="font-medium text-white">{result.smoke_analysis.color}</span> smoke, {result.smoke_analysis.density} density
                  </p>
                  {result.smoke_analysis.probable_causes?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {result.smoke_analysis.probable_causes.map((c, i) => (
                        <li key={i} className="text-xs text-white/60">• {c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Extracted Text (OCR) */}
              {result.extracted_text?.length > 0 && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    {t('visualDiagnostics.extractedText') || 'Extracted Text / Codes'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.extracted_text.map((txt, i) => (
                      <code key={i} className="px-2 py-1 bg-white/5 rounded text-xs text-purple-300">{txt}</code>
                    ))}
                  </div>
                </div>
              )}

              {/* Probable Diagnosis */}
              {result.probable_diagnosis && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <h4 className="text-sm font-semibold text-white mb-2">
                    🔍 {t('visualDiagnostics.probableDiagnosis') || 'Probable Diagnosis'}
                  </h4>
                  <p className="text-sm text-white/90">{result.probable_diagnosis.primary}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {t('visualDiagnostics.confidence') || 'Confidence'}: {result.probable_diagnosis.confidence}
                  </p>
                  {result.probable_diagnosis.secondary_possibilities?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-[11px] text-white/40 mb-1">{t('visualDiagnostics.otherPossibilities') || 'Other possibilities:'}</p>
                      <ul className="space-y-0.5">
                        {result.probable_diagnosis.secondary_possibilities.map((p, i) => (
                          <li key={i} className="text-xs text-white/60">• {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.probable_diagnosis.recommended_next_steps?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-[11px] text-white/40 mb-1">{t('visualDiagnostics.nextSteps') || 'Recommended next steps:'}</p>
                      <ol className="space-y-0.5">
                        {result.probable_diagnosis.recommended_next_steps.map((s, i) => (
                          <li key={i} className="text-xs text-white/70">{i + 1}. {s}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <Button onClick={handleUseDiagnosis} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {t('visualDiagnostics.useDiagnosis') || 'Use in Diagnostic Chat'}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function categoryLabel(cat, t) {
  const map = {
    dashboard: t('visualDiagnostics.catDashboard') || '🎛 Dashboard',
    engine_bay: t('visualDiagnostics.catEngineBay') || '🔧 Engine Bay',
    undercarriage: t('visualDiagnostics.catUndercarriage') || '⬇ Undercarriage',
    exterior_body: t('visualDiagnostics.catExterior') || '🚛 Exterior',
    fluid_leak: t('visualDiagnostics.catFluidLeak') || '💧 Fluid Leak',
    exhaust: t('visualDiagnostics.catExhaust') || '💨 Exhaust',
    electrical: t('visualDiagnostics.catElectrical') || '⚡ Electrical',
    part_closeup: t('visualDiagnostics.catPartCloseup') || '🔩 Part Close-up',
    documentation: t('visualDiagnostics.catDocumentation') || '📄 Documentation',
  };
  return map[cat] || cat;
}
