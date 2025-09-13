import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Show install banner after a delay if not installed
      if (!checkInstalled()) {
        setTimeout(() => {
          setShowInstallDialog(true);
        }, 3000);
      }
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowInstallDialog(false);
      toast.success('Приложение успешно установлено!');
    };

    // Check installation status on load
    checkInstalled();

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual installation instructions
      setShowInstructions(true);
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        toast.success('Начинается установка приложения...');
      } else {
        console.log('[PWA] User dismissed the install prompt');
        toast.info('Установка отменена');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowInstallDialog(false);
    } catch (error) {
      console.error('[PWA] Error during installation:', error);
      toast.error('Ошибка при установке приложения');
    }
  };

  const handleDismiss = () => {
    setShowInstallDialog(false);
    // Don't show again for this session
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || sessionStorage.getItem('installPromptDismissed')) {
    return null;
  }

  return (
    <>
      {/* Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-md glass-strong border-white/20">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white">Установить приложение</DialogTitle>
                  <DialogDescription className="text-white/85">
                    Получите быстрый доступ к AI диагностике
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Преимущества установки:</h4>
              <ul className="space-y-1 text-sm text-white/85">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Работа без интернета
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Быстрый запуск с главного экрана
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Push-уведомления
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Полноэкранный режим
                </li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Установить
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Позже
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Installation Instructions */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-lg glass-strong border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Как установить приложение</DialogTitle>
            <DialogDescription className="text-white/85">
              Следуйте инструкциям для вашего браузера
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Safari (iOS):</h4>
              <ol className="space-y-1 text-sm text-white/85 list-decimal list-inside">
                <li>Нажмите кнопку "Поделиться" внизу экрана</li>
                <li>Выберите "На экран Домой"</li>
                <li>Нажмите "Добавить"</li>
              </ol>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Chrome (Android):</h4>
              <ol className="space-y-1 text-sm text-white/85 list-decimal list-inside">
                <li>Нажмите меню (три точки) в правом верхнем углу</li>
                <li>Выберите "Установить приложение"</li>
                <li>Нажмите "Установить"</li>
              </ol>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Chrome (Desktop):</h4>
              <ol className="space-y-1 text-sm text-white/85 list-decimal list-inside">
                <li>Найдите иконку установки в адресной строке</li>
                <li>Нажмите на неё и выберите "Установить"</li>
                <li>Подтвердите установку</li>
              </ol>
            </div>

            <Button
              onClick={() => setShowInstructions(false)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              Понятно
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Install Button */}
      {isInstallable && !showInstallDialog && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setShowInstallDialog(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full p-3"
            size="sm"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      )}
    </>
  );
}