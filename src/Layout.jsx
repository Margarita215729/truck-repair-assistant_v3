import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { MessageSquare, MapPin, FileText, Menu, X, User, LogIn, Package, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoadingAuth, logout } = useAuth();
  const { t, language, setLanguage, languages } = useLanguage();

  const navItems = [
    { name: t('nav.diagnostics'), page: 'Diagnostics', icon: MessageSquare },
    { name: t('nav.community'), page: 'Community', icon: Users },
    { name: t('nav.partsCatalog'), page: 'PartsCatalog', icon: Package },
    { name: t('nav.findServices'), page: 'ServiceFinder', icon: MapPin },
    { name: t('nav.reports'), page: 'Reports', icon: FileText },
    { name: t('nav.profile'), page: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 brand-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Diagnostics')} className="flex items-center gap-3 group">
              <img 
                src="/logo.svg" 
                alt="TRA" 
                className="w-10 h-10 brand-logo"
              />
              <div className="hidden sm:block">
                <span className="text-lg font-bold tracking-tight brand-text-gradient">Truck Repair</span>
                <span className="text-lg font-bold tracking-tight text-white/90 ml-1">Assistant</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.filter(i => i.page !== 'Profile').map((item) => (
                <Link key={item.page} to={createPageUrl(item.page)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentPageName === item.page
                      ? 'bg-brand-orange/10 text-brand-orange' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}>
                  <item.icon className="w-4 h-4" />{item.name}
                </Link>
              ))}
              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                title={languages[language === 'en' ? 'ru' : 'en']}
              >
                <Globe className="w-4 h-4" />
                {language.toUpperCase()}
              </button>
              {/* User Menu */}
              {!isLoadingAuth && (isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full ml-2">
                      <Avatar className="h-9 w-9 border-2 border-white/10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-brand-orange/20 text-brand-orange text-sm">
                          {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#111718] border-brand-dark/30 text-white">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.full_name || t('common.user')}</p>
                      <p className="text-xs text-white/50">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-brand-dark/30" />
                    <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                      <Link to={createPageUrl('Profile')} className="flex items-center gap-2">
                        <User className="w-4 h-4" />{t('nav.profile')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-brand-dark/30" />
                    <DropdownMenuItem onClick={logout}
                      className="hover:bg-red-500/10 text-red-400 cursor-pointer">{t('nav.logout')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to={createPageUrl('Profile')}>
                  <Button className="ml-2 brand-btn text-white border-0">
                    <LogIn className="w-4 h-4 mr-2" />{t('nav.login')}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="icon"
              className="md:hidden text-white/60 hover:text-white hover:bg-white/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-brand-dark/20 bg-[#0b1012]/95 backdrop-blur-xl">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link key={item.page} to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    currentPageName === item.page
                      ? 'bg-brand-orange/10 text-brand-orange' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}>
                  <item.icon className="w-5 h-5" />{item.name}
                </Link>
              ))}
              {!isLoadingAuth && !isAuthenticated && (
                <Link to={createPageUrl('Profile')} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full mt-2 brand-btn text-white border-0">
                    <LogIn className="w-4 h-4 mr-2" />{t('nav.login')}
                  </Button>
                </Link>
              )}
              {!isLoadingAuth && isAuthenticated && (
                <Button onClick={logout} variant="outline"
                  className="w-full mt-2 border-white/20 text-red-400 hover:bg-red-500/10">{t('nav.logout')}</Button>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="pt-16 min-h-screen">{children}</main>
    </div>
  );
}
