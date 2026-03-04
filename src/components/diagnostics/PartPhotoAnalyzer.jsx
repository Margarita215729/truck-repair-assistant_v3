import React, { useState } from 'react';
import { uploadFile, invokeLLM } from '@/services/aiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, Loader2, Package, DollarSign, ExternalLink, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PartPhotoAnalyzer({ open, onClose, onPartIdentified }) {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await uploadFile({ file });
      setImageUrl(file_url);
      await analyzePartImage(file_url);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const analyzePartImage = async (url) => {
    setAnalyzing(true);
    try {
      const response = await invokeLLM({
        prompt: `Analyze this truck/automotive part image and identify:\n1. Part name and type\n2. Manufacturer/brand (if visible)\n3. Visible part numbers or markings\n4. Condition (worn, damaged, corroded, etc.)\n5. Common truck makes/models this fits\n6. OEM part numbers for replacement\n7. Compatible aftermarket alternatives (Dorman, ACDelco, Motorcraft, etc.)\n8. Approximate price range\n9. Common failure modes for this part\n10. Installation difficulty`,
        image_urls: [url],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            part_name: { type: "string" },
            part_type: { type: "string" },
            manufacturer: { type: "string" },
            visible_markings: { type: "array", items: { type: "string" } },
            condition: { type: "string" },
            compatible_vehicles: { type: "array", items: { type: "string" } },
            oem_part_numbers: { type: "array", items: { type: "string" } },
            aftermarket_alternatives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  brand: { type: "string" },
                  part_number: { type: "string" },
                  price_range: { type: "string" }
                }
              }
            },
            common_issues: { type: "array", items: { type: "string" } },
            installation_difficulty: { type: "string" }
          }
        }
      });

      setAnalysis(response);
      
      // Send to parent for diagnostic context
      if (onPartIdentified && response.part_name) {
        onPartIdentified({
          part_name: response.part_name,
          condition: response.condition,
          oem_numbers: response.oem_part_numbers
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze part image');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImageUrl(null);
    setAnalysis(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-orange-400" />
            Visual Part Identification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!imageUrl ? (
            <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-orange-500/50 transition-colors">
              <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/70 mb-4">Upload a photo of the part you need identified</p>
              <label htmlFor="part-photo" className="cursor-pointer">
                <Button disabled={uploading} className="bg-orange-500 hover:bg-orange-600">
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Choose Photo
                    </>
                  )}
                </Button>
                <input
                  id="part-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-white/40 mt-4">
                Best results: clear photo, good lighting, part markings visible
              </p>
            </div>
          ) : (
            <>
              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden bg-black/40">
                <img src={imageUrl} alt="Part" className="w-full h-auto" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {analyzing && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-white">Analyzing part...</p>
                    <p className="text-xs text-white/60">Identifying part and finding alternatives</p>
                  </div>
                </div>
              )}

              {analysis && !analyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Part Info */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="font-semibold text-white text-lg mb-2">{analysis.part_name}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {analysis.part_type && (
                        <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                          {analysis.part_type}
                        </Badge>
                      )}
                      {analysis.manufacturer && (
                        <Badge variant="outline" className="border-white/20 text-white/70">
                          {analysis.manufacturer}
                        </Badge>
                      )}
                      {analysis.condition && (
                        <Badge variant="outline" className="border-red-500/30 text-red-400">
                          Condition: {analysis.condition}
                        </Badge>
                      )}
                    </div>
                    
                    {analysis.visible_markings?.length > 0 && (
                      <div className="text-xs text-white/60">
                        <span className="font-medium">Visible markings:</span> {analysis.visible_markings.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* OEM Part Numbers */}
                  {analysis.oem_part_numbers?.length > 0 && (
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        OEM Part Numbers
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.oem_part_numbers.map((num, i) => (
                          <code key={i} className="px-2 py-1 bg-white/5 rounded text-xs text-blue-400">
                            {num}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aftermarket Alternatives */}
                  {analysis.aftermarket_alternatives?.length > 0 && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Aftermarket Alternatives
                      </h4>
                      <div className="space-y-2">
                        {analysis.aftermarket_alternatives.map((alt, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded p-2">
                            <div>
                              <span className="text-white text-sm font-medium">{alt.brand}</span>
                              <code className="ml-2 text-xs text-white/60">{alt.part_number}</code>
                            </div>
                            {alt.price_range && (
                              <span className="text-green-400 text-sm">{alt.price_range}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compatible Vehicles */}
                  {analysis.compatible_vehicles?.length > 0 && (
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-white/50 mb-1">Compatible with:</p>
                      <p className="text-sm text-white/80">{analysis.compatible_vehicles.join(', ')}</p>
                    </div>
                  )}

                  {/* Common Issues */}
                  {analysis.common_issues?.length > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-xs text-yellow-400 font-medium mb-2">Common Issues:</p>
                      <ul className="text-sm text-white/70 space-y-1">
                        {analysis.common_issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-400 mt-0.5">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.installation_difficulty && (
                    <div className="text-center text-sm text-white/60">
                      Installation: <span className="text-white font-medium">{analysis.installation_difficulty}</span>
                    </div>
                  )}

                  <Button onClick={onClose} className="w-full bg-orange-500 hover:bg-orange-600">
                    Use This Information in Diagnosis
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
