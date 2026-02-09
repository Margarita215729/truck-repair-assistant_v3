/**
 * Advanced Audio Analysis Service for Truck Diagnostic System
 * Implements real-time audio processing and ML-based component failure detection
 * Ported from v2 AudioAnalysisService.ts — TypeScript types removed
 */

/**
 * @typedef {Object} AudioFeatures
 * @property {number[]} mfcc - Mel-frequency cepstral coefficients
 * @property {number} spectralCentroid - Brightness of sound
 * @property {number} spectralRolloff - High-frequency content
 * @property {number} spectralFlux - Rate of change in spectrum
 * @property {number} zeroCrossingRate - How often signal crosses zero
 * @property {number} energy - Overall energy level
 * @property {number} rms - Root mean square
 * @property {number[]} chroma - Pitch class profiles
 * @property {number[]} tonnetz - Tonal centroid features
 * @property {number[]} dominantFrequencies
 * @property {number} harmonicRatio
 * @property {number} noisiness
 */

/**
 * @typedef {Object} ComponentAnalysis
 * @property {TruckComponent} component
 * @property {string} failure_type
 * @property {number} confidence
 * @property {number} anomaly_score
 * @property {{low_freq: number, mid_freq: number, high_freq: number}} frequency_patterns
 * @property {'normal'|'minor'|'moderate'|'severe'|'critical'} severity
 */

/**
 * @typedef {'engine'|'transmission'|'brakes'|'suspension'|'air_system'|'cooling'|'electrical'|'drivetrain'} TruckComponent
 */

