import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/LanguageContext';
import { authService } from '@/services/authService';

export default function LoginPage({ onLogin }) {
  const { t, language, setLanguage, languages } = useLanguage();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot' | 'check-email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await authService.resetPassword(email);
        setMode('check-email');
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (!name.trim()) {
          setError(t('login.enterName'));
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError(t('login.passwordMinLength'));
          setLoading(false);
          return;
        }
        const result = await onLogin('signup', { email, password, name });
        // If Supabase requires email confirmation, user.identities will be empty
        if (result?.user && !result.user.email_confirmed_at) {
          setMode('check-email');
        } else {
          setSuccess(t('login.accountCreated'));
          setMode('signin');
          setPassword('');
        }
      } else {
        await onLogin('signin', { email, password });
      }
    } catch (err) {
      if (err.message?.includes('Email not confirmed')) {
        setMode('check-email');
      } else {
        setError(err.message || t('login.authFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-brand-orange/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-dark/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            <Globe className="w-4 h-4" />
            {languages[language]}
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.svg" alt="Truck Repair Assistant" className="w-20 h-20 brand-logo" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="brand-text-gradient">Truck Repair</span>
            <span className="text-white ml-1">Assistant</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Card */}
        <div className="brand-card rounded-2xl p-6 shadow-2xl">
          {/* Check Email Screen */}
          {mode === 'check-email' ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-brand-orange" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">{t('login.checkYourEmail')}</h2>
              <p className="text-white/50 text-sm mb-6">{t('login.checkEmailDesc', { email })}</p>
              <Button
                onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                variant="outline"
                className="border-white/20 text-white/70 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('login.backToSignIn')}
              </Button>
            </div>
          ) : (
            <>
              {/* Tab switcher — only show for signin/signup */}
              {mode !== 'forgot' && (
                <div className="flex bg-[#0b1012] rounded-lg p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                      mode === 'signin'
                        ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'
                        : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    {t('login.signIn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                      mode === 'signup'
                        ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'
                        : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    {t('login.signUp')}
                  </button>
                </div>
              )}

              {/* Forgot Password Header */}
              {mode === 'forgot' && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(''); }}
                    className="flex items-center gap-1 text-white/50 hover:text-white text-sm mb-3 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t('login.backToSignIn')}
                  </button>
                  <h2 className="text-lg font-semibold text-white">{t('login.forgotPassword')}</h2>
                  <p className="text-white/50 text-sm mt-1">{t('login.forgotPasswordDesc')}</p>
                </div>
              )}

          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/70 text-sm">
                  {t('login.fullName')}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('login.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-[#0b1012] border-brand-dark/30 text-white placeholder:text-white/25 focus:border-brand-orange/50 focus:ring-brand-orange/20 h-11"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 text-sm">
                {t('login.emailAddress')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-[#0b1012] border-brand-dark/30 text-white placeholder:text-white/25 focus:border-brand-orange/50 focus:ring-brand-orange/20 h-11"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/70 text-sm">
                    {t('login.password')}
                  </Label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                      className="text-brand-orange/70 hover:text-brand-orange text-xs transition-colors"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? t('login.passwordPlaceholderNew') : t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-[#0b1012] border-brand-dark/30 text-white placeholder:text-white/25 focus:border-brand-orange/50 focus:ring-brand-orange/20 h-11"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 brand-btn text-white font-medium border-0 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'forgot'
                    ? t('login.sending')
                    : mode === 'signin'
                      ? t('login.signingIn')
                      : t('login.creatingAccount')}
                </>
              ) : (
                mode === 'forgot'
                  ? t('login.sendResetLink')
                  : mode === 'signin'
                    ? t('login.signIn')
                    : t('login.createAccount')
              )}
            </Button>
          </form>

          {/* Footer */}
          {mode !== 'forgot' && (
            <p className="text-center text-white/30 text-xs mt-6">
              {mode === 'signin'
                ? t('login.noAccount')
                : t('login.hasAccount')}
            </p>
          )}
            </>
          )}
        </div>

        {/* Bottom text */}
        <p className="text-center text-white/20 text-xs mt-6">
          {t('login.copyright')}
        </p>
      </div>
    </div>
  );
}
