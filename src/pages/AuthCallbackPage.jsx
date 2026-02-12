import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { CheckCircle2, XCircle, Loader2, KeyRound } from 'lucide-react';

export default function AuthCallbackPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error' | 'reset-password'
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Check for recovery flow BEFORE getSession() consumes the hash token
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const flowType = hashParams.get('type');

      if (flowType === 'recovery') {
        // Let Supabase exchange the recovery token for a session
        const { error } = await supabase.auth.getSession();
        if (error) {
          setStatus('error');
          setMessage(error.message);
          return;
        }
        setStatus('reset-password');
        setMessage(t('auth.passwordResetReady'));
        return;
      }

      // Normal auth callback (email confirmation, OAuth, etc.)
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      if (session) {
        setStatus('success');
        setMessage(t('auth.emailConfirmed'));
        // Clear the URL hash to prevent token leakage
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => navigate('/', { replace: true }), 2000);
      } else {
        setStatus('error');
        setMessage(t('auth.confirmationFailed') || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || t('auth.confirmationFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-orange/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="TRA" className="w-20 h-20 mx-auto mb-4 brand-logo" />
          <h1 className="text-2xl font-bold">
            <span className="brand-text-gradient">Truck Repair</span>
            <span className="text-white ml-1">Assistant</span>
          </h1>
        </div>

        <div className="brand-card rounded-2xl p-8 shadow-2xl text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-12 h-12 text-brand-orange mx-auto mb-4 animate-spin" />
              <h2 className="text-lg font-semibold text-white mb-2">{t('auth.processing')}</h2>
              <p className="text-white/50 text-sm">{t('auth.pleaseWait')}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">{message}</h2>
              <p className="text-white/50 text-sm">{t('auth.redirecting')}</p>
            </>
          )}

          {status === 'reset-password' && (
            <>
              <KeyRound className="w-12 h-12 text-brand-orange mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">{t('auth.setNewPassword')}</h2>
              <p className="text-white/50 text-sm mb-4">{t('auth.passwordResetReady')}</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (newPassword.length < 6) {
                  setMessage(t('auth.passwordTooShort'));
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setMessage(t('auth.passwordsMismatch'));
                  return;
                }
                setIsResetting(true);
                setMessage('');
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  setStatus('success');
                  setMessage(t('auth.passwordUpdated'));
                  setTimeout(() => navigate('/', { replace: true }), 2000);
                } catch (err) {
                  setMessage(err.message || t('auth.passwordResetFailed'));
                } finally {
                  setIsResetting(false);
                }
              }} className="space-y-3 text-left">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.newPasswordPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange/50"
                  required
                  minLength={6}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange/50"
                  required
                  minLength={6}
                />
                {message && <p className="text-red-400 text-sm">{message}</p>}
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full brand-btn px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                >
                  {isResetting ? t('auth.processing') : t('auth.updatePassword')}
                </button>
              </form>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">{t('auth.confirmationFailed')}</h2>
              <p className="text-red-400/70 text-sm mb-4">{message}</p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="brand-btn px-6 py-2 rounded-lg text-white text-sm"
              >
                {t('auth.backToLogin')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
