import React, { useState, useRef, useEffect } from 'react';
import { uploadFile, invokeLLM } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, Square, Play, Pause, Upload, Trash2, Loader2, Volume2, Sparkles, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';

export default function AudioRecorder({ open, onClose, onAudioCaptured }) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [visualizerData, setVisualizerData] = useState(new Array(32).fill(0));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioDescription, setAudioDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      
      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        setVisualizerData(Array.from(dataArray));
        animationRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setVisualizerData(new Array(32).fill(0));
      
      // Analyze audio after recording stops
      await analyzeAudio();
    }
  };

  const analyzeAudio = async () => {
    if (!audioBlob) return;
    
    setIsAnalyzing(true);
    try {
      // Upload audio file
      const file = new File([audioBlob], 'engine-sound.webm', { type: 'audio/webm' });
      const { file_url } = await uploadFile({ file });
      
      // Analyze with AI
      const response = await invokeLLM({
        prompt: `Analyze this engine/truck sound recording and provide a detailed technical description. Focus on:
- Type of sound (knocking, rattling, whining, grinding, hissing, etc.)
- Pitch and rhythm (high-pitched, low rumble, steady, intermittent)
- Timing (constant, only when accelerating, at idle, under load)
- Intensity (loud, faint, increasing over time)
- Any unusual patterns or irregularities
- Possible source of the sound (engine, transmission, exhaust, brakes, etc.)

Provide a clear, concise description that a mechanic would understand.`,
        file_urls: [file_url]
      });
      
      setAudioDescription(response);
      setShowDescription(true);
    } catch (error) {
      console.error('Audio analysis error:', error);
      toast.error(t('audio.analysisFailed'));
      setAudioDescription('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSubmit = () => {
    if (audioBlob && audioDescription) {
      onAudioCaptured(audioBlob, audioUrl, audioDescription);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    setAudioDescription('');
    setShowDescription(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-blue-500" />
            </div>
            Record Engine Sound
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Visualizer */}
          <div className="h-32 bg-black/40 rounded-xl flex items-end justify-center gap-1 p-4 overflow-hidden">
            {visualizerData.slice(0, 32).map((value, i) => (
              <motion.div
                key={i}
                className="w-2 bg-gradient-to-t from-orange-500 to-orange-300 rounded-full"
                animate={{ height: isRecording ? Math.max(4, value / 3) : 4 }}
                transition={{ duration: 0.05 }}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center">
            <span className="text-4xl font-mono font-bold text-white/90">
              {formatTime(recordingTime)}
            </span>
            <p className="text-sm text-white/40 mt-1">
              {isRecording ? t('audio.recording') : audioUrl ? t('audio.recordingComplete') : t('audio.readyToRecord')}
            </p>
          </div>

          {/* AI Analysis */}
          {isAnalyzing && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <div>
                <p className="text-sm font-medium text-white">{t('audio.analyzingSound')}</p>
                <p className="text-xs text-white/60">{t('audio.aiRecognizing')}</p>
              </div>
            </div>
          )}

          {/* Audio Description */}
          {showDescription && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">{t('audio.aiSoundDescription')}</span>
              </div>
              <Textarea
                value={audioDescription}
                onChange={(e) => setAudioDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white min-h-[100px] resize-none"
                placeholder={t('audio.soundDescPlaceholder')}
              />
              <p className="text-xs text-white/50 mt-2">
                                {t('audio.editDescHint')}
              </p>
            </motion.div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {!audioUrl ? (
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAnalyzing}
                className={`w-16 h-16 rounded-full ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                }`}
              >
                {isRecording ? (
                  <Square className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isAnalyzing}
                  className="w-12 h-12 rounded-full border-white/20 hover:bg-white/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={togglePlayback}
                  disabled={isAnalyzing}
                  className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </Button>
                
                <Button
                  onClick={handleSubmit}
                  disabled={isAnalyzing || !audioDescription}
                  className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          <p className="text-center text-sm text-white/40">
            {isRecording 
              ? t('audio.pressStop') 
              : isAnalyzing
                ? t('audio.aiAnalyzing')
                : audioUrl 
                  ? t('audio.reviewAndSend')
                  : t('audio.startEngineRecord')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
