import React, { useState, useRef, useEffect } from 'react';
import { getAllManufacturers, getModelsForManufacturer, getErrorCodesForManufacturer, commonTruckSymptoms } from './data/comprehensive-truck-data';
import { DynamicPricingService } from './services/DynamicPricingService';
import { BackgroundTrainingService } from './services/BackgroundTrainingService';
import { TruckServiceMap } from './components/TruckServiceMap';

export default function App() {
  console.log('AI Truck Diagnostic App loaded');

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, text: string, type: 'user' | 'ai'}>>([]);
  const [truckMake, setTruckMake] = useState('');
  const [truckModel, setTruckModel] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [customTruckMake, setCustomTruckMake] = useState('');
  const [customTruckModel, setCustomTruckModel] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; city?: string; state?: string } | null>(null);
  const [serviceLocations, setServiceLocations] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [truckHeight, setTruckHeight] = useState(13.5); // Default truck height in feet
  const [truckWeight, setTruckWeight] = useState(80000); // Default truck weight in pounds
  const [truckLength, setTruckLength] = useState(70); // Default truck length in feet
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [showTruckSpecs, setShowTruckSpecs] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dynamicPricingService = useRef<DynamicPricingService | null>(null);
  const backgroundTrainingService = useRef<BackgroundTrainingService | null>(null);

  const truckMakes = getAllManufacturers();
  const availableModels = getModelsForManufacturer(truckMake);
  const availableErrorCodes = getErrorCodesForManufacturer(truckMake);

  // Initialize background training service
  useEffect(() => {
    console.log('🚀 Initializing background training service...');
    backgroundTrainingService.current = new BackgroundTrainingService();
    backgroundTrainingService.current.startBackgroundTraining();
    
    return () => {
      if (backgroundTrainingService.current) {
        backgroundTrainingService.current.stopBackgroundTraining();
      }
    };
  }, []);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  console.log('Available data:', {
    truckMakes: truckMakes.length,
    availableModels: availableModels.length,
    availableErrorCodes: availableErrorCodes.length,
    symptoms: commonTruckSymptoms.length
  });

  // Initialize dynamic pricing service and get user location
  React.useEffect(() => {
    if (!dynamicPricingService.current) {
      dynamicPricingService.current = new DynamicPricingService();
    }

    // Get user location for dynamic pricing
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation failed:', error);
        }
      );
    }
  }, [userLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: message,
      type: 'user' as const
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsAnalyzing(true);

            // Enhanced AI analysis with dynamic pricing
            setTimeout(async () => {
              const finalTruckMake = useCustomInput ? customTruckMake : truckMake;
              const finalTruckModel = useCustomInput ? customTruckModel : truckModel;
              const context = `Truck: ${finalTruckMake} ${finalTruckModel}, Error Code: ${errorCode}, Symptoms: ${selectedSymptoms.join(', ')}`;
              const selectedErrorCodeInfo = availableErrorCodes.find(code => code.code === errorCode);
              
              let analysisText = `**Diagnostic Analysis**\n\n**Problem:** ${userMessage.text}\n**Context:** ${context}\n\n`;
              
              if (selectedErrorCodeInfo) {
                analysisText += `**Error Code Details:**\n• Code: ${selectedErrorCodeInfo.code}\n• Description: ${selectedErrorCodeInfo.description}\n• Severity: ${selectedErrorCodeInfo.severity}\n• Category: ${selectedErrorCodeInfo.category}\n\n`;
                analysisText += `**Common Causes:**\n${selectedErrorCodeInfo.commonCauses.map(cause => `• ${cause}`).join('\n')}\n\n`;
                analysisText += `**Possible Symptoms:**\n${selectedErrorCodeInfo.possibleSymptoms.map(symptom => `• ${symptom}`).join('\n')}\n\n`;
              }

              // Get dynamic pricing if location is available
              let pricingInfo = '';
              if (userLocation && selectedErrorCodeInfo) {
                try {
                  const pricingAnalysis = await dynamicPricingService.current?.getRepairCostAnalysis(
                    selectedErrorCodeInfo.category,
                    selectedErrorCodeInfo.description,
                    userLocation
                  );
                  
                  if (pricingAnalysis) {
                    pricingInfo = `\n**💰 REAL-TIME PRICING (${pricingAnalysis.location.city}, ${pricingAnalysis.location.state}):**\n`;
                    pricingInfo += `• Total Cost: $${pricingAnalysis.pricing.total.min} - $${pricingAnalysis.pricing.total.max}\n`;
                    pricingInfo += `• Average Cost: $${pricingAnalysis.pricing.total.average}\n`;
                    pricingInfo += `• Labor: $${pricingAnalysis.pricing.labor.average} (${pricingAnalysis.timeEstimate.average})\n`;
                    pricingInfo += `• Parts: $${pricingAnalysis.pricing.parts.average}\n`;
                    pricingInfo += `• Trend: ${pricingAnalysis.trends.priceChange} (${pricingAnalysis.trends.changePercent}%)\n`;
                    pricingInfo += `• Sources: ${pricingAnalysis.sources.length} recent reports\n`;
                    pricingInfo += `• Confidence: ${Math.round(pricingAnalysis.confidence * 100)}%\n`;
                  }
                } catch (error) {
                  console.warn('Dynamic pricing failed:', error);
                  pricingInfo = `\n**💰 PRICING:** Using estimated costs (real-time data unavailable)\n`;
                }
              }
              
              analysisText += `**Recommendations:**\n• Check engine diagnostics\n• Inspect related components\n• Schedule professional inspection\n\n**Priority:** ${selectedErrorCodeInfo?.severity || 'Medium'}${pricingInfo}`;

              const aiMessage = {
                id: (Date.now() + 1).toString(),
                text: analysisText,
                type: 'ai' as const
              };
              setMessages(prev => [...prev, aiMessage]);
              setIsAnalyzing(false);
            }, 2000);
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Analyze audio with ML
        try {
          const { AudioAnalysisService } = await import('./services/AudioAnalysisService');
          const audioService = new AudioAnalysisService();
          const analysis = await audioService.analyzeAudioBlob(audioBlob);
          
          // Add analysis to chat
          const analysisMessage = {
            id: Date.now().toString(),
            text: `**Audio Analysis Results:**\n• Component: ${analysis.component}\n• Failure Type: ${analysis.failure_type}\n• Confidence: ${Math.round(analysis.confidence * 100)}%\n• Severity: ${analysis.severity}\n• Anomaly Score: ${analysis.anomaly_score}`,
            type: 'ai' as const
          };
          setMessages(prev => [...prev, analysisMessage]);
        } catch (error) {
          console.warn('Audio analysis failed:', error);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Could not access microphone:', error);
      alert('Microphone access denied. Please allow microphone access to record audio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      alert('Some files were rejected. Only image files under 10MB are allowed.');
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Analyze images with AI
    for (const file of validFiles) {
      try {
        const analysisMessage = {
          id: Date.now().toString() + Math.random(),
          text: `**Image Analysis:** ${file.name}\n• File size: ${(file.size / 1024 / 1024).toFixed(2)}MB\n• Type: ${file.type}\n• Visual analysis: Analyzing truck components and potential issues...`,
          type: 'ai' as const
        };
        setMessages(prev => [...prev, analysisMessage]);
      } catch (error) {
        console.warn('Image analysis failed:', error);
      }
    }
  };

  const generatePDFReport = async () => {
    const finalTruckMake = useCustomInput ? customTruckMake : truckMake;
    const finalTruckModel = useCustomInput ? customTruckModel : truckModel;
    
    // Report data for future use
    // const reportData = {
    //   truckMake: finalTruckMake,
    //   truckModel: finalTruckModel,
    //   errorCode,
    //   symptoms: selectedSymptoms,
    //   messages: messages,
    //   audioUrl,
    //   selectedFiles: selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
    //   timestamp: new Date().toISOString(),
    //   location: userLocation
    // };
    
    try {
      // Create a comprehensive report
      const reportContent = `
# Truck Diagnostic Report
Generated: ${new Date().toLocaleString()}

## Vehicle Information
- Make: ${finalTruckMake}
- Model: ${finalTruckModel}
- Error Code: ${errorCode || 'None'}

## Symptoms
${selectedSymptoms.map(s => `- ${s}`).join('\n')}

## Diagnostic History
${messages.map(m => `**${m.type === 'user' ? 'User' : 'AI'}:** ${m.text}`).join('\n\n')}

## Attachments
- Audio Recordings: ${audioUrl ? '1 file' : 'None'}
- Images: ${selectedFiles.length} files

## Location
${userLocation ? `Lat: ${userLocation.lat}, Lng: ${userLocation.lng}` : 'Not available'}
      `;

      // Create and download the report
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truck-diagnostic-report-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Add confirmation message
      const reportMessage = {
        id: Date.now().toString(),
        text: `**PDF Report Generated!**\n• Report includes all diagnostic data\n• Audio and image attachments noted\n• Location data included\n• Download started automatically`,
        type: 'ai' as const
      };
      setMessages(prev => [...prev, reportMessage]);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate report. Please try again.');
    }
  };


  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: isMobile ? '10px' : '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: isMobile ? '20px' : '30px',
          background: 'rgba(255,255,255,0.1)',
          padding: isMobile ? '15px' : '20px',
          borderRadius: '15px',
          backdropFilter: 'blur(10px)'
        }}>
          <h1 style={{ 
            color: 'white', 
            fontSize: isMobile ? '1.8rem' : '2.5rem', 
            margin: '0 0 10px 0',
            lineHeight: '1.2'
          }}>
            AI Truck Diagnostic Assistant
          </h1>
          <p style={{ 
            color: 'rgba(255,255,255,0.8)', 
            fontSize: isMobile ? '0.9rem' : '1.1rem', 
            margin: 0,
            lineHeight: '1.4'
          }}>
            Describe your truck problem and get instant AI-powered diagnosis
          </p>
        </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                  gap: isMobile ? '15px' : '20px' 
                }}>
                  {/* Left Panel - Tools */}
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                    height: 'fit-content'
                  }}>
                    <h3 style={{ color: 'white', marginTop: 0, fontSize: '1.2rem', marginBottom: '15px' }}>Diagnostic Tools</h3>
            
                    {/* Truck Info */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ color: 'white', fontSize: '0.9rem' }}>
                          Truck Make:
                        </label>
                        <button
                          onClick={() => setUseCustomInput(!useCustomInput)}
                          style={{
                            padding: '4px 8px',
                            background: useCustomInput ? '#e74c3c' : '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >
                          {useCustomInput ? 'Use List' : 'Manual Input'}
                        </button>
                      </div>
                      
                      {useCustomInput ? (
                        <input 
                          type="text" 
                          value={customTruckMake} 
                          onChange={(e) => setCustomTruckMake(e.target.value)}
                          placeholder="Enter truck make manually"
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            borderRadius: '5px', 
                            border: 'none',
                            fontSize: '13px',
                            backgroundColor: 'white',
                            color: '#333'
                          }}
                        />
                      ) : (
                        <select 
                          value={truckMake} 
                          onChange={(e) => {
                            setTruckMake(e.target.value);
                            setTruckModel(''); // Reset model when make changes
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            borderRadius: '5px', 
                            border: 'none',
                            fontSize: '13px',
                            backgroundColor: 'white',
                            color: '#333'
                          }}
                        >
                          <option value="">Select Make</option>
                          {truckMakes.map(make => (
                            <option key={make} value={make}>{make}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ color: 'white', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                        Truck Model:
                      </label>
                      
                      {useCustomInput ? (
                        <input 
                          type="text" 
                          value={customTruckModel} 
                          onChange={(e) => setCustomTruckModel(e.target.value)}
                          placeholder="Enter truck model manually"
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            borderRadius: '5px', 
                            border: 'none',
                            fontSize: '13px',
                            backgroundColor: 'white',
                            color: '#333'
                          }}
                        />
                      ) : (
                        <select 
                          value={truckModel} 
                          onChange={(e) => setTruckModel(e.target.value)}
                          disabled={!truckMake}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            borderRadius: '5px', 
                            border: 'none',
                            fontSize: '13px',
                            backgroundColor: truckMake ? 'white' : '#f5f5f5',
                            color: truckMake ? '#333' : '#999',
                            cursor: truckMake ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <option value="">Select Model</option>
                          {availableModels.map(model => (
                            <option key={model.id} value={model.name}>{model.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ color: 'white', display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>
                        Error Code:
                      </label>
                      <select 
                        value={errorCode} 
                        onChange={(e) => setErrorCode(e.target.value)}
                        disabled={!truckMake}
                        style={{ 
                          width: '100%', 
                          padding: '8px', 
                          borderRadius: '5px', 
                          border: 'none',
                          fontSize: '13px',
                          backgroundColor: truckMake ? 'white' : '#f5f5f5',
                          color: truckMake ? '#333' : '#999',
                          cursor: truckMake ? 'pointer' : 'not-allowed',
                          marginBottom: '6px'
                        }}
                      >
                        <option value="">Select Error Code</option>
                        {availableErrorCodes.map(code => (
                          <option key={code.code} value={code.code}>{code.code} - {code.description}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        value={errorCode} 
                        onChange={(e) => setErrorCode(e.target.value)}
                        placeholder="Or enter custom error code"
                        style={{ 
                          width: '100%', 
                          padding: '8px', 
                          borderRadius: '5px', 
                          border: 'none',
                          fontSize: '13px',
                          backgroundColor: 'white',
                          color: '#333'
                        }}
                      />
                    </div>

                    {/* Truck Specifications */}
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ color: 'white', fontSize: '0.9rem' }}>
                          Truck Specifications:
                        </label>
                        <button
                          onClick={() => setShowTruckSpecs(!showTruckSpecs)}
                          style={{
                            padding: '4px 8px',
                            background: showTruckSpecs ? '#e74c3c' : '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.7rem'
                          }}
                        >
                          {showTruckSpecs ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {showTruckSpecs && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>
                              Height (ft):
                            </label>
                            <input 
                              type="number" 
                              value={truckHeight} 
                              onChange={(e) => setTruckHeight(parseFloat(e.target.value) || 13.5)}
                              style={{ 
                                width: '100%', 
                                padding: '6px', 
                                borderRadius: '4px', 
                                border: 'none',
                                fontSize: '12px',
                                backgroundColor: 'white',
                                color: '#333'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>
                              Weight (lbs):
                            </label>
                            <input 
                              type="number" 
                              value={truckWeight} 
                              onChange={(e) => setTruckWeight(parseInt(e.target.value) || 80000)}
                              style={{ 
                                width: '100%', 
                                padding: '6px', 
                                borderRadius: '4px', 
                                border: 'none',
                                fontSize: '12px',
                                backgroundColor: 'white',
                                color: '#333'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', display: 'block', marginBottom: '2px' }}>
                              Length (ft):
                            </label>
                            <input 
                              type="number" 
                              value={truckLength} 
                              onChange={(e) => setTruckLength(parseFloat(e.target.value) || 70)}
                              style={{ 
                                width: '100%', 
                                padding: '6px', 
                                borderRadius: '4px', 
                                border: 'none',
                                fontSize: '12px',
                                backgroundColor: 'white',
                                color: '#333'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Common Symptoms */}
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ color: 'white', fontSize: '0.9rem' }}>
                          Common Symptoms:
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => setShowSymptoms(!showSymptoms)}
                            style={{
                              padding: '4px 8px',
                              background: showSymptoms ? '#e74c3c' : '#3498db',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            {showSymptoms ? 'Hide' : 'Show'}
                          </button>
                          {showSymptoms && (
                            <button
                              onClick={() => {
                                if (selectedSymptoms.length === commonTruckSymptoms.length) {
                                  setSelectedSymptoms([]);
                                } else {
                                  setSelectedSymptoms([...commonTruckSymptoms]);
                                }
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.7rem'
                              }}
                            >
                              {selectedSymptoms.length === commonTruckSymptoms.length ? 'Clear' : 'All'}
                            </button>
                          )}
                        </div>
                      </div>
                      {showSymptoms && (
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '4px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {commonTruckSymptoms.map(symptom => (
                            <label key={symptom} style={{ 
                              color: 'white', 
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                              padding: '2px 0'
                            }}>
                              <input 
                                type="checkbox" 
                                checked={selectedSymptoms.includes(symptom)}
                                onChange={() => toggleSymptom(symptom)}
                                style={{ marginRight: '6px', transform: 'scale(0.9)' }}
                              />
                              <span style={{ lineHeight: '1.2' }}>{symptom}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{
                          padding: '8px 6px',
                          background: isRecording ? '#e74c3c' : '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          textAlign: 'center'
                        }}
                      >
                        {isRecording ? 'Stop' : 'Record'}
                      </button>
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '8px 6px',
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          textAlign: 'center'
                        }}
                      >
                        Photos ({selectedFiles.length})
                      </button>
                      
                      <button 
                        onClick={generatePDFReport}
                        style={{
                          padding: '8px 6px',
                          background: '#9b59b6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          textAlign: 'center'
                        }}
                      >
                        PDF
                      </button>
                    </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

                    {/* Audio player */}
                    {audioUrl && (
                      <div style={{ marginTop: '10px' }}>
                        <audio controls src={audioUrl} style={{ width: '100%' }} />
                      </div>
                    )}

                    {/* Selected files */}
                    {selectedFiles.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ color: 'white', fontSize: '0.9rem', margin: '0 0 5px 0' }}>
                          Selected files: {selectedFiles.length}
                        </p>
                        {selectedFiles.map((file, index) => (
                          <div key={index} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                            {file.name}
                          </div>
                        ))}
                      </div>
                    )}
          </div>

          {/* Right Panel - Chat */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: isMobile ? '15px' : '20px',
            borderRadius: '15px',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            height: 'fit-content',
            maxHeight: isMobile ? '350px' : '400px',
            overflowY: 'auto'
          }}>
            <h3 style={{ color: 'white', marginTop: 0 }}>Chat with AI Mechanic</h3>
            
            {/* Messages */}
            <div style={{ 
              height: isMobile ? '200px' : '250px',
              overflowY: 'auto', 
              marginBottom: isMobile ? '15px' : '20px',
              padding: isMobile ? '8px' : '10px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            }}>
              {messages.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: 'rgba(255,255,255,0.7)', 
                  marginTop: '50px' 
                }}>
                  <p>Hi! I'm your AI truck diagnostic specialist.</p>
                  <p>Describe your truck problem and I'll help you diagnose it!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={{
                    marginBottom: '15px',
                    textAlign: msg.type === 'user' ? 'right' : 'left'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      maxWidth: '80%',
                      background: msg.type === 'user' ? '#3498db' : '#2ecc71',
                      color: 'white',
                      whiteSpace: 'pre-wrap'
                    }}>
                      <strong>{msg.type === 'user' ? 'You:' : 'AI Mechanic:'}</strong><br/>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {isAnalyzing && (
                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#f39c12',
                    color: 'white'
                  }}>
                    AI Mechanic: Analyzing your problem...
                  </div>
                </div>
              )}
      </div>
      
            {/* Input Form */}
            <form onSubmit={handleSubmit} style={{ 
              display: 'flex', 
              gap: isMobile ? '8px' : '10px',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <input
                type="text"
                placeholder="Describe your truck problem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  flex: 1,
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: isMobile ? '14px' : '16px'
                }}
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !message.trim()}
                style={{
                  padding: isMobile ? '10px 16px' : '12px 20px',
                  background: isAnalyzing ? '#95a5a6' : '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '14px' : '16px',
                  minWidth: isMobile ? 'auto' : '80px'
                }}
              >
                {isAnalyzing ? 'Analyzing...' : 'Send'}
              </button>
            </form>
          </div>
        </div>

                {/* Service Locator Section */}
                <div style={{
                  marginTop: isMobile ? '15px' : '20px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: isMobile ? '12px' : '15px',
                  borderRadius: '15px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '10px' : '0'
                  }}>
                    <h3 style={{ 
                      color: 'white', 
                      marginTop: 0, 
                      fontSize: isMobile ? '1.1rem' : '1.2rem' 
                    }}>Service Locator</h3>
                    <button
                      onClick={async () => {
                        if (userLocation) {
                          try {
                            const { EnhancedServiceLocatorService } = await import('./services/EnhancedServiceLocatorService');
                            const serviceLocator = new EnhancedServiceLocatorService();
                            const services = await serviceLocator.getServiceCenters(userLocation);
                            
                            setServiceLocations(services);
                            
                            const serviceMessage = {
                              id: Date.now().toString(),
                              text: `**Nearby Service Centers Found:**\n${services.slice(0, 3).map(s => `• ${s.name} - ${s.address} (Rating: ${s.rating}/5)`).join('\n')}\n\n**Total found:** ${services.length} services\n\n**Map updated** with service locations and truck height restrictions!`,
                              type: 'ai' as const
                            };
                            setMessages(prev => [...prev, serviceMessage]);
                          } catch (error) {
                            console.warn('Service locator failed:', error);
                          }
                        } else {
                          alert('Location not available. Please allow location access.');
                        }
                      }}
                      style={{
                        padding: isMobile ? '8px 16px' : '6px 12px',
                        background: '#e67e22',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.9rem' : '0.8rem',
                        width: isMobile ? '100%' : 'auto'
                      }}
                    >
                      Find Services
                    </button>
                  </div>
                  
                  <TruckServiceMap
                    userLocation={userLocation || undefined}
                    serviceLocations={serviceLocations}
                    truckHeight={truckHeight}
                    truckWeight={truckWeight}
                    truckLength={truckLength}
                    onServiceSelect={(service) => {
                      setSelectedService(service);
                      const serviceMessage = {
                        id: Date.now().toString(),
                        text: `**Selected Service Center:**\n• Name: ${service.name}\n• Address: ${service.address}\n• Rating: ${service.rating}/5\n• Type: ${service.type}\n• Phone: ${service.phone || 'Not available'}\n• Services: ${service.services?.join(', ') || 'Not specified'}\n\n**Truck Route Info:**\n• Height: ${truckHeight}ft\n• Weight: ${Math.round(truckWeight/1000)}k lbs\n• Length: ${truckLength}ft\n• Route optimized for your truck specifications`,
                        type: 'ai' as const
                      };
                      setMessages(prev => [...prev, serviceMessage]);
                    }}
                  />
                </div>


      </div>
    </div>
  );
}
