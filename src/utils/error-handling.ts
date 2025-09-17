import { getErrorMessage } from "../utils/error-handling";
/**
 * Utility functions for safe error handling
 */

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return getErrorMessage(error);
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
      message: getErrorMessage(error),
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