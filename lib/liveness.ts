import type { Point } from 'face-api.js'

export type LivenessState =
  | 'looking_for_face'
  | 'center_calibration'
  | 'move_head'
  | 'return_center'
  | 'verified'
  | 'failed'

export interface HeadLivenessOptions {
  calibrationMs?: number
  maxVerificationMs?: number
  turnThresholdRatio?: number
  returnThresholdRatio?: number
}

export interface HeadLivenessContext {
  state: LivenessState
  calibrationMs: number
  maxVerificationMs: number
  turnThresholdRatio: number
  returnThresholdRatio: number
  startedAt: number
  calibrationStartedAt: number
  centerOffsetBaseline: number | null
  calibrationSampleCount: number
  progressStep: number
  totalSteps: number
  currentOffsetRatio: number | null
  effectiveTurnThreshold: number
  effectiveReturnThreshold: number
  consecutiveCenterFrames: number
  missingLandmarkFrames: number
}

export interface FaceLandmarksLike {
  getNose?: () => Point[]
  positions?: Point[]
}

export interface FaceBoxLike {
  x: number
  y: number
  width: number
  height: number
}

export function createBlinkLivenessContext(
  options: HeadLivenessOptions = {},
  now = Date.now()
): HeadLivenessContext {
  return {
    state: 'center_calibration',
    calibrationMs: options.calibrationMs ?? 1500,
    maxVerificationMs: options.maxVerificationMs ?? 60000,
    turnThresholdRatio: options.turnThresholdRatio ?? 0.06,
    returnThresholdRatio: options.returnThresholdRatio ?? 0.08,
    startedAt: now,
    calibrationStartedAt: now,
    centerOffsetBaseline: null,
    calibrationSampleCount: 0,
    progressStep: 0,
    totalSteps: 3,
    currentOffsetRatio: null,
    effectiveTurnThreshold: options.turnThresholdRatio ?? 0.06,
    effectiveReturnThreshold: options.returnThresholdRatio ?? 0.08,
    consecutiveCenterFrames: 0,
    missingLandmarkFrames: 0,
  }
}

export function updateBlinkLiveness(
  context: HeadLivenessContext,
  landmarks: FaceLandmarksLike | null,
  faceBox: FaceBoxLike | null,
  now = Date.now()
): HeadLivenessContext {
  if (context.state === 'verified' || context.state === 'failed') return context

  if (now - context.startedAt > context.maxVerificationMs) {
    return { ...context, state: 'failed' }
  }

  if (!landmarks || !faceBox || faceBox.width <= 0) {
    const nextMissing = context.missingLandmarkFrames + 1
    if (nextMissing <= 5) {
      return { ...context, missingLandmarkFrames: nextMissing }
    }
    return {
      ...context,
      state: context.state === 'center_calibration' ? 'center_calibration' : 'looking_for_face',
      currentOffsetRatio: null,
      missingLandmarkFrames: nextMissing,
    }
  }

  const nose = getNoseTip(landmarks)
  if (!nose) {
    return { ...context, missingLandmarkFrames: context.missingLandmarkFrames + 1 }
  }

  const boxCenterX = faceBox.x + faceBox.width / 2
  const offsetRatio = (nose.x - boxCenterX) / faceBox.width
  const turnThreshold = context.turnThresholdRatio
  const returnThreshold = context.returnThresholdRatio

  if (context.state === 'center_calibration') {
    const nextSamples = context.calibrationSampleCount + 1
    const nextBaseline = context.centerOffsetBaseline
      ? context.centerOffsetBaseline * 0.9 + offsetRatio * 0.1
      : offsetRatio

    if (now - context.calibrationStartedAt < context.calibrationMs) {
      return {
        ...context,
        state: 'center_calibration',
        centerOffsetBaseline: nextBaseline,
        calibrationSampleCount: nextSamples,
        currentOffsetRatio: offsetRatio,
        progressStep: 0,
        effectiveTurnThreshold: turnThreshold,
        effectiveReturnThreshold: returnThreshold,
        missingLandmarkFrames: 0,
      }
    }

    return {
      ...context,
      state: 'move_head',
      centerOffsetBaseline: nextBaseline,
      calibrationSampleCount: nextSamples,
      currentOffsetRatio: offsetRatio,
      progressStep: 1,
      effectiveTurnThreshold: turnThreshold,
      effectiveReturnThreshold: returnThreshold,
      missingLandmarkFrames: 0,
    }
  }

  const baseline = context.centerOffsetBaseline ?? 0
  const delta = offsetRatio - baseline

  if (context.state === 'move_head') {
    if (Math.abs(delta) >= turnThreshold) {
      return {
        ...context,
        state: 'return_center',
        progressStep: 2,
        currentOffsetRatio: offsetRatio,
        missingLandmarkFrames: 0,
      }
    }
    return { ...context, currentOffsetRatio: offsetRatio, missingLandmarkFrames: 0 }
  }

  if (context.state === 'return_center') {
    const centered = Math.abs(delta) <= returnThreshold
    const nextCenterFrames = centered ? context.consecutiveCenterFrames + 1 : 0
    if (nextCenterFrames >= 2) {
      return {
        ...context,
        state: 'verified',
        progressStep: 3,
        currentOffsetRatio: offsetRatio,
        consecutiveCenterFrames: nextCenterFrames,
        missingLandmarkFrames: 0,
      }
    }
    return {
      ...context,
      currentOffsetRatio: offsetRatio,
      consecutiveCenterFrames: nextCenterFrames,
      missingLandmarkFrames: 0,
    }
  }

  return { ...context, currentOffsetRatio: offsetRatio, missingLandmarkFrames: 0 }
}

function getNoseTip(landmarks: FaceLandmarksLike): Point | null {
  if (typeof landmarks.getNose === 'function') {
    const nose = landmarks.getNose()
    if (nose.length >= 4) return nose[3]
    if (nose.length > 0) return nose[Math.floor(nose.length / 2)]
  }

  const positions = landmarks.positions
  if (!positions || positions.length < 31) return null
  return positions[30]
}
