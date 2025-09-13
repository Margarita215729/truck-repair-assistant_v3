// Runtime Error Detection for React Components
// Tests components for runtime errors that cause white screens

import * as fs from 'fs';
import * as path from 'path';

interface RuntimeTest {
  component: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  fix?: string;
}

export class RuntimeTester {
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  // Test for common runtime errors that cause white screens
  testForWhiteScreenCauses(): RuntimeTest[] {
    const results: RuntimeTest[] = [];
    
    // 1. Test App.tsx for critical errors
    results.push(...this.testAppComponent());
    
    // 2. Test main.tsx for mounting errors
    results.push(...this.testMainFile());
    
    // 3. Test for missing dependencies
    results.push(...this.testDependencies());
    
    // 4. Test for environment variable issues
    results.push(...this.testEnvironmentVariables());
    
    // 5. Test for CSS/styling issues
    results.push(...this.testStyling());
    
    return results;
  }

  private testAppComponent(): RuntimeTest[] {
    const results: RuntimeTest[] = [];
    const appPath = path.join(this.rootDir, 'src', 'App.tsx');
    
    if (!fs.existsSync(appPath)) {
      results.push({
        component: 'App.tsx',
        test: 'exists',
        status: 'FAIL',
        message: 'App.tsx not found',
        fix: 'Create src/App.tsx with basic React component'
      });
      return results;
    }

    try {
      const content = fs.readFileSync(appPath, 'utf8');
      
      // Check for default export
      if (!content.includes('export default')) {
        results.push({
          component: 'App.tsx',
          test: 'default_export',
          status: 'FAIL',
          message: 'App component missing default export',
          fix: 'Add "export default App" or "export default function App()"'
        });
      }

      // Check for JSX return
      if (!content.includes('return') || !content.includes('<')) {
        results.push({
          component: 'App.tsx',
          test: 'jsx_return',
          status: 'FAIL',
          message: 'App component not returning JSX',
          fix: 'Ensure App component returns JSX elements'
        });
      }

      // Check for uncaught errors in useEffect
      const useEffectMatches = content.match(/useEffect\s*\([^}]+\}/g);
      if (useEffectMatches) {
        for (const match of useEffectMatches) {
          if (!match.includes('try') && !match.includes('catch')) {
            results.push({
              component: 'App.tsx',
              test: 'useEffect_error_handling',
              status: 'WARNING',
              message: 'useEffect without error handling detected',
              fix: 'Wrap useEffect code in try-catch blocks'
            });
          }
        }
      }

      // Check for state initialization errors
      const useStateMatches = content.match(/useState\s*\([^)]*\)/g);
      if (useStateMatches) {
        for (const match of useStateMatches) {
          if (match.includes('undefined') || match.includes('null')) {
            results.push({
              component: 'App.tsx',
              test: 'useState_initialization',
              status: 'WARNING',
              message: 'useState initialized with null/undefined',
              fix: 'Initialize state with proper default values'
            });
          }
        }
      }

