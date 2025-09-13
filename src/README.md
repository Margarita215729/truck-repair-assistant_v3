# 🚛 Truck Diagnostic AI - AI-система диагностики грузовиков

Продвинутая система диагностики грузовиков с использованием искусственного интеллекта для водителей, которые нуждаются в срочной помощи на дороге.

## ✨ Основные функции

- **🔍 AI-Диагностика**: Интеллектуальная диагностика проблем с использованием GitHub Models
- **🎤 Голосовая диагностика**: Анализ звуков двигателя и описания проблем голосом
- **📊 Smart Reports**: Комплексные диагностические отчеты с оценкой стоимости ремонта
- **🗺️ Service Locator**: Интерактивные карты ближайших мастерских и эвакуаторов
- **💼 Управление флотом**: Статистика и мониторинг состояния автопарка
- **🔐 Безопасность**: Полная аутентификация и защита данных

## 🛠️ Технический стек

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 с эффектами glassmorphism
- **UI Components**: Shadcn/UI + Radix UI
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: GitHub Models (GPT-4)
- **Maps**: Google Maps API
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18.0.0 или выше
- npm или yarn
- Аккаунты: Supabase, Google Cloud (для Maps), GitHub (для Models)

### Установка

```bash
# Клонирование репозитория
git clone <your-repo-url>
cd truck-diagnostic-ai

# Установка зависимостей
npm install

# Копирование и настройка переменных окружения
cp .env.example .env.local
# Отредактируйте .env.local, добавив ваши API ключи

# Запуск в режиме разработки
npm run dev
```

### Переменные окружения

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# GitHub Models
GITHUB_TOKEN=your_github_token
```

## 📁 Структура проекта

```
├── components/           # React компоненты
│   ├── ui/              # UI компоненты (Shadcn)
│   ├── Dashboard.tsx    # Главная панель
│   ├── SoundDiagnostic.tsx  # Звуковая диагностика
│   ├── SmartReports.tsx # Умные отчеты
│   └── ServiceLocations.tsx # Локатор сервисов
├── lib/                 # Утилиты и конфигурация
├── hooks/               # React хуки
├── styles/              # Стили и CSS
├── supabase/           # Backend функции
├── utils/              # Вспомогательные функции
└── types/              # TypeScript типы
```

## 🎨 Дизайн-система

Приложение использует современный дизайн с эффектами жидкого стекла (glassmorphism) и серебристыми металлическими акцентами:

- **Glassmorphism**: Полупрозрачные элементы с blur эффектами
- **Металлические градиенты**: Серебристые и стальные оттенки
- **Адаптивность**: Полная поддержка мобильных устройств
- **Темная тема**: Переключение между светлой и темной темами

## 🔧 Скрипты разработки

```bash
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка для продакшена
npm run preview      # Предварительный просмотр сборки
npm run lint         # Проверка кода ESLint
npm run type-check   # Проверка типов TypeScript
npm run deploy-prepare  # Подготовка к деплою
npm run deploy       # Деплой на Vercel
```

## 🚀 Деплой на Vercel

### Автоматический деплой

```bash
# Установка Vercel CLI
npm i -g vercel

# Подготовка и деплой
npm run deploy
```

### Ручная настройка

1. **Создайте проект в Vercel**:
   ```bash
   vercel
   ```

2. **Добавьте переменные окружения в Vercel Dashboard**:
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GITHUB_TOKEN`

3. **Деплойте**:
   ```bash
   vercel --prod
   ```

## 🔒 Безопасность

- Все чувствительные данные защищены
- HTTPS принудительно для всех соединений
- Переменные окружения не экспортируются в браузер
- Аутентификация через Supabase Auth
- CORS правильно настроен

## 📱 Поддерживаемые устройства

- ✅ Десктоп (Chrome, Firefox, Safari, Edge)
- ✅ Планшеты (iPad, Android tablets)
- ✅ Мобильные устройства (iOS, Android)
- ✅ PWA поддержка

## 🤝 Содействие разработке

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Сделайте изменения
4. Добавьте тесты
5. Отправьте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License.

## 🆘 Поддержка

Если у вас возникли проблемы:

1. Проверьте [Issues](../../issues)
2. Создайте новый Issue с подробным описанием
3. Используйте `npm run deploy-prepare` для диагностики

## 🔮 Планы развития

- [ ] Интеграция с IoT датчиками грузовиков
- [ ] Машинное обучение для предиктивной диагностики
- [ ] Интеграция с системами управления флотом
- [ ] Мобильное приложение (React Native)
- [ ] Расширенная аналитика и BI
- [ ] Интеграция с системами заказа запчастей

---

Создано с ❤️ для водителей грузовиков по всему миру.