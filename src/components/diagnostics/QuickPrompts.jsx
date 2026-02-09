import React from 'react';
import { motion } from 'framer-motion';
import { 
  Flame, 
  Gauge, 
  Zap, 
  Wind, 
  Droplet, 
  Volume2,
  AlertTriangle,
  Thermometer 
} from 'lucide-react';

const QUICK_PROMPTS = [
  {
    icon: Flame,
    label: "Engine won't start",
    prompt: "My truck engine won't start. It cranks but doesn't fire up.",
    color: "from-red-500/20 to-red-600/20",
    iconColor: "text-red-500"
  },
  {
    icon: Volume2,
    label: "Strange noise",
    prompt: "I'm hearing a strange noise from my truck. Can you help identify it?",
    color: "from-purple-500/20 to-purple-600/20",
    iconColor: "text-purple-500"
  },
  {
    icon: Gauge,
    label: "Low power",
    prompt: "My truck has lost power and doesn't accelerate like it used to.",
    color: "from-orange-500/20 to-orange-600/20",
    iconColor: "text-orange-500"
  },
  {
    icon: Thermometer,
    label: "Overheating",
    prompt: "My engine temperature is running high and sometimes overheats.",
    color: "from-yellow-500/20 to-yellow-600/20",
    iconColor: "text-yellow-500"
  },
  {
    icon: Zap,
    label: "Electrical issues",
    prompt: "I'm having electrical problems - lights flickering and warning lights on.",
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-500"
  },
  {
    icon: Droplet,
    label: "Fluid leak",
    prompt: "I noticed fluid leaking under my truck. Can you help identify what it might be?",
    color: "from-cyan-500/20 to-cyan-600/20",
    iconColor: "text-cyan-500"
  },
];

export default function QuickPrompts({ onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {QUICK_PROMPTS.map((prompt, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(prompt.prompt)}
          className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left group"
        >
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${prompt.color} flex items-center justify-center shrink-0`}>
            <prompt.icon className={`w-5 h-5 ${prompt.iconColor}`} />
          </div>
          <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
            {prompt.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}