import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Key, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Info,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { env } from '../lib/env';

export function ApiKeySetup() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<'unknown' | 'valid' | 'invalid' | 'missing'>('unknown');
  const [isTestingKey, setIsTestingKey] = useState(false);

  useEffect(() => {
    checkCurrentApiKey();
  }, []);

  const checkCurrentApiKey = () => {
    try {
      const apiKey = env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey || apiKey === '') {
        setKeyStatus('missing');
        setCurrentApiKey(null);
      } else if (apiKey.includes('YOUR_API_KEY') || apiKey.length < 30) {
        setKeyStatus('invalid');
        setCurrentApiKey(apiKey);
      } else {
        setCurrentApiKey(apiKey);
        setKeyStatus('valid');
      }
      
    } catch (err) {
      setKeyStatus('missing');
      setCurrentApiKey(null);
    }
  };

  const testApiKey = async (key: string) => {
    setIsTestingKey(true);
    
    try {
      // Test the key by making a simple Maps API request
      const testUrl = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      
      // Create a script element to test the key
      const script = document.createElement('script');
      script.src = testUrl;
      
      const testPromise = new Promise((resolve, reject) => {
        script.onload = () => {
          document.head.removeChild(script);
          resolve('valid');
        };
        
        script.onerror = () => {
          document.head.removeChild(script);
          reject(new Error('Invalid API key'));
        };
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (script.parentNode) {
            document.head.removeChild(script);
          }
          reject(new Error('Request timeout'));
        }, 10000);
      });
      
      document.head.appendChild(script);
      
      await testPromise;
      
      toast.success('API key is valid!');
      setKeyStatus('valid');
      
    } catch (error) {
      toast.error('API key test failed. Please check your key.');
      setKeyStatus('invalid');
    } finally {
      setIsTestingKey(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const maskedApiKey = currentApiKey ? 
    `${currentApiKey.substring(0, 8)}...${currentApiKey.substring(currentApiKey.length - 8)}` : 
    'Not configured';

  const getStatusBadge = () => {
    switch (keyStatus) {
      case 'valid':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Valid
          </Badge>
        );
      case 'invalid':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-400/30">
            <XCircle className="h-3 w-3 mr-1" />
            Invalid
          </Badge>
        );
      case 'missing':
        return (
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-400/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-white/20 text-white/90">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <Key className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Google Maps API Key Status</CardTitle>
                <CardDescription className="text-white/80">
                  Current integration status and configuration
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80">Current API Key:</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/90 font-mono text-sm">
                  {showApiKey ? currentApiKey || 'Not configured' : maskedApiKey}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {currentApiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(currentApiKey)}
                    className="glass-subtle border-white/20 text-white hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white/80">Status:</Label>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkCurrentApiKey}
                  className="glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test API Key */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" />
            Test API Key
          </CardTitle>
          <CardDescription className="text-white/80">
            Test a Google Maps API key before setting it as environment variable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">API Key to Test:</Label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your Google Maps API key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/50"
              />
              <Button
                onClick={() => setShowApiKey(!showApiKey)}
                variant="outline"
                size="sm"
                className="glass-subtle border-white/20 text-white hover:bg-white/10"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <Button
            onClick={() => testApiKey(apiKeyInput)}
            disabled={!apiKeyInput || isTestingKey}
            className="w-full"
          >
            {isTestingKey ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testing Key...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Test API Key
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Setup Instructions
          </CardTitle>
          <CardDescription className="text-white/80">
            How to get and configure your Google Maps API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-white font-medium">Create Google Cloud Project</h4>
                <p className="text-white/70 text-sm mt-1">
                  Go to Google Cloud Console and create a new project or select an existing one.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://console.cloud.google.com/projectcreate', '_blank')}
                  className="mt-2 glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="text-white font-medium">Enable Maps JavaScript API</h4>
                <p className="text-white/70 text-sm mt-1">
                  Enable the Maps JavaScript API for your project in the API Library.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://console.cloud.google.com/apis/library/maps-backend.googleapis.com', '_blank')}
                  className="mt-2 glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Enable API
                </Button>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="text-white font-medium">Create API Key</h4>
                <p className="text-white/70 text-sm mt-1">
                  Generate a new API key in the Credentials section of your project.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                  className="mt-2 glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="text-white font-medium">Set Environment Variable</h4>
                <p className="text-white/70 text-sm mt-1">
                  Add your API key to your environment variables as GOOGLE_MAPS_API_KEY.
                </p>
                <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <code className="text-green-400 text-sm font-mono">
                    GOOGLE_MAPS_API_KEY=your_actual_api_key_here
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard('GOOGLE_MAPS_API_KEY=your_actual_api_key_here')}
                    className="ml-2 glass-subtle border-white/20 text-white hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-300 text-sm">
                  <strong>Important:</strong> After setting the environment variable, restart your development server 
                  for the changes to take effect. The API key should have permissions for Maps JavaScript API and 
                  Places API (optional).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}