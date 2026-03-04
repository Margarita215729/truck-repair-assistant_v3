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
    price: 0,
    priceAnnual: 0,
    features: [
      { key: 'ai_requests', value: '5 requests/day', valueRu: '5 запросов/день' },
      { key: 'trucks', value: '2 trucks', valueRu: '2 грузовика' },
      { key: 'diagnostics', value: 'Basic diagnostics', valueRu: 'Базовая диагностика' },
      { key: 'community', value: 'Community access', valueRu: 'Доступ к сообществу' },
      { key: 'reports', value: 'Basic reports', valueRu: 'Базовые отчёты' },
    ],
  },
  owner: {
    id: 'owner',
    name: 'Owner-Operator',
    nameRu: 'Владелец-Оператор',
    price: 14.99,
    priceAnnual: 149.99,
    stripePriceMonthly: env.OWNER_PRICE_MONTHLY,
    stripePriceAnnual: env.OWNER_PRICE_ANNUAL,
    features: [
      { key: 'ai_requests', value: 'Unlimited requests', valueRu: 'Безлимитные запросы' },
      { key: 'trucks', value: 'Up to 5 trucks', valueRu: 'До 5 грузовиков' },
      { key: 'diagnostics', value: 'Advanced diagnostics', valueRu: 'Продвинутая диагностика' },
      { key: 'roadside', value: 'Roadside triage reports', valueRu: 'Отчёты дорожной сортировки' },
      { key: 'audio', value: 'Audio analysis', valueRu: 'Анализ звука' },
      { key: 'photo', value: 'Part photo analysis', valueRu: 'Анализ фото запчастей' },
      { key: 'visual_diagnostics', value: 'Visual diagnostics (photo & video)', valueRu: 'Визуальная диагностика (фото и видео)' },
      { key: 'community', value: 'Priority community support', valueRu: 'Приоритетная поддержка' },
    ],
  },
  fleet: {
    id: 'fleet',
    name: 'Fleet',
    nameRu: 'Автопарк',
    price: 49.99,
    priceAnnual: 499.99,
    stripePriceMonthly: env.FLEET_PRICE_MONTHLY,
    stripePriceAnnual: env.FLEET_PRICE_ANNUAL,
    features: [
      { key: 'ai_requests', value: 'Unlimited requests', valueRu: 'Безлимитные запросы' },
      { key: 'trucks', value: 'Unlimited trucks', valueRu: 'Безлимитные грузовики' },
      { key: 'diagnostics', value: 'Advanced diagnostics', valueRu: 'Продвинутая диагностика' },
      { key: 'roadside', value: 'Roadside triage reports', valueRu: 'Отчёты дорожной сортировки' },
      { key: 'audio', value: 'Audio analysis', valueRu: 'Анализ звука' },
      { key: 'photo', value: 'Part photo analysis', valueRu: 'Анализ фото запчастей' },
      { key: 'visual_diagnostics', value: 'Visual diagnostics (photo & video)', valueRu: 'Визуальная диагностика (фото и видео)' },
      { key: 'toolkit', value: 'Custom toolkits', valueRu: 'Пользовательские наборы' },
      { key: 'fleet_mgmt', value: 'Fleet management dashboard', valueRu: 'Панель управления автопарком' },
      { key: 'reports', value: 'Detailed PDF reports', valueRu: 'Детальные PDF отчёты' },
      { key: 'priority', value: 'Priority support', valueRu: 'Приоритетная поддержка' },
    ],
  },
};

export const LIMITS = {
  free: {
    ai_requests_per_day: 5,
    max_trucks: 2,
  },
  owner: {
    ai_requests_per_day: -1, // unlimited
    max_trucks: 5,
  },
  fleet: {
    ai_requests_per_day: -1, // unlimited
    max_trucks: -1, // unlimited
  },
  lifetime: {
    ai_requests_per_day: -1,
    max_trucks: -1,
  },
};
