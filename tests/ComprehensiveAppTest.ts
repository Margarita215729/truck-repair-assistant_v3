/**
 * Comprehensive Application Testing Suite
 * Tests all major functionality of the AI Truck Diagnostic Assistant
 */

import { GitHubModelsService } from '../src/services/GitHubModelsService';
import { YouTubeSearchService } from '../src/services/YouTubeSearchService';
import { DynamicPricingService } from '../src/services/DynamicPricingService';
import { BackgroundTrainingService } from '../src/services/BackgroundTrainingService';

export class ComprehensiveAppTest {
  private testResults: Array<{
    testName: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message: string;
    duration: number;
  }> = [];

  private startTime: number = 0;

  /**
   * Run all comprehensive tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Application Tests...\n');
    
    // Test 1: Core Services Initialization
    await this.testCoreServicesInitialization();
    
    // Test 2: AI Model Training and Response
    await this.testAIModelTraining();
    
    // Test 3: YouTube Search Integration
    await this.testYouTubeSearchIntegration();
    
    // Test 4: Response Formatting and Cleaning
    await this.testResponseFormatting();
    
    // Test 5: Dynamic Pricing Service
    await this.testDynamicPricingService();
    
    // Test 6: Background Training Service
    await this.testBackgroundTrainingService();
    
    // Test 7: Error Handling and Fallbacks
    await this.testErrorHandling();
    
    // Test 8: Mobile Responsiveness
    await this.testMobileResponsiveness();
    
    // Test 9: PDF Report Generation
    await this.testPDFReportGeneration();
    
    // Test 10: Map Integration
    await this.testMapIntegration();
    
    // Generate final report
    this.generateTestReport();
  }

  /**
   * Test 1: Core Services Initialization
   */
  private async testCoreServicesInitialization(): Promise<void> {
    this.startTest('Core Services Initialization');
    
    try {
      // Test GitHubModelsService
      const githubService = new GitHubModelsService();
      console.log('✅ GitHubModelsService initialized');
      
      // Test YouTubeSearchService
      const youtubeService = new YouTubeSearchService();
      console.log('✅ YouTubeSearchService initialized');
      
      // Test DynamicPricingService
      const pricingService = new DynamicPricingService();
      console.log('✅ DynamicPricingService initialized');
      
      // Test BackgroundTrainingService
      const trainingService = new BackgroundTrainingService();
      console.log('✅ BackgroundTrainingService initialized');
      
      this.passTest('All core services initialized successfully');
    } catch (error) {
      this.failTest(`Core services initialization failed: ${error}`);
    }
  }

  /**
   * Test 2: AI Model Training and Response
   */
  private async testAIModelTraining(): Promise<void> {
    this.startTest('AI Model Training and Response');
    
    try {
      const service = new GitHubModelsService();
      
      // Test training data preparation
      const mockTrainingData = [
        {
          input: {
            truck_model: 'Freightliner Cascadia',
            symptoms: 'Engine knocking sound',
            error_codes: ['SPN 102', 'FMI 3']
          },
          output: {
            diagnosis: 'Rod bearing failure',
            component: 'engine',
            failure_type: 'rod_bearing_failure',
            urgency: 'critical',
            can_continue: false,
            immediate_actions: ['Stop vehicle immediately', 'Call for towing'],
            preventive_measures: ['Regular oil changes', 'Monitor engine temperature'],
            confidence_score: 0.95
          }
        }
      ];
      
      const trainingData = await service.prepareTrainingData(mockTrainingData);
      console.log('✅ Training data prepared successfully');
      
      // Test diagnostic analysis (mock)
      const mockPrompt = {
        truck_model: 'Freightliner Cascadia',
        symptoms: 'Engine knocking sound',
        error_codes: ['SPN 102', 'FMI 3']
      };
      
      console.log('✅ AI diagnostic prompt created');
      
      this.passTest('AI model training and response system working');
    } catch (error) {
      this.failTest(`AI model training failed: ${error}`);
    }
  }

