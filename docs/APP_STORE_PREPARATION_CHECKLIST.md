# App Store Preparation - Checklist

Все необходимые документы для публикации в App Store созданы!

## ✅ Созданные документы

### 1. Privacy Policy
- **Файл**: `PRIVACY_POLICY.md`
- **Описание**: Полная политика конфиденциальности с детальным описанием сбора и использования данных
- **Соответствие**: GDPR, CCPA, App Store требования
- **URL для App Store**: Разместите на `https://truckrepairassistant.com/privacy`

### 2. Terms of Service
- **Файл**: `TERMS_OF_SERVICE.md`
- **Описание**: Условия использования приложения
- **Включает**: Подписки, AI disclaimer, ограничение ответственности, права пользователей
- **URL для App Store**: Разместите на `https://truckrepairassistant.com/terms`

### 3. Support Page
- **Файл**: `public/support.html`
- **Описание**: Страница поддержки с FAQ, контактами и ресурсами
- **URL для App Store**: Будет доступна на `https://truckrepairassistant.com/support`

### 4. App Store Submission Guide
- **Файл**: `docs/APP_STORE_SUBMISSION.md`
- **Описание**: Полное руководство по подготовке и публикации в App Store
- **Включает**: 
  - Метаданные для App Store
  - Описание приложения
  - Скриншоты и требования к изображениям
  - Privacy questionnaire ответы
  - Инструкции по сборке и отправке

### 5. iOS Info.plist
- **Файл**: `ios/App/App/Info.plist`
- **Обновлено**: Добавлены описания разрешений для:
  - Location (NSLocationWhenInUseUsageDescription)
  - Camera (NSCameraUsageDescription)
  - Photo Library (NSPhotoLibraryUsageDescription)
  - Photo Library Add (NSPhotoLibraryAddUsageDescription)
  - Export Compliance (ITSAppUsesNonExemptEncryption)

## 📋 Следующие шаги

### 1. Разместите документы онлайн

Создайте публичные URL для:
- **Privacy Policy**: https://truckrepairassistant.com/privacy
- **Terms of Service**: https://truckrepairassistant.com/terms
- **Support Page**: https://truckrepairassistant.com/support

Можно использовать:
- Vercel (уже настроен для этого проекта)
- GitHub Pages
- Собственный домен

### 2. Настройте маршруты в приложении

Добавьте маршруты в `src/pages.config.js` или создайте отдельные страницы:

```javascript
// В src/pages/PrivacyPage.jsx
// В src/pages/TermsPage.jsx
```

Или создайте статические HTML страницы в `public/`:
- `public/privacy.html` (конвертировать из PRIVACY_POLICY.md)
- `public/terms.html` (конвертировать из TERMS_OF_SERVICE.md)

### 3. Обновите информацию в документах

Замените плейсхолдеры в документах:

**В PRIVACY_POLICY.md и TERMS_OF_SERVICE.md:**
- `[Your Company Address]` → реальный адрес компании
- `[City, State, ZIP]` → город и почтовый индекс
- `[Your State/Country]` → юрисдикция

**В APP_STORE_SUBMISSION.md:**
- `[Your First Name]` и `[Your Last Name]` → контактное лицо
- `[Your Phone Number]` → номер телефона
- Создайте demo аккаунт для App Review
- Подготовьте скриншоты приложения

### 4. Подготовьте графические материалы

**Обязательные:**
- [ ] App Icon 1024x1024px (без прозрачности)
- [ ] iPhone 6.7" скриншоты (5 шт.)
- [ ] iPhone 6.5" скриншоты (5 шт.)
- [ ] iPad Pro 12.9" скриншоты (5 шт.)

**Рекомендуемые скриншоты:**
1. Диагностический экран с анализом fault code
2. AI чат с рекомендациями по ремонту
3. Поиск запчастей с ценами
4. Service Locator с картой
5. История ремонтов

