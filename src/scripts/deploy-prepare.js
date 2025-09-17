#!/usr/bin/env node

/**
 * Скрипт подготовки к деплою на Vercel
 * Проверяет необходимые файлы и конфигурации
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

console.log('🚀 Подготовка к деплою Truck Diagnostic AI на Vercel...\n');

// Проверка обязательных файлов
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'vercel.json',
  'tsconfig.json',
  'src/App.tsx',
  'src/main.tsx', 
  'src/styles/globals.css',
  'src/supabase/functions/server/index.tsx',
  'src/lib/env.ts',
  'src/lib/env-init.ts',
  'src/types/global.d.ts'
];

let allFilesExist = true;

console.log('📁 Проверка обязательных файлов:');
requiredFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - ОТСУТСТВУЕТ!`);
    allFilesExist = false;
  }
});

// Проверка package.json
console.log('\n📦 Проверка package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  
  // Проверка build скрипта
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('   ✅ Build скрипт найден');
  } else {
    console.log('   ❌ Build скрипт отсутствует!');
    allFilesExist = false;
  }
  
  // Проверка основных зависимостей
  const requiredDeps = ['react', 'react-dom', '@vitejs/plugin-react-swc', 'vite'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`   ✅ ${dep}`);
    } else {
      console.log(`   ❌ ${dep} - отсутствует!`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log('   ❌ Ошибка чтения package.json:', error.message);
  allFilesExist = false;
}

// Проверка переменных окружения
console.log('\n🔐 Проверка переменных окружения:');
const envExampleFile = path.join(rootDir, '.env.example');
const envLocalFile = path.join(rootDir, '.env.local');

if (fs.existsSync(envExampleFile)) {
  console.log('   ✅ .env.example создан');
} else {
  console.log('   ⚠️  .env.example не найден');
}

if (fs.existsSync(envLocalFile)) {
  console.log('   ✅ .env.local найден (для разработки)');
} else {
  console.log('   ⚠️  .env.local не найден - создайте для локальной разработки');
}

// Проверка lib/env.ts
const envLibFile = path.join(rootDir, 'src/lib/env.ts');
if (fs.existsSync(envLibFile)) {
  console.log('   ✅ src/lib/env.ts создан');
} else {
  console.log('   ❌ src/lib/env.ts отсутствует!');
  allFilesExist = false;
}

console.log('   ℹ️  При деплое на Vercel добавьте переменные окружения в Project Settings');

// Проверка vercel.json
console.log('\n⚙️  Проверка конфигурации Vercel:');
try {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
  
  if (vercelConfig.framework === 'vite') {
    console.log('   ✅ Framework: Vite');
  }
  
  if (vercelConfig.buildCommand === 'npm run build') {
    console.log('   ✅ Build команда настроена');
  }
  
  if (vercelConfig.outputDirectory === 'dist') {
    console.log('   ✅ Output директория настроена');
  }
  
  if (vercelConfig.env) {
    console.log('   ✅ Переменные окружения конфигурированы');
    console.log('   ℹ️  Убедитесь, что добавили их в Vercel Project Settings');
  }
} catch (error) {
  console.log('   ❌ Ошибка чтения vercel.json:', error.message);
  allFilesExist = false;
}

// Инструкции по деплою
console.log('\n📋 Инструкции по деплою:');
console.log('   1. Убедитесь что у вас установлен Vercel CLI: npm i -g vercel');
console.log('   2. Войдите в аккаунт: vercel login');
console.log('   3. В корне проекта выполните: vercel');
console.log('   4. Следуйте инструкциям мастера настройки');
console.log('   5. Добавьте переменные окружения в Vercel Dashboard:');
console.log('      - VITE_GOOGLE_MAPS_API_KEY');
console.log('      - VITE_SUPABASE_URL');
console.log('      - VITE_SUPABASE_ANON_KEY');
console.log('      - SUPABASE_SERVICE_ROLE_KEY');
console.log('      - GITHUB_TOKEN');

// Результат проверки
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 Проект готов к деплою на Vercel!');
  console.log('   Выполните: npm run deploy-prepare && vercel');
} else {
  console.log('❌ Обнаружены проблемы. Исправьте их перед деплоем.');
  process.exit(1);
}
console.log('='.repeat(50));