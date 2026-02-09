import React, { useState } from 'react';
import { entities } from '@/services/entityService';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench, Star, Truck, AlertCircle, Activity, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ToolkitSelector({ open, onClose, onSelect, onManage }) {
  const [selectedToolkit, setSelectedToolkit] = useState(null);

  const { data: toolkits = [], isLoading } = useQuery({
    queryKey: ['diagnostic-toolkits'],
    queryFn: () => entities.DiagnosticToolkit.list('-updated_date', 50),
    enabled: open
  });

  const handleSelect = () => {
    if (selectedToolkit) {
      onSelect(selectedToolkit);
      toast.success(`Toolkit "${selectedToolkit.name}" loaded`);
      onClose();
    }
  };

  const favoriteToolkits = toolkits.filter(t => t.is_favorite);
  const otherToolkits = toolkits.filter(t => !t.is_favorite);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wrench className="w-5 h-5 text-orange-500" />
            Select Diagnostic Toolkit
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : toolkits.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-4">No toolkits created yet</p>
            <Button
              onClick={() => {
                onClose();
                onManage();
              }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Toolkit
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                {favoriteToolkits.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-white/60">Favorites</span>
                    </div>
                    <div className="space-y-2">
                      {favoriteToolkits.map((toolkit) => (
                        <ToolkitCard
                          key={toolkit.id}
                          toolkit={toolkit}
                          isSelected={selectedToolkit?.id === toolkit.id}
                          onClick={() => setSelectedToolkit(toolkit)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {otherToolkits.length > 0 && (
                  <div>
                    {favoriteToolkits.length > 0 && (
                      <div className="text-sm font-medium text-white/40 mb-3 mt-4">All Toolkits</div>
                    )}
                    <div className="space-y-2">
                      {otherToolkits.map((toolkit) => (
                        <ToolkitCard
                          key={toolkit.id}
                          toolkit={toolkit}
                          isSelected={selectedToolkit?.id === toolkit.id}
                          onClick={() => setSelectedToolkit(toolkit)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onManage();
                }}
                className="border-white/20 text-white/70 hover:bg-white/5"
              >
                Manage Toolkits
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-white/20 text-white/70 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSelect}
                  disabled={!selectedToolkit}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
                >
                  Load Toolkit
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToolkitCard({ toolkit, isSelected, onClick }) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? 'bg-orange-500/10 border-orange-500/50'
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{toolkit.name}</h3>
            {toolkit.is_favorite && (
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
          </div>
          
          {toolkit.description && (
            <p className="text-xs text-white/60 mb-2 line-clamp-2">{toolkit.description}</p>
          )}

          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-3 h-3 text-white/40" />
            <span className="text-xs text-white/60">
              {toolkit.truck_year} {toolkit.truck_make} {toolkit.truck_model}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {toolkit.error_codes?.length > 0 && (
              <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400 text-[10px] h-5">
                <AlertCircle className="w-3 h-3 mr-1" />
                {toolkit.error_codes.length} codes
              </Badge>
            )}
            {toolkit.symptoms?.length > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-[10px] h-5">
                <Activity className="w-3 h-3 mr-1" />
                {toolkit.symptoms.length} symptoms
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
