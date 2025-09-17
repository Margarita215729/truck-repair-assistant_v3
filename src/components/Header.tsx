import { useState } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Moon, Sun, Menu, Mic, Home, MapPin, FileText, LogOut, User, Volume2, BarChart3, Truck, Brain } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { VisuallyHidden } from './ui/visually-hidden';
import { useAuth } from './AuthProvider';
import { LoginModal } from './LoginModal';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export function Header({ activeTab, setActiveTab, darkMode, setDarkMode }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navItems = [
    { id: 'analysis', label: 'Intelligent Diagnostic Analysis', icon: BarChart3, shortText: 'ANALYSIS' },
    { id: 'reports', label: 'Smart Reports', icon: FileText, shortText: 'REPORTS' },
    { id: 'locations', label: 'Service Locator', icon: MapPin, shortText: 'HELP' },
    { id: 'training', label: 'AI Diagnostic', icon: Brain, shortText: 'TRAINING' },
  ];

  return (
    <header className="glass-strong sticky top-0 z-50 border-b border-white/10">
      <div className="flex items-center justify-between p-3 md:p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 hidden sm:block">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
              <Truck className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-sm" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white truncate">Truck Repair Assistant</h1>
            <p className="text-xs md:text-sm text-white/90 font-medium truncate">Emergency Road Diagnostics</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2 mr-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(item.id)}
                className={`
                  relative gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 font-medium text-sm
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30 shadow-lg shadow-blue-500/20 backdrop-blur-xl' 
                    : 'text-white/80 hover:text-white hover:bg-white/10 hover:backdrop-blur-xl hover:shadow-lg'
                  }
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden xl:inline truncate">{item.label}</span>
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/10 to-purple-400/10 blur-sm -z-10" />
                )}
              </Button>
            );
          })}
        </nav>

        {/* Tablet Navigation - Short text */}
        <nav className="hidden md:flex lg:hidden items-center gap-2 mr-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(item.id)}
                className={`
                  relative px-3 py-2 rounded-lg transition-all duration-300 font-bold text-xs tracking-wider
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30 shadow-lg shadow-blue-500/20 backdrop-blur-xl' 
                    : 'text-white/80 hover:text-white hover:bg-white/10 hover:backdrop-blur-xl hover:shadow-lg'
                  }
                `}
                title={item.label}
              >
                {item.shortText}
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/10 to-purple-400/10 blur-sm -z-10" />
                )}
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 sm:gap-6 md:gap-8 flex-shrink-0">
          {/* Dark Mode Toggle - Hidden on small mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            className="hidden sm:flex p-2.5 md:p-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-300 text-white hover:text-white"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User Menu - Compact on mobile */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-300">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ring-2 ring-white/30">
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-xs sm:text-sm">
                      {user.user_metadata?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-strong border-white/20" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-3">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-white">{user.user_metadata?.name || 'User'}</p>
                    <p className="w-[200px] truncate text-sm text-white/90">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="border-white/20" />
                <DropdownMenuItem onClick={() => setDarkMode(!darkMode)} className="text-white hover:bg-white/10 sm:hidden">
                  {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-white/20 sm:hidden" />
                <DropdownMenuItem onClick={signOut} className="text-white hover:bg-white/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowLoginModal(true)}
              className="gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-300 text-white hover:text-white"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )}

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-300 text-white hover:text-white">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 sm:w-80 glass-strong border-white/20">
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Mobile navigation menu for Truck Repair Assistant</SheetDescription>
              </VisuallyHidden>
              <div className="flex flex-col h-full">

                <nav className="flex flex-col gap-2 flex-1 relative p-4 rounded-lg" style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => setActiveTab(item.id)}
                        className={`
                          justify-start gap-3 p-3 rounded-lg transition-all duration-300 text-white hover:text-white
                          ${isActive 
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' 
                            : 'hover:bg-white/10'
                          }
                        `}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </Button>
                    );
                  })}
                </nav>
                {!user && (
                  <div className="p-4 rounded-lg" style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}>
                    <Button 
                      onClick={() => setShowLoginModal(true)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
      </div>
    </header>
  );
}