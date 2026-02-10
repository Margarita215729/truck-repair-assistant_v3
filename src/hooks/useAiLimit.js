import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { subscriptionService } from '@/services/subscriptionService';

/**
 * Hook to check AI limits before making a request.
 * Returns { canUse, checkAndIncrement, isLimitReached, usage }
 */
export function useAiLimit() {
  const { isProUser, aiUsage, refreshAiUsage } = useAuth();
  const [isLimitReached, setIsLimitReached] = useState(false);

  const canUse = isProUser || (aiUsage?.remaining > 0);

  /**
   * Check limit and increment if allowed. Returns true if request can proceed.
   */
  const checkAndIncrement = useCallback(async () => {
    if (isProUser) return true;

    const usage = await refreshAiUsage();
    if (!usage.allowed) {
      setIsLimitReached(true);
      return false;
    }

    // Increment will happen server-side via AI proxy
    setIsLimitReached(false);
    return true;
  }, [isProUser, refreshAiUsage]);

  const dismissLimit = useCallback(() => {
    setIsLimitReached(false);
  }, []);

  return {
    canUse,
    checkAndIncrement,
    isLimitReached,
    dismissLimit,
    usage: aiUsage,
  };
}

export default useAiLimit;
