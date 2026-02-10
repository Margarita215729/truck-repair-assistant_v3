import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Supabase handles the token exchange automatically via detectSessionInUrl
      // We just wait for the session to be established
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      if (session) {
        setStatus('success');
        setMessage(t('auth.emailConfirmed'));
        // Redirect to main page after 2 seconds
        setTimeout(() => navigate('/', { replace: true }), 2000);
      } else {
        // Might be a password reset or other flow
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const type = params.get('type');

        if (type === 'recovery') {
          setStatus('success');
          setMessage(t('auth.passwordResetReady'));
          setTimeout(() => navigate('/', { replace: true }), 2000);
        } else {
          setStatus('success');
          setMessage(t('auth.emailConfirmed'));
          setTimeout(() => navigate('/', { replace: true }), 2000);
        }
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
