/**
 * Safe feature detection for camera / microphone / video recording.
 * Must never throw — iOS WebView may lack MediaRecorder or mediaDevices.
 */

export function hasNavigator() {
  return typeof navigator !== 'undefined';
}

export function hasMediaDevices() {
  return hasNavigator() && !!navigator.mediaDevices;
}

export function hasGetUserMedia() {
  return hasMediaDevices() && typeof navigator.mediaDevices.getUserMedia === 'function';
}

export function hasMediaRecorder() {
  return typeof MediaRecorder !== 'undefined';
}

/**
 * Returns a supported MIME type string, or null to omit mimeType in MediaRecorder options.
 * Never throws.
 */
export function getSupportedMimeType() {
  try {
    if (!hasMediaRecorder()) return null;

    const types = [
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];

    for (const type of types) {
      try {
        if (MediaRecorder.isTypeSupported(type)) return type;
      } catch {
        // ignore per-type failures
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function canRecordVideo() {
  return hasGetUserMedia() && hasMediaRecorder();
}

export function canRecordAudio() {
  return hasGetUserMedia() && hasMediaRecorder();
}

/**
 * Stop all tracks on a MediaStream safely.
 */
export function stopMediaStream(stream) {
  try {
    stream?.getTracks?.().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}
