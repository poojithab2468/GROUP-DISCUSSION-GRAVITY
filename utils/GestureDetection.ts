/**
 * GestureDetection Utility
 * Fluent Edge Computer Vision Subsystem
 *
 * Provides high-precision hand landmark tracking via MediaPipe Hands
 * and an anatomically constrained spatial cluster fallback detector.
 *
 * Rules:
 * 1. If hands are not in camera frame, strictly report 'Not Visible' (NEVER 'Excessive').
 * 2. If hand detection confidence is low, report 'Unable to Detect'.
 * 3. Movement velocity is computed ONLY across consecutive frames where hands are reliably tracked.
 * 4. Resets tracking history immediately when hands leave the frame.
 */

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export type GestureStatus = 'Good' | 'Low' | 'Excessive' | 'Not Visible' | 'Unable to Detect';

// Backward compatibility alias
export type GestureUsage = 'Low' | 'Balanced' | 'Excessive' | 'Not Visible';

export interface GestureMetrics {
  gestureStatus: GestureStatus;
  isVisible: boolean;
  confidence: number;
  isClosed: boolean;
  movementIntensity: number;
  gestureScore: number;
}

/**
 * Calculates Euclidean distance between two 3D points
 */
export const getDistance3D = (p1: HandLandmark, p2: HandLandmark): number => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow((p1.z || 0) - (p2.z || 0), 2)
  );
};

/**
 * Stateful Hand Gesture Tracker
 * Handles temporal smoothing, state resets, and avoids stale frame leaps
 */
export class HandGestureTracker {
  private lastLandmarks: HandLandmark[] | null = null;
  private movementHistory: number[] = [];
  private consecutiveMissingFrames: number = 0;
  private consecutiveValidFrames: number = 0;
  private readonly historyCapacity = 6;

  // Fallback cluster tracking
  private lastClusterCenter: { x: number; y: number } | null = null;

  public reset(): void {
    this.lastLandmarks = null;
    this.movementHistory = [];
    this.consecutiveMissingFrames = 0;
    this.consecutiveValidFrames = 0;
    this.lastClusterCenter = null;
  }

  /**
   * Process MediaPipe 21 Hand Landmarks
   * @param landmarks Array of 21 3D landmarks for a detected hand, or null if no hand
   * @param detectionConfidence Optional detector confidence (0 to 1)
   */
  public processLandmarks(
    landmarks: HandLandmark[] | null | undefined,
    detectionConfidence: number = 0.8
  ): GestureMetrics {
    // 1. Missing or empty landmarks: Hands NOT visible
    if (!landmarks || landmarks.length < 21) {
      this.consecutiveMissingFrames++;
      this.consecutiveValidFrames = 0;

      // Reset tracking anchors immediately to avoid leaping when hands reappear
      if (this.consecutiveMissingFrames >= 2) {
        this.lastLandmarks = null;
        this.movementHistory = [];
      }

      return {
        gestureStatus: 'Not Visible',
        isVisible: false,
        confidence: 0,
        isClosed: false,
        movementIntensity: 0,
        gestureScore: 0,
      };
    }

    // 2. Low confidence check
    if (detectionConfidence < 0.40) {
      return {
        gestureStatus: 'Unable to Detect',
        isVisible: false,
        confidence: detectionConfidence,
        isClosed: false,
        movementIntensity: 0,
        gestureScore: 0,
      };
    }

    this.consecutiveMissingFrames = 0;
    this.consecutiveValidFrames++;

    // Anatomical anchor landmarks:
    // 0 = Wrist, 5 = Index MCP, 9 = Middle MCP, 17 = Pinky MCP
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const palmSpan = Math.max(0.04, getDistance3D(wrist, middleMcp));

    // Fist / Closed hand check (fingertips vs wrist)
    const tipIndices = [8, 12, 16, 20];
    const avgTipDist =
      tipIndices.reduce((sum, idx) => sum + getDistance3D(landmarks[idx], wrist), 0) / tipIndices.length;
    const isClosed = avgTipDist < palmSpan * 0.9;

    // Movement velocity calculation
    let rawDisplacement = 0;
    if (this.lastLandmarks && this.consecutiveValidFrames > 1) {
      // Average normalized displacement of wrist and MCP anchors
      const dWrist = getDistance3D(wrist, this.lastLandmarks[0]);
      const dIndex = getDistance3D(landmarks[5], this.lastLandmarks[5]);
      const dMiddle = getDistance3D(middleMcp, this.lastLandmarks[9]);
      const dPinky = getDistance3D(landmarks[17], this.lastLandmarks[17]);

      const avgRawDist = (dWrist + dIndex + dMiddle + dPinky) / 4;
      // Normalize by palmSpan so distance from camera doesn't inflate movement
      rawDisplacement = avgRawDist / palmSpan;
    } else {
      // First frame hand entered: Start with 0 movement (no false entrance spike)
      rawDisplacement = 0;
    }

    // Update position memory
    this.lastLandmarks = landmarks.map(p => ({ x: p.x, y: p.y, z: p.z }));

    // Temporal smoothing
    this.movementHistory.push(rawDisplacement);
    if (this.movementHistory.length > this.historyCapacity) {
      this.movementHistory.shift();
    }

    const smoothedIntensity =
      this.movementHistory.reduce((a, b) => a + b, 0) / (this.movementHistory.length || 1);

    // Classification with calibrated thresholds:
    // - < 0.035: Low / Resting hand (e.g. resting on desk or gesturing very subtly)
    // - 0.035 - 0.22: Good / Expressive hand gestures (natural conversational pacing)
    // - > 0.22: Excessive gestures (frantic waving or restless fidgeting)
    let status: GestureStatus = 'Good';
    let score = 85;

    if (smoothedIntensity < 0.035) {
      status = 'Low';
      score = 65;
    } else if (smoothedIntensity > 0.22) {
      status = 'Excessive';
      score = 45;
    } else {
      status = 'Good';
      score = 85;
    }

    return {
      gestureStatus: status,
      isVisible: true,
      confidence: Math.round(detectionConfidence * 100) / 100,
      isClosed,
      movementIntensity: Math.round(smoothedIntensity * 1000) / 1000,
      gestureScore: score,
    };
  }

