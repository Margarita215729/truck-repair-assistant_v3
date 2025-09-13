import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  Key, 
  ExternalLink, 
  Eye, 
  EyeOff,
  Copy,
  Info,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

export function GithubTokenSetup() {
  const [token, setToken] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testToken = async (testToken?: string) => {
    const tokenToTest = testToken || token;
    if (!tokenToTest) return false;

    setIsLoading(true);
    try {
      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToTest}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test' }],
          model: 'gpt-4o-mini',
          max_tokens: 1
        })
      });

      const isValidToken = response.ok || response.status === 400; // 400 is ok, means auth worked
      setIsValid(isValidToken);
      return isValidToken;
    } catch (error) {
      console.error('Token test failed:', error);
      setIsValid(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copied to clipboard');
  };

  const openGithubModels = () => {
    window.open('https://github.com/marketplace/models', '_blank');
  };

  const openTokenDocs = () => {
    window.open('https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens', '_blank');
  };

  useEffect(() => {
    // Check if token is already set in environment
    const checkExistingToken = async () => {
      try {
        // This would normally check the environment variable
        // For demo purposes, we'll assume it needs to be set up
        const envToken = process.env.GITHUB_TOKEN;
        if (envToken) {
          setToken('••••••••••••••••••••••••••••••••••••••••');
          const isValidToken = await testToken(envToken);
          setIsValid(isValidToken);
        }
      } catch (error) {
        console.log('No existing token found');
      }
    };

    checkExistingToken();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-glass-border" style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Zap className="h-5 w-5 text-yellow-500" />
            GitHub Models Token Setup
          </CardTitle>
          <CardDescription className="text-white/80">
            Configure your GitHub Personal Access Token for AI-powered truck diagnostics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              GitHub Models provides free access to powerful AI models including GPT-4 for diagnostic analysis.
              You'll need a GitHub account and personal access token.
            </AlertDescription>
          </Alert>

          {/* Token Status */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-white/70" />
              <span className="text-white/90 text-sm">Token Status:</span>
            </div>
            <div className="flex items-center gap-2">
              {isValid === null ? (
                <Badge variant="secondary">Not Tested</Badge>
              ) : isValid ? (
                <Badge variant="default" className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Invalid
                </Badge>
              )}
            </div>
          </div>

          {/* Token Input */}
          <div className="space-y-2">
            <Label htmlFor="github-token" className="text-white">
              GitHub Personal Access Token
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="github-token"
                  type={isVisible ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setIsVisible(!isVisible)}
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {token && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(token)}
                  className="glass-subtle border-white/20 text-white hover:bg-white/10"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => testToken()}
              disabled={!token || isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isLoading ? 'Testing...' : 'Test Token'}
            </Button>
            <Button
              variant="outline"
              onClick={openGithubModels}
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              GitHub Models
            </Button>
            <Button
              variant="outline"
              onClick={openTokenDocs}
              className="glass-subtle border-white/20 text-white hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Token Docs
            </Button>
          </div>

          {/* Setup Instructions */}
          <div className="space-y-4">
            <h4 className="text-white font-medium">Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/80">
              <li>
                Go to{' '}
                <button
                  onClick={openGithubModels}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  GitHub Models
                </button>{' '}
                and sign in with your GitHub account
              </li>
              <li>Accept the GitHub Models terms and conditions</li>
              <li>
                Create a{' '}
                <button
                  onClick={openTokenDocs}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Personal Access Token
                </button>{' '}
                in your GitHub settings
              </li>
              <li>Copy the token and paste it above</li>
              <li>Click "Test Token" to verify it works</li>
              <li>Once verified, the AI diagnostic features will be enabled</li>
            </ol>
          </div>

          {/* Security Notice */}
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Note:</strong> Your GitHub token is processed securely and only used for AI model access.
              It's not stored permanently and is only kept in memory during your session.
            </AlertDescription>
          </Alert>

          {/* Features Enabled */}
          {isValid && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h4 className="text-green-300 font-medium mb-2">🎉 AI Features Enabled!</h4>
              <ul className="space-y-1 text-sm text-green-200">
                <li>• Real-time truck diagnostic analysis</li>
                <li>• Emergency roadside assistance recommendations</li>
                <li>• Safety assessments and immediate action guidance</li>
                <li>• Cost estimates and repair priorities</li>
                <li>• Professional-grade diagnostic insights</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}