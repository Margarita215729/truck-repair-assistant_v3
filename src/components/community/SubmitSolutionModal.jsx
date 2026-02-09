import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/services/entityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const TRUCK_MAKES = ['Peterbilt', 'Kenworth', 'Freightliner', 'Volvo', 'Mack', 'International', 'Western Star', 'Ford', 'Chevrolet', 'RAM', 'GMC'];

export default function SubmitSolutionModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    category: 'repair',
    truck_make: '',
    truck_model: '',
    truck_year_start: '',
    truck_year_end: '',
    engine_type: '',
    problem_description: '',
    solution: '',
    difficulty: 'moderate',
    time_required: '',
    cost_saved: '',
    tags: []
  });
  const [uploading, setUploading] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (data) => entities.KnowledgeBase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success('Solution shared! Thank you for contributing.');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate({
      ...formData,
      truck_year_start: formData.truck_year_start ? parseInt(formData.truck_year_start) : undefined,
      truck_year_end: formData.truck_year_end ? parseInt(formData.truck_year_end) : undefined,
      cost_saved: formData.cost_saved ? parseFloat(formData.cost_saved) : undefined
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Share Your Solution</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-white/70">Title *</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Fixed DPF regen issue on Freightliner Cascadia"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Category *</Label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white"
              >
                <option value="repair">Repair</option>
                <option value="modification">Modification</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="maintenance">Maintenance</option>
                <option value="troubleshooting">Troubleshooting</option>
              </select>
            </div>
            <div>
              <Label className="text-white/70">Difficulty *</Label>
              <select
                required
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white"
              >
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="difficult">Difficult</option>
                <option value="professional">Professional Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-white/70">Make *</Label>
              <select
                required
                value={formData.truck_make}
                onChange={(e) => setFormData({ ...formData, truck_make: e.target.value })}
                className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white"
              >
                <option value="">Select</option>
                {TRUCK_MAKES.map(make => <option key={make} value={make}>{make}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-white/70">Model</Label>
              <Input
                value={formData.truck_model}
                onChange={(e) => setFormData({ ...formData, truck_model: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/70">Engine Type</Label>
              <Input
                value={formData.engine_type}
                onChange={(e) => setFormData({ ...formData, engine_type: e.target.value })}
                placeholder="e.g., Cummins ISX15"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-white/70">Year Range (From)</Label>
              <Input
                type="number"
                value={formData.truck_year_start}
                onChange={(e) => setFormData({ ...formData, truck_year_start: e.target.value })}
                placeholder="2015"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/70">Year Range (To)</Label>
              <Input
                type="number"
                value={formData.truck_year_end}
                onChange={(e) => setFormData({ ...formData, truck_year_end: e.target.value })}
                placeholder="2020"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/70">Time Required</Label>
              <Input
                value={formData.time_required}
                onChange={(e) => setFormData({ ...formData, time_required: e.target.value })}
                placeholder="2-3 hours"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-white/70">Problem Description *</Label>
            <Textarea
              required
              value={formData.problem_description}
              onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
              placeholder="Describe the problem you encountered..."
              rows={3}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-white/70">Solution *</Label>
            <Textarea
              required
              value={formData.solution}
              onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
              placeholder="Step-by-step solution..."
              rows={6}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-white/70">Cost Saved (vs shop)</Label>
            <Input
              type="number"
              value={formData.cost_saved}
              onChange={(e) => setFormData({ ...formData, cost_saved: e.target.value })}
              placeholder="500"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/20">
              Cancel
            </Button>
            <Button type="submit" disabled={submitMutation.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600">
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Share Solution'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
