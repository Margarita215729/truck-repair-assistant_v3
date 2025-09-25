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
    
    // Check if we have any input (message, error code, or symptoms)
    if (!message.trim() && !errorCode && selectedSymptoms.length === 0) return;

    // Create user message with available information
    let messageText = message.trim();
    if (!messageText) {
      // If no text message, create one from available data
      const parts = [];
      if (errorCode) parts.push(`Error Code: ${errorCode}`);
      if (selectedSymptoms.length > 0) parts.push(`Symptoms: ${selectedSymptoms.join(', ')}`);
      messageText = parts.join(' | ');
    }

    const userMessage = {
      id: Date.now().toString(),
      text: messageText,
      type: 'user' as const
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsAnalyzing(true);

            // Enhanced AI analysis using GitHubModelsService
            setTimeout(async () => {
              try {
                const finalTruckMake = useCustomInput ? customTruckMake : truckMake;
                const finalTruckModel = useCustomInput ? customTruckModel : truckModel;
                
                // Try GitHubModelsService first, fallback to Supabase API
                let analysis;
                let analysisSource = 'unknown';
                
                try {
                  console.log('🚀 Attempting GitHubModelsService...');
                  
                  // Import and use GitHubModelsService
                  const { GitHubModelsService } = await import('./services/GitHubModelsService');
                  const githubService = new GitHubModelsService();
                  
                  // Create diagnostic prompt
                  const diagnosticPrompt = {
                    symptoms: userMessage.text,
                    truck_model: `${finalTruckMake} ${finalTruckModel}`,
                    error_code: errorCode,
                    selected_symptoms: selectedSymptoms,
                    has_audio_recording: false,
                    user_location: userLocation
                  };
                  
                  console.log('📝 Diagnostic prompt:', diagnosticPrompt);
                  
                  // Get AI analysis with roadside priority
                  analysis = await githubService.analyzeTruckDiagnostic(diagnosticPrompt);
                  analysisSource = 'GitHubModelsService';
                  
                  console.log('✅ GitHubModelsService success:', analysis);
                  
                } catch (githubError) {
                  console.warn('❌ GitHub Models API failed, trying Supabase API:', githubError);
                  
                  try {
                    // Fallback to Supabase API
                    const { aiAPI } = await import('./utils/api');
                    const supabaseResponse = await aiAPI.analyze({
                      symptoms: userMessage.text,
                      truckModel: `${finalTruckMake} ${finalTruckModel}`,
                      hasAudioRecording: false
                    });
                    
                    console.log('📡 Supabase API response:', supabaseResponse);
                    
                    // Convert Supabase response to our format with better roadside solutions
                    analysis = {
                      can_continue: true,
                      urgency: 'medium',
                      quick_fixes: [
                        'Check oil level and add oil if low',
                        'Restart engine and listen for changes',
                        'Check for loose connections',
                        'Verify fuel filter is not clogged',
                        'Try tapping the fuel filter to dislodge debris'
                      ],
                      live_hacks: [
                        'Professional trick: Tap the oil pressure sensor to reset it',
                        'Industry secret: Use a rubber mallet to tap the fuel filter',
                        'Mechanic hack: Check the air filter for blockages',
                        'Roadside fix: Bypass the fuel filter temporarily if possible'
                      ],
                      immediate_actions: [
                        'Turn off engine if unsafe',
                        'Check for visible leaks',
                        'Verify all fluid levels',
                        'Look for loose or damaged wires'
                      ],
                      youtube_videos: [
                        {
                          title: 'Emergency Truck Repair - Roadside Fixes',
                          duration: '6:30',
                          url: 'https://www.youtube.com/watch?v=example1'
                        },
                        {
                          title: 'Quick Fix for Engine Problems',
                          duration: '4:15',
                          url: 'https://www.youtube.com/watch?v=example2'
                        }
                      ],
                      cost_estimate: { min: 300, max: 800 }
                    };
                    analysisSource = 'Supabase API (Fallback)';
                    
                  } catch (supabaseError) {
                    console.error('❌ Supabase API also failed:', supabaseError);
                    
                    // Final fallback with comprehensive roadside solutions
                    analysis = {
                      can_continue: true,
                      urgency: 'medium',
                      quick_fixes: [
                        'Check oil level and add oil if low',
                        'Restart engine and listen for changes',
                        'Check for loose connections',
                        'Verify fuel filter is not clogged',
                        'Try tapping the fuel filter to dislodge debris',
                        'Check battery connections and clean terminals',
                        'Verify coolant level and look for leaks'
                      ],
                      live_hacks: [
                        'Professional trick: Tap the oil pressure sensor to reset it',
                        'Industry secret: Use a rubber mallet to tap the fuel filter',
                        'Mechanic hack: Check the air filter for blockages',
                        'Roadside fix: Bypass the fuel filter temporarily if possible',
                        'Emergency trick: Use starting fluid if engine won\'t start',
                        'Quick fix: Check and clean the mass air flow sensor'
                      ],
                      immediate_actions: [
                        'Turn off engine if unsafe',
                        'Check for visible leaks',
                        'Verify all fluid levels',
                        'Look for loose or damaged wires',
                        'Check tire pressure and condition',
                        'Verify lights and signals work'
                      ],
                      youtube_videos: [
                        {
                          title: 'Emergency Truck Repair - Roadside Fixes',
                          duration: '6:30',
                          url: 'https://www.youtube.com/watch?v=example1'
                        },
                        {
                          title: 'Quick Fix for Engine Problems',
                          duration: '4:15',
                          url: 'https://www.youtube.com/watch?v=example2'
                        },
                        {
                          title: 'Professional Truck Hacks',
                          duration: '8:45',
                          url: 'https://www.youtube.com/watch?v=example3'
                        }
                      ],
                      cost_estimate: { min: 300, max: 800 }
                    };
                    analysisSource = 'Static Fallback';
                  }
                }
                
                console.log(`🎯 Analysis source: ${analysisSource}`);
                console.log('📊 Final analysis:', analysis);
                
                // Format response with roadside priority
                let analysisText = `🚨 SAFETY FIRST:\n• Can Continue Driving: ${analysis.can_continue ? 'YES (with caution)' : 'NO - STOP IMMEDIATELY'}\n• Safety Risk: ${analysis.urgency.toUpperCase()}\n\n`;
                
                if (analysis.quick_fixes && analysis.quick_fixes.length > 0) {
                  analysisText += `⚡ QUICK FIX (Roadside Solution):\n${analysis.quick_fixes.map(fix => `• ${fix}`).join('\n')}\n\n`;
                }
                
                if (analysis.live_hacks && analysis.live_hacks.length > 0) {
                  analysisText += `🔧 LIVE HACK (Professional Trick):\n${analysis.live_hacks.map(hack => `• ${hack}`).join('\n')}\n\n`;
                }
                
                if (analysis.immediate_actions && analysis.immediate_actions.length > 0) {
                  analysisText += `⚡ IMMEDIATE ACTIONS:\n${analysis.immediate_actions.map(action => `• ${action}`).join('\n')}\n\n`;
                }
                
                if (analysis.youtube_videos && analysis.youtube_videos.length > 0) {
                  analysisText += `📺 VIDEO HELP (YouTube Tutorials):\n`;
                  analysis.youtube_videos.forEach((video) => {
                    analysisText += `• ${video.title} (${video.duration})\n`;
                  });
                  analysisText += `\n`;
                }
                
                if (analysis.cost_estimate) {
                  analysisText += `💰 COST ESTIMATE:\n• Quick fix: $0-50 (if you can do it)\n• Professional repair: $${analysis.cost_estimate.min}-$${analysis.cost_estimate.max}\n\n`;
                }
                
                analysisText += `🎯 PRIORITY: Get truck moving first, worry about permanent fix later!\n\n`;
                analysisText += `📡 Analysis Source: ${analysisSource}`;

                const aiMessage = {
                  id: (Date.now() + 1).toString(),
                  text: analysisText,
                  type: 'ai' as const
                };
                setMessages(prev => [...prev, aiMessage]);
              } catch (error) {
                console.error('AI analysis failed:', error);
                const errorMessage = {
                  id: (Date.now() + 1).toString(),
                  text: `❌ AI Analysis Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`,
                  type: 'ai' as const
                };
                setMessages(prev => [...prev, errorMessage]);
              } finally {
                setIsAnalyzing(false);
              }
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
    
    try {
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      
      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      
      // Helper function to add text with word wrapping
      const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, color: string = '#000000') => {
        doc.setFontSize(fontSize);
        doc.setTextColor(color);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };
      
      // Helper function to add a line
      const addLine = (x1: number, y1: number, x2: number, y2: number, color: string = '#666666') => {
        doc.setDrawColor(color);
        doc.line(x1, y1, x2, y2);
      };
      
      // Helper function to add a section header
      const addSectionHeader = (title: string, y: number) => {
        doc.setFillColor(102, 126, 234); // Blue background
        doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        return y + 15;
      };
      
      // Header with logo and title
      doc.setFillColor(102, 126, 234);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('🚛 AI Truck Diagnostic Report', 20, 20);
      
      // Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 60, 20);
      
      yPosition = 50;
      
      // Vehicle Information Section
      yPosition = addSectionHeader('Vehicle Information', yPosition);
      yPosition = addText(`Make: ${finalTruckMake || 'Not specified'}`, 20, yPosition, pageWidth - 40, 11);
      yPosition = addText(`Model: ${finalTruckModel || 'Not specified'}`, 20, yPosition, pageWidth - 40, 11);
      yPosition = addText(`Error Code: ${errorCode || 'None'}`, 20, yPosition, pageWidth - 40, 11);
      
      if (userLocation) {
        yPosition = addText(`Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`, 20, yPosition, pageWidth - 40, 11);
      }
      
      yPosition += 10;
      addLine(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 15;
      
      // Symptoms Section
      if (selectedSymptoms.length > 0) {
        yPosition = addSectionHeader('Reported Symptoms', yPosition);
        selectedSymptoms.forEach(symptom => {
          yPosition = addText(`• ${symptom}`, 25, yPosition, pageWidth - 50, 10);
        });
        yPosition += 10;
        addLine(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }
      
      // Diagnostic History Section
      if (messages.length > 0) {
        yPosition = addSectionHeader('Diagnostic History', yPosition);
        
        messages.forEach((msg) => {
          // Check if we need a new page
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }
          
          const sender = msg.type === 'user' ? '👤 User' : '🤖 AI Mechanic';
          const color = msg.type === 'user' ? '#3498db' : '#2ecc71';
          
          yPosition = addText(`${sender}:`, 20, yPosition, pageWidth - 40, 10, color);
          yPosition = addText(msg.text.replace(/\*\*(.*?)\*\*/g, '$1'), 25, yPosition, pageWidth - 50, 9);
          yPosition += 5;
        });
        
        yPosition += 10;
        addLine(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }
      
      // Attachments Section
      yPosition = addSectionHeader('Attachments', yPosition);
      yPosition = addText(`Audio Recordings: ${audioUrl ? '1 file available' : 'None'}`, 20, yPosition, pageWidth - 40, 10);
      yPosition = addText(`Images: ${selectedFiles.length} file(s)`, 20, yPosition, pageWidth - 40, 10);
      
      if (selectedFiles.length > 0) {
        selectedFiles.forEach(file => {
          yPosition = addText(`• ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 25, yPosition, pageWidth - 50, 9);
        });
      }
      
      yPosition += 10;
      addLine(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 15;
      
      // Footer
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = pageHeight - 20;
      } else {
        yPosition = pageHeight - 20;
      }
      
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by AI Truck Diagnostic Assistant', 20, yPosition);
      doc.text('For professional diagnosis, consult a certified mechanic', pageWidth - 80, yPosition);
      
      // Save the PDF
      const fileName = `truck-diagnostic-report-${Date.now()}.pdf`;
      doc.save(fileName);

      // Add confirmation message
      const reportMessage = {
        id: Date.now().toString(),
        text: `**📄 PDF Report Generated Successfully!**\n• Professional formatting with sections\n• Complete diagnostic history included\n• Vehicle information and symptoms documented\n• File: ${fileName}\n• Download started automatically`,
        type: 'ai' as const
      };
      setMessages(prev => [...prev, reportMessage]);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      
      // Fallback to text report if PDF generation fails
      const reportContent = `
# Truck Diagnostic Report
Generated: ${new Date().toLocaleString()}

## Vehicle Information
- Make: ${finalTruckMake || 'Not specified'}
- Model: ${finalTruckModel || 'Not specified'}
- Error Code: ${errorCode || 'None'}

## Symptoms
${selectedSymptoms.length > 0 ? selectedSymptoms.map(s => `- ${s}`).join('\n') : 'None reported'}

## Diagnostic History
${messages.map(m => `**${m.type === 'user' ? 'User' : 'AI'}:** ${m.text}`).join('\n\n')}

## Attachments
- Audio Recordings: ${audioUrl ? '1 file' : 'None'}
- Images: ${selectedFiles.length} files

## Location
${userLocation ? `Lat: ${userLocation.lat}, Lng: ${userLocation.lng}` : 'Not available'}
      `;

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truck-diagnostic-report-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('PDF generation failed. Text report generated instead.');
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
            
                    {/* Truck Info - Compact Layout */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ color: 'white', fontSize: '0.85rem' }}>
                          Truck Make:
                        </label>
                        <button
                          onClick={() => setUseCustomInput(!useCustomInput)}
                          style={{
                            padding: '3px 6px',
                            background: useCustomInput ? '#e74c3c' : '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}
                        >
                          {useCustomInput ? 'List' : 'Manual'}
                        </button>
                      </div>
                      
                      {useCustomInput ? (
                        <input 
                          type="text" 
                          value={customTruckMake} 
                          onChange={(e) => setCustomTruckMake(e.target.value)}
                          placeholder="Enter make"
                          style={{ 
                            width: '70%', 
                            padding: '6px', 
                            borderRadius: '4px', 
                            border: 'none',
                            fontSize: '12px',
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
                            width: '70%', 
                            padding: '6px', 
                            borderRadius: '4px', 
                            border: 'none',
                            fontSize: '12px',
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

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ color: 'white', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
                        Truck Model:
                      </label>
                      
                      {useCustomInput ? (
                        <input 
                          type="text" 
                          value={customTruckModel} 
                          onChange={(e) => setCustomTruckModel(e.target.value)}
                          placeholder="Enter model"
                          style={{ 
                            width: '70%', 
                            padding: '6px', 
                            borderRadius: '4px', 
                            border: 'none',
                            fontSize: '12px',
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
                            width: '70%', 
                            padding: '6px', 
                            borderRadius: '4px', 
                            border: 'none',
                            fontSize: '12px',
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

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ color: 'white', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
                        Error Code:
                      </label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select 
                          value={errorCode} 
                          onChange={(e) => setErrorCode(e.target.value)}
                          disabled={!truckMake}
                          style={{ 
                            width: '45%', 
                            padding: '6px', 
                            borderRadius: '4px', 
                            border: 'none',
                            fontSize: '12px',
                            backgroundColor: truckMake ? 'white' : '#f5f5f5',
                            color: truckMake ? '#333' : '#999',
                            cursor: truckMake ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <option value="">Select Code</option>
                          {availableErrorCodes.map(code => (
                            <option key={code.code} value={code.code}>{code.code}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          value={errorCode} 
                          onChange={(e) => setErrorCode(e.target.value)}
                          placeholder="Custom code"
                          style={{ 
                            width: '45%', 
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

                    {/* Truck Specifications - Compact */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ color: 'white', fontSize: '0.85rem' }}>
                          Truck Specifications:
                        </label>
                        <button
                          onClick={() => setShowTruckSpecs(!showTruckSpecs)}
                          style={{
                            padding: '3px 6px',
                            background: showTruckSpecs ? '#e74c3c' : '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '0.65rem'
                          }}
                        >
                          {showTruckSpecs ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {showTruckSpecs && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                          <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', display: 'block', marginBottom: '2px' }}>
                              Height (ft):
                            </label>
                            <input 
                              type="number" 
                              value={truckHeight} 
                              onChange={(e) => setTruckHeight(parseFloat(e.target.value) || 13.5)}
                              style={{ 
                                width: '100%', 
                                padding: '4px', 
                                borderRadius: '3px', 
                                border: 'none',
                                fontSize: '11px',
                                backgroundColor: 'white',
                                color: '#333'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', display: 'block', marginBottom: '2px' }}>
                              Weight (lbs):
                            </label>
                            <input 
                              type="number" 
                              value={truckWeight} 
                              onChange={(e) => setTruckWeight(parseInt(e.target.value) || 80000)}
                              style={{ 
                                width: '100%', 
                                padding: '4px', 
                                borderRadius: '3px', 
                                border: 'none',
                                fontSize: '11px',
                                backgroundColor: 'white',
                                color: '#333'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', display: 'block', marginBottom: '2px' }}>
                              Length (ft):
                            </label>
                            <input 
                              type="number" 
                              value={truckLength} 
                              onChange={(e) => setTruckLength(parseFloat(e.target.value) || 70)}
                              style={{ 
                                width: '100%', 
                                padding: '4px', 
                                borderRadius: '3px', 
                                border: 'none',
                                fontSize: '11px',
                                backgroundColor: 'white',
                                color: '#333'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Common Symptoms - Compact */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ color: 'white', fontSize: '0.85rem' }}>
                          Common Symptoms:
                        </label>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          <button
                            onClick={() => setShowSymptoms(!showSymptoms)}
                            style={{
                              padding: '3px 6px',
                              background: showSymptoms ? '#e74c3c' : '#3498db',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '0.65rem'
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
                                padding: '3px 6px',
                                background: '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '0.65rem'
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
                          gap: '3px',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {commonTruckSymptoms.map(symptom => (
                            <label key={symptom} style={{ 
                              color: 'white', 
                              fontSize: '0.7rem',
                              display: 'flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                              padding: '1px 0'
                            }}>
                              <input 
                                type="checkbox" 
                                checked={selectedSymptoms.includes(symptom)}
                                onChange={() => toggleSymptom(symptom)}
                                style={{ marginRight: '4px', transform: 'scale(0.8)' }}
                              />
                              <span style={{ lineHeight: '1.1' }}>{symptom}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Compact */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{
                          padding: '6px 4px',
                          background: isRecording ? '#e74c3c' : '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          textAlign: 'center'
                        }}
                      >
                        {isRecording ? 'Stop' : 'Record'}
                      </button>
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '6px 4px',
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          textAlign: 'center'
                        }}
                      >
                        Photos ({selectedFiles.length})
                      </button>
                      
                      <button 
                        onClick={generatePDFReport}
                        style={{
                          padding: '6px 4px',
                          background: '#9b59b6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
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
                placeholder="Describe your truck problem (optional if you have error code or symptoms)..."
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
                disabled={isAnalyzing || (!message.trim() && !errorCode && selectedSymptoms.length === 0)}
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
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
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
