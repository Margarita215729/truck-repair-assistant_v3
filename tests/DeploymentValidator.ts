// Comprehensive Deployment Validation Suite
// Tests for catching all deployment issues

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

export class DeploymentValidator {
  private results: ValidationResult[] = [];
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  // 1. Test Package.json Structure
  validatePackageJson(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    try {
      const packagePath = path.join(this.rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check essential fields
      const requiredFields = ['name', 'version', 'scripts', 'dependencies'];
      for (const field of requiredFields) {
        if (!packageJson[field]) {
          results.push({
            category: 'PACKAGE',
            test: `package.json.${field}`,
            status: 'FAIL',
            message: `Missing required field: ${field}`
          });
        } else {
          results.push({
            category: 'PACKAGE',
            test: `package.json.${field}`,
            status: 'PASS',
            message: `Field ${field} exists`
          });
        }
      }

      // Check build script
      if (!packageJson.scripts?.build) {
        results.push({
          category: 'PACKAGE',
          test: 'package.json.scripts.build',
          status: 'FAIL',
          message: 'Missing build script'
        });
      }

      // Check for problematic dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        if (typeof version === 'string' && version.includes('@')) {
          results.push({
            category: 'PACKAGE',
            test: `dependency.${name}`,
            status: 'FAIL',
            message: `Invalid dependency version: ${name}@${version}`,
            details: { name, version }
          });
        }
      }

    } catch (error) {
      results.push({
        category: 'PACKAGE',
        test: 'package.json.read',
        status: 'FAIL',
        message: `Failed to read package.json: ${error}`
      });
    }