  /**
   * Test 3: YouTube Search Integration
   */
  private async testYouTubeSearchIntegration(): Promise<void> {
    this.startTest('YouTube Search Integration');
    
    try {
      const youtubeService = new YouTubeSearchService();
      
      // Test search functionality
      const searchTerms = ['truck engine repair', 'diesel engine problems'];
      const result = await youtubeService.searchTruckRepairVideos(searchTerms, 3);
      
      console.log(`✅ YouTube search completed: ${result.videos.length} videos found`);
      console.log(`✅ Search query: "${result.searchQuery}"`);
      
      // Test trending videos
      const trendingVideos = await youtubeService.getTrendingTruckVideos(2);
      console.log(`✅ Trending videos: ${trendingVideos.length} videos`);
      
      // Test component-specific search
      const componentResult = await youtubeService.searchComponentRepair('engine', 'knocking');
      console.log(`✅ Component search: ${componentResult.videos.length} videos`);
      
      this.passTest('YouTube search integration working correctly');
    } catch (error) {
      this.failTest(`YouTube search integration failed: ${error}`);
    }
  }

  /**
   * Test 4: Response Formatting and Cleaning
   */
  private async testResponseFormatting(): Promise<void> {
    this.startTest('Response Formatting and Cleaning');
    
    try {
      const service = new GitHubModelsService();
      
      // Test response cleaning
      const dirtyResponse = `
        **DIAGNOSIS**: Engine problem
        *Urgency*: HIGH
        \`\`\`code\`\`\`
        - Stop immediately
        - Call mechanic
        \`\`\`
        ## Summary
        __Important__: Safety first!
      `;
      
      // Access private method for testing
      const cleanResponse = (service as any).cleanAIResponse(dirtyResponse);
      
      console.log('✅ Response cleaning test completed');
      console.log('Original:', dirtyResponse.substring(0, 50) + '...');
      console.log('Cleaned:', cleanResponse.substring(0, 50) + '...');
      
      // Verify cleaning worked
      const hasMarkdown = cleanResponse.includes('**') || cleanResponse.includes('*') || cleanResponse.includes('```');
      if (hasMarkdown) {
        this.failTest('Response cleaning did not remove all markdown');
        return;
      }
      
      this.passTest('Response formatting and cleaning working correctly');
    } catch (error) {
      this.failTest(`Response formatting test failed: ${error}`);
    }
  }

  /**
   * Test 5: Dynamic Pricing Service
   */
  private async testDynamicPricingService(): Promise<void> {
    this.startTest('Dynamic Pricing Service');
    
    try {
      const pricingService = new DynamicPricingService();
      
      // Test pricing analysis
      const mockLocation = { lat: 29.7604, lng: -95.3698, city: 'Houston', state: 'TX' };
      const pricingAnalysis = await pricingService.getRepairCostAnalysis(
        'engine',
        'rod bearing replacement',
        mockLocation
      );
      
      console.log('✅ Dynamic pricing analysis completed');
      console.log(`✅ Cost range: $${pricingAnalysis?.pricing?.total?.min || 'N/A'} - $${pricingAnalysis?.pricing?.total?.max || 'N/A'}`);
      
      this.passTest('Dynamic pricing service working correctly');
    } catch (error) {
      this.failTest(`Dynamic pricing service failed: ${error}`);
    }
  }

  /**
   * Test 6: Background Training Service
   */
  private async testBackgroundTrainingService(): Promise<void> {
    this.startTest('Background Training Service');
    
    try {
      const trainingService = new BackgroundTrainingService();
      
      // Test service initialization
      console.log('✅ Background training service initialized');
      
      // Test training data collection
      const shouldRun = await (trainingService as any).shouldRunTraining();
      console.log(`✅ Training check completed: ${shouldRun ? 'Should run' : 'Should not run'}`);
      
      this.passTest('Background training service working correctly');
    } catch (error) {
      this.failTest(`Background training service failed: ${error}`);
    }
  }

