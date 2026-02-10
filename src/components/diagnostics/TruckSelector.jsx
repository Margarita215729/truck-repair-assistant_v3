import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities } from '@/services/entityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Calendar, Check, Star, Save } from 'lucide-react';
import { toast } from 'sonner';

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

const YEARS = Array.from({ length: 27 }, (_, i) => 2026 - i);

export default function TruckSelector({ open, onClose, onSelect, currentTruck }) {
  const [mode, setMode] = useState('saved');
  const [make, setMake] = useState(currentTruck?.make || '');
  const [model, setModel] = useState(currentTruck?.model || '');
  const [year, setYear] = useState(currentTruck?.year?.toString() || '');

  const { data: savedTrucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => entities.Truck.list('-is_primary', 50),
    enabled: open
  });

  const models = make ? US_TRUCK_DATA[make] || [] : [];

  const handleSelectSaved = (truck) => {
    onSelect({
      id: truck.id,
      make: truck.make,
      model: truck.model,
      year: truck.year,
      details: truck
    });
    onClose();
  };

  const handleSelectManual = () => {
    if (make && model && year) {
      onSelect({ make, model, year: parseInt(year) });
      onClose();
    }
  };

  const handleSaveAndSelect = async () => {
    if (!make || !model || !year) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const savedTruck = await entities.Truck.create({
        make,
        model,
        year: parseInt(year),
        nickname: `${make} ${model}`
      });
      onSelect({
        id: savedTruck.id,
        make: savedTruck.make,
        model: savedTruck.model,
        year: savedTruck.year,
        details: savedTruck
      });
      toast.success('Truck saved to your garage!');
      onClose();
    } catch (error) {
      console.error('Error saving truck:', error);
      toast.error('Failed to save truck');
    }
  };

  const handleMakeChange = (value) => {
    setMake(value);
    setModel('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-500" />
            </div>
            Select Your Truck
          </DialogTitle>
        </DialogHeader>

        {savedTrucks.length > 0 && (
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant={mode === 'saved' ? 'default' : 'outline'}
              onClick={() => setMode('saved')}
              className={mode === 'saved' ? 'bg-orange-500 hover:bg-orange-600' : 'border-white/20'}
            >
              My Garage ({savedTrucks.length})
            </Button>
            <Button
              type="button"
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => setMode('manual')}
              className={mode === 'manual' ? 'bg-orange-500 hover:bg-orange-600' : 'border-white/20'}
            >
              Enter Manually
            </Button>
          </div>
        )}

        {mode === 'saved' && savedTrucks.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {savedTrucks.map((truck) => (
              <div
                key={truck.id}
                onClick={() => handleSelectSaved(truck)}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">
                        {truck.nickname || `${truck.year} ${truck.make} ${truck.model}`}
                      </h3>
                      {truck.is_primary && (
                        <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                      )}
                    </div>
                    <p className="text-sm text-white/60">
                      {truck.year} {truck.make} {truck.model}
                    </p>
                    {truck.engine_type && (
                      <p className="text-xs text-white/50 mt-1">
                        Engine: {truck.engine_type}
                      </p>
                    )}
                    {truck.mileage && (
                      <Badge variant="outline" className="mt-2 border-white/20 text-white/70 text-xs">
                        {truck.mileage.toLocaleString()} miles
                      </Badge>
                    )}
                  </div>
                  {truck.images?.[0] && (
                    <img
                      src={truck.images[0]}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg ml-3"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium">Make</label>
              <Select value={make} onValueChange={handleMakeChange}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                  <SelectValue placeholder="Select truck make" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {Object.keys(US_TRUCK_DATA).map((m) => (
                    <SelectItem key={m} value={m} className="text-white hover:bg-white/10 focus:bg-white/10">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium">Model</label>
              <Select value={model} onValueChange={setModel} disabled={!make}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 disabled:opacity-50">
                  <SelectValue placeholder={make ? "Select model" : "Select make first"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {models.map((m) => (
                    <SelectItem key={m} value={m} className="text-white hover:bg-white/10 focus:bg-white/10">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60 font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Year
              </label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 max-h-60">
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y.toString()} className="text-white hover:bg-white/10 focus:bg-white/10">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSelectManual}
                disabled={!make || !model || !year}
                variant="outline"
                className="flex-1 h-12 border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                <Check className="w-4 h-4 mr-2" />
                Use Once
              </Button>
              <Button
                onClick={handleSaveAndSelect}
                disabled={!make || !model || !year}
                className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Save & Select
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
