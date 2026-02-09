import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/services/entityService';
import { authService } from '@/services/authService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, CheckCircle, MessageSquare, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import SolutionDetailModal from './SolutionDetailModal';

const categoryColors = {
  repair: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  modification: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  diagnostic: 'bg-red-500/20 text-red-400 border-red-500/30',
  maintenance: 'bg-green-500/20 text-green-400 border-green-500/30',
  troubleshooting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
};

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  difficult: 'bg-orange-500/20 text-orange-400',
  professional: 'bg-red-500/20 text-red-400'
};

export default function SolutionCard({ solution }) {
  const [showDetail, setShowDetail] = useState(false);
  const queryClient = useQueryClient();

  const { data: userVote } = useQuery({
    queryKey: ['user-vote', solution.id],
    queryFn: async () => {
      const user = await authService.me();
      const votes = await entities.SolutionVote.filter({
        solution_id: solution.id,
        created_by: user.email
      });
      return votes[0];
    }
  });

  const voteMutation = useMutation({
    mutationFn: async (voteType) => {
      if (userVote) {
        await entities.SolutionVote.delete(userVote.id);
        if (userVote.vote_type !== voteType) {
          await entities.SolutionVote.create({
            solution_id: solution.id,
            vote_type: voteType
          });
        }
      } else {
        await entities.SolutionVote.create({
          solution_id: solution.id,
          vote_type: voteType
        });
      }
      
      const votes = await entities.SolutionVote.filter({ solution_id: solution.id });
      const upvotes = votes.filter(v => v.vote_type === 'upvote').length;
      const downvotes = votes.filter(v => v.vote_type === 'downvote').length;
      
      await entities.KnowledgeBase.update(solution.id, { upvotes, downvotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      queryClient.invalidateQueries({ queryKey: ['user-vote', solution.id] });
    }
  });

  const score = solution.upvotes - solution.downvotes;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
      >
        <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer" onClick={() => setShowDetail(true)}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              {/* Vote Section */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); voteMutation.mutate('upvote'); }}
                  className={`p-1 rounded hover:bg-white/10 ${userVote?.vote_type === 'upvote' ? 'text-orange-500' : 'text-white/40'}`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
                <span className={`text-sm font-bold ${score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-white/60'}`}>
                  {score}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); voteMutation.mutate('downvote'); }}
                  className={`p-1 rounded hover:bg-white/10 ${userVote?.vote_type === 'downvote' ? 'text-blue-500' : 'text-white/40'}`}
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm leading-snug">{solution.title}</h3>
                  {solution.verified && (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  )}
                </div>

                <p className="text-white/60 text-xs mb-3 line-clamp-2">
                  {solution.problem_description}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className={categoryColors[solution.category]}>
                    {solution.category}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-white/70">
                    {solution.truck_make} {solution.truck_model}
                  </Badge>
                  {solution.difficulty && (
                    <Badge variant="outline" className={difficultyColors[solution.difficulty]}>
                      {solution.difficulty}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-white/50">
                  {solution.time_required && (
                    <span>⏱️ {solution.time_required}</span>
                  )}
                  {solution.cost_saved && (
                    <span>💰 Saved ${solution.cost_saved}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-auto p-0 text-white/40 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <SolutionDetailModal
        solution={solution}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
