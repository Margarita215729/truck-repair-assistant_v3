import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lightbulb, Send } from 'lucide-react';

export default function ClarifyingQuestions({ questions, onAnswerSelect }) {
  const [customAnswers, setCustomAnswers] = useState({});
  const [showInput, setShowInput] = useState({});

  if (!questions || questions.length === 0) return null;

  const handleCustomAnswer = (question, index) => {
    const answer = customAnswers[index];
    if (answer?.trim()) {
      onAnswerSelect(question, answer);
      setCustomAnswers({ ...customAnswers, [index]: '' });
      setShowInput({ ...showInput, [index]: false });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold text-white">Help me narrow this down</h3>
      </div>
      
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="space-y-2">
            <p className="text-sm text-white/90">{q.question}</p>
            {q.reasoning && (
              <p className="text-xs text-purple-300 italic">
                💡 {q.reasoning}
              </p>
            )}
            {q.quick_answers && q.quick_answers.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {q.quick_answers.map((answer, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant="outline"
                      onClick={() => onAnswerSelect(q.question, answer)}
                      className="border-purple-500/30 text-white/80 hover:bg-purple-500/20 hover:text-white"
                    >
                      {answer}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowInput({ ...showInput, [idx]: !showInput[idx] })}
                    className="text-purple-400/60 hover:text-purple-400"
                  >
                    Other...
                  </Button>
                </div>
                
                {showInput[idx] && (
                  <div className="flex gap-2">
                    <Input
                      value={customAnswers[idx] || ''}
                      onChange={(e) => setCustomAnswers({ ...customAnswers, [idx]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCustomAnswer(q.question, idx);
                      }}
                      placeholder="Type your answer..."
                      className="bg-white/5 border-white/10 text-white text-sm h-9"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleCustomAnswer(q.question, idx)}
                      disabled={!customAnswers[idx]?.trim()}
                      className="bg-purple-500 hover:bg-purple-600 h-9 px-3"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}