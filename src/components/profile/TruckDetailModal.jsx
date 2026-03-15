import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/services/entityService';
import { uploadFile } from '@/services/aiService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

const TRUCK_MAKES = {
  'Peterbilt': ['389', '579', '567', '520'],
  'Kenworth': ['W900', 'T680', 'T880', 'T370'],
  'Freightliner': ['Cascadia', 'Coronado', 'M2', 'Columbia'],
  'Volvo': ['VNL', 'VNR', 'VHD'],
  'Mack': ['Anthem', 'Pinnacle', 'Granite'],
  'International': ['LT', 'RH', 'HV', 'LoneStar'],
  'Western Star': ['4900', '5700', '6900'],
  'Ford': ['F-150', 'F-250', 'F-350', 'F-450', 'F-550', 'F-650'],
  'Chevrolet': ['Silverado 1500', 'Silverado 2500HD', 'Silverado 3500HD'],
  'Dodge': ['Ram 1500', 'Ram 2500', 'Ram 3500', 'Ram 4500', 'Ram 5500'],
  'RAM': ['1500', '2500', '3500', '4500', '5500'],
  'GMC': ['Sierra 1500', 'Sierra 2500HD', 'Sierra 3500HD'],
  'Mercedes': ['Sprinter', 'Metris']
};

function normalizeVinSuffix(value) {
  return (value || '').replace(/\D/g, '').slice(-6);
}

export default function TruckDetailModal({ truck, open, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(truck ? {
    ...truck,
    vin: normalizeVinSuffix(truck.vin || ''),
  } : {
    nickname: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    mileage: '',
    engine_type: '',
    engine_displacement: '',
    transmission_model: '',
    fuel_type: 'diesel',
    tire_size: '',
    fluid_capacities: {},
    modifications: [],
    maintenance_notes: '',
    images: [],
    manuals: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingManual, setUploadingManual] = useState(false);
  const [newMod, setNewMod] = useState('');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (truck?.id) {
        return entities.Truck.update(truck.id, data);
      }
      return entities.Truck.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast.success(truck ? 'Truck updated' : 'Truck added');
      onClose();
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await uploadFile({ file });
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), file_url]
      }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleManualUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingManual(true);
    try {
      const { file_url } = await uploadFile({ file });
      setFormData(prev => ({
        ...prev,
        manuals: [...(prev.manuals || []), {
          name: file.name,
          url: file_url,
          type: file.type
        }]
      }));
      toast.success('Manual uploaded');
    } catch (error) {
      toast.error('Failed to upload manual');
    } finally {
      setUploadingManual(false);
    }
  };

  const handleAddModification = () => {
    if (!newMod.trim()) return;
    setFormData(prev => ({
      ...prev,
      modifications: [...(prev.modifications || []), newMod.trim()]
    }));
    setNewMod('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      vin: normalizeVinSuffix(formData.vin || ''),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {truck ? 'Edit Truck' : 'Add New Truck'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Nickname (optional)</Label>
                <Input
                  value={formData.nickname || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="e.g., Big Blue"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Make *</Label>
                <select
                  required
                  value={formData.make || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value, model: '' }))}
                  className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white"
                >
                  <option value="">Select make</option>
                  {Object.keys(TRUCK_MAKES).map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white/70">Model *</Label>
                <select
                  required
                  value={formData.model || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white"
                  disabled={!formData.make}
                >
                  <option value="">Select model</option>
                  {formData.make && TRUCK_MAKES[formData.make]?.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white/70">Year *</Label>
                <Input
                  type="number"
                  required
                  value={formData.year || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">VIN</Label>
                <Input
                  value={formData.vin || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, vin: normalizeVinSuffix(e.target.value) }))}
                  placeholder="Last 6 VIN digits"
                  maxLength={6}
                  className="bg-white/5 border-white/10 text-white font-mono"
                />
              </div>
              <div>
                <Label className="text-white/70">Current Mileage</Label>
                <Input
                  type="number"
                  value={formData.mileage || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, mileage: parseInt(e.target.value) }))}
                  placeholder="0"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Engine & Drivetrain */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80">Engine & Drivetrain</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Engine Type</Label>
                <Input
                  value={formData.engine_type || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, engine_type: e.target.value }))}
                  placeholder="e.g., Cummins ISX15"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Displacement</Label>
                <Input
                  value={formData.engine_displacement || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, engine_displacement: e.target.value }))}
                  placeholder="e.g., 15.0L"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Transmission</Label>
                <Input
                  value={formData.transmission_model || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, transmission_model: e.target.value }))}
                  placeholder="e.g., Eaton Fuller 18-speed"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Tire Size</Label>
                <Input
                  value={formData.tire_size || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, tire_size: e.target.value }))}
                  placeholder="e.g., 295/75R22.5"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          {/* Fluid Capacities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80">Fluid Capacities</h3>
            <div className="grid grid-cols-2 gap-4">
              {['engine_oil', 'coolant', 'def', 'transmission_fluid'].map(fluid => (
                <div key={fluid}>
                  <Label className="text-white/70 capitalize">{fluid.replace('_', ' ')}</Label>
                  <Input
                    value={formData.fluid_capacities?.[fluid] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      fluid_capacities: { ...prev.fluid_capacities, [fluid]: e.target.value }
                    }))}
                    placeholder="e.g., 15 gallons"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Modifications */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Modifications</h3>
            <div className="flex gap-2">
              <Input
                value={newMod}
                onChange={(e) => setNewMod(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddModification())}
                placeholder="Add modification..."
                className="bg-white/5 border-white/10 text-white"
              />
              <Button type="button" onClick={handleAddModification} variant="outline" className="border-white/20">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.modifications?.map((mod, i) => (
                <Badge key={i} variant="outline" className="border-white/20 text-white/70">
                  {mod}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      modifications: prev.modifications.filter((_, idx) => idx !== i)
                    }))}
                    className="ml-2 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Maintenance Notes */}
          <div>
            <Label className="text-white/70">Maintenance Notes</Label>
            <Textarea
              value={formData.maintenance_notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, maintenance_notes: e.target.value }))}
              placeholder="Special maintenance requirements..."
              className="bg-white/5 border-white/10 text-white"
              rows={3}
            />
          </div>

          {/* Images */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Photos</h3>
            <div className="flex gap-3 flex-wrap">
              {formData.images?.map((img, i) => (
                <div key={i} className="relative group w-24 h-24">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      images: prev.images.filter((_, idx) => idx !== i)
                    }))}
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-white/40">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-white/40" />}
              </label>
            </div>
          </div>

          {/* Manuals */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/80">Manuals & Documentation</h3>
            <div className="space-y-2">
              {formData.manuals?.map((manual, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/80">{manual.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      manuals: prev.manuals.filter((_, idx) => idx !== i)
                    }))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-2 p-3 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40">
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleManualUpload} className="hidden" />
                {uploadingManual ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white/60">Upload manual (PDF, DOC)</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/20">
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (truck ? 'Update' : 'Add Truck')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
