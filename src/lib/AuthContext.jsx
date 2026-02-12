import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { authService } from '@/services/authService';
import { subscriptionService } from '@/services/subscriptionService';
import { LIMITS } from '@/config/stripe';

const AuthContext = createContext();

/** Helper: wraps a promise with a timeout (rejects on timeout) */
function withTimeout(promise, ms, label = 'operation') {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const AUTH_TIMEOUT = 10000;     // 10 s for initial auth check
const SUB_TIMEOUT = 8000;       // 8 s for subscription load

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [subscription, setSubscription] = useState({ plan: 'free', status: 'active' });
  const [aiUsage, setAiUsage] = useState({ used: 0, limit: 10, remaining: 10 });
  const authCheckDone = useRef(false);

  const isProUser = subscription?.plan === 'pro' || subscription?.plan === 'owner' || subscription?.plan === 'fleet' || subscription?.plan === 'lifetime';
  const planLimits = LIMITS[subscription?.plan] || LIMITS.free;

  useEffect(() => {
    checkUserAuth();

    const unsubscribe = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          email_confirmed_at: session.user.email_confirmed_at,
          full_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
        });
        setIsAuthenticated(true);
        // Load subscription after sign-in (non-blocking)
        loadSubscription();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setSubscription({ plan: 'free', status: 'active' });
        setAiUsage({ used: 0, limit: 10, remaining: 10 });
      } else if (event === 'TOKEN_REFRESHED') {
        loadSubscription();
      }
    });

    // Safety net: if auth check hasn't completed in AUTH_TIMEOUT, force-finish
    const safetyTimer = setTimeout(() => {
      if (!authCheckDone.current) {
        console.warn('Auth check safety timeout — forcing loading to false');
        setIsLoadingAuth(false);
      }
    }, AUTH_TIMEOUT + 2000);

    return () => {
      clearTimeout(safetyTimer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loadSubscription = useCallback(async () => {
    try {
      const [sub, usage] = await withTimeout(
        Promise.all([
          subscriptionService.getCurrentSubscription(),
          subscriptionService.checkAiLimit(),
        ]),
        SUB_TIMEOUT,
        'loadSubscription',
      );
      setSubscription(sub);
      setAiUsage(usage);
    } catch (err) {
      console.warn('Failed to load subscription:', err);
    }
  }, []);

  const refreshAiUsage = useCallback(async () => {
    try {
      const usage = await subscriptionService.checkAiLimit();
      setAiUsage(usage);
      return usage;
    } catch {
      return aiUsage;
    }
  }, [aiUsage]);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const currentUser = await withTimeout(authService.me(), AUTH_TIMEOUT, 'authService.me');

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        // Load subscription — don't block auth for it
        loadSubscription();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.warn('Auth check failed:', error?.message || error);
      setIsAuthenticated(false);
    } finally {
      authCheckDone.current = true;
      setIsLoadingAuth(false);
    }
  };

  const login = async (mode, credentials) => {
    if (mode === 'signup') {
      const result = await authService.signUp(credentials.email, credentials.password, credentials.name);
      return result;
    } else {
      const result = await authService.signIn(credentials.email, credentials.password);
      if (result?.user) {
        const profile = await authService.me();
        setUser(profile);
        setIsAuthenticated(true);
        await loadSubscription();
      }
      return result;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
    setSubscription({ plan: 'free', status: 'active' });
    setAiUsage({ used: 0, limit: 10, remaining: 10 });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      login,
      logout,
      subscription,
      isProUser,
      planLimits,
      aiUsage,
      refreshAiUsage,
      loadSubscription,
      checkAppState: checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
