import React, { useState } from 'react';
import { entities } from '@/services/entityService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench, Plus, Trash2, Edit, Star, AlertCircle, Activity, Truck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const TRUCK_MAKES = {
  'Peterbilt': ['389', '579', '567', '520', '337'],
  'Kenworth': ['W900', 'T680', 'T880', 'T800', 'T370'],
  'Freightliner': ['Cascadia', 'Coronado', 'M2', 'Sprinter', 'Business Class M2'],
  'Volvo': ['VNL', 'VNR', 'VHD'],
  'Mack': ['Anthem', 'Pinnacle', 'Granite', 'TerraPro'],
  'International': ['LT', 'RH', 'HV', 'MV'],
  'Ford': ['F-150', 'F-250', 'F-350', 'F-450', 'F-650'],
  'Chevrolet': ['Silverado 1500', 'Silverado 2500HD', 'Silverado 3500HD'],
  'Dodge': ['Ram 1500', 'Ram 2500', 'Ram 3500', 'Ram 4500', 'Ram 5500'],
  'RAM': ['1500', '2500', '3500', '4500', '5500'],
  'GMC': ['Sierra 1500', 'Sierra 2500HD', 'Sierra 3500HD'],
  'Mercedes': ['Sprinter', 'Metris']
};

export default function ToolkitManager({ open, onClose }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingToolkit, setEditingToolkit] = useState(null);
  const queryClient = useQueryClient();

  const { data: toolkits = [], isLoading } = useQuery({
    queryKey: ['diagnostic-toolkits'],
    queryFn: () => entities.DiagnosticToolkit.list('-updated_date', 100),
    enabled: open
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.DiagnosticToolkit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-toolkits'] });
      toast.success('Toolkit deleted');
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) =>
      entities.DiagnosticToolkit.update(id, { is_favorite: !is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostic-toolkits'] });
    }
  });

  const handleCreate = () => {
    setIsCreating(true);
    setEditingToolkit(null);
  };

  const handleEdit = (toolkit) => {
    setEditingToolkit(toolkit);
    setIsCreating(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this toolkit?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wrench className="w-5 h-5 text-orange-500" />
              Diagnostic Toolkits
            </DialogTitle>
            <Button
              onClick={handleCreate}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Toolkit
            </Button>
          </div>
        </DialogHeader>

        {isCreating ? (
          <ToolkitForm
            toolkit={editingToolkit}
            onClose={() => {
              setIsCreating(false);
              setEditingToolkit(null);
            }}
            onSaved={() => {
              setIsCreating(false);
              setEditingToolkit(null);
              queryClient.invalidateQueries({ queryKey: ['diagnostic-toolkits'] });
            }}
          />
        ) : (
          <ScrollArea className="max-h-[60vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : toolkits.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 mb-2">No toolkits created yet</p>
                <p className="text-white/40 text-sm">
                  Create toolkits to quickly load common diagnostic scenarios
                </p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                <AnimatePresence>
                  {toolkits.map((toolkit) => (
                    <motion.div
                      key={toolkit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{toolkit.name}</h3>
                            {toolkit.is_favorite && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          
                          {toolkit.description && (
                            <p className="text-sm text-white/60 mb-2">{toolkit.description}</p>
                          )}

                          <div className="flex items-center gap-2 mb-2">
                            <Truck className="w-3 h-3 text-white/40" />
                            <span className="text-sm text-white/60">
                              {toolkit.truck_year} {toolkit.truck_make} {toolkit.truck_model}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {toolkit.error_codes?.length > 0 && (
                              <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400 text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {toolkit.error_codes.length} error codes
                              </Badge>
                            )}
                            {toolkit.symptoms?.length > 0 && (
                              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-xs">
                                <Activity className="w-3 h-3 mr-1" />
                                {toolkit.symptoms.length} symptoms
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavoriteMutation.mutate(toolkit)}
                            className="h-8 w-8 hover:bg-white/10"
                          >
                            <Star className={`w-4 h-4 ${toolkit.is_favorite ? 'text-yellow-500 fill-yellow-500' : 'text-white/40'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(toolkit)}
                            className="h-8 w-8 hover:bg-white/10 text-white/60 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(toolkit.id)}
                            className="h-8 w-8 hover:bg-red-500/10 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToolkitForm({ toolkit, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: toolkit?.name || '',
    description: toolkit?.description || '',
    truck_make: toolkit?.truck_make || '',
    truck_model: toolkit?.truck_model || '',
    truck_year: toolkit?.truck_year || new Date().getFullYear(),
    error_codes: toolkit?.error_codes || [],
    symptoms: toolkit?.symptoms || [],
    notes: toolkit?.notes || ''
  });
  const [errorCodeInput, setErrorCodeInput] = useState('');
  const [symptomInput, setSymptomInput] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data) =>
      toolkit
        ? entities.DiagnosticToolkit.update(toolkit.id, data)
        : entities.DiagnosticToolkit.create(data),
    onSuccess: () => {
      toast.success(toolkit ? 'Toolkit updated' : 'Toolkit created');
      onSaved();
    }
  });

  const handleAddErrorCode = () => {
    if (errorCodeInput.trim() && !formData.error_codes.includes(errorCodeInput.trim())) {
      setFormData({ ...formData, error_codes: [...formData.error_codes, errorCodeInput.trim()] });
      setErrorCodeInput('');
    }
  };

  const handleAddSymptom = () => {
    if (symptomInput.trim() && !formData.symptoms.includes(symptomInput.trim())) {
      setFormData({ ...formData, symptoms: [...formData.symptoms, symptomInput.trim()] });
      setSymptomInput('');
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.truck_make || !formData.truck_model) {
      toast.error('Please fill in all required fields');
      return;
    }
    saveMutation.mutate(formData);
  };

  const availableModels = TRUCK_MAKES[formData.truck_make] || [];

  return (
    <ScrollArea className="max-h-[60vh] pr-4">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">
            Toolkit Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Freightliner Cascadia DEF Issues"
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What does this toolkit cover?"
            className="bg-white/5 border-white/10 text-white h-20"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Make *</label>
            <Select value={formData.truck_make} onValueChange={(v) => setFormData({ ...formData, truck_make: v, truck_model: '' })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                {Object.keys(TRUCK_MAKES).map((make) => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Model *</label>
            <Select value={formData.truck_model} onValueChange={(v) => setFormData({ ...formData, truck_model: v })} disabled={!formData.truck_make}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Year</label>
            <Input
              type="number"
              value={formData.truck_year}
              onChange={(e) => setFormData({ ...formData, truck_year: parseInt(e.target.value) })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">Error Codes</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={errorCodeInput}
              onChange={(e) => setErrorCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddErrorCode()}
              placeholder="e.g., P2002, SPN 3364"
              className="bg-white/5 border-white/10 text-white"
            />
            <Button onClick={handleAddErrorCode} variant="outline" className="border-white/20 shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {formData.error_codes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {formData.error_codes.map((code, i) => (
                <Badge key={i} variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400">
                  {code}
                  <button
                    onClick={() => setFormData({ ...formData, error_codes: formData.error_codes.filter((_, idx) => idx !== i) })}
                    className="ml-1.5 hover:text-red-300"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">Symptoms</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSymptom()}
              placeholder="e.g., Engine won't start, Loss of power"
              className="bg-white/5 border-white/10 text-white"
            />
            <Button onClick={handleAddSymptom} variant="outline" className="border-white/20 shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {formData.symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {formData.symptoms.map((symptom, i) => (
                <Badge key={i} variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400">
                  {symptom}
                  <button
                    onClick={() => setFormData({ ...formData, symptoms: formData.symptoms.filter((_, idx) => idx !== i) })}
                    className="ml-1.5 hover:text-blue-300"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-white/80 mb-2 block">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional context or observations..."
            className="bg-white/5 border-white/10 text-white h-24"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white/70">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : toolkit ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