**Опционально:**
- [ ] App Preview видео (15-30 сек)
- [ ] Feature Graphic для Google Play (1024x500px)

### 5. Проверьте переменные окружения

Убедитесь что все production API ключи настроены в Vercel:
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] `VITE_GOOGLE_MAPS_API_KEY`
- [ ] `STRIPE_SECRET_KEY` (server-side)
- [ ] `GITHUB_TOKEN` (server-side)
- [ ] `GEMINI_API_KEY` (server-side)

### 6. Создайте demo аккаунт

Для Apple App Review:
```
Email: appstore-review@truckrepairassistant.com
Password: [Создайте безопасный пароль]
Subscription: Pre-activated Fleet plan
Sample Data: Добавьте примеры грузовиков и диагностики
```

### 7. Соберите приложение для App Store

```bash
# 1. Установите зависимости
npm install

# 2. Соберите production версию
npm run build:mobile

# 3. Синхронизируйте с iOS
npm run cap:sync

# 4. Откройте Xcode
npm run cap:open:ios

# 5. В Xcode:
# - Выберите "Any iOS Device (arm64)"
# - Product > Archive
# - Distribute App > App Store Connect
```

### 8. Заполните App Store Connect

1. Войдите в [App Store Connect](https://appstoreconnect.apple.com)
2. Создайте новое приложение
3. Заполните метаданные из `docs/APP_STORE_SUBMISSION.md`
4. Загрузите скриншоты
5. Добавьте URLs:
   - Privacy Policy URL
   - Terms of Service URL
   - Support URL
6. Заполните Privacy Questionnaire
7. Добавьте demo аккаунт в App Review Information
8. Submit for Review

### 9. Google Play Store (опционально)

Аналогичные шаги для Android:
```bash
npm run cap:open:android
# Build > Generate Signed Bundle/APK
```

См. секцию "Google Play Store" в `docs/APP_STORE_SUBMISSION.md`

## 🔒 Важные замечания

### Privacy & Compliance
- ✅ Политика конфиденциальности соответствует GDPR и CCPA
- ✅ Все разрешения iOS описаны понятно для пользователя
- ✅ Disclaimer о том, что AI не заменяет профессиональных механиков
- ✅ Описано какие данные собираются и как используются

### Legal Protection
- ✅ Ограничение ответственности (Limitation of Liability)
- ✅ Отказ от гарантий (Disclaimers)
- ✅ Arbitration Agreement (для споров)
- ✅ Conditions для подписок и возвратов

### App Store Requirements
- ✅ Описания разрешений в Info.plist
- ✅ Export Compliance (ITSAppUsesNonExemptEncryption = false)
- ✅ Privacy Policy и Terms URLs
- ✅ Support URL
- ✅ Age Rating: 4+

## 📧 Контакты для документов

Убедитесь что email адреса активны и мониторятся:
- support@truckrepairassistant.com (основная поддержка)
- privacy@truckrepairassistant.com (вопросы конфиденциальности)
- legal@truckrepairassistant.com (юридические вопросы)
- billing@truckrepairassistant.com (платежи и подписки)
- dpo@truckrepairassistant.com (Data Protection Officer для GDPR)

## 🎯 Рекомендуемый timeline

1. **День 1-2**: Разместите документы онлайн, настройте email адреса
2. **День 3-4**: Подготовьте скриншоты и графические материалы
3. **День 5**: Создайте demo аккаунт и тестовые данные
4. **День 6-7**: Соберите и протестируйте release версию
5. **День 8**: Заполните App Store Connect
6. **День 9**: Submit для review
7. **День 10-12**: Ожидайте результат review (обычно 24-48 часов)

## 📚 Дополнительные ресурсы

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [GDPR Compliance](https://gdpr.eu/)
- [CCPA Compliance](https://oag.ca.gov/privacy/ccpa)

---

**Статус**: ✅ Готов к публикации (после выполнения шагов выше)  
**Последнее обновление**: 23 мая 2026

**Удачи с публикацией! 🚀**
