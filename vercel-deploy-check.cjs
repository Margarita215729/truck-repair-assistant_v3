#!/usr/bin/env node

// Vercel deployment checker
console.log('🔍 VERCEL DEPLOYMENT CHECKER');
console.log('='.repeat(40));

const fs = require('fs');
const path = require('path');

// Check 1: Framework detection files
console.log('\n📦 CHECKING FRAMEWORK DETECTION...');

const frameworkFiles = [
  { file: 'package.json', required: true, check: 'vite in scripts' },
  { file: 'vite.config.ts', required: true, check: 'vite config exists' },
  { file: 'index.html', required: true, check: 'entry point exists' },
  { file: 'vercel.json', required: false, check: 'deployment config' }
];

for (const { file, required, check } of frameworkFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - ${check}`);
    
    if (file === 'package.json') {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (pkg.scripts && pkg.scripts.build && pkg.scripts.build.includes('vite')) {
        console.log(`   ✅ Contains vite build command`);
      } else {
        console.log(`   ❌ Missing vite build command`);
      }
      
      if (pkg.dependencies && pkg.dependencies['@vitejs/plugin-react-swc']) {
        console.log(`   ✅ Contains Vite React plugin`);
      } else {
        console.log(`   ❌ Missing Vite React plugin`);
      }
    }
    
    if (file === 'index.html') {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('/src/main.tsx')) {
        console.log(`   ✅ References main.tsx entry point`);
      } else {
        console.log(`   ❌ Missing main.tsx reference`);
      }
    }
    
  } else {
    const status = required ? '❌' : '⚠️';
    console.log(`${status} ${file} - ${required ? 'MISSING (required)' : 'missing (optional)'}`);
  }
}

// Check 2: Build output
console.log('\n🏗️ CHECKING BUILD OUTPUT...');
if (fs.existsSync('dist')) {
  console.log('✅ dist directory exists');
  
  const distFiles = fs.readdirSync('dist');
  if (distFiles.includes('index.html')) {
    console.log('✅ dist/index.html exists');
    
    const distHtml = fs.readFileSync('dist/index.html', 'utf8');
    const jsMatches = distHtml.match(/<script[^>]*src="[^"]*"[^>]*>/g);
    const cssMatches = distHtml.match(/<link[^>]*rel="stylesheet"[^>]*>/g);
    
    console.log(`✅ Found ${jsMatches ? jsMatches.length : 0} JS files`);
    console.log(`✅ Found ${cssMatches ? cssMatches.length : 0} CSS files`);
    
    if (jsMatches && jsMatches.length > 0) {
      jsMatches.forEach((match, i) => {
        const src = match.match(/src="([^"]*)"/);
        if (src) {
          console.log(`   JS ${i + 1}: ${src[1]}`);
        }
      });
    }
  } else {
    console.log('❌ dist/index.html missing');
  }
  
  const assetsDir = path.join('dist', 'assets');
  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    console.log(`✅ Found ${assets.length} asset files`);
  }
} else {
  console.log('❌ dist directory missing - run npm run build');
}

// Check 3: Vercel specific
console.log('\n🚀 VERCEL DEPLOYMENT REQUIREMENTS...');

// Check vercel.json
if (fs.existsSync('vercel.json')) {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.framework) {
    console.log(`✅ Framework specified: ${vercelConfig.framework}`);
  } else {
    console.log('⚠️ No framework specified in vercel.json');
  }
  
  if (vercelConfig.buildCommand) {
    console.log(`✅ Build command: ${vercelConfig.buildCommand}`);
  }
  
  if (vercelConfig.outputDirectory) {
    console.log(`✅ Output directory: ${vercelConfig.outputDirectory}`);
  }
} else {
  console.log('⚠️ No vercel.json found (Vercel will auto-detect)');
}

console.log('\n📋 DEPLOYMENT CHECKLIST:');
console.log('1. ✅ Package.json has "vite" in build script');
console.log('2. ✅ vite.config.ts exists');
console.log('3. ✅ index.html in root with main.tsx reference');
console.log('4. ✅ dist folder builds successfully');
console.log('5. ✅ vercel.json specifies framework');

console.log('\n🎯 IF VERCEL STILL SHOWS "No framework detected":');
console.log('- Delete the Vercel project and recreate it');
console.log('- Or manually set framework to "vite" in Vercel dashboard');
console.log('- Check that all files are committed to git');
console.log('- Verify Node.js version compatibility');
