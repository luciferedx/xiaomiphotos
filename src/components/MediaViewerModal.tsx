import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  FolderInput,
  HardDrive,
  Heart,
  Info,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Trash2,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MediaItem } from '../types/media';
import { formatDuration } from '../utils/galleryLogic';

interface MediaViewerModalProps {
  item: MediaItem;
  allVisibleItems: MediaItem[];
  onClose: () => void;
  onNavigate: (nextItem: MediaItem) => void;
  onOpenEditor: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onRequestTransfer: (ids: string[], mode: 'copy' | 'move') => void;
  onDeleteOrRestore: (id: string) => void;
  onShare: (item: MediaItem) => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  item,
  allVisibleItems,
  onClose,
  onNavigate,
  onOpenEditor,
  onToggleFavorite,
  onRename,
  onRequestTransfer,
  onDeleteOrRestore,
  onShare,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [showExif, setShowExif] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(item.filename);

  // Video playback state (10-bit HDR ExoPlayer simulation)
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoTimeSec, setVideoTimeSec] = useState(0);
  const durationSec = item.exif.durationSec || 24;

  const currentIdx = allVisibleItems.findIndex((x) => x.id === item.id);
  const prevItem = currentIdx > 0 ? allVisibleItems[currentIdx - 1] : null;
  const nextItem =
    currentIdx >= 0 && currentIdx < allVisibleItems.length - 1
      ? allVisibleItems[currentIdx + 1]
      : null;

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRenameDraft(item.filename);
    setIsRenaming(false);
    setVideoTimeSec(0);
    setIsPlaying(true);
  }, [item.id, item.filename]);

  // Smooth video scrubber tick when viewing video items
  useEffect(() => {
    if (item.kind !== 'video' || !isPlaying) return;
    const timer = window.setInterval(() => {
      setVideoTimeSec((prev) => (prev + 0.5 >= durationSec ? 0 : prev + 0.5));
    }, 500);
    return () => window.clearInterval(timer);
  }, [item.kind, isPlaying, durationSec]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isRenaming) return;
      if (e.key === 'Escape') {
        if (showExif) setShowExif(false);
        else onClose();
      } else if (e.key === 'ArrowLeft' && prevItem) {
        onNavigate(prevItem);
      } else if (e.key === 'ArrowRight' && nextItem) {
        onNavigate(nextItem);
      } else if (e.key.toLowerCase() === 'i') {
        setShowExif((v) => !v);
      } else if (e.key.toLowerCase() === 'e' && item.kind !== 'video') {
        onOpenEditor(item);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRenaming, showExif, prevItem, nextItem, item, onClose, onNavigate, onOpenEditor]);

  const handleDoubleClick = () => {
    if (item.kind === 'video') return;
    if (zoom > 1.1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.4);
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameDraft.trim()) {
      onRename(item.id, renameDraft.trim());
    }
    setIsRenaming(false);
  };

  const capturedFormatted = new Date(item.capturedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${item.filename}`}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none"
    >
      {/* Top Floating Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-3.5 pb-6 bg-gradient-to-b from-black/75 via-black/35 to-transparent flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media viewer"
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/12 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{item.filename}</p>
            <p className="text-xs text-white/70 truncate">
              {capturedFormatted} · {item.exif.focalLengthMm}mm {item.exif.aperture}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.kind !== 'video' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(1, Number((zoom - 0.6).toFixed(1)));
                  setZoom(next);
                  if (next === 1) setPan({ x: 0, y: 0 });
                }}
                disabled={zoom <= 1}
                aria-label="Zoom out photo"
                className="hidden sm:flex min-w-[40px] min-h-[40px] rounded-full bg-white/12 backdrop-blur-xl border border-white/20 items-center justify-center disabled:opacity-35 hover:bg-white/20"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, Number((z + 0.6).toFixed(1))))}
                disabled={zoom >= 4}
                aria-label="Zoom in photo"
                className="hidden sm:flex min-w-[40px] min-h-[40px] rounded-full bg-white/12 backdrop-blur-xl border border-white/20 items-center justify-center disabled:opacity-35 hover:bg-white/20"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Edit Pill Button (Opens Mirror/Rotate/Crop Mini Editor) */}
              <button
                type="button"
                onClick={() => onOpenEditor(item)}
                className="h-10 px-5 rounded-full bg-white text-black text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-white/90 transition-colors whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Media Stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onDoubleClick={handleDoubleClick}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          setDragging(true);
          setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          setPan({ x: e.clientX - dragOrigin.x, y: e.clientY - dragOrigin.y });
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <img
          src={item.src}
          alt={item.alt}
          referrerPolicy="no-referrer"
          draggable={false}
          className="max-h-full max-w-full object-contain transition-transform duration-150"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
        />

        {/* Previous / Next Navigation Arrows */}
        {prevItem && zoom <= 1.05 && (
          <button
            type="button"
            onClick={() => onNavigate(prevItem)}
            aria-label="Previous photo"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/65 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {nextItem && zoom <= 1.05 && (
          <button
            type="button"
            onClick={() => onNavigate(nextItem)}
            aria-label="Next photo"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/65 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* 10-bit HDR ExoPlayer Controls Overlay for Video Items */}
        {item.kind === 'video' && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-xl rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-white/80 font-mono tabular-nums">
              <span>{item.exif.colorProfile}</span>
              <span>
                {formatDuration(videoTimeSec)} / {formatDuration(durationSec)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'Pause HDR video' : 'Play HDR video'}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                )}
              </button>
              <label htmlFor="hdr-video-scrub" className="sr-only">
                Video timeline scrubber
              </label>
              <input
                id="hdr-video-scrub"
                type="range"
                min={0}
                max={durationSec}
                step={0.5}
                value={videoTimeSec}
                onChange={(e) => setVideoTimeSec(Number(e.target.value))}
                className="flex-1 accent-white"
              />
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                className="w-9 h-9 rounded-full bg-white/12 flex items-center justify-center shrink-0"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Action Pill */}
      <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center px-4">
        <div className="rounded-full bg-zinc-900/75 backdrop-blur-2xl border border-white/20 px-2.5 py-1.5 flex items-center gap-1 sm:gap-2 shadow-2xl">
          <button
            type="button"
            onClick={() => onShare(item)}
            aria-label="Share file"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(item.id)}
            aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Heart
              className={`w-4 h-4 ${
                item.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-white'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setShowExif((v) => !v)}
            aria-expanded={showExif}
            aria-label="Inspect Leica EXIF details"
            className={`min-w-[44px] min-h-[44px] px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              showExif ? 'bg-white text-black' : 'hover:bg-white/15 text-white'
            }`}
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">EXIF</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestTransfer([item.id], 'copy')}
            aria-label="Copy file to album or external drive"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onRequestTransfer([item.id], 'move')}
            aria-label="Move file to album or external drive"
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <FolderInput className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteOrRestore(item.id)}
            aria-label={item.isTrashed ? 'Restore from trash' : 'Move to trash'}
            className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            {item.isTrashed ? (
              <RotateCcw className="w-4 h-4 text-sky-400" />
            ) : (
              <Trash2 className="w-4 h-4 text-rose-400" />
            )}
          </button>
        </div>
      </div>

      {/* Pro Camera & Leica Optics EXIF Swipe-Up Sheet */}
      {showExif && (
        <div
          className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 sm:px-6 pb-3"
          role="region"
          aria-label="Leica camera EXIF metadata"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-[#121214]/95 backdrop-blur-2xl border border-white/15 p-5 sm:p-6 shadow-2xl">
            <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1">
                {isRenaming ? (
                  <form onSubmit={handleRenameSubmit} className="flex items-center gap-2">
                    <label htmlFor="rename-file-input" className="sr-only">
                      New filename
                    </label>
                    <input
                      id="rename-file-input"
                      type="text"
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      autoFocus
                      className="flex-1 bg-white/10 border border-white/25 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenameDraft(item.filename);
                        setIsRenaming(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 text-xs"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold truncate">
                      {item.filename}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsRenaming(true)}
                      aria-label="Rename file"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/75"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-white/65 mt-0.5">
                  {item.exif.cameraModel} · {item.exif.lensName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExif(false)}
                aria-label="Close EXIF details"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4-column Leica Optical Spec Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 mb-4">
              <div>
                <p className="text-[11px] text-white/55">Focal Length</p>
                <p className="text-sm font-mono tabular-nums font-semibold mt-0.5">
                  {item.exif.focalLengthMm}mm
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/55">Aperture</p>
                <p className="text-sm font-mono tabular-nums font-semibold mt-0.5">
                  {item.exif.aperture}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/55">ISO</p>
                <p className="text-sm font-mono tabular-nums font-semibold mt-0.5">
                  {item.exif.iso > 0 ? `ISO ${item.exif.iso}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-white/55">Shutter</p>
                <p className="text-sm font-mono tabular-nums font-semibold mt-0.5">
                  {item.exif.shutterSpeed}
                </p>
              </div>
            </div>

            {/* File Specs & Storage Path */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-white/55">Resolution &amp; Size</p>
                <p className="font-mono tabular-nums text-white">
                  {item.exif.resolutionLabel} · {item.exif.fileSizeMb.toFixed(1)} MB
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-white/55">Color Profile &amp; Format</p>
                <p className="font-mono text-white">
                  {item.exif.colorProfile} · {item.exif.format}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[11px] text-white/70 font-mono">
              <HardDrive className="w-3.5 h-3.5 shrink-0 text-white/55" />
              <span className="truncate">{item.filePath}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