  /**
   * Anatomically Constrained Spatial Fallback Hand Detector
   * Analyzes video canvas when neural landmarks are unavailable.
   * Strictly avoids false positives on torso, neck, clothing, or camera jitter.
   */
  public processCanvasFallback(
    currData: Uint8ClampedArray,
    prevData: Uint8ClampedArray | null,
    width: number,
    height: number,
    faceBox?: { x: number; y: number; width: number; height: number } | null
  ): GestureMetrics {
    if (!prevData || currData.length !== prevData.length) {
      this.reset();
      return {
        gestureStatus: 'Not Visible',
        isVisible: false,
        confidence: 0,
        isClosed: false,
        movementIntensity: 0,
        gestureScore: 0,
      };
    }

    // Define torso exclusion column:
    // If face is detected, the body column spans from below the face to the bottom.
    // Body movement (breathing, shifting, collar) occurs in this central column.
    let torsoLeft = Math.floor(width * 0.25);
    let torsoRight = Math.floor(width * 0.75);
    let faceBottomY = Math.floor(height * 0.40);

    if (faceBox) {
      const padding = faceBox.width * 0.45;
      torsoLeft = Math.max(0, Math.floor(faceBox.x - padding));
      torsoRight = Math.min(width, Math.ceil(faceBox.x + faceBox.width + padding));
      faceBottomY = Math.min(height, Math.ceil(faceBox.y + faceBox.height * 1.2));
    }

    // Grid-based spatial clustering
    // Hands in camera view form dense contiguous skin patches in lateral quadrants
    // or raised gestures outside the torso column.
    const cellSize = 10;
    const gridCols = Math.floor(width / cellSize);
    const gridRows = Math.floor(height / cellSize);
    const skinGrid: number[] = new Array(gridCols * gridRows).fill(0);
    const motionGrid: number[] = new Array(gridCols * gridRows).fill(0);

    let totalSkinPixels = 0;
    let totalMovingSkin = 0;

    // Scan lower 65% of the frame
    const startRow = Math.floor(gridRows * 0.35);

    for (let r = startRow; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cellX = c * cellSize;
        const cellY = r * cellSize;

        // Strictly exclude central torso/neck zone to prevent torso false positives
        if (cellX >= torsoLeft && cellX <= torsoRight && cellY < Math.floor(height * 0.75)) {
          continue;
        }

        let cellSkinCount = 0;
        let cellMotionCount = 0;

        for (let dy = 0; dy < cellSize; dy++) {
          for (let dx = 0; dx < cellSize; dx++) {
            const px = cellX + dx;
            const py = cellY + dy;
            if (px >= width || py >= height) continue;

            const idx = (py * width + px) * 4;
            const red = currData[idx];
            const green = currData[idx + 1];
            const blue = currData[idx + 2];

            // Strict human skin chromaticity model
            const isSkin =
              red > 85 &&
              green > 50 &&
              blue > 35 &&
              red > green &&
              (red - blue) >= 15 &&
              Math.abs(red - green) >= 10 &&
              red > blue;

            if (isSkin) {
              cellSkinCount++;
              const dR = Math.abs(red - prevData[idx]);
              const dG = Math.abs(green - prevData[idx + 1]);
              const dB = Math.abs(blue - prevData[idx + 2]);
              if (dR + dG + dB > 32) {
                cellMotionCount++;
              }
            }
          }
        }

        const cellIdx = r * gridCols + c;
        skinGrid[cellIdx] = cellSkinCount;
        motionGrid[cellIdx] = cellMotionCount;
        totalSkinPixels += cellSkinCount;
        totalMovingSkin += cellMotionCount;
      }
    }

