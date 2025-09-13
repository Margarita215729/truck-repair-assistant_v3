#!/usr/bin/env node

// Simple test runner without TypeScript compilation
const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE DEPLOYMENT TESTING');
console.log('=' .repeat(50));

// Test 1: Check package.json
console.log('\n📦 TESTING PACKAGE.JSON...');
try {
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check essential fields
  const required = ['name', 'version', 'scripts', 'dependencies'];
  let packageOk = true;
  
  for (const field of required) {
    if (!packageJson[field]) {
      console.log(`❌ Missing ${field} in package.json`);
      packageOk = false;
    }
  }
  
  // Check for problematic dependencies
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  for (const [name, version] of Object.entries(deps)) {
    if (version.includes('@')) {
      console.log(`❌ Invalid dependency: ${name}@${version}`);
      packageOk = false;
    }
  }
  
  if (packageOk) {
    console.log('✅ Package.json looks good');
  }
  
} catch (error) {
  console.log(`❌ Package.json error: ${error.message}`);
}

// Test 2: Check critical files
console.log('\n📁 TESTING CRITICAL FILES...');
const criticalFiles = [
  'index.html',
  'src/main.tsx',
  'src/App.tsx',
  'src/index.css',
  'vite.config.ts',
  'tsconfig.json'
];

for (const file of criticalFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
    
    // Additional checks for specific files
    if (file === 'index.html') {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('<div id="root">')) {
        console.log(`❌ ${file} missing root div`);
      }
      if (!content.includes('/src/main.tsx')) {
        console.log(`❌ ${file} missing main.tsx script`);
      }
    }
    
    if (file === 'src/main.tsx') {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('ReactDOM.createRoot')) {
        console.log(`❌ ${file} missing createRoot`);
      }
      if (!content.includes("getElementById('root')")) {
        console.log(`❌ ${file} not targeting root element`);
      }
      if (!content.includes('import App')) {
        console.log(`❌ ${file} missing App import`);
      }
    }
    
    if (file === 'src/App.tsx') {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('export default')) {
        console.log(`❌ ${file} missing default export`);
      }
      if (!content.includes('return') || !content.includes('<')) {
        console.log(`❌ ${file} not returning JSX`);
      }
    }
    
  } else {
    console.log(`❌ ${file} missing`);
  }
}

// Test 3: Check for problematic imports
console.log('\n🔍 SCANNING FOR PROBLEMATIC IMPORTS...');
function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      scanDirectory(fullPath);
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check for imports with version numbers
          if (line.includes('from') && /@\d+\.\d+\.\d+/.test(line)) {
            console.log(`❌ ${path.relative(__dirname, fullPath)}:${index + 1} - Import with version: ${line.trim()}`);
          }
          
          // Check for other problematic patterns
          if (line.includes('from') && (line.includes('*') || line.includes('$') || line.includes('jsr:'))) {
            console.log(`⚠️  ${path.relative(__dirname, fullPath)}:${index + 1} - Suspicious import: ${line.trim()}`);
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }
}

try {
  scanDirectory(path.join(__dirname, 'src'));
  console.log('✅ Import scan completed');
} catch (error) {
  console.log(`❌ Import scan failed: ${error.message}`);
}

// Test 4: Test build process
console.log('\n🏗️  TESTING BUILD PROCESS...');
const { execSync } = require('child_process');

try {
  console.log('Running npm run build...');
  const buildOutput = execSync('npm run build', { 
    encoding: 'utf8',
    cwd: __dirname,
    timeout: 60000 // 1 minute timeout
  });
  
  console.log('✅ Build successful!');
  console.log('Build output:');
  console.log(buildOutput);
  
  // Check if dist folder was created
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ dist folder created');
    
    // Check for essential files in dist
    const distFiles = fs.readdirSync(distPath);
    if (distFiles.includes('index.html')) {
      console.log('✅ dist/index.html created');
    } else {
      console.log('❌ dist/index.html missing');
    }
    
    // Check for JS files
    const jsFiles = distFiles.filter(f => f.endsWith('.js'));
    if (jsFiles.length > 0) {
      console.log(`✅ ${jsFiles.length} JS files created`);
    } else {
      console.log('❌ No JS files in dist');
    }
    
  } else {
    console.log('❌ dist folder not created');
  }
  
} catch (error) {
  console.log('❌ Build failed!');
  console.log('Error:', error.message);
  if (error.stdout) {
    console.log('Stdout:', error.stdout.toString());
  }
  if (error.stderr) {
    console.log('Stderr:', error.stderr.toString());
  }
}

// Test 5: Check dist/index.html for runtime issues
console.log('\n🔍 CHECKING BUILT FILES...');
const distIndexPath = path.join(__dirname, 'dist', 'index.html');
if (fs.existsSync(distIndexPath)) {
  try {
    const content = fs.readFileSync(distIndexPath, 'utf8');
    
    if (content.includes('<div id="root">')) {
      console.log('✅ Built index.html has root div');
    } else {
      console.log('❌ Built index.html missing root div');
    }
    
    // Check for script tags
    const scriptMatches = content.match(/<script[^>]*src="[^"]*"[^>]*>/g);
    if (scriptMatches && scriptMatches.length > 0) {
      console.log(`✅ Found ${scriptMatches.length} script tags`);
    } else {
      console.log('❌ No script tags found in built index.html');
    }
    
    // Check for CSS links
    const linkMatches = content.match(/<link[^>]*rel="stylesheet"[^>]*>/g);
    if (linkMatches && linkMatches.length > 0) {
      console.log(`✅ Found ${linkMatches.length} CSS links`);
    } else {
      console.log('⚠️  No CSS links found in built index.html');
    }
    
  } catch (error) {
    console.log(`❌ Error reading built index.html: ${error.message}`);
  }
} else {
  console.log('❌ Built index.html not found');
}

console.log('\n📊 TEST SUMMARY');
console.log('=' .repeat(30));
console.log('If you see ❌ errors above, those need to be fixed.');
console.log('If you see ⚠️  warnings, those should be investigated.');
console.log('✅ indicates passing tests.');
console.log('\nFor white screen issues, focus on:');
console.log('1. Missing default exports in components');
console.log('2. Import errors with version numbers');
console.log('3. Missing root div or script tags');
console.log('4. Build process failures');
console.log('5. Runtime errors in React components');
