import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { aiAPI } from '../utils/api';
import { toast } from 'sonner';

export function AIDiagnosticTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [testData, setTestData] = useState({
    symptoms: 'Engine makes knocking sound when accelerating',
    truckMake: 'Freightliner',
    truckModel: 'Cascadia',
    errorCode: ''
  });

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiAPI.analyze({
        symptoms: testData.symptoms,
        errorCode: testData.errorCode,
        truckMake: testData.truckMake,
        truckModel: testData.truckModel,
        hasAudioRecording: false
      });

      setResult(response);
      toast.success('AI Analysis completed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`AI Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>AI Diagnostic Test</CardTitle>
          <CardDescription>
            Test the AI diagnostic functionality with different inputs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Truck Make</label>
              <Select
                value={testData.truckMake}
                onValueChange={(value) => setTestData(prev => ({ ...prev, truckMake: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Freightliner">Freightliner</SelectItem>
                  <SelectItem value="Peterbilt">Peterbilt</SelectItem>
                  <SelectItem value="Kenworth">Kenworth</SelectItem>
                  <SelectItem value="Volvo">Volvo</SelectItem>
                  <SelectItem value="Mack">Mack</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Truck Model</label>
              <Input
                value={testData.truckModel}
                onChange={(e) => setTestData(prev => ({ ...prev, truckModel: e.target.value }))}
                placeholder="e.g., Cascadia, 579, T680"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Symptoms</label>
            <Textarea
              value={testData.symptoms}
              onChange={(e) => setTestData(prev => ({ ...prev, symptoms: e.target.value }))}
              placeholder="Describe the symptoms or issues with the truck"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Error Code (Optional)</label>
            <Input
              value={testData.errorCode}
              onChange={(e) => setTestData(prev => ({ ...prev, errorCode: e.target.value }))}
              placeholder="e.g., SPN 102, FMI 3"
            />
          </div>

          <Button
            onClick={handleTest}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Testing AI Diagnostic...' : 'Test AI Diagnostic'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Success!</CardTitle>
            <CardDescription>AI Diagnostic completed successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-800">Request:</h4>
                <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                  {JSON.stringify(testData, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold text-green-800">Response:</h4>
                <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
