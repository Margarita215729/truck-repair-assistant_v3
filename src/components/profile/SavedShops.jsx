import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Phone, Navigation, Trash2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

export default function SavedShops({ shops = [], onUpdate }) {
  const { t } = useLanguage();
  const handleDelete = (index) => {
    if (confirm(t('shops.deleteService'))) {
      const newShops = shops.filter((_, i) => i !== index);
      onUpdate(newShops);
    }
  };

  if (shops.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">{t('shops.favoriteServices')}</h3>
        <Card className="p-8 bg-white/5 border-white/10 text-center">
          <Wrench className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-white/60">{t('shops.noSavedServices')}</p>
          <p className="text-white/40 text-sm mt-1">{t('shops.noSavedServicesHint')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">{t('shops.favoriteServices')} ({shops.length})</h3>
      <div className="space-y-3">
        <AnimatePresence>
          {shops.map((shop, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
            >
              <Card className="p-4 bg-white/5 border-white/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white">{shop.name}</h4>
                    <p className="text-sm text-white/50 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {shop.address}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      {shop.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`tel:${shop.phone}`)}
                          className="h-8 border-white/20 hover:bg-white/10"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          {t('shops.call')}
                        </Button>
                      )}
                      {shop.lat && shop.lng && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`)}
                          className="h-8 border-white/20 hover:bg-white/10"
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          {t('shops.directions')}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(index)}
                    className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
