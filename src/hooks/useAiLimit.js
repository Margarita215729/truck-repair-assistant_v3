import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { GUEST_CHAT_MESSAGE_LIMIT } from '@/lib/guestAccess';

/**
 * Hook to check AI limits before making a request.
 * Returns { canUse, checkAndIncrement, isLimitReached, usage, isGuest, guestLimitReached }
 */
export function useAiLimit({ messageCount = 0 } = {}) {
  const { isProUser, aiUsage, refreshAiUsage, isAuthenticated } = useAuth();
  const [isLimitReached, setIsLimitReached] = useState(false);

  const isGuest = !isAuthenticated;
  const guestLimitReached = isGuest && messageCount >= GUEST_CHAT_MESSAGE_LIMIT;

  const canUse = isGuest
    ? !guestLimitReached
    : isProUser || (aiUsage?.remaining > 0);

  /**
   * Check limit and increment if allowed. Returns true if request can proceed.
   */
  const checkAndIncrement = useCallback(async () => {
    // Guest mode: enforce message-count limit (no server round-trip needed)
    if (isGuest) {
      if (guestLimitReached) {
        setIsLimitReached(true);
        return false;
      }
      return true;
    }

    if (isProUser) return true;

    const usage = await refreshAiUsage();
    if (!usage.allowed) {
      setIsLimitReached(true);
      return false;
    }

    // Increment will happen server-side via AI proxy
    setIsLimitReached(false);
    return true;
  }, [isProUser, refreshAiUsage, isGuest, guestLimitReached]);

  const dismissLimit = useCallback(() => {
    setIsLimitReached(false);
  }, []);

  return {
    canUse,
    checkAndIncrement,
    isLimitReached,
    dismissLimit,
    usage: aiUsage,
    isGuest,
    guestLimitReached,
    guestMessageLimit: GUEST_CHAT_MESSAGE_LIMIT,
  };
}

export default useAiLimit;