    // Cluster verification:
    // A hand must contain at least 2 adjacent cells with >= 35 skin pixels each
    // (representing a physical hand/wrist contour of at least 80-150 contiguous skin pixels).
    let maxClusterSize = 0;
    let clusterCentroidX = 0;
    let clusterCentroidY = 0;
    let clusterMotionPixels = 0;
    let clusterSkinPixels = 0;

    for (let r = startRow; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const idx = r * gridCols + c;
        if (skinGrid[idx] >= 35) {
          // Check 4-connected neighbors
          let neighbors = 1;
          let sumMotion = motionGrid[idx];
          let sumSkin = skinGrid[idx];
          let sumX = (c * cellSize + cellSize / 2) * skinGrid[idx];
          let sumY = (r * cellSize + cellSize / 2) * skinGrid[idx];

          const checkNeighbor = (nr: number, nc: number) => {
            if (nr >= startRow && nr < gridRows && nc >= 0 && nc < gridCols) {
              const nIdx = nr * gridCols + nc;
              if (skinGrid[nIdx] >= 30) {
                neighbors++;
                sumMotion += motionGrid[nIdx];
                sumSkin += skinGrid[nIdx];
                sumX += (nc * cellSize + cellSize / 2) * skinGrid[nIdx];
                sumY += (nr * cellSize + cellSize / 2) * skinGrid[nIdx];
              }
            }
          };

          checkNeighbor(r + 1, c);
          checkNeighbor(r, c + 1);
          checkNeighbor(r - 1, c);
          checkNeighbor(r, c - 1);

          if (neighbors >= 2 && sumSkin > maxClusterSize) {
            maxClusterSize = sumSkin;
            clusterSkinPixels = sumSkin;
            clusterMotionPixels = sumMotion;
            clusterCentroidX = sumX / (sumSkin || 1);
            clusterCentroidY = sumY / (sumSkin || 1);
          }
        }
      }
    }

    // If no connected hand cluster was found: Hands are NOT visible
    if (maxClusterSize < 80) {
      this.consecutiveMissingFrames++;
      this.consecutiveValidFrames = 0;
      this.lastClusterCenter = null;
      this.movementHistory = [];

      return {
        gestureStatus: 'Not Visible',
        isVisible: false,
        confidence: 0,
        isClosed: false,
        movementIntensity: 0,
        gestureScore: 0,
      };
    }

    // Hand cluster reliably confirmed
    this.consecutiveMissingFrames = 0;
    this.consecutiveValidFrames++;

    const currentCenter = { x: clusterCentroidX, y: clusterCentroidY };
    let centroidDisplacement = 0;

    if (this.lastClusterCenter && this.consecutiveValidFrames > 1) {
      const dx = currentCenter.x - this.lastClusterCenter.x;
      const dy = currentCenter.y - this.lastClusterCenter.y;
      centroidDisplacement = Math.sqrt(dx * dx + dy * dy);
    } else {
      centroidDisplacement = 0;
    }
    this.lastClusterCenter = currentCenter;

    const motionRatio = clusterMotionPixels / (clusterSkinPixels || 1);
    const combinedMovement = (centroidDisplacement / cellSize) * 0.6 + motionRatio * 0.4;

    this.movementHistory.push(combinedMovement);
    if (this.movementHistory.length > this.historyCapacity) {
      this.movementHistory.shift();
    }
    const avgMovement = this.movementHistory.reduce((a, b) => a + b, 0) / this.movementHistory.length;

    let status: GestureStatus = 'Good';
    let score = 85;

    // Fallback thresholds:
    // Low: Resting or very subtle movement
    // Good: Controlled communicative hand gestures
    // Excessive: Fast flailing
    if (avgMovement < 0.12) {
      status = 'Low';
      score = 65;
    } else if (avgMovement > 0.75) {
      status = 'Excessive';
      score = 45;
    } else {
      status = 'Good';
      score = 85;
    }

    return {
      gestureStatus: status,
      isVisible: true,
      confidence: 0.72,
      isClosed: false,
      movementIntensity: Math.round(avgMovement * 100) / 100,
      gestureScore: score,
    };
  }
}

// Module singleton tracker for backward-compatible functional API
const defaultTracker = new HandGestureTracker();

/**
 * Backward compatible analyzeGestures function
 */
export const analyzeGestures = (landmarks: HandLandmark[] | null | undefined): GestureMetrics => {
  return defaultTracker.processLandmarks(landmarks);
};
