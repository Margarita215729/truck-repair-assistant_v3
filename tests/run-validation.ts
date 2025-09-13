#!/usr/bin/env node

// Test runner for deployment validation
import { DeploymentValidator } from './DeploymentValidator';
import * as path from 'path';

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const validator = new DeploymentValidator(rootDir);
  
  console.log('🚀 Starting comprehensive deployment validation...\n');
  
  try {
    const results = validator.runAllValidations();
    const report = validator.generateReport(results);
    
    console.log(report);
    
    // Check if there are critical failures
    const failures = results.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
      console.log('🚨 CRITICAL ISSUES DETECTED:');
      failures.forEach(failure => {
        console.log(`   ❌ ${failure.category}: ${failure.test} - ${failure.message}`);
        if (failure.details) {
          console.log(`      Details: ${JSON.stringify(failure.details)}`);
        }
      });
      process.exit(1);
    } else {
      console.log('✅ All validations passed! Project ready for deployment.');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Validation failed with error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
