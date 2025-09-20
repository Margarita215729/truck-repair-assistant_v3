/**
 * Utility functions for safe error handling
 */

import { toast } from 'sonner';

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}

/**
 * Safely extract error details for logging
 */
export function getErrorDetails(error: unknown): { message: string; stack?: string; name?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  return {
    message: getErrorMessage(error)
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown, context?: string) {
  const errorMessage = getErrorMessage(error);
  return {
    success: false,
    error: errorMessage,
    context: context || 'Unknown context',
    timestamp: new Date().toISOString()
  };
}

/**
 * Standardized async error handler with toast notification
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  errorContext: string,
  showToast: boolean = true
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`${errorContext}:`, getErrorDetails(error));
    
    if (showToast) {
      toast.error(`${errorContext}: ${errorMessage}`);
    }
    
    return null;
  }
}

/**
 * Standardized sync error handler
 */
export function handleSyncError<T>(
  operation: () => T,
  errorContext: string,
  showToast: boolean = true
): T | null {
  try {
    return operation();
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`${errorContext}:`, getErrorDetails(error));
    
    if (showToast) {
      toast.error(`${errorContext}: ${errorMessage}`);
    }
    
    return null;
  }
}

/**
 * Wrapper for API calls with standardized error handling
 */
export async function apiCall<T>(
  request: () => Promise<T>,
  errorMessage: string = 'API call failed'
): Promise<T | null> {
  return handleAsyncError(request, errorMessage);
}