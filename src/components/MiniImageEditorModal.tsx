import React, { useMemo, useRef, useState } from 'react';
import {
  FlipHorizontal2,
  FlipVertical2,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import {
  CropAspectPreset,
  EditTransformState,
  MediaItem,
} from '../types/media';
import {
  clampCropRect,
  createInitialTransformState,
  fitCropRectToAspect,
  getPresetTargetRatio,
  getTotalRotationDegrees,
  hasPendingEdits,
  normalizeStraightenAngle,
  renderTransformedImageToDataUrl,
  rotateQuarterTurn,
} from '../utils/imageTransform';

interface MiniImageEditorModalProps {
  item: MediaItem;
  onCancel: () => void;
  onExportComplete: (params: {
    mode: 'copy' | 'overwrite';
    dataUrl: string;
    width: number;
    height: number;
  }) => void;
}

type DragHandle =
  | 'move'
  | 'nw'
  | 'ne'
  | 'sw'
  | 'se'
  | 'n'
  | 's'
  | 'e'
  | 'w';

const ASPECT_PRESETS: { id: CropAspectPreset; label: string }[] = [
  { id: 'freeform', label: 'Freeform' },
  { id: 'original', label: 'Original' },
  { id: '1:1', label: '1:1' },
  { id: '4:3', label: '4:3' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];

export const MiniImageEditorModal: React.FC<MiniImageEditorModalProps> = ({
  item,
  onCancel,
  onExportComplete,
}) => {
  const [transform, setTransform] = useState<EditTransformState>(
    createInitialTransformState
  );
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({
    w: item.exif.widthPx || 1200,
    h: item.exif.heightPx || 900,
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    initialRect: EditTransformState['cropRect'];
  } | null>(null);

  const rotated90 = transform.quarterTurns % 2 === 1;
  const displayAspect = useMemo(() => {
    const base = naturalSize.w / Math.max(1, naturalSize.h);
    return rotated90 ? 1 / base : base;
  }, [naturalSize, rotated90]);

  const applyAspectPreset = (
    preset: CropAspectPreset,
    orientation: 'landscape' | 'portrait'
  ) => {
    const targetRatio = getPresetTargetRatio(
      preset,
      orientation,
      naturalSize.w / Math.max(1, naturalSize.h)
    );
    const nextRect = fitCropRectToAspect(targetRatio, displayAspect);
    setTransform((prev) => ({
      ...prev,
      aspectPreset: preset,
      aspectOrientation: orientation,
      cropRect: nextRect,
    }));
  };

  const beginCropDrag = (handle: DragHandle, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingCrop(true);
    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialRect: { ...transform.cropRect },
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;

    const bounds = stage.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / Math.max(1, bounds.width);
    const dy = (e.clientY - drag.startY) / Math.max(1, bounds.height);
    const r = drag.initialRect;

    let next = { ...r };
    if (drag.handle === 'move') {
      next.x = r.x + dx;
      next.y = r.y + dy;
    } else {
      if (drag.handle.includes('w')) {
        const right = r.x + r.width;
        const clampedX = Math.max(0, Math.min(right - 0.12, r.x + dx));
        next.x = clampedX;
        next.width = right - clampedX;
      }
      if (drag.handle.includes('e')) {
        next.width = Math.max(0.12, Math.min(1 - r.x, r.width + dx));
      }
      if (drag.handle.includes('n')) {
        const bottom = r.y + r.height;
        const clampedY = Math.max(0, Math.min(bottom - 0.12, r.y + dy));
        next.y = clampedY;
        next.height = bottom - clampedY;
      }
      if (drag.handle.includes('s')) {
        next.height = Math.max(0.12, Math.min(1 - r.y, r.height + dy));
      }
    }

    setTransform((prev) => ({
      ...prev,
      aspectPreset: drag.handle === 'move' ? prev.aspectPreset : 'freeform',
      cropRect: clampCropRect(next),
    }));
  };

  const endCropDrag = () => {
    dragStateRef.current = null;
    setIsDraggingCrop(false);
  };

  const handleSave = async (mode: 'copy' | 'overwrite') => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const rendered = await renderTransformedImageToDataUrl(
        item.src,
        transform
      );
      onExportComplete({
        mode,
        dataUrl: rendered.dataUrl,
        width: rendered.width,
        height: rendered.height,
      });
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Unable to export edited photo'
      );
      setIsSaving(false);
    }
  };

  const totalDeg = getTotalRotationDegrees(transform);
  const fineRad = (Math.abs(transform.straightenDeg) * Math.PI) / 180;
  const previewAutoScale =
    transform.straightenDeg === 0
      ? 1
      : Math.cos(fineRad) +
        Math.sin(fineRad) * Math.max(displayAspect, 1 / displayAspect);
  const edited = hasPendingEdits(transform);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${item.filename}`}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none"
    >
      {/* Top Bar: Cancel | Title | Overwrite & Save Copy */}
      <div className="px-4 sm:px-6 h-14 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-3 py-2 -ml-2 text-sm font-medium text-white/85 hover:text-white whitespace-nowrap"
        >
          Cancel
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-white/65">
          <span>Mirror · Rotate · Crop</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">
            {item.storageOrigin === 'external' ? 'USB-OTG SAF' : 'MediaStore'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('overwrite')}
            className="h-9 px-3.5 rounded-full bg-white/12 border border-white/15 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-40 whitespace-nowrap"
          >
            Overwrite Original
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave('copy')}
            className="h-9 px-4 rounded-full bg-[#FFD60A] text-black text-xs font-bold hover:bg-[#ffe03d] disabled:opacity-40 whitespace-nowrap"
          >
            {isSaving ? 'Exporting...' : 'Save Copy'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="px-4 py-2 bg-rose-950/90 border-b border-rose-500/40 text-xs text-rose-200 text-center">
          {saveError}
        </div>
      )}

      {/* Interactive Crop & Transform Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-6 sm:p-9 overflow-hidden">
        <div
          ref={stageRef}
          data-testid="editor-crop-stage"
          onPointerMove={handleCropPointerMove}
          onPointerUp={endCropDrag}
          onPointerCancel={endCropDrag}
          className="relative max-w-full max-h-full overflow-visible shadow-2xl"
          style={{
            aspectRatio: `${displayAspect}`,
            height: 'min(56vh, 500px)',
            maxWidth: '90vw',
          }}
        >
          {/* Clipped Image + Dimmed Outer Masks Layer */}
          <div className="absolute inset-0 overflow-hidden rounded-sm">
            {/* Live GPU-Accelerated Transform Preview */}
            <img
              src={item.src}
              alt={item.alt}
              referrerPolicy="no-referrer"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth && el.naturalHeight) {
                  setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
                }
              }}
              className="w-full h-full object-contain transition-transform duration-150"
              style={{
                transform: `scale(${(transform.mirrorX ? -1 : 1) * previewAutoScale}, ${(transform.mirrorY ? -1 : 1) * previewAutoScale}) rotate(${totalDeg}deg)`,
              }}
            />

            {/* Dimmed Outer Crop Masks */}
            <div
              className="absolute inset-x-0 top-0 bg-black/60 pointer-events-none"
              style={{ height: `${transform.cropRect.y * 100}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-black/60 pointer-events-none"
              style={{
                height: `${(1 - (transform.cropRect.y + transform.cropRect.height)) * 100}%`,
              }}
            />
            <div
              className="absolute left-0 bg-black/60 pointer-events-none"
              style={{
                top: `${transform.cropRect.y * 100}%`,
                height: `${transform.cropRect.height * 100}%`,
                width: `${transform.cropRect.x * 100}%`,
              }}
            />
            <div
              className="absolute right-0 bg-black/60 pointer-events-none"
              style={{
                top: `${transform.cropRect.y * 100}%`,
                height: `${transform.cropRect.height * 100}%`,
                width: `${(1 - (transform.cropRect.x + transform.cropRect.width)) * 100}%`,
              }}
            />
          </div>

          {/* Interactive Crop Frame with Rule-of-Thirds & Unclipped Corner L-Brackets */}
          <div
            onPointerDown={(e) => beginCropDrag('move', e)}
            className="absolute border border-white/90 cursor-move touch-none"
            style={{
              left: `${transform.cropRect.x * 100}%`,
              top: `${transform.cropRect.y * 100}%`,
              width: `${transform.cropRect.width * 100}%`,
              height: `${transform.cropRect.height * 100}%`,
            }}
          >
            {/* Rule-of-Thirds Gridlines */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-150"
              style={{ opacity: isDraggingCrop ? 0.85 : 0.38 }}
            >
              <div className="absolute left-1/3 inset-y-0 w-px bg-white/80" />
              <div className="absolute left-2/3 inset-y-0 w-px bg-white/80" />
              <div className="absolute top-1/3 inset-x-0 h-px bg-white/80" />
              <div className="absolute top-2/3 inset-x-0 h-px bg-white/80" />
            </div>

            {/* 4 Corner L-Bracket Handles */}
            <button
              type="button"
              aria-label="Resize top-left crop corner"
              onPointerDown={(e) => beginCropDrag('nw', e)}
              className="absolute -top-[2px] -left-[2px] w-6 h-6 border-t-[3.5px] border-l-[3.5px] border-white cursor-nwse-resize"
            />
            <button
              type="button"
              aria-label="Resize top-right crop corner"
              onPointerDown={(e) => beginCropDrag('ne', e)}
              className="absolute -top-[2px] -right-[2px] w-6 h-6 border-t-[3.5px] border-r-[3.5px] border-white cursor-nesw-resize"
            />
            <button
              type="button"
              aria-label="Resize bottom-left crop corner"
              onPointerDown={(e) => beginCropDrag('sw', e)}
              className="absolute -bottom-[2px] -left-[2px] w-6 h-6 border-b-[3.5px] border-l-[3.5px] border-white cursor-nesw-resize"
            />
            <button
              type="button"
              aria-label="Resize bottom-right crop corner"
              onPointerDown={(e) => beginCropDrag('se', e)}
              className="absolute -bottom-[2px] -right-[2px] w-6 h-6 border-b-[3.5px] border-r-[3.5px] border-white cursor-nwse-resize"
            />

            {/* 4 Edge Handles */}
            <button
              type="button"
              aria-label="Resize top crop edge"
              onPointerDown={(e) => beginCropDrag('n', e)}
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-3 cursor-ns-resize"
            />
            <button
              type="button"
              aria-label="Resize bottom crop edge"
              onPointerDown={(e) => beginCropDrag('s', e)}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-3 cursor-ns-resize"
            />
            <button
              type="button"
              aria-label="Resize left crop edge"
              onPointerDown={(e) => beginCropDrag('w', e)}
              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-10 cursor-ew-resize"
            />
            <button
              type="button"
              aria-label="Resize right crop edge"
              onPointerDown={(e) => beginCropDrag('e', e)}
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-10 cursor-ew-resize"
            />
          </div>
        </div>
      </div>

      {/* Bottom Transform Controls Dock (Strictly Mirror, Rotate, Crop) */}
      <div className="bg-[#121214] border-t border-white/10 px-4 sm:px-6 pt-3.5 pb-5 space-y-3.5 shrink-0">
        <div className="max-w-2xl mx-auto space-y-3.5">
          {/* Fine Straightening Dial (-45° to +45° with 0° center detent) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="straighten-dial" className="text-white/65">
                Straighten
              </label>
              <span
                className="font-mono tabular-nums font-semibold"
                style={{
                  color: transform.straightenDeg === 0 ? '#FFD60A' : '#FFFFFF',
                }}
              >
                {transform.straightenDeg > 0
                  ? `+${transform.straightenDeg.toFixed(1)}°`
                  : `${transform.straightenDeg.toFixed(1)}°`}
              </span>
            </div>
            <input
              id="straighten-dial"
              type="range"
              min={-45}
              max={45}
              step={0.5}
              value={transform.straightenDeg}
              onChange={(e) => {
                const { angle } = normalizeStraightenAngle(
                  Number(e.target.value)
                );
                setTransform((prev) => ({ ...prev, straightenDeg: angle }));
              }}
              className="w-full accent-[#FFD60A]"
            />
          </div>

          {/* Aspect Ratio Presets + Portrait/Landscape Flip */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5">
              {ASPECT_PRESETS.map((preset) => {
                const active = transform.aspectPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      applyAspectPreset(preset.id, transform.aspectOrientation)
                    }
                    aria-pressed={active}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/80 hover:bg-white/15'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  applyAspectPreset(transform.aspectPreset, 'landscape')
                }
                aria-label="Landscape crop orientation"
                aria-pressed={transform.aspectOrientation === 'landscape'}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  transform.aspectOrientation === 'landscape'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/75'
                }`}
              >
                <RectangleHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  applyAspectPreset(transform.aspectPreset, 'portrait')
                }
                aria-label="Portrait crop orientation"
                aria-pressed={transform.aspectOrientation === 'portrait'}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  transform.aspectOrientation === 'portrait'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/75'
                }`}
              >
                <RectangleVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mirror H/V + Rotate 90° CCW/CW + Reset */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setTransform((prev) => ({ ...prev, mirrorX: !prev.mirrorX }))
                }
                aria-pressed={transform.mirrorX}
                aria-label="Mirror horizontal"
                className={`h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  transform.mirrorX
                    ? 'bg-[#FFD60A] text-black'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <FlipHorizontal2 className="w-4 h-4" />
                <span className="hidden sm:inline">Mirror H</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTransform((prev) => ({ ...prev, mirrorY: !prev.mirrorY }))
                }
                aria-pressed={transform.mirrorY}
                aria-label="Mirror vertical"
                className={`h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  transform.mirrorY
                    ? 'bg-[#FFD60A] text-black'
                    : 'bg-white/10 text-white hover:bg-white/15'
                }`}
              >
                <FlipVertical2 className="w-4 h-4" />
                <span className="hidden sm:inline">Mirror V</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTransform((prev) => ({
                    ...prev,
                    quarterTurns: rotateQuarterTurn(prev.quarterTurns, 'ccw'),
                  }))
                }
                aria-label="Rotate 90 degrees counter-clockwise"
                className="h-10 px-3 rounded-xl bg-white/10 text-white hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">90° CCW</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTransform((prev) => ({
                    ...prev,
                    quarterTurns: rotateQuarterTurn(prev.quarterTurns, 'cw'),
                  }))
                }
                aria-label="Rotate 90 degrees clockwise"
                className="h-10 px-3 rounded-xl bg-white/10 text-white hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">90° CW</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!edited}
              onClick={() => setTransform(createInitialTransformState())}
              className="h-10 px-3.5 rounded-xl text-xs font-semibold text-[#FFD60A] disabled:opacity-35 hover:bg-white/10 whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