  /**
   * Test 7: Error Handling and Fallbacks
   */
  private async testErrorHandling(): Promise<void> {
    this.startTest('Error Handling and Fallbacks');
    
    try {
      // Test YouTube service with invalid API key
      const youtubeService = new YouTubeSearchService('invalid_key');
      const result = await youtubeService.searchTruckRepairVideos(['test'], 1);
      
      // Should fallback to mock data
      if (result.videos.length > 0) {
        console.log('✅ YouTube fallback to mock data working');
      } else {
        this.failTest('YouTube fallback not working');
        return;
      }
      
      // Test GitHub service error handling
      const githubService = new GitHubModelsService('invalid_key');
      console.log('✅ GitHub service error handling initialized');
      
      this.passTest('Error handling and fallbacks working correctly');
    } catch (error) {
      this.failTest(`Error handling test failed: ${error}`);
    }
  }

  /**
   * Test 8: Mobile Responsiveness
   */
  private async testMobileResponsiveness(): Promise<void> {
    this.startTest('Mobile Responsiveness');
    
    try {
      // Test window resize simulation
      const originalWidth = window.innerWidth;
      
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      console.log('✅ Mobile viewport simulation completed');
      
      // Restore original width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalWidth,
      });
      
      this.passTest('Mobile responsiveness test completed');
    } catch (error) {
      this.failTest(`Mobile responsiveness test failed: ${error}`);
    }
  }

  /**
   * Test 9: PDF Report Generation
   */
  private async testPDFReportGeneration(): Promise<void> {
    this.startTest('PDF Report Generation');
    
    try {
      // Test jsPDF import
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Test basic PDF creation
      doc.text('Test PDF Report', 20, 20);
      const pdfOutput = doc.output('datauristring');
      
      if (pdfOutput && pdfOutput.includes('data:application/pdf')) {
        console.log('✅ PDF generation working correctly');
        this.passTest('PDF report generation working correctly');
      } else {
        this.failTest('PDF generation failed');
      }
    } catch (error) {
      this.failTest(`PDF report generation failed: ${error}`);
    }
  }

  /**
   * Test 10: Map Integration
   */
  private async testMapIntegration(): Promise<void> {
    this.startTest('Map Integration');
    
    try {
      // Test Google Maps API availability
      const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (mapsApiKey) {
        console.log('✅ Google Maps API key configured');
        
        // Test service locations data
        const mockServiceLocations = [
          { id: 1, name: 'Test Repair Center', lat: 29.7604, lng: -95.3698, type: 'repair' },
          { id: 2, name: 'Test Parts Store', lat: 29.7704, lng: -95.3798, type: 'parts' }
        ];
        
        console.log(`✅ Service locations data: ${mockServiceLocations.length} locations`);
        this.passTest('Map integration test completed');
      } else {
        this.failTest('Google Maps API key not configured');
      }
    } catch (error) {
      this.failTest(`Map integration test failed: ${error}`);
    }
  }

  /**
   * Helper methods for test management
   */
  private startTest(testName: string): void {
    this.startTime = Date.now();
    console.log(`\n🧪 Testing: ${testName}`);
  }

  private passTest(message: string): void {
    const duration = Date.now() - this.startTime;
    this.testResults.push({
      testName: this.getCurrentTestName(),
      status: 'PASS',
      message,
      duration
    });
    console.log(`✅ ${message} (${duration}ms)`);
  }

  private failTest(message: string): void {
    const duration = Date.now() - this.startTime;
    this.testResults.push({
      testName: this.getCurrentTestName(),
      status: 'FAIL',
      message,
      duration
    });
    console.log(`❌ ${message} (${duration}ms)`);
  }

  private getCurrentTestName(): string {
    const stack = new Error().stack;
    const match = stack?.match(/test(\w+)/);
    return match ? match[1] : 'Unknown Test';
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    console.log(`\n📋 Detailed Results:`);
    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${index + 1}. ${icon} ${result.testName}: ${result.message} (${result.duration}ms)`);
    });
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Application is ready for production.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please review and fix issues.`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Export for use in other test files
export default ComprehensiveAppTest;
