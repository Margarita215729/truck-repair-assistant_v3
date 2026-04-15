/**
 * Stripe Configuration
 */
import { env } from '@/config/env';

export const STRIPE_PUBLISHABLE_KEY = env.STRIPE_PUBLISHABLE_KEY;

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    nameRu: 'Бесплатный',
    nameEs: 'Gratis',
    price: 0,
    features: [
      { key: 'ai_requests', value: '10 requests/day', valueRu: '10 запросов/день', valueEs: '10 solicitudes/día' },
      { key: 'trucks', value: '3 trucks', valueRu: '3 грузовика', valueEs: '3 camiones' },
      { key: 'diagnostics', value: 'Basic diagnostics', valueRu: 'Базовая диагностика', valueEs: 'Diagnóstico básico' },
      { key: 'community', value: 'Community access', valueRu: 'Доступ к сообществу', valueEs: 'Acceso а la comunidad' },
      { key: 'reports', value: 'Basic reports', valueRu: 'Базовые отчёты', valueEs: 'Informes básicos' },
      { key: 'parts', value: 'Parts catalog', valueRu: 'Каталог запчастей', valueEs: 'Catálogo de piezas' },
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    nameRu: 'Премиум',
    nameEs: 'Premium',
    price: 1,
    originalPrice: 14.99,
    badge: 'promo',
    stripePriceMonthly: env.PREMIUM_PRICE_MONTHLY,
    features: [
      { key: 'ai_requests', value: 'Unlimited requests', valueRu: 'Безлимитные запросы', valueEs: 'Solicitudes ilimitadas' },
      { key: 'trucks', value: 'Unlimited trucks', valueRu: 'Безлимитные грузовики', valueEs: 'Camiones ilimitados' },
      { key: 'diagnostics', value: 'Advanced diagnostics', valueRu: 'Продвинутая диагностика', valueEs: 'Diagnóstico avanzado' },
      { key: 'roadside', value: 'Roadside triage reports', valueRu: 'Отчёты дорожной сортировки', valueEs: 'Informes de triaje en carretera' },
      { key: 'audio', value: 'Audio analysis', valueRu: 'Анализ звука', valueEs: 'Análisis de audio' },
      { key: 'photo', value: 'Part photo analysis', valueRu: 'Анализ фото запчастей', valueEs: 'Análisis de fotos de piezas' },
      { key: 'visual_diagnostics', value: 'Visual diagnostics (photo & video)', valueRu: 'Визуальная диагностика (фото и видео)', valueEs: 'Diagnóstico visual (foto y video)' },
      { key: 'community', value: 'Priority community support', valueRu: 'Приоритетная поддержка', valueEs: 'Soporte prioritario' },
      { key: 'reports', value: 'Detailed PDF reports', valueRu: 'Детальные PDF отчёты', valueEs: 'Informes PDF detallados' },
      { key: 'fleet_mgmt', value: 'Fleet management dashboard', valueRu: 'Панель управления автопарком', valueEs: 'Panel de gestión de flota' },
      { key: 'priority', value: 'Priority support', valueRu: 'Приоритетная поддержка', valueEs: 'Soporte prioritario' },
    ],
  },
};

export const LIMITS = {
  free: {
    ai_requests_per_day: 10,
    max_trucks: 3,
  },
  premium: {
    ai_requests_per_day: -1, // unlimited
    max_trucks: -1, // unlimited
  },
  // Backward compatibility for existing subscribers
  pro: { ai_requests_per_day: -1, max_trucks: -1 },
  owner: { ai_requests_per_day: -1, max_trucks: 5 },
  fleet: { ai_requests_per_day: -1, max_trucks: -1 },
  lifetime: { ai_requests_per_day: -1, max_trucks: -1 },
};
