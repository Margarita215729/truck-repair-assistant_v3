import React from 'react';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useEnvironment } from '../hooks/useEnvironment';

export function EnvironmentStatus() {
  const { env, isLoaded, validation, isValid } = useEnvironment();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Loading...</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isValid ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        )}
        <span className="text-sm font-medium">
          Environment Status: {isValid ? 'Ready' : 'Incomplete'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span>Google Maps API Key:</span>
          {env.GOOGLE_MAPS_API_KEY ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Set
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span>Supabase URL:</span>
          {env.SUPABASE_URL ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Set
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span>Supabase Anon Key:</span>
          {env.SUPABASE_ANON_KEY ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Set
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span>GitHub Token:</span>
          {env.GITHUB_TOKEN ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Set
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Optional
            </Badge>
          )}
        </div>
      </div>
      
      {!isValid && validation.missing.length > 0 && (
        <div className="mt-2 text-xs text-amber-600">
          Missing: {validation.missing.join(', ')}
        </div>
      )}
    </div>
  );
}