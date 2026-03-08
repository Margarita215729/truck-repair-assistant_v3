import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider, useLanguage } from '@/lib/LanguageContext';
import { TruckProvider } from '@/lib/TruckContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LoginPage from '@/pages/LoginPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import PricingPage from '@/pages/PricingPage';
import PoliciesPage from '@/pages/PoliciesPage';
import ProtectedRoute from '@/lib/ProtectedRoute';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

/** Pages accessible without login (guest mode) */
const PUBLIC_PAGE_KEYS = new Set(['Diagnostics', 'Policies']);

/** Pages that require authentication */
const PROTECTED_PAGE_KEYS = new Set(['Reports', 'Profile', 'Community', 'PartsCatalog', 'ServiceFinder']);

const AppRoutes = () => {
  const { isLoadingAuth, authError, login } = useAuth();
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

  return (
    <Routes>
      {/* Auth callback */}
      <Route path="/auth/confirm" element={<AuthCallbackPage />} />

      {/* Login page — accessible directly */}
      <Route path="/Login" element={<LoginPage onLogin={login} />} />

      {/* Public pages */}
      <Route path="/Pricing" element={
        <LayoutWrapper currentPageName="Pricing">
          <PricingPage />
        </LayoutWrapper>
      } />
      <Route path="/Policies" element={
        <LayoutWrapper currentPageName="Policies">
          <PoliciesPage />
        </LayoutWrapper>
      } />

      {/* Default route — Diagnostics (public, guest-accessible) */}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />

      {/* Per-page routes with appropriate gating */}
      {Object.entries(Pages).map(([path, Page]) => {
        if (path === 'Policies') return null; // handled above
        const isProtected = PROTECTED_PAGE_KEYS.has(path);
        const element = (
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        );
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={isProtected ? <ProtectedRoute>{element}</ProtectedRoute> : element}
          />
        );
      })}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <TruckProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </QueryClientProvider>
        </TruckProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