/**
 * Helper to extract error message from unknown error types
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

export class AudioAnalysisService {
  constructor() {
    /** @type {AudioContext} */
    this.audioContext = null;
    this.sampleRate = 44100;
    this.frameSize = 2048;
    this.hopLength = 512;

    // Component-specific frequency signatures
    this.componentSignatures = {
      engine: {
        idle_rpm_range: [600, 900],
        frequency_bands: {
          combustion: [20, 200],    // Combustion events
          valvetrain: [200, 800],   // Valve noise
          injection: [800, 2000],   // Fuel injection
          turbo: [2000, 8000]       // Turbocharger whine
        }
      },
      transmission: {
        frequency_bands: {
          gear_mesh: [500, 1500],   // Gear meshing
          bearing: [1500, 4000],    // Bearing noise
          hydraulic: [100, 500]     // Hydraulic pump
        }
      },
      brakes: {
        frequency_bands: {
          pad_contact: [1000, 3000], // Brake pad contact
          air_system: [100, 800],    // Air brake system
          rotor_warp: [50, 200]      // Warped rotors
        }
      },
      air_system: {
        frequency_bands: {
          compressor: [200, 1000],   // Air compressor
          leaks: [2000, 8000],       // Air leaks (high freq hiss)
          valve_operation: [100, 500] // Valve operations
        }
      }
    };

    this.initializeAudioContext();
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error('Audio processing not supported in this browser');
    }
  }

  /**
   * Main entry point for analyzing audio blob from truck recording
   * @param {Blob} audioBlob
   * @returns {Promise<ComponentAnalysis>}
   */
  async analyzeAudioBlob(audioBlob) {
    try {
      // Convert blob to audio buffer
      const audioBuffer = await this.blobToAudioBuffer(audioBlob);

      // Extract comprehensive audio features
      const features = await this.extractFeatures(audioBuffer);

      // Classify component and detect anomalies
      const componentAnalysis = await this.classifyAndAnalyze(features);

      return componentAnalysis;

    } catch (error) {
      console.error('Audio analysis failed:', error);
      throw new Error('Failed to analyze audio: ' + getErrorMessage(error));
    }
  }

  /**
   * Convert audio blob to AudioBuffer for processing
   * @param {Blob} blob
   * @returns {Promise<AudioBuffer>}
   */
  async blobToAudioBuffer(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Extract comprehensive audio features from buffer
   * @param {AudioBuffer} audioBuffer
   * @returns {Promise<AudioFeatures>}
   */
  async extractFeatures(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0); // Use first channel

    // Apply preprocessing
    const processedData = this.preprocessAudio(channelData);

    // Extract features
    const features = {
      // Spectral features
      mfcc: this.calculateMFCC(processedData),
      spectralCentroid: this.calculateSpectralCentroid(processedData),
      spectralRolloff: this.calculateSpectralRolloff(processedData),
      spectralFlux: this.calculateSpectralFlux(processedData),

      // Temporal features
      zeroCrossingRate: this.calculateZeroCrossingRate(processedData),
      energy: this.calculateEnergy(processedData),
      rms: this.calculateRMS(processedData),

      // Advanced features
      chroma: this.calculateChroma(processedData),
      tonnetz: this.calculateTonnetz(processedData),

      // Frequency analysis
      dominantFrequencies: this.findDominantFrequencies(processedData),
      harmonicRatio: this.calculateHarmonicRatio(processedData),
      noisiness: this.calculateNoisiness(processedData)
    };

    return features;
  }

  /**
   * Preprocess audio data (noise reduction, normalization)
   * @param {Float32Array} data
   * @returns {Float32Array}
   */
  preprocessAudio(data) {
    // Apply high-pass filter to remove low-frequency noise
    const filtered = this.highPassFilter(data, 50); // Remove below 50Hz

    // Normalize amplitude
    const maxAmplitude = Math.max(...Array.from(filtered).map(Math.abs));
    if (maxAmplitude > 0) {
      for (let i = 0; i < filtered.length; i++) {
        filtered[i] = filtered[i] / maxAmplitude;
      }
    }

    return filtered;
  }

  /**
   * Simple high-pass filter implementation
   * @param {Float32Array} data
   * @param {number} cutoffFreq
   * @returns {Float32Array}
   */
  highPassFilter(data, cutoffFreq) {
    const rc = 1.0 / (cutoffFreq * 2 * Math.PI);
    const dt = 1.0 / this.sampleRate;
    const alpha = rc / (rc + dt);

    const filtered = new Float32Array(data.length);
    filtered[0] = data[0];

    for (let i = 1; i < data.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] + data[i] - data[i - 1]);
    }

    return filtered;
  }

  /**
   * Calculate Mel-frequency cepstral coefficients (MFCC)
   * @param {Float32Array} data
   * @returns {number[]}
   */
  calculateMFCC(data) {
    // Simplified MFCC calculation
    // In production, use a proper MFCC library like ml-matrix
    const fftResult = this.performFFT(data);
    const melFilters = this.createMelFilterBank(13); // 13 MFCC coefficients

    const mfcc = [];
    for (let i = 0; i < 13; i++) {
      let sum = 0;
      for (let j = 0; j < fftResult.length / 2; j++) {
        const magnitude = Math.sqrt(fftResult[j * 2] ** 2 + fftResult[j * 2 + 1] ** 2);
        sum += magnitude * melFilters[i][j];
      }
      mfcc.push(Math.log(sum + 1e-10)); // Add small epsilon to avoid log(0)
    }

    return mfcc;
  }

  /**
   * Calculate spectral centroid (brightness measure)
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateSpectralCentroid(data) {
    const fftResult = this.performFFT(data);
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < fftResult.length / 2; i++) {
      const magnitude = Math.sqrt(fftResult[i * 2] ** 2 + fftResult[i * 2 + 1] ** 2);
      const frequency = (i * this.sampleRate) / fftResult.length;

      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }

    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Calculate spectral rolloff (high-frequency content measure)
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateSpectralRolloff(data) {
    const fftResult = this.performFFT(data);
    const magnitudes = [];
    let totalEnergy = 0;

    for (let i = 0; i < fftResult.length / 2; i++) {
      const magnitude = Math.sqrt(fftResult[i * 2] ** 2 + fftResult[i * 2 + 1] ** 2);
      magnitudes.push(magnitude);
      totalEnergy += magnitude;
    }

    const threshold = 0.85 * totalEnergy; // 85% of energy
    let cumulativeEnergy = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i];
      if (cumulativeEnergy >= threshold) {
        return (i * this.sampleRate) / fftResult.length;
      }
    }

    return this.sampleRate / 2; // Nyquist frequency
  }

  /**
   * Calculate zero crossing rate
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateZeroCrossingRate(data) {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (data.length - 1);
  }

  /**
   * Calculate RMS energy
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateRMS(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }

  /**
   * Find dominant frequencies in the signal
   * @param {Float32Array} data
   * @param {number} [numPeaks=5]
   * @returns {number[]}
   */
  findDominantFrequencies(data, numPeaks = 5) {
    const fftResult = this.performFFT(data);
    const magnitudes = [];

    for (let i = 1; i < fftResult.length / 2 - 1; i++) {
      const magnitude = Math.sqrt(fftResult[i * 2] ** 2 + fftResult[i * 2 + 1] ** 2);
      const frequency = (i * this.sampleRate) / fftResult.length;
      magnitudes.push({ freq: frequency, mag: magnitude });
    }

    // Sort by magnitude and return top frequencies
    magnitudes.sort((a, b) => b.mag - a.mag);
    return magnitudes.slice(0, numPeaks).map(peak => peak.freq);
  }

  /**
   * Classify component and analyze for anomalies
   * @param {AudioFeatures} features
   * @returns {Promise<ComponentAnalysis>}
   */
  async classifyAndAnalyze(features) {
    // Analyze frequency patterns to identify component
    const component = this.identifyComponent(features);

    // Detect anomalies for the identified component
    const anomalyAnalysis = this.detectAnomalies(features, component);

    // Calculate frequency band analysis
    const frequencyPatterns = this.analyzeFrequencyPatterns(features);

    return {
      component,
      failure_type: anomalyAnalysis.failure_type,
      confidence: anomalyAnalysis.confidence,
      anomaly_score: anomalyAnalysis.score,
      frequency_patterns: frequencyPatterns,
      severity: this.assessSeverity(anomalyAnalysis.score)
    };
  }

  /**
   * Identify which truck component is making the sound
   * @param {AudioFeatures} features
   * @returns {TruckComponent}
   */
  identifyComponent(features) {
    const dominantFreq = features.dominantFrequencies[0];
    const spectralCentroid = features.spectralCentroid;
    const noisiness = features.noisiness;

    // Rule-based classification (in production, use ML model)
    if (dominantFreq < 200 && features.harmonicRatio > 0.7) {
      return 'engine'; // Low frequency, harmonic content
    } else if (dominantFreq > 2000 && noisiness > 0.8) {
      return 'brakes'; // High frequency noise (brake squeal)
    } else if (spectralCentroid > 1000 && features.harmonicRatio < 0.5) {
      return 'air_system'; // High frequency, noisy (air leaks)
    } else if (dominantFreq > 500 && dominantFreq < 1500) {
      return 'transmission'; // Mid-range mechanical sounds
    } else {
      return 'engine'; // Default to engine
    }
  }

  /**
   * Detect anomalies for specific component
   * @param {AudioFeatures} features
   * @param {TruckComponent} component
   * @returns {{failure_type: string, confidence: number, score: number}}
   */
  detectAnomalies(features, component) {
    // Component-specific anomaly detection
    switch (component) {
      case 'engine':
        return this.detectEngineAnomalies(features);
      case 'brakes':
        return this.detectBrakeAnomalies(features);
      case 'transmission':
        return this.detectTransmissionAnomalies(features);
      case 'air_system':
        return this.detectAirSystemAnomalies(features);
      default:
        return { failure_type: 'unknown', confidence: 0.5, score: 0.5 };
    }
  }

  /**
   * Engine-specific anomaly detection
   * @param {AudioFeatures} features
   * @returns {{failure_type: string, confidence: number, score: number}}
   */
  detectEngineAnomalies(features) {
    const dominantFreq = features.dominantFrequencies[0];
    const harmonicRatio = features.harmonicRatio;
    const spectralFlux = features.spectralFlux;

    // Rod bearing knock: Low frequency (50-150Hz), high energy
    if (dominantFreq < 150 && features.energy > 0.7 && harmonicRatio < 0.6) {
      return {
        failure_type: 'rod_bearing_failure',
        confidence: 0.85,
        score: 0.9
      };
    }

    // Valve chatter: Mid frequency (200-800Hz), irregular pattern
    if (dominantFreq > 200 && dominantFreq < 800 && spectralFlux > 0.3) {
      return {
        failure_type: 'valve_adjustment_needed',
        confidence: 0.75,
        score: 0.6
      };
    }

    // Turbo whine: High frequency (2000+Hz), increasing with RPM
    if (dominantFreq > 2000 && harmonicRatio > 0.8) {
      return {
        failure_type: 'turbocharger_bearing_wear',
        confidence: 0.8,
        score: 0.7
      };
    }

    return { failure_type: 'normal_operation', confidence: 0.6, score: 0.2 };
  }

  /**
   * Brake-specific anomaly detection
   * @param {AudioFeatures} features
   * @returns {{failure_type: string, confidence: number, score: number}}
   */
  detectBrakeAnomalies(features) {
    const dominantFreq = features.dominantFrequencies[0];
    const noisiness = features.noisiness;
    const spectralRolloff = features.spectralRolloff;

    // Brake squeal: High frequency (1000-3000Hz), high noisiness
    if (dominantFreq > 1000 && dominantFreq < 3000 && noisiness > 0.8) {
      return {
        failure_type: 'brake_pad_wear',
        confidence: 0.9,
        score: 0.8
      };
    }

    // Grinding: Very high frequency, extreme noisiness
    if (spectralRolloff > 4000 && noisiness > 0.9) {
      return {
        failure_type: 'brake_pad_metal_contact',
        confidence: 0.95,
        score: 0.95
      };
    }

    return { failure_type: 'normal_braking', confidence: 0.7, score: 0.1 };
  }

  /**
   * Transmission-specific anomaly detection
   * @param {AudioFeatures} features
   * @returns {{failure_type: string, confidence: number, score: number}}
   */
  detectTransmissionAnomalies(features) {
    const dominantFreq = features.dominantFrequencies[0];
    const spectralCentroid = features.spectralCentroid;
    const harmonicRatio = features.harmonicRatio;
    const noisiness = features.noisiness;

    // Gear whine: High frequency (800-2000Hz), harmonic content
    if (dominantFreq > 800 && dominantFreq < 2000 && harmonicRatio > 0.6) {
      const confidence = Math.min(0.95, 0.7 + (dominantFreq - 800) / 1200 * 0.25);
      return {
        failure_type: 'gear_whine',
        confidence,
        score: 0.7
      };
    }

    // Grinding gears: Mid-high frequency (500-1500Hz), high noisiness
    if (dominantFreq > 500 && dominantFreq < 1500 && noisiness > 0.7) {
      return {
        failure_type: 'grinding_gears',
        confidence: 0.8,
        score: 0.85
      };
    }

    // Hydraulic pump noise: Low-mid frequency (200-600Hz), irregular pattern
    if (dominantFreq > 200 && dominantFreq < 600 && features.spectralFlux > 0.4) {
      return {
        failure_type: 'hydraulic_pump_wear',
        confidence: 0.75,
        score: 0.6
      };
    }

    // Clutch slipping: Broad spectrum noise, high flux
    if (spectralCentroid > 1200 && features.spectralFlux > 0.5 && noisiness > 0.6) {
      return {
        failure_type: 'clutch_slipping',
        confidence: 0.7,
        score: 0.8
      };
    }

    return { failure_type: 'normal_operation', confidence: 0.6, score: 0.1 };
  }

  /**
   * Air system-specific anomaly detection
   * @param {AudioFeatures} features
   * @returns {{failure_type: string, confidence: number, score: number}}
   */
  detectAirSystemAnomalies(features) {
    const dominantFreq = features.dominantFrequencies[0];
    const spectralRolloff = features.spectralRolloff;
    const noisiness = features.noisiness;
    const energy = features.energy;

    // Air leaks: High frequency hiss (2000+Hz), high noisiness
    if (dominantFreq > 2000 && noisiness > 0.8 && spectralRolloff > 4000) {
      const confidence = Math.min(0.95, 0.75 + (noisiness - 0.8) / 0.2 * 0.2);
      return {
        failure_type: 'air_leak',
        confidence,
        score: 0.9
      };
    }

    // Compressor issues: Low frequency (100-400Hz), high energy, rhythmic
    if (dominantFreq > 100 && dominantFreq < 400 && energy > 0.6) {
      const rhythmicity = this.detectRhythmicPattern(features);
      if (rhythmicity > 0.7) {
        return {
          failure_type: 'compressor_malfunction',
          confidence: 0.8,
          score: 0.75
        };
      }
    }

    // Valve problems: Mid frequency (400-1000Hz), irregular pattern
    if (dominantFreq > 400 && dominantFreq < 1000 && features.spectralFlux > 0.3) {
      return {
        failure_type: 'valve_malfunction',
        confidence: 0.7,
        score: 0.65
      };
    }

    // Pressure regulator issues: Whistling sound (1000-3000Hz)
    if (dominantFreq > 1000 && dominantFreq < 3000 && features.harmonicRatio > 0.8) {
      return {
        failure_type: 'pressure_regulator_issue',
        confidence: 0.75,
        score: 0.7
      };
    }

    return { failure_type: 'normal_operation', confidence: 0.6, score: 0.1 };
  }

  /**
   * Calculate spectral flux (rate of change in spectrum)
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateSpectralFlux(data) {
    const fftResult = this.performFFT(data);
    const frameSize = this.frameSize;
    let totalFlux = 0;
    let frameCount = 0;

    // Calculate flux between consecutive frames
    for (let i = frameSize; i < fftResult.length - frameSize; i += frameSize) {
      let flux = 0;
      for (let j = 0; j < frameSize / 2; j++) {
        const currentMag = Math.sqrt(fftResult[i + j * 2] ** 2 + fftResult[i + j * 2 + 1] ** 2);
        const prevMag = Math.sqrt(fftResult[i - frameSize + j * 2] ** 2 + fftResult[i - frameSize + j * 2 + 1] ** 2);
        flux += Math.max(0, currentMag - prevMag);
      }
      totalFlux += flux;
      frameCount++;
    }

    return frameCount > 0 ? totalFlux / frameCount : 0;
  }

  /**
   * Calculate energy of the signal
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateEnergy(data) {
    let energy = 0;
    for (let i = 0; i < data.length; i++) {
      energy += data[i] * data[i];
    }
    return energy / data.length;
  }

  /**
   * Calculate chroma features (pitch class profiles)
   * @param {Float32Array} data
   * @returns {number[]}
   */
  calculateChroma(data) {
    const fftResult = this.performFFT(data);
    const chroma = new Array(12).fill(0);
    const freqPerBin = this.sampleRate / fftResult.length;

    for (let i = 0; i < fftResult.length / 2; i++) {
      const magnitude = Math.sqrt(fftResult[i * 2] ** 2 + fftResult[i * 2 + 1] ** 2);
      const frequency = i * freqPerBin;

      if (frequency > 80 && frequency < 2000) { // Focus on musical range
        const pitch = this.frequencyToPitch(frequency);
        const chromaIndex = pitch % 12;
        chroma[chromaIndex] += magnitude;
      }
    }

    // Normalize
    const sum = chroma.reduce((a, b) => a + b, 0);
    return sum > 0 ? chroma.map(c => c / sum) : chroma;
  }

  /**
   * Calculate tonnetz features (tonal centroid features)
   * @param {Float32Array} data
   * @returns {number[]}
   */
  calculateTonnetz(data) {
    const chroma = this.calculateChroma(data);
    const tonnetz = new Array(6).fill(0);

    // Tonnetz coordinates based on chroma
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      tonnetz[0] += chroma[i] * Math.cos(angle * 7); // Circle of fifths
      tonnetz[1] += chroma[i] * Math.sin(angle * 7);
      tonnetz[2] += chroma[i] * Math.cos(angle * 3); // Minor thirds
      tonnetz[3] += chroma[i] * Math.sin(angle * 3);
      tonnetz[4] += chroma[i] * Math.cos(angle * 2); // Major thirds
      tonnetz[5] += chroma[i] * Math.sin(angle * 2);
    }

    return tonnetz;
  }

  /**
   * Calculate harmonic-to-noise ratio
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateHarmonicRatio(data) {
    const fftResult = this.performFFT(data);
    let harmonicEnergy = 0;
    let totalEnergy = 0;

    // Find fundamental frequency
    const fundamental = this.findFundamentalFrequency(fftResult);
    if (fundamental === 0) return 0;

    const freqPerBin = this.sampleRate / fftResult.length;

    for (let i = 0; i < fftResult.length / 2; i++) {
      const magnitude = Math.sqrt(fftResult[i * 2] ** 2 + fftResult[i * 2 + 1] ** 2);
      const frequency = i * freqPerBin;
      totalEnergy += magnitude;

      // Check if frequency is close to a harmonic
      for (let h = 1; h <= 10; h++) {
        const harmonicFreq = fundamental * h;
        if (Math.abs(frequency - harmonicFreq) < freqPerBin * 2) {
          harmonicEnergy += magnitude;
          break;
        }
      }
    }

    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  /**
   * Calculate noisiness measure
   * @param {Float32Array} data
   * @returns {number}
   */
  calculateNoisiness(data) {
    const harmonicRatio = this.calculateHarmonicRatio(data);
    const spectralFlux = this.calculateSpectralFlux(data);
    const zcr = this.calculateZeroCrossingRate(data);

    // Combine measures: high ZCR, low harmonic ratio, high flux = more noise
    return (zcr * 0.4 + (1 - harmonicRatio) * 0.4 + Math.min(spectralFlux, 1) * 0.2);
  }

  /**
   * Perform Fast Fourier Transform
   * @param {Float32Array} data
   * @returns {Float32Array}
   */
  performFFT(data) {
    const N = data.length;
    const output = new Float32Array(N * 2); // Complex output (real, imag pairs)

    // Simple DFT implementation (for production, use a proper FFT library)
    for (let k = 0; k < N; k++) {
      let realSum = 0;
      let imagSum = 0;

      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        realSum += data[n] * Math.cos(angle);
        imagSum += data[n] * Math.sin(angle);
      }

      output[k * 2] = realSum;
      output[k * 2 + 1] = imagSum;
    }

    return output;
  }

  /**
   * Create Mel filter bank for MFCC calculation
   * @param {number} numFilters
   * @returns {number[][]}
   */
  createMelFilterBank(numFilters) {
    const fftSize = this.frameSize;
    const sampleRate = this.sampleRate;
    const melFilters = [];

    // Mel scale conversion functions
    const hzToMel = (hz) => 2595 * Math.log10(1 + hz / 700);
    const melToHz = (mel) => 700 * (Math.pow(10, mel / 2595) - 1);

    // Create mel-spaced filter bank
    const minMel = hzToMel(0);
    const maxMel = hzToMel(sampleRate / 2);
    const melPoints = [];

    for (let i = 0; i <= numFilters + 1; i++) {
      melPoints.push(melToHz(minMel + (maxMel - minMel) * i / (numFilters + 1)));
    }

    // Convert to bin indices
    const binPoints = melPoints.map(freq => Math.floor(freq * fftSize / sampleRate));

    // Create triangular filters
    for (let i = 0; i < numFilters; i++) {
      const filter = new Array(fftSize / 2).fill(0);
      const leftBin = binPoints[i];
      const centerBin = binPoints[i + 1];
      const rightBin = binPoints[i + 2];

      // Left slope
      for (let j = leftBin; j < centerBin; j++) {
        if (j >= 0 && j < filter.length) {
          filter[j] = (j - leftBin) / (centerBin - leftBin);
        }
      }

      // Right slope
      for (let j = centerBin; j < rightBin; j++) {
        if (j >= 0 && j < filter.length) {
          filter[j] = (rightBin - j) / (rightBin - centerBin);
        }
      }

      melFilters.push(filter);
    }

    return melFilters;
  }

  /**
   * Helper function to find fundamental frequency
   * @param {Float32Array} fftResult
   * @returns {number}
   */
  findFundamentalFrequency(fftResult) {
    let maxMagnitude = 0;
    let fundamentalBin = 0;
    const freqPerBin = this.sampleRate / fftResult.length;

    // Look for peak in low-frequency range (50-500 Hz for truck engines)
    const minBin = Math.floor(50 / freqPerBin);
    const maxBin = Math.floor(500 / freqPerBin);

    for (let i = minBin; i < Math.min(maxBin, fftResult.length / 2); i++) {
      const magnitude = Math.sqrt(fftResult[i * 2] ** 2 + fftResult[i * 2 + 1] ** 2);
      if (magnitude > maxMagnitude) {
        maxMagnitude = magnitude;
        fundamentalBin = i;
      }
    }

    return fundamentalBin * freqPerBin;
  }

  /**
   * Helper function to convert frequency to pitch
   * @param {number} frequency
   * @returns {number}
   */
  frequencyToPitch(frequency) {
    return Math.round(12 * Math.log2(frequency / 440) + 69);
  }

  /**
   * Analyze frequency patterns across different bands
   * @param {AudioFeatures} features
   * @returns {{low_freq: number, mid_freq: number, high_freq: number}}
   */
  analyzeFrequencyPatterns(features) {
    const dominantFreqs = features.dominantFrequencies;
    let lowFreqEnergy = 0;
    let midFreqEnergy = 0;
    let highFreqEnergy = 0;

    dominantFreqs.forEach(freq => {
      if (freq < 500) {
        lowFreqEnergy += 1;
      } else if (freq < 2000) {
        midFreqEnergy += 1;
      } else {
        highFreqEnergy += 1;
      }
    });

    const total = lowFreqEnergy + midFreqEnergy + highFreqEnergy;

    if (total === 0) {
      return { low_freq: 0.33, mid_freq: 0.33, high_freq: 0.34 };
    }

    return {
      low_freq: lowFreqEnergy / total,
      mid_freq: midFreqEnergy / total,
      high_freq: highFreqEnergy / total
    };
  }

  /**
   * Assess severity based on anomaly score and component type
   * @param {number} score
   * @param {string} [component]
   * @returns {'normal'|'minor'|'moderate'|'severe'|'critical'}
   */
  assessSeverity(score, component) {
    // Adjust thresholds based on component criticality
    let criticalThreshold = 0.8;
    let severeThreshold = 0.6;
    let moderateThreshold = 0.4;
    let minorThreshold = 0.2;

    // Brakes and engine are more critical
    if (component === 'brakes' || component === 'engine') {
      criticalThreshold = 0.7;
      severeThreshold = 0.5;
      moderateThreshold = 0.3;
      minorThreshold = 0.15;
    }

    if (score < minorThreshold) return 'normal';
    if (score < moderateThreshold) return 'minor';
    if (score < severeThreshold) return 'moderate';
    if (score < criticalThreshold) return 'severe';
    return 'critical';
  }

  /**
   * Detect rhythmic patterns in audio (for compressor detection)
   * @param {AudioFeatures} features
   * @returns {number}
   */
  detectRhythmicPattern(features) {
    // Simple rhythmicity detection based on spectral flux regularity
    const flux = features.spectralFlux;
    const energy = features.energy;

    // If there's consistent energy and moderate flux, likely rhythmic
    if (energy > 0.5 && flux > 0.2 && flux < 0.6) {
      return 0.8;
    }

    return 0.3;
  }
}
