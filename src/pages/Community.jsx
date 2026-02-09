import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/services/entityService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import SolutionCard from '@/components/community/SolutionCard';
import SubmitSolutionModal from '@/components/community/SubmitSolutionModal';
import { useLanguage } from '@/lib/LanguageContext';

export default function Community() {
  const { t } = useLanguage();
  const [showSubmit, setShowSubmit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('trending');

  const { data: solutions = [], isLoading } = useQuery({
    queryKey: ['knowledge-base', categoryFilter, sortBy],
    queryFn: async () => {
      let results = await entities.KnowledgeBase.list('-created_date', 100);
      
      if (categoryFilter !== 'all') {
        results = results.filter(s => s.category === categoryFilter);
      }
      
      if (sortBy === 'trending') {
        results.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      } else if (sortBy === 'recent') {
        results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }
      
      return results;
    }
  });

  const filteredSolutions = solutions.filter(s =>
    !searchQuery || 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.problem_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.truck_make.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{t('community.title')}</h1>
                <p className="text-white/60">{t('community.subtitle')}</p>
              </div>
            </div>
            <Button onClick={() => setShowSubmit(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              {t('community.shareSolution')}
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('community.searchPlaceholder')}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all" className="text-white">{t('community.allCategories')}</SelectItem>
              <SelectItem value="repair" className="text-white">{t('community.repairs')}</SelectItem>
              <SelectItem value="modification" className="text-white">{t('community.modifications')}</SelectItem>
              <SelectItem value="diagnostic" className="text-white">{t('nav.diagnostics')}</SelectItem>
              <SelectItem value="maintenance" className="text-white">{t('community.maintenance')}</SelectItem>
              <SelectItem value="troubleshooting" className="text-white">{t('community.troubleshooting')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="trending" className="text-white">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {t('community.topRated')}
                </div>
              </SelectItem>
              <SelectItem value="recent" className="text-white">{t('community.mostRecent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Solutions Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-white/60">{t('community.loadingSolutions')}</div>
        ) : filteredSolutions.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-4">{t('community.noSolutions')}</p>
            <Button onClick={() => setShowSubmit(true)} variant="outline" className="border-white/20">
              {t('community.beFirst')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredSolutions.map((solution) => (
              <SolutionCard key={solution.id} solution={solution} />
            ))}
          </div>
        )}
      </div>

      <SubmitSolutionModal open={showSubmit} onClose={() => setShowSubmit(false)} />
    </div>
  );
}
