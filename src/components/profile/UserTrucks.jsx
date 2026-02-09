import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Plus, Pencil, Trash2, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

const US_TRUCK_DATA = {
  'Peterbilt': ['579', '389', '567', '520', '537', '367'],
  'Kenworth': ['T680', 'W990', 'T880', 'T270', 'T370', 'W900'],
  'Freightliner': ['Cascadia', 'M2 106', 'M2 112', '122SD', '114SD', 'Coronado'],
  'Volvo': ['VNL', 'VNR', 'VHD', 'VNX'],
  'Mack': ['Anthem', 'Pinnacle', 'Granite', 'LR', 'MD', 'TerraPro'],
  'International': ['LT Series', 'RH Series', 'HX Series', 'HV Series', 'MV Series'],
  'Western Star': ['49X', '47X', '4700', '4900'],
  'Navistar': ['International A26', 'S13'],
  'Ford': ['F-150', 'F-250', 'F-350', 'F-450', 'F-550', 'Ranger', 'Transit'],
  'Chevrolet': ['Silverado 1500', 'Silverado 2500', 'Silverado 3500', 'Colorado', 'Express'],
  'RAM': ['1500', '2500', '3500', '4500', '5500'],
  'GMC': ['Sierra 1500', 'Sierra 2500', 'Sierra 3500', 'Canyon', 'Savana'],
  'Toyota': ['Tundra', 'Tacoma'],
  'Nissan': ['Titan', 'Frontier'],
  'Isuzu': ['NPR', 'NQR', 'NRR', 'FTR'],
};

const YEARS = Array.from({ length: 27 }, (_, i) => 2000 + i).reverse();

export default function UserTrucks({ trucks = [], onUpdate }) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    nickname: '',
    mileage: ''
  });

  const models = formData.make ? US_TRUCK_DATA[formData.make] || [] : [];

  const resetForm = () => {
    setFormData({ make: '', model: '', year: '', vin: '', nickname: '', mileage: '' });
    setEditingTruck(null);
    setShowForm(false);
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setFormData({
      make: truck.make || '',
      model: truck.model || '',
      year: truck.year?.toString() || '',
      vin: truck.vin || '',
      nickname: truck.nickname || '',
      mileage: truck.mileage?.toString() || ''
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const truckData = {
      id: editingTruck?.id || Date.now().toString(),
      make: formData.make,
      model: formData.model,
      year: parseInt(formData.year),
      vin: formData.vin,
      nickname: formData.nickname,
      mileage: formData.mileage ? parseInt(formData.mileage) : null
    };

    let newTrucks;
    if (editingTruck) {
      newTrucks = trucks.map(t => t.id === editingTruck.id ? truckData : t);
    } else {
      newTrucks = [...trucks, truckData];
    }
    
    onUpdate(newTrucks);
    resetForm();
  };

  const handleDelete = (truckId) => {
    if (confirm(t('trucks.deleteTruck'))) {
      onUpdate(trucks.filter(t => t.id !== truckId));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{t('trucks.myTrucks')}</h3>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          {t('common.add')}
        </Button>
      </div>

      {trucks.length === 0 ? (
        <Card className="p-8 bg-white/5 border-white/10 text-center">
          <Truck className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-white/60">{t('trucks.noTrucks')}</p>
          <p className="text-white/40 text-sm mt-1">{t('trucks.noTrucksHint')}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {trucks.map((truck) => (
              <motion.div
                key={truck.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card className="p-4 bg-white/5 border-white/10 hover:bg-white/8 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">
                          {truck.nickname || `${truck.make} ${truck.model}`}
                        </h4>
                        {truck.nickname && (
                          <span className="text-white/50 text-sm">
                            {truck.make} {truck.model}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                        <span>{truck.year}</span>
                        {truck.mileage && (
                          <>
                            <span>•</span>
                            <span>{truck.mileage.toLocaleString()} mi</span>
                          </>
                        )}
                        {truck.vin && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-xs">{truck.vin}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(truck)}
                        className="text-white/40 hover:text-white hover:bg-white/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(truck.id)}
                        className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={resetForm}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-500" />
              </div>
              {editingTruck ? t('trucks.editTruck') : t('trucks.addTruck')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-white/60">{t('trucks.nickname')}</label>
              <Input
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder={t('trucks.nicknamePlaceholder')}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-white/60">{t('trucks.make')} *</label>
                <Select 
                  value={formData.make} 
                  onValueChange={(v) => setFormData({ ...formData, make: v, model: '' })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder={t('trucks.select')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {Object.keys(US_TRUCK_DATA).map((m) => (
                      <SelectItem key={m} value={m} className="text-white hover:bg-white/10">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/60">{t('trucks.model')} *</label>
                <Select 
                  value={formData.model} 
                  onValueChange={(v) => setFormData({ ...formData, model: v })}
                  disabled={!formData.make}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white disabled:opacity-50">
                    <SelectValue placeholder={t('trucks.select')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {models.map((m) => (
                      <SelectItem key={m} value={m} className="text-white hover:bg-white/10">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-white/60">{t('trucks.year')} *</label>
                <Select 
                  value={formData.year} 
                  onValueChange={(v) => setFormData({ ...formData, year: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder={t('trucks.select')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 max-h-60">
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()} className="text-white hover:bg-white/10">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/60">{t('trucks.mileage')}</label>
                <Input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  placeholder="500000"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">{t('trucks.vin')}</label>
              <Input
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                placeholder="1XPWD40X1ED215307"
                className="bg-white/5 border-white/10 text-white font-mono"
                maxLength={17}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!formData.make || !formData.model || !formData.year}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
            >
              <Check className="w-4 h-4 mr-2" />
              {editingTruck ? t('trucks.saveTruck') : t('trucks.addTruckBtn')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
