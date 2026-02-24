import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink, Play, Pause, ChevronDown, ChevronUp, TrendingUp, CheckCircle, AlertTriangle, Lightbulb, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import SuggestedParts from './SuggestedParts';
import RepairInstructions from './RepairInstructions.jsx';
import ClarifyingQuestions from './ClarifyingQuestions.jsx';
import DiagnosticProgress from './DiagnosticProgress.jsx';

export default function ChatMessage({ message, onPartClick, onAnswerQuestion, onGenerateGuide }) {
  const [copied, setCopied] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const audioRef = useRef(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  const isUser = message.role === 'user';
  
  // Show full content if there are clarifying questions (diagnostic flow)
  const hasQuestions = message.clarifying_questions && message.clarifying_questions.length > 0;
  const shouldCollapse = !isUser && !hasQuestions && message.content && message.content.length > 300;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0 mt-1">
          <span className="text-xs font-bold">AI</span>
        </div>
      )}
      
      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' 
            : 'bg-white/5 border border-white/10 text-white'
        }`}>
          {message.audio_url && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (playingAudio) {
                    audioRef.current?.pause();
                    setPlayingAudio(false);
                  } else {
                    if (!audioRef.current || audioRef.current.src !== message.audio_url) {
                      audioRef.current = new Audio(message.audio_url);
                      audioRef.current.onended = () => setPlayingAudio(false);
                    }
                    audioRef.current.play();
                    setPlayingAudio(true);
                  }
                }}
                className="h-8 px-2 hover:bg-white/10"
              >
                {playingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <span className="text-sm text-white/60">Audio recording attached</span>
            </div>
          )}
          
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
            <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                p: ({ children }) => <p className="my-2 leading-relaxed text-white/90">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-white">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2 text-white">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-white">{children}</h3>,
                ul: ({ children }) => <ul className="my-2 ml-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="text-white/80 marker:text-orange-500">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                    {children}
                  </a>
                ),
                code: ({ children, className, node, ...rest }) => {
                  const isInline = !className && node?.position?.start?.line === node?.position?.end?.line;
                  return isInline ? (
                    <code className="px-1.5 py-0.5 bg-black/40 rounded text-orange-400 text-xs font-mono">
                      {children}
                    </code>
                  ) : (
                    <pre className="my-2 p-3 bg-black/40 rounded-lg overflow-x-auto">
                      <code className="text-xs font-mono text-white/80">{children}</code>
                    </pre>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-orange-500 pl-3 my-2 text-white/70 italic">
                    {children}
                  </blockquote>
                ),
                }}
              >
                {shouldCollapse && !contentExpanded 
                  ? message.content.substring(0, 300) + '...'
                  : message.content
                }
              </ReactMarkdown>
              {shouldCollapse && (
                <button
                  onClick={() => setContentExpanded(!contentExpanded)}
                  className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                >
                  {contentExpanded ? '↑ Show less' : '↓ Read more'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Insufficient Info Warning */}
        {message.insufficient_info && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-amber-300">Недостаточно информации для качественного анализа</span>
            </div>
            {message.missing_details && message.missing_details.length > 0 && (
              <div>
                <p className="text-xs text-white/50 mb-1.5">Для точной диагностики укажите:</p>
                <ul className="space-y-1">
                  {message.missing_details.map((detail, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-amber-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {message.preliminary_suggestions && message.preliminary_suggestions.length > 0 && (
              <div className="pt-2 border-t border-amber-500/20">
                <p className="text-xs text-white/50 mb-2">Что можно сделать уже сейчас:</p>
                <div className="space-y-2">
                  {message.preliminary_suggestions.map((sug, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-white/90">{sug.title}</span>
                        <p className="text-xs text-white/60 mt-0.5">{sug.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Offline/Fallback Warning */}
        {message.isFallback && (
          <div className="mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-xs text-yellow-300/80">Service temporarily unavailable — showing offline diagnosis. Try again in a moment for full analysis.</span>
          </div>
        )}

        {/* Forum Insights */}
        {message.trending_issues && message.trending_issues.length > 0 && (
          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-semibold text-orange-400">Forum Trending</span>
            </div>
            <div className="space-y-2">
              {message.trending_issues.map((issue, i) => (
                <div key={i} className="text-xs text-white/70">
                  <div className="flex items-start gap-2">
                    <Users className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-white/90">{issue.issue}</span>
                      <div className="text-white/50 mt-0.5">
                        {issue.forum} • {issue.frequency}
                        {issue.affected_models?.length > 0 && ` • ${issue.affected_models.join(', ')}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forum Consensus */}
        {message.forum_consensus && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs font-semibold text-green-400">Community Consensus</span>
            </div>
            <div className="text-xs text-white/80 space-y-1">
              <div>
                <span className="text-green-400 font-medium">Top Solution: </span>
                {message.forum_consensus.top_solution}
              </div>
              {message.forum_consensus.success_rate && (
                <div className="text-white/60">
                  Success Rate: {message.forum_consensus.success_rate}
                </div>
              )}
              {message.forum_consensus.common_mistakes?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1 text-yellow-400 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="font-medium">Avoid:</span>
                  </div>
                  <ul className="space-y-0.5 ml-4 list-disc list-inside text-white/60">
                    {message.forum_consensus.common_mistakes.map((mistake, i) => (
                      <li key={i}>{mistake}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sources (collapsed by default) */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              {sourcesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
            </button>
            
            {sourcesExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 space-y-1"
              >
                {message.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs hover:bg-white/5 p-2 rounded-lg transition-colors group"
                  >
                    <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-white/60" />
                    <div className="flex-1 min-w-0">
                      <span className="text-white/60 group-hover:text-white/80 truncate block">
                        {source.title}
                      </span>
                      {source.forum_name && (
                        <span className="text-white/40 text-[10px]">{source.forum_name}</span>
                      )}
                    </div>
                    {source.relevance && (
                      <Badge variant="outline" className="text-[10px] h-5 border-white/20 text-white/60">
                        {source.relevance === 'trending' && '🔥'}
                        {source.relevance === 'proven_solution' && '✅'}
                        {source.relevance === 'warning' && '⚠️'}
                        {source.relevance === 'pro_tip' && '💡'}
                      </Badge>
                    )}
                  </a>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/5"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        )}

        {/* Clarifying Questions - Always visible */}
        {message.clarifying_questions && message.clarifying_questions.length > 0 && (
          <ClarifyingQuestions 
            questions={message.clarifying_questions} 
            onAnswerSelect={onAnswerQuestion}
          />
        )}

        {/* Collapsible Details - Only show if content is expanded or no questions */}
        {(contentExpanded || !hasQuestions) && (
          <>
            {/* Diagnostic Progress */}
            {message.diagnostic_progress && (
              <DiagnosticProgress progress={message.diagnostic_progress} />
            )}

            {/* Community Matches Preview */}
            {message.community_matches && message.community_matches.count > 0 && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400">
                    {message.community_matches.count} Community Solutions Match Your Issue
                  </span>
                </div>
                <p className="text-xs text-white/70">{message.community_matches.preview}</p>
              </div>
            )}

            {/* DTC Analysis */}
            {message.dtc_analysis && message.dtc_analysis.length > 0 && (
          <div className="mt-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold text-white">Diagnostic Trouble Codes</h3>
            </div>
            {message.dtc_analysis.map((dtc, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono font-bold text-red-400">{dtc.code}</code>
                  <Badge variant="outline" className={`text-xs ${
                    dtc.severity === 'critical' ? 'border-red-500 text-red-400' :
                    dtc.severity === 'high' ? 'border-orange-500 text-orange-400' :
                    dtc.severity === 'medium' ? 'border-yellow-500 text-yellow-400' :
                    'border-white/20 text-white/70'
                  }`}>
                    {dtc.severity}
                  </Badge>
                </div>
                <p className="text-sm text-white/80">{dtc.description}</p>
                {dtc.common_causes && dtc.common_causes.length > 0 && (
                  <div>
                    <p className="text-xs text-white/60 mb-1">Common causes:</p>
                    <ul className="text-xs text-white/70 space-y-0.5 ml-4 list-disc">
                      {dtc.common_causes.map((cause, j) => (
                        <li key={j}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(dtc.immediate_action_required || dtc.can_drive === false) && (
                  <div className="flex items-center gap-2 text-xs text-red-400 pt-2 border-t border-white/10">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="font-semibold">
                      {dtc.immediate_action_required ? 'Immediate action required' : 'Do not drive - tow to shop'}
                    </span>
                  </div>
                )}
              </div>
            ))}
            </div>
            )}

            {/* Repair Instructions */}
            {message.repair_instructions && message.repair_instructions.length > 0 && (
              <RepairInstructions instructions={message.repair_instructions} />
            )}

            {/* Suggested Parts */}
            {message.suggested_parts && message.suggested_parts.length > 0 && (
              <SuggestedParts parts={message.suggested_parts} onPartClick={onPartClick} />
            )}

            {/* Generate Interactive Guide */}
            {!isUser && message.content && message.content.length > 100 && onGenerateGuide && (
              <div className="mt-3">
                <Button
                  onClick={() => onGenerateGuide(message.content)}
                  variant="outline"
                  size="sm"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Generate Interactive Repair Guide
                </Button>
              </div>
            )}
            </>
            )}

        {/* Timestamp */}
        <p className={`text-[10px] text-white/30 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : ''}
        </p>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-1">
          <span className="text-xs font-medium text-white/60">You</span>
        </div>
      )}
    </motion.div>
  );
}