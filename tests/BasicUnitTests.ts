/**
 * Basic unit tests for truck repair assistant utilities
 * Replaces deployment-only validation tests with real unit tests
 */

import { calculateDistance, calculateDriveTime, getDistanceValue } from '../src/utils/distance';
import { getErrorMessage, createErrorResponse, handleSyncError } from '../src/utils/error-handling';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

export class BasicUnitTests {
  private results: TestResult[] = [];

  /**
   * Add test result
   */
  private addResult(testName: string, passed: boolean, message: string): void {
    this.results.push({ testName, passed, message });
  }

  /**
   * Test distance calculation utilities
   */
  testDistanceCalculations(): void {
    console.log('🧮 Testing distance calculation utilities...');
    
    // Test basic distance calculation
    const location1 = { lat: 29.7604, lng: -95.3698 }; // Houston
    const location2 = { lat: 29.7372, lng: -95.2618 }; // Houston suburb
    
    const distance = calculateDistance(location1, location2);
    const isValidDistance = distance.includes('miles') && !distance.includes('NaN');
    this.addResult('Distance Calculation', isValidDistance, 
      `Distance calculated: ${distance}`);
    
    // Test null location handling
    const nullDistance = calculateDistance(null, location2);
    this.addResult('Null Location Handling', nullDistance === 'N/A', 
      `Null location returns: ${nullDistance}`);
    
    // Test drive time calculation
    const driveTime = calculateDriveTime(location1, location2);
    const isValidTime = driveTime.includes('min drive') && !driveTime.includes('NaN');
    this.addResult('Drive Time Calculation', isValidTime, 
      `Drive time calculated: ${driveTime}`);
    
    // Test distance value extraction
    const distanceValue = getDistanceValue(location1, location2);
    const isValidValue = typeof distanceValue === 'number' && distanceValue > 0;
    this.addResult('Distance Value Extraction', isValidValue, 
      `Distance value: ${distanceValue} miles`);
  }

  /**
   * Test error handling utilities
   */
  testErrorHandling(): void {
    console.log('🚨 Testing error handling utilities...');
    
    // Test error message extraction
    const error = new Error('Test error message');
    const message = getErrorMessage(error);
    this.addResult('Error Message Extraction', message === 'Test error message', 
      `Extracted message: ${message}`);
    
    // Test string error handling
    const stringError = 'String error';
    const stringMessage = getErrorMessage(stringError);
    this.addResult('String Error Handling', stringMessage === 'String error', 
      `String error message: ${stringMessage}`);
    
    // Test unknown error handling
    const unknownMessage = getErrorMessage(undefined);
    this.addResult('Unknown Error Handling', unknownMessage === 'An unknown error occurred', 
      `Unknown error message: ${unknownMessage}`);
    
    // Test error response creation
    const errorResponse = createErrorResponse(error, 'Test context');
    const hasRequiredFields = errorResponse.success === false && 
      errorResponse.error === 'Test error message' && 
      errorResponse.context === 'Test context';
    this.addResult('Error Response Creation', hasRequiredFields, 
      `Error response created with proper structure`);
    
    // Test sync error handler
    const result = handleSyncError(() => {
      throw new Error('Test sync error');
    }, 'Test operation', false);
    this.addResult('Sync Error Handler', result === null, 
      `Sync error handler returned null on error`);
  }

  /**
   * Test API structure validation
   */
  testAPIStructure(): void {
    console.log('🔌 Testing API structure...');
    
    try {
      // These tests verify the basic structure exists
      const { diagnosticsAPI, authAPI } = require('../src/utils/api');
      
      // Test diagnostics API methods
      const diagnosticsMethods = ['save', 'getHistory', 'getById'];
      diagnosticsMethods.forEach(method => {
        const hasMethod = typeof diagnosticsAPI[method] === 'function';
        this.addResult(`Diagnostics API ${method}`, hasMethod, 
          `Method ${method} ${hasMethod ? 'exists' : 'missing'}`);
      });
      
      // Test auth API methods
      const authMethods = ['signup', 'signIn', 'signOut', 'getCurrentUser', 'getSession'];
      authMethods.forEach(method => {
        const hasMethod = typeof authAPI[method] === 'function';
        this.addResult(`Auth API ${method}`, hasMethod, 
          `Method ${method} ${hasMethod ? 'exists' : 'missing'}`);
      });
      
    } catch (error) {
      this.addResult('API Import', false, `Failed to import API: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Run all tests
   */
  runAllTests(): void {
    console.log('🧪 Running Basic Unit Tests...\n');
    
    this.testDistanceCalculations();
    this.testErrorHandling();
    this.testAPIStructure();
    
    this.printResults();
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 UNIT TEST RESULTS');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.testName}: ${result.message}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (failed === 0) {
      console.log('🎉 All unit tests passed! Core utilities are working correctly.');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. ${passed} test(s) passed.`);
    }
    
    console.log(`📈 Test Coverage: ${passed}/${this.results.length} tests passed`);
  }

  /**
   * Get test summary
   */
  getTestSummary(): { passed: number; failed: number; total: number } {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    return { passed, failed, total: this.results.length };
  }
}

// Export for use in other test files
export default BasicUnitTests;