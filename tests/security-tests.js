/**
 * Security Validation Tests
 * Tests for the security improvements implemented in the truck repair assistant
 */

// Import security modules for testing
import { 
  validateGitHubToken, 
  validateGoogleMapsKey, 
  validateSupabaseKey,
  validateAllEnvironmentVariables,
  encryptToken,
  decryptToken,
  SecureTokenStorage 
} from '../src/lib/token-security.js';

import { 
  isOriginAllowed,
  validateAudioFile,
  sanitizeTextInput,
  validateJsonInput 
} from '../src/lib/api-security.js';

console.log('🔒 SECURITY VALIDATION TESTS');
console.log('========================================');

// Test 1: Token Validation
console.log('\n1. Testing Token Validation...');

// Test GitHub token validation
const testTokens = [
  { token: 'ghp_1234567890abcdef1234567890abcdef12345678', expected: true },
  { token: 'invalid_token', expected: false },
  { token: '', expected: false },
  { token: 'github_pat_11A1234567890abcdef1234567890abcdef12345678901234567890', expected: true },
  { token: 'test_token_placeholder', expected: false }
];

let tokenTestsPassed = 0;
testTokens.forEach((test, index) => {
  const result = validateGitHubToken(test.token);
  const passed = result.isValid === test.expected;
  console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} Token: "${test.token.substring(0, 20)}..." Expected: ${test.expected}, Got: ${result.isValid}`);
  if (result.errors.length > 0) console.log(`    Errors: ${result.errors.join(', ')}`);
  if (result.warnings.length > 0) console.log(`    Warnings: ${result.warnings.join(', ')}`);
  if (passed) tokenTestsPassed++;
});

console.log(`Token validation tests: ${tokenTestsPassed}/${testTokens.length} passed`);

// Test 2: CORS Origin Validation
console.log('\n2. Testing CORS Origin Validation...');

const testOrigins = [
  { origin: 'https://truck-repair-assistant-v2.vercel.app', expected: true },
  { origin: 'http://localhost:3000', expected: true },
  { origin: 'https://malicious-site.com', expected: false },
  { origin: 'http://localhost:5173', expected: true },
  { origin: '', expected: false }
];

let corsTestsPassed = 0;
testOrigins.forEach((test, index) => {
  const result = isOriginAllowed(test.origin);
  const passed = result === test.expected;
  console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} Origin: "${test.origin}" Expected: ${test.expected}, Got: ${result}`);
  if (passed) corsTestsPassed++;
});

console.log(`CORS validation tests: ${corsTestsPassed}/${testOrigins.length} passed`);

// Test 3: Audio File Validation
console.log('\n3. Testing Audio File Validation...');

const testAudioFiles = [
  { file: { size: 1024 * 1024, type: 'audio/wav', name: 'test.wav' }, expected: true },
  { file: { size: 100 * 1024 * 1024, type: 'audio/wav', name: 'toolarge.wav' }, expected: false },
  { file: { size: 1024, type: 'application/exe', name: 'malicious.exe' }, expected: false },
  { file: { size: 0, type: 'audio/mp3', name: 'empty.mp3' }, expected: false },
  { file: { size: 1024, type: 'audio/mp3', name: '../../../evil.mp3' }, expected: false }
];

let audioTestsPassed = 0;
testAudioFiles.forEach((test, index) => {
  const result = validateAudioFile(test.file);
  const passed = result.valid === test.expected;
  console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} File: "${test.file.name}" Expected: ${test.expected}, Got: ${result.valid}`);
  if (!result.valid && result.errors.length > 0) {
    console.log(`    Errors: ${result.errors.join(', ')}`);
  }
  if (passed) audioTestsPassed++;
});

console.log(`Audio validation tests: ${audioTestsPassed}/${testAudioFiles.length} passed`);

// Test 4: Text Sanitization
console.log('\n4. Testing Text Sanitization...');

const testInputs = [
  { input: 'Normal text', expected: 'Normal text' },
  { input: '<script>alert("xss")</script>', expected: 'scriptalert("xss")/script' },
  { input: 'javascript:alert("evil")', expected: 'alert("evil")' },
  { input: 'Text with onclick=evil', expected: 'Text with evil' },
  { input: '  Whitespace text  ', expected: 'Whitespace text' }
];

let sanitizeTestsPassed = 0;
testInputs.forEach((test, index) => {
  const result = sanitizeTextInput(test.input);
  const passed = result === test.expected;
  console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} Input: "${test.input}" Expected: "${test.expected}", Got: "${result}"`);
  if (passed) sanitizeTestsPassed++;
});

console.log(`Text sanitization tests: ${sanitizeTestsPassed}/${testInputs.length} passed`);

// Test 5: JSON Validation
console.log('\n5. Testing JSON Validation...');

const testJsonInputs = [
  { input: { normal: 'data' }, expected: true },
  { input: { __proto__: { evil: true } }, expected: false },
  { input: 'function() { return evil; }', expected: false },
  { input: { valid: 'json', number: 123 }, expected: true }
];

let jsonTestsPassed = 0;
testJsonInputs.forEach((test, index) => {
  const result = validateJsonInput(test.input);
  const passed = result.valid === test.expected;
  console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} Input type: ${typeof test.input} Expected: ${test.expected}, Got: ${result.valid}`);
  if (!result.valid && result.error) {
    console.log(`    Error: ${result.error}`);
  }
  if (passed) jsonTestsPassed++;
});

console.log(`JSON validation tests: ${jsonTestsPassed}/${testJsonInputs.length} passed`);

// Test 6: Token Encryption/Decryption
console.log('\n6. Testing Token Encryption...');

const testToken = 'ghp_1234567890abcdef1234567890abcdef12345678';
const encrypted = encryptToken(testToken);
const decrypted = decryptToken(encrypted);

const encryptionPassed = decrypted === testToken && encrypted !== testToken;
console.log(`  Encryption test: ${encryptionPassed ? '✅' : '❌'} Original !== Encrypted: ${testToken !== encrypted}, Decrypted === Original: ${decrypted === testToken}`);

// Summary
console.log('\n🔒 SECURITY TEST SUMMARY');
console.log('========================================');
const totalTests = tokenTestsPassed + corsTestsPassed + audioTestsPassed + sanitizeTestsPassed + jsonTestsPassed + (encryptionPassed ? 1 : 0);
const totalPossible = testTokens.length + testOrigins.length + testAudioFiles.length + testInputs.length + testJsonInputs.length + 1;

console.log(`Total tests passed: ${totalTests}/${totalPossible}`);
console.log(`Success rate: ${Math.round((totalTests / totalPossible) * 100)}%`);

if (totalTests === totalPossible) {
  console.log('🎉 All security tests passed!');
} else {
  console.log('⚠️  Some security tests failed. Please review the implementation.');
}

export { totalTests, totalPossible };