import { DataCollectionService } from './DataCollectionService';

export class BackgroundTrainingService {
  private dataCollectionService: DataCollectionService;
  private trainingInterval: NodeJS.Timeout | null = null;
  private isTraining = false;
  private readonly TRAINING_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.dataCollectionService = new DataCollectionService();
  }

  /**
   * Start background training process
   */
  public startBackgroundTraining(): void {
    console.log('🔄 Starting background training service...');
    
    // Run initial training
    this.runTrainingCycle();
    
    // Schedule periodic training
    this.trainingInterval = setInterval(() => {
      this.runTrainingCycle();
    }, this.TRAINING_INTERVAL);
    
    console.log('✅ Background training service started');
  }

  /**
   * Stop background training process
   */
  public stopBackgroundTraining(): void {
    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
      this.trainingInterval = null;
    }
    console.log('⏹️ Background training service stopped');
  }

  /**
   * Run a single training cycle
   */
  private async runTrainingCycle(): Promise<void> {
    if (this.isTraining) {
      console.log('⏳ Training already in progress, skipping...');
      return;
    }

    this.isTraining = true;
    console.log('🚀 Starting training cycle...');

    try {
      // Check if training is needed
      const shouldTrain = await this.shouldRunTraining();
      if (!shouldTrain) {
        console.log('⏭️ Training not needed, skipping cycle');
        return;
      }

      // Collect and process data
      const forumPosts = await this.dataCollectionService.collectForumData();
      const manualEntries = await this.dataCollectionService.collectManualData();
      const realTimeData = await this.dataCollectionService.collectRealTimeData();
      
      // Generate training dataset
      const trainingData = this.dataCollectionService.generateTrainingDataset(forumPosts, manualEntries);
      trainingData.push(...realTimeData);
      
      // Upload to S3
      await this.dataCollectionService.uploadToS3(trainingData);
      
      // Train model
      await this.dataCollectionService.trainModelWithBedrock(trainingData);
      
      // Get and log statistics
      const stats = this.dataCollectionService.getTrainingStats(trainingData);
      console.log('📊 Training Statistics:', stats);
      
      // Save training metadata
      this.saveTrainingMetadata(trainingData.length, stats);
      
      console.log('✅ Training cycle completed successfully');
      
    } catch (error) {
      console.error('❌ Training cycle failed:', error);
      this.saveTrainingError(error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Check if training should be run
   */
  private async shouldRunTraining(): Promise<boolean> {
    try {
      // Check if we already have a recent trained model
      const existingModel = localStorage.getItem('truck_diagnostic_model');
      const modelTimestamp = localStorage.getItem('truck_diagnostic_model_timestamp');
      
      if (existingModel && modelTimestamp) {
        const timestamp = new Date(modelTimestamp).getTime();
        const now = Date.now();
        const ageInHours = (now - timestamp) / (1000 * 60 * 60);
        
        // Use existing model if it's less than 7 days old
        if (ageInHours < 168) {
          console.log('Using existing trained model, age:', Math.round(ageInHours), 'hours');
          return false; // Don't train, use existing model
        }
      }

      const lastTraining = localStorage.getItem('last_training_timestamp');
      if (!lastTraining) {
        return true; // First time training
      }

      const lastTrainingTime = new Date(lastTraining).getTime();
      const now = Date.now();
      const timeSinceLastTraining = now - lastTrainingTime;
      
      // Train if more than 24 hours have passed (increased from 12 hours)
      return timeSinceLastTraining > (24 * 60 * 60 * 1000);
      
    } catch (error) {
      console.error('Error checking training status:', error);
      return false; // Default to not training if check fails
    }
  }

  /**
   * Save training metadata
   */
  private saveTrainingMetadata(sampleCount: number, stats: any): void {
    const metadata = {
      timestamp: new Date().toISOString(),
      samples_used: sampleCount,
      stats: stats,
      status: 'completed'
    };
    
    localStorage.setItem('last_training_timestamp', metadata.timestamp);
    localStorage.setItem('training_metadata', JSON.stringify(metadata));
  }

  /**
   * Save training error
   */
  private saveTrainingError(error: any): void {
    const errorData = {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      status: 'failed'
    };
    
    localStorage.setItem('training_error', JSON.stringify(errorData));
  }

  /**
   * Get training status
   */
  public getTrainingStatus(): any {
    try {
      const metadata = localStorage.getItem('training_metadata');
      const error = localStorage.getItem('training_error');
      
      return {
        metadata: metadata ? JSON.parse(metadata) : null,
        error: error ? JSON.parse(error) : null,
        isTraining: this.isTraining
      };
    } catch (error) {
      return {
        metadata: null,
        error: null,
        isTraining: this.isTraining
      };
    }
  }

  /**
   * Force immediate training (for admin use)
   */
  public async forceTraining(): Promise<void> {
    console.log('🔧 Force training requested...');
    await this.runTrainingCycle();
  }
}


