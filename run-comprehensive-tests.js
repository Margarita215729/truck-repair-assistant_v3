#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all application tests and generates detailed reports
 */

import { ComprehensiveAppTest } from './tests/ComprehensiveAppTest.js';

async function runTests() {
  console.log('🚀 AI Truck Diagnostic Assistant - Comprehensive Testing');
  console.log('=' .repeat(60));
  
  try {
    const testSuite = new ComprehensiveAppTest();
    await testSuite.runAllTests();
    
    console.log('\n✨ Testing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Testing failed with error:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
