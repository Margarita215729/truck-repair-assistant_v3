import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider, useLanguage } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoginPage from '@/pages/LoginPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import PricingPage from '@/pages/PricingPage';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, authError, login } = useAuth();
  const { t } = useLanguage();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.svg" alt="TRA" className="w-14 h-14 animate-logo-pulse" />
          <div className="w-10 h-10 border-4 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin"></div>
          <p className="text-white/50 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Not authenticated — show login page
  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      <Route path="/Pricing" element={
        <LayoutWrapper currentPageName="Pricing">
          <PricingPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <Routes>
              {/* Auth callback — outside authenticated route to handle unauthenticated redirects */}
              <Route path="/auth/confirm" element={<AuthCallbackPage />} />
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
