import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  GUEST_AI_USAGE_EVENT,
  GUEST_CHAT_MESSAGE_LIMIT,
  getGuestAiUsage,
} from '@/lib/guestAccess';

/**
 * Hook to check AI limits before making a request.
 * Returns { canUse, checkAndIncrement, isLimitReached, usage, isGuest, guestLimitReached }
 */
export function useAiLimit() {
  const { isProUser, aiUsage, refreshAiUsage, isAuthenticated } = useAuth();
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [guestUsage, setGuestUsage] = useState(getGuestAiUsage);

  const isGuest = !isAuthenticated;
  const guestLimitReached = isGuest && guestUsage.allowed === false;

  useEffect(() => {
    const handleGuestUsage = (event) => {
      if (event.detail) setGuestUsage(event.detail);
    };
    window.addEventListener(GUEST_AI_USAGE_EVENT, handleGuestUsage);
    return () => window.removeEventListener(GUEST_AI_USAGE_EVENT, handleGuestUsage);
  }, []);

  const canUse = isGuest
    ? !guestLimitReached
    : isProUser || (aiUsage?.remaining > 0);

  /**
   * Check limit and increment if allowed. Returns true if request can proceed.
   */
  const checkAndIncrement = useCallback(async () => {
    // The API is authoritative; this cached value keeps an exhausted guest from
    // making an unnecessary request after a successful 10th call.
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
    usage: isGuest ? guestUsage : aiUsage,
    isGuest,
    guestLimitReached,
    guestMessageLimit: GUEST_CHAT_MESSAGE_LIMIT,
  };
}

export default useAiLimit;