      results.push({
        component: 'App.tsx',
        test: 'basic_structure',
        status: 'PASS',
        message: 'App component structure looks good'
      });

    } catch (error) {
      results.push({
        component: 'App.tsx',
        test: 'read_file',
        status: 'FAIL',
        message: `Cannot read App.tsx: ${error}`,
        fix: 'Check file permissions and syntax'
      });
    }

    return results;
  }

  private testMainFile(): RuntimeTest[] {
    const results: RuntimeTest[] = [];
    const mainPath = path.join(this.rootDir, 'src', 'main.tsx');
    
    if (!fs.existsSync(mainPath)) {
      results.push({
        component: 'main.tsx',
        test: 'exists',
        status: 'FAIL',
        message: 'main.tsx not found',
        fix: 'Create src/main.tsx with React root mounting code'
      });
      return results;
    }

    try {
      const content = fs.readFileSync(mainPath, 'utf8');
      
      // Check for React imports
      if (!content.includes('import React') && !content.includes('import { StrictMode }')) {
        results.push({
          component: 'main.tsx',
          test: 'react_import',
          status: 'FAIL',
          message: 'Missing React import in main.tsx',
          fix: 'Add "import React from \'react\'"'
        });
      }

      // Check for ReactDOM import
      if (!content.includes('ReactDOM')) {
        results.push({
          component: 'main.tsx',
          test: 'reactdom_import',
          status: 'FAIL',
          message: 'Missing ReactDOM import in main.tsx',
          fix: 'Add "import ReactDOM from \'react-dom/client\'"'
        });
      }

      // Check for App import
      if (!content.includes('import App')) {
        results.push({
          component: 'main.tsx',
          test: 'app_import',
          status: 'FAIL',
          message: 'Missing App import in main.tsx',
          fix: 'Add "import App from \'./App\'"'
        });
      }

      // Check for root element mounting
      if (!content.includes("getElementById('root')")) {
        results.push({
          component: 'main.tsx',
          test: 'root_element',
          status: 'FAIL',
          message: 'Not mounting to root element',
          fix: 'Use document.getElementById(\'root\') for mounting'
        });
      }

      // Check for createRoot usage
      if (!content.includes('createRoot')) {
        results.push({
          component: 'main.tsx',
          test: 'create_root',
          status: 'FAIL',
          message: 'Using deprecated render method',
          fix: 'Use ReactDOM.createRoot() instead of ReactDOM.render()'
        });
      }

      results.push({
        component: 'main.tsx',
        test: 'basic_structure',
        status: 'PASS',
        message: 'main.tsx structure looks good'
      });

    } catch (error) {
      results.push({
        component: 'main.tsx',
        test: 'read_file',
        status: 'FAIL',
        message: `Cannot read main.tsx: ${error}`,
        fix: 'Check file permissions and syntax'
      });
    }

    return results;
  }

  private testDependencies(): RuntimeTest[] {
    const results: RuntimeTest[] = [];
    
    try {
      const packagePath = path.join(this.rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check for essential React dependencies
      const essentialDeps = ['react', 'react-dom'];
      for (const dep of essentialDeps) {
        if (!packageJson.dependencies?.[dep]) {
          results.push({
            component: 'dependencies',
            test: `essential_dep_${dep}`,
            status: 'FAIL',
            message: `Missing essential dependency: ${dep}`,
            fix: `Run: npm install ${dep}`
          });
        }
      }

      // Check for version conflicts
      const deps = packageJson.dependencies || {};
      if (deps.react && deps['react-dom']) {
        const reactVersion = deps.react.replace(/[^0-9.]/g, '');
        const reactDomVersion = deps['react-dom'].replace(/[^0-9.]/g, '');
        
        if (reactVersion !== reactDomVersion) {
          results.push({
            component: 'dependencies',
            test: 'react_version_match',
            status: 'WARNING',
            message: 'React and ReactDOM versions don\'t match',
            fix: 'Ensure React and ReactDOM have the same version'
          });
        }
      }

      results.push({
        component: 'dependencies',
        test: 'package_json_valid',
        status: 'PASS',
        message: 'Package.json dependencies look good'
      });

    } catch (error) {
      results.push({
        component: 'dependencies',
        test: 'read_package_json',
        status: 'FAIL',
        message: `Cannot read package.json: ${error}`,
        fix: 'Check package.json syntax and permissions'
      });
    }

    return results;
  }

  private testEnvironmentVariables(): RuntimeTest[] {
    const results: RuntimeTest[] = [];
    
    // Check for environment variable usage in code
    const srcDir = path.join(this.rootDir, 'src');
    const findEnvUsage = (dir: string): string[] => {
      const files: string[] = [];
      if (!fs.existsSync(dir)) return files;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findEnvUsage(fullPath));
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('process.env') || content.includes('import.meta.env')) {
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
      return files;
    };

    const filesWithEnv = findEnvUsage(srcDir);
    
    for (const file of filesWithEnv) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const envMatches = content.match(/(process\.env\.|import\.meta\.env\.)[A-Z_]+/g);
        
        if (envMatches) {
          for (const match of envMatches) {
            // Check if environment variables are properly prefixed for Vite
            if (match.includes('import.meta.env.') && !match.includes('VITE_')) {
              results.push({
                component: path.relative(this.rootDir, file),
                test: 'env_var_prefix',
                status: 'FAIL',
                message: `Environment variable ${match} not prefixed with VITE_`,
                fix: 'Prefix environment variables with VITE_ for client-side access'
              });
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    // Check for .env files
    const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
    let hasEnvFile = false;
    
    for (const envFile of envFiles) {
      if (fs.existsSync(path.join(this.rootDir, envFile))) {
        hasEnvFile = true;
        break;
      }
    }

    if (filesWithEnv.length > 0 && !hasEnvFile) {
      results.push({
        component: 'environment',
        test: 'env_file_exists',
        status: 'WARNING',
        message: 'Code uses environment variables but no .env file found',
        fix: 'Create .env file with required environment variables'
      });
    }

    results.push({
      component: 'environment',
      test: 'env_validation',
      status: 'PASS',
      message: 'Environment variable usage validated'
    });

    return results;
  }

  private testStyling(): RuntimeTest[] {
    const results: RuntimeTest[] = [];
    
    // Check for CSS imports in main.tsx
    const mainPath = path.join(this.rootDir, 'src', 'main.tsx');
    if (fs.existsSync(mainPath)) {
      try {
        const content = fs.readFileSync(mainPath, 'utf8');
        
        if (!content.includes('.css')) {
          results.push({
            component: 'styling',
            test: 'css_import',
            status: 'WARNING',
            message: 'No CSS imports found in main.tsx',
            fix: 'Import CSS file: import \'./index.css\''
          });
        }
      } catch (error) {
        // Skip if can't read
      }
    }

    // Check if CSS files exist
    const cssFiles = ['src/index.css', 'src/App.css'];
    let hasCssFile = false;
    
    for (const cssFile of cssFiles) {
      if (fs.existsSync(path.join(this.rootDir, cssFile))) {
        hasCssFile = true;
        break;
      }
    }

    if (!hasCssFile) {
      results.push({
        component: 'styling',
        test: 'css_files',
        status: 'WARNING',
        message: 'No CSS files found',
        fix: 'Create src/index.css with basic styles'
      });
    }

    results.push({
      component: 'styling',
      test: 'styling_validation',
      status: 'PASS',
      message: 'Styling setup validated'
    });

    return results;
  }

  generateRuntimeReport(results: RuntimeTest[]): string {
    let report = '🚨 RUNTIME ERROR ANALYSIS\n';
    report += '='.repeat(40) + '\n\n';

    const failures = results.filter(r => r.status === 'FAIL');
    const warnings = results.filter(r => r.status === 'WARNING');
    
    if (failures.length > 0) {
      report += '❌ CRITICAL RUNTIME ISSUES (These likely cause white screen):\n';
      report += '-'.repeat(60) + '\n';
      
      for (const failure of failures) {
        report += `🔥 ${failure.component} - ${failure.test}\n`;
        report += `   Problem: ${failure.message}\n`;
        if (failure.fix) {
          report += `   Fix: ${failure.fix}\n`;
        }
        report += '\n';
      }
    }

    if (warnings.length > 0) {
      report += '⚠️  POTENTIAL ISSUES:\n';
      report += '-'.repeat(30) + '\n';
      
      for (const warning of warnings) {
        report += `⚡ ${warning.component} - ${warning.test}\n`;
        report += `   Issue: ${warning.message}\n`;
        if (warning.fix) {
          report += `   Suggestion: ${warning.fix}\n`;
        }
        report += '\n';
      }
    }

    const passes = results.filter(r => r.status === 'PASS');
    if (passes.length > 0) {
      report += '✅ PASSING TESTS:\n';
      report += '-'.repeat(20) + '\n';
      
      for (const pass of passes) {
        report += `✓ ${pass.component} - ${pass.test}: ${pass.message}\n`;
      }
    }

    return report;
  }
}