    return results;
  }

  // 2. Test Import Statements
  validateImports(): ValidationResult[] {
    const results: ValidationResult[] = [];
    const srcDir = path.join(this.rootDir, 'src');
    
    const findTsFiles = (dir: string): string[] => {
      const files: string[] = [];
      if (!fs.existsSync(dir)) return files;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findTsFiles(fullPath));
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const tsFiles = findTsFiles(srcDir);
    
    for (const file of tsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Check for imports with version numbers
          const versionImportMatch = line.match(/from\s+['"][^'"]*@\d+\.\d+\.\d+['"]/);
          if (versionImportMatch) {
            results.push({
              category: 'IMPORTS',
              test: `import.version.${path.basename(file)}:${index + 1}`,
              status: 'FAIL',
              message: `Import with version number: ${versionImportMatch[0]}`,
              details: { file: path.relative(this.rootDir, file), line: index + 1 }
            });
          }

          // Check for problematic import patterns
          const problemPatterns = [
            /from\s+['"][^'"]*\*['"]/,  // Wildcard imports
            /from\s+['"][^'"]*\$['"]/,  // Dollar signs
            /from\s+['"][^'"]*jsr:['"]/  // JSR imports
          ];

          for (const pattern of problemPatterns) {
            if (pattern.test(line)) {
              results.push({
                category: 'IMPORTS',
                test: `import.pattern.${path.basename(file)}:${index + 1}`,
                status: 'WARNING',
                message: `Potentially problematic import: ${line.trim()}`,
                details: { file: path.relative(this.rootDir, file), line: index + 1 }
              });
            }
          }
        });

        results.push({
          category: 'IMPORTS',
          test: `import.scan.${path.basename(file)}`,
          status: 'PASS',
          message: `Scanned ${lines.length} lines`
        });

      } catch (error) {
        results.push({
          category: 'IMPORTS',
          test: `import.read.${path.basename(file)}`,
          status: 'FAIL',
          message: `Failed to read file: ${error}`
        });
      }
    }

    return results;
  }

  // 3. Test Component Syntax
  validateComponents(): ValidationResult[] {
    const results: ValidationResult[] = [];
    const componentsDir = path.join(this.rootDir, 'src', 'components');
    
    if (!fs.existsSync(componentsDir)) {
      results.push({
        category: 'COMPONENTS',
        test: 'components.directory',
        status: 'FAIL',
        message: 'Components directory not found'
      });
      return results;
    }

    const findComponents = (dir: string): string[] => {
      const files: string[] = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findComponents(fullPath));
        } else if (item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const componentFiles = findComponents(componentsDir);

    for (const file of componentFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for basic React component structure
        if (!content.includes('export') || (!content.includes('function') && !content.includes('const'))) {
          results.push({
            category: 'COMPONENTS',
            test: `component.structure.${path.basename(file)}`,
            status: 'FAIL',
            message: 'Component missing export or function declaration'
          });
        }

        // Check for unclosed brackets/braces
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;

        if (openBraces !== closeBraces) {
          results.push({
            category: 'COMPONENTS',
            test: `component.braces.${path.basename(file)}`,
            status: 'FAIL',
            message: `Unmatched braces: ${openBraces} open, ${closeBraces} close`
          });
        }

        if (openParens !== closeParens) {
          results.push({
            category: 'COMPONENTS',
            test: `component.parens.${path.basename(file)}`,
            status: 'FAIL',
            message: `Unmatched parentheses: ${openParens} open, ${closeParens} close`
          });
        }

        // Check for TypeScript errors (basic)
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Check for common TS errors
          if (line.includes(': :') || line.includes('::')) {
            results.push({
              category: 'COMPONENTS',
              test: `component.typescript.${path.basename(file)}:${index + 1}`,
              status: 'FAIL',
              message: `Potential TypeScript syntax error: ${line.trim()}`,
              details: { file: path.relative(this.rootDir, file), line: index + 1 }
            });
          }
        });

        results.push({
          category: 'COMPONENTS',
          test: `component.validation.${path.basename(file)}`,
          status: 'PASS',
          message: 'Component syntax validation passed'
        });

      } catch (error) {
        results.push({
          category: 'COMPONENTS',
          test: `component.read.${path.basename(file)}`,
          status: 'FAIL',
          message: `Failed to read component: ${error}`
        });
      }
    }

    return results;
  }

  // 4. Test Build Configuration
  validateBuildConfig(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Check vite.config.ts
    const viteConfigPath = path.join(this.rootDir, 'vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
      try {
        const content = fs.readFileSync(viteConfigPath, 'utf8');
        
        if (!content.includes('defineConfig')) {
          results.push({
            category: 'BUILD',
            test: 'vite.config.defineConfig',
            status: 'FAIL',
            message: 'vite.config.ts missing defineConfig'
          });
        }

        if (!content.includes('@vitejs/plugin-react')) {
          results.push({
            category: 'BUILD',
            test: 'vite.config.react',
            status: 'FAIL',
            message: 'vite.config.ts missing React plugin'
          });
        }

        results.push({
          category: 'BUILD',
          test: 'vite.config.exists',
          status: 'PASS',
          message: 'vite.config.ts found and validated'
        });

      } catch (error) {
        results.push({
          category: 'BUILD',
          test: 'vite.config.read',
          status: 'FAIL',
          message: `Failed to read vite.config.ts: ${error}`
        });
      }
    } else {
      results.push({
        category: 'BUILD',
        test: 'vite.config.exists',
        status: 'FAIL',
        message: 'vite.config.ts not found'
      });
    }

    // Check tsconfig.json
    const tsconfigPath = path.join(this.rootDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        
        if (!tsconfig.compilerOptions) {
          results.push({
            category: 'BUILD',
            test: 'tsconfig.compilerOptions',
            status: 'FAIL',
            message: 'tsconfig.json missing compilerOptions'
          });
        }

        results.push({
          category: 'BUILD',
          test: 'tsconfig.exists',
          status: 'PASS',
          message: 'tsconfig.json found and validated'
        });

      } catch (error) {
        results.push({
          category: 'BUILD',
          test: 'tsconfig.read',
          status: 'FAIL',
          message: `Failed to read tsconfig.json: ${error}`
        });
      }
    }

    return results;
  }

  // 5. Test Entry Point
  validateEntryPoint(): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Check index.html
    const indexPath = path.join(this.rootDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      try {
        const content = fs.readFileSync(indexPath, 'utf8');
        
        if (!content.includes('<div id="root">')) {
          results.push({
            category: 'ENTRY',
            test: 'index.html.root',
            status: 'FAIL',
            message: 'index.html missing root div'
          });
        }

        if (!content.includes('/src/main.tsx')) {
          results.push({
            category: 'ENTRY',
            test: 'index.html.main',
            status: 'FAIL',
            message: 'index.html missing main.tsx script'
          });
        }

        results.push({
          category: 'ENTRY',
          test: 'index.html.exists',
          status: 'PASS',
          message: 'index.html found and validated'
        });

      } catch (error) {
        results.push({
          category: 'ENTRY',
          test: 'index.html.read',
          status: 'FAIL',
          message: `Failed to read index.html: ${error}`
        });
      }
    }

    // Check main.tsx
    const mainPath = path.join(this.rootDir, 'src', 'main.tsx');
    if (fs.existsSync(mainPath)) {
      try {
        const content = fs.readFileSync(mainPath, 'utf8');
        
        if (!content.includes('ReactDOM.createRoot')) {
          results.push({
            category: 'ENTRY',
            test: 'main.tsx.createRoot',
            status: 'FAIL',
            message: 'main.tsx missing ReactDOM.createRoot'
          });
        }

        if (!content.includes("getElementById('root')")) {
          results.push({
            category: 'ENTRY',
            test: 'main.tsx.root',
            status: 'FAIL',
            message: 'main.tsx not targeting root element'
          });
        }

        results.push({
          category: 'ENTRY',
          test: 'main.tsx.exists',
          status: 'PASS',
          message: 'main.tsx found and validated'
        });

      } catch (error) {
        results.push({
          category: 'ENTRY',
          test: 'main.tsx.read',
          status: 'FAIL',
          message: `Failed to read main.tsx: ${error}`
        });
      }
    }

    return results;
  }

  // Run all validations
  runAllValidations(): ValidationResult[] {
    console.log('🔍 Running comprehensive deployment validation...\n');
    
    const allResults = [
      ...this.validatePackageJson(),
      ...this.validateImports(),
      ...this.validateComponents(),
      ...this.validateBuildConfig(),
      ...this.validateEntryPoint()
    ];

    return allResults;
  }

  // Generate report
  generateReport(results: ValidationResult[]): string {
    const categories = [...new Set(results.map(r => r.category))];
    let report = '📊 DEPLOYMENT VALIDATION REPORT\n';
    report += '='.repeat(50) + '\n\n';

    const summary = {
      PASS: results.filter(r => r.status === 'PASS').length,
      FAIL: results.filter(r => r.status === 'FAIL').length,
      WARNING: results.filter(r => r.status === 'WARNING').length
    };

    report += `📈 SUMMARY:\n`;
    report += `✅ PASSED: ${summary.PASS}\n`;
    report += `❌ FAILED: ${summary.FAIL}\n`;
    report += `⚠️  WARNINGS: ${summary.WARNING}\n\n`;

    for (const category of categories) {
      const categoryResults = results.filter(r => r.category === category);
      report += `📁 ${category}\n`;
      report += '-'.repeat(20) + '\n';

      for (const result of categoryResults) {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        report += `${icon} ${result.test}: ${result.message}\n`;
        if (result.details) {
          report += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
        }
      }
      report += '\n';
    }

    return report;
  }
}
