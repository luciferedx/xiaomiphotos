import {
  CropAspectPreset,
  EditTransformState,
  NormalizedCropRect,
} from '../types/media';

export const MIN_CROP_SIZE = 0.12;

export function createInitialTransformState(): EditTransformState {
  return {
    mirrorX: false,
    mirrorY: false,
    quarterTurns: 0,
    straightenDeg: 0,
    aspectPreset: 'freeform',
    aspectOrientation: 'landscape',
    cropRect: { x: 0, y: 0, width: 1, height: 1 },
  };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function getTotalRotationDegrees(state: EditTransformState): number {
  return state.quarterTurns * 90 + state.straightenDeg;
}

export function rotateQuarterTurn(
  current: 0 | 1 | 2 | 3,
  direction: 'cw' | 'ccw'
): 0 | 1 | 2 | 3 {
  const delta = direction === 'cw' ? 1 : 3;
  return ((current + delta) % 4) as 0 | 1 | 2 | 3;
}

/**
 * Snap straightening dial softly to 0° when within ±1.2° (matching haptic detent on Android).
 */
export function normalizeStraightenAngle(rawDeg: number): {
  angle: number;
  snappedToZero: boolean;
} {
  const clamped = clamp(Math.round(rawDeg * 2) / 2, -45, 45);
  if (Math.abs(clamped) <= 1.0) {
    return { angle: 0, snappedToZero: true };
  }
  return { angle: clamped, snappedToZero: false };
}

/**
 * Compute target width/height ratio in image-space for a crop preset.
 */
export function getPresetTargetRatio(
  preset: CropAspectPreset,
  orientation: 'landscape' | 'portrait',
  naturalAspect: number
): number | null {
  if (preset === 'freeform') return null;
  if (preset === 'original') {
    return orientation === 'landscape'
      ? Math.max(naturalAspect, 1 / naturalAspect)
      : Math.min(naturalAspect, 1 / naturalAspect);
  }

  let baseRatio = 1;
  switch (preset) {
    case '1:1':
      return 1;
    case '4:3':
      baseRatio = 4 / 3;
      break;
    case '16:9':
      baseRatio = 16 / 9;
      break;
    case '9:16':
      return orientation === 'portrait' ? 9 / 16 : 16 / 9;
  }

  return orientation === 'landscape' ? baseRatio : 1 / baseRatio;
}

/**
 * Compute centered normalized crop rectangle fitted inside [0..1] x [0..1]
 * matching the requested aspect ratio inside a canvas of `displayAspect = width / height`.
 */
export function fitCropRectToAspect(
  targetRatio: number | null,
  displayAspect: number
): NormalizedCropRect {
  if (!targetRatio || targetRatio <= 0 || displayAspect <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  // In normalized coordinates, (cropW * displayW) / (cropH * displayH) = targetRatio
  // => cropW / cropH = targetRatio / displayAspect
  const normRatio = targetRatio / displayAspect;
  let width = 1;
  let height = 1;

  if (normRatio >= 1) {
    width = 1;
    height = clamp(1 / normRatio, MIN_CROP_SIZE, 1);
  } else {
    height = 1;
    width = clamp(normRatio, MIN_CROP_SIZE, 1);
  }

  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  };
}

/**
 * Clamp and normalize a crop rect so it stays strictly within [0..1] bounds
 * and respects minimum crop dimensions.
 */
export function clampCropRect(rect: NormalizedCropRect): NormalizedCropRect {
  const width = clamp(rect.width, MIN_CROP_SIZE, 1);
  const height = clamp(rect.height, MIN_CROP_SIZE, 1);
  const x = clamp(rect.x, 0, 1 - width);
  const y = clamp(rect.y, 0, 1 - height);
  return { x, y, width, height };
}

export function hasPendingEdits(state: EditTransformState): boolean {
  return (
    state.mirrorX ||
    state.mirrorY ||
    state.quarterTurns !== 0 ||
    state.straightenDeg !== 0 ||
    Math.abs(state.cropRect.x) > 0.002 ||
    Math.abs(state.cropRect.y) > 0.002 ||
    Math.abs(state.cropRect.width - 1) > 0.002 ||
    Math.abs(state.cropRect.height - 1) > 0.002
  );
}

/**
 * Full-resolution non-destructive Canvas pipeline (browser equivalent of ImageTransformProcessor.kt):
 * Applies exact mirror + rotation (quarter turns + fine straighten) + normalized crop rect
 * to produce a genuine transformed JPEG data URL and updated pixel dimensions.
 */
export async function renderTransformedImageToDataUrl(
  imageSrc: string,
  state: EditTransformState
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load source image for transform'));
    el.src = imageSrc;
  });

  const srcW = img.naturalWidth || 1200;
  const srcH = img.naturalHeight || 900;
  const rotated90 = state.quarterTurns % 2 === 1;
  const stageW = rotated90 ? srcH : srcW;
  const stageH = rotated90 ? srcW : srcH;

  // Stage 1: render rotated + mirrored full image onto offscreen canvas
  const stageCanvas = document.createElement('canvas');
  stageCanvas.width = stageW;
  stageCanvas.height = stageH;
  const stageCtx = stageCanvas.getContext('2d');
  if (!stageCtx) {
    throw new Error('2D canvas context unavailable');
  }

  // Auto-zoom slightly during fine straightening so corners never show black wedges
  const fineRad = (Math.abs(state.straightenDeg) * Math.PI) / 180;
  const autoScale =
    state.straightenDeg === 0
      ? 1
      : Math.cos(fineRad) +
        Math.sin(fineRad) * Math.max(stageW / stageH, stageH / stageW);

  stageCtx.save();
  stageCtx.translate(stageW / 2, stageH / 2);
  stageCtx.scale(
    (state.mirrorX ? -1 : 1) * autoScale,
    (state.mirrorY ? -1 : 1) * autoScale
  );
  stageCtx.rotate((getTotalRotationDegrees(state) * Math.PI) / 180);
  stageCtx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
  stageCtx.restore();

  // Stage 2: extract exact normalized crop region
  const clamped = clampCropRect(state.cropRect);
  const cropX = Math.round(clamped.x * stageW);
  const cropY = Math.round(clamped.y * stageH);
  const cropW = Math.max(16, Math.round(clamped.width * stageW));
  const cropH = Math.max(16, Math.round(clamped.height * stageH));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW;
  outCanvas.height = cropH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) {
    throw new Error('2D output canvas context unavailable');
  }

  outCtx.drawImage(stageCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  const dataUrl = outCanvas.toDataURL('image/jpeg', 0.94);

  return { dataUrl, width: cropW, height: cropH };
}
