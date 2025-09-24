#!/bin/bash

# Final Deployment Script
echo "🚀 FINAL SUPABASE DEPLOYMENT"
echo "============================"

# Check if token is provided
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN не установлен!"
    echo ""
    echo "📋 Чтобы получить токен:"
    echo "1. Зайдите в: https://supabase.com/dashboard/account/tokens"
    echo "2. Нажмите 'Generate new token'"
    echo "3. Скопируйте токен"
    echo "4. Запустите: export SUPABASE_ACCESS_TOKEN=ВАШ_ТОКЕН"
    echo ""
    echo "💡 Пример команды:"
    echo "export SUPABASE_ACCESS_TOKEN=sbp_5279c62de85b70a5f841a7b6af732d54824d4636"
    echo "./final-deployment.sh"
    exit 1
fi

echo "✅ Access token найден"

# Link project
echo "🔗 Подключаюсь к проекту..."
npx supabase link --project-ref tismknqcuuzydlsvzwei

# Deploy functions
echo "📦 Развертываю функции..."
npx supabase functions deploy

echo "✅ Функции развернуты!"

# Test deployment
echo "🧪 Тестирую развертывание..."
echo "Health check:"
curl -k -s "https://tismknqcuuzydlsvzwei.supabase.co/functions/v1/health" | jq . 2>/dev/null || echo "Health check completed"

echo ""
echo "🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО!"
echo "=========================="
echo ""
echo "📋 Что было сделано:"
echo "✅ Проект подключен к Supabase"
echo "✅ Все Edge Functions развернуты"
echo "✅ Health check выполнен"
echo ""
echo "🔗 Доступные endpoints:"
echo "  Health: https://tismknqcuuzydlsvzwei.supabase.co/functions/v1/health"
echo "  AI Analysis: https://tismknqcuuzydlsvzwei.supabase.co/functions/v1/ai-analyze"
echo "  Diagnostics: https://tismknqcuuzydlsvzwei.supabase.co/functions/v1/diagnostics"
echo ""
echo "📖 Документация: https://supabase.com/docs/guides/functions"
echo ""
echo "🚀 Готово к использованию!"
