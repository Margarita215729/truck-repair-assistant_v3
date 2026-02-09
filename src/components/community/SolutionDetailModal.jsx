import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Calendar, User } from 'lucide-react';

export default function SolutionDetailModal({ solution, open, onClose }) {
  if (!solution) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {solution.title}
            {solution.verified && <CheckCircle className="w-5 h-5 text-green-400" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Truck Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-orange-500/30 text-orange-400">
              {solution.truck_make} {solution.truck_model}
            </Badge>
            {solution.truck_year_start && (
              <Badge variant="outline" className="border-white/20 text-white/70">
                {solution.truck_year_start}{solution.truck_year_end && ` - ${solution.truck_year_end}`}
              </Badge>
            )}
            {solution.engine_type && (
              <Badge variant="outline" className="border-white/20 text-white/70">
                {solution.engine_type}
              </Badge>
            )}
          </div>

          {/* Problem */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-2">Problem</h3>
            <p className="text-white/70 whitespace-pre-wrap">{solution.problem_description}</p>
          </div>

          <Separator className="bg-white/10" />

          {/* Solution */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-2">Solution</h3>
            <p className="text-white/70 whitespace-pre-wrap">{solution.solution}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
            {solution.difficulty && (
              <div>
                <span className="text-xs text-white/50">Difficulty</span>
                <p className="text-white capitalize">{solution.difficulty}</p>
              </div>
            )}
            {solution.time_required && (
              <div>
                <span className="text-xs text-white/50">Time Required</span>
                <p className="text-white">{solution.time_required}</p>
              </div>
            )}
            {solution.cost_saved && (
              <div>
                <span className="text-xs text-white/50">Cost Saved</span>
                <p className="text-green-400">${solution.cost_saved}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-white/50">Rating</span>
              <p className="text-white">
                {solution.upvotes - solution.downvotes > 0 ? '+' : ''}
                {solution.upvotes - solution.downvotes}
              </p>
            </div>
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 text-xs text-white/50">
            <User className="w-3 h-3" />
            {solution.created_by}
            <span>•</span>
            <Calendar className="w-3 h-3" />
            {new Date(solution.created_date).toLocaleDateString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
