import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/services/entityService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Plus, Star, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import TruckDetailModal from './TruckDetailModal';

export default function TruckGarage() {
  const { t } = useLanguage();
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => entities.Truck.list('-is_primary', 50)
  });

  const deleteTruckMutation = useMutation({
    mutationFn: (id) => entities.Truck.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast.success(t('common.delete'));
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (truckId) => {
      // First, unset all primary flags
      const allTrucks = await entities.Truck.list();
      await Promise.all(
        allTrucks.filter(t => t.is_primary).map(t => 
          entities.Truck.update(t.id, { is_primary: false })
        )
      );
      // Then set the selected one
      return entities.Truck.update(truckId, { is_primary: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast.success(t('trucks.primaryUpdated'));
    }
  });

  const handleEdit = (truck) => {
    setSelectedTruck(truck);
    setShowDetailModal(true);
  };

  const handleAddNew = () => {
    setSelectedTruck(null);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {t('trucks.myGarage')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60">{t('trucks.loadingGarage')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {t('trucks.myGarage')}
            {trucks.length > 0 && (
              <Badge variant="outline" className="ml-2 border-white/20 text-white/70">
                {trucks.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={handleAddNew}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('trucks.addTruck')}
          </Button>
        </CardHeader>
        <CardContent>
          {trucks.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60 mb-4">{t('trucks.noTrucks')}</p>
              <Button onClick={handleAddNew} variant="outline" className="border-white/20 text-white/70">
                <Plus className="w-4 h-4 mr-2" />
                {t('trucks.addTruck')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trucks.map((truck) => (
                <motion.div
                  key={truck.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group"
                >
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors overflow-hidden">
                    {truck.images?.[0] && (
                      <div className="h-32 overflow-hidden bg-black/20">
                        <img 
                          src={truck.images[0]} 
                          alt={truck.nickname || `${truck.year} ${truck.make}`}
                          className="w-full h-full object-cover opacity-70"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
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
                        </div>
                      </div>

                      {truck.engine_type && (
                        <p className="text-xs text-white/50 mb-2">
                          {t('trucks.engine')}: {truck.engine_type}
                        </p>
                      )}

                      {truck.vin && (
                        <p className="text-xs text-white/40 font-mono mb-2">
                          VIN: {truck.vin}
                        </p>
                      )}

                      {truck.mileage && (
                        <Badge variant="outline" className="border-white/20 text-white/70 text-xs">
                          {truck.mileage.toLocaleString()} {t('trucks.miles')}
                        </Badge>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(truck)}
                          className="flex-1 border-white/20 text-white/70 hover:bg-white/10"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          {t('common.edit')}
                        </Button>
                        {!truck.is_primary && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPrimaryMutation.mutate(truck.id)}
                            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            {t('trucks.setPrimary')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTruckMutation.mutate(truck.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TruckDetailModal
        truck={selectedTruck}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTruck(null);
        }}
      />
    </>
  );
}
