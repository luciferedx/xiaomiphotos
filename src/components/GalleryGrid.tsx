import React, { useMemo, useState } from 'react';
import { Check, Heart, ImageOff, Play, ZoomIn, ZoomOut } from 'lucide-react';
import { GridDensity, MediaItem } from '../types/media';
import {
  formatDuration,
  groupMediaByMonth,
  stepGridDensity,
} from '../utils/galleryLogic';

interface GalleryGridProps {
  items: MediaItem[];
  density: GridDensity;
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  onChangeDensity: (density: GridDensity) => void;
  onOpenViewer: (item: MediaItem) => void;
  onToggleSelect: (id: string) => void;
  onClearSearch?: () => void;
  hasActiveSearch: boolean;
}

const GRID_CLASS_BY_DENSITY: Record<GridDensity, string> = {
  '3col': 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6',
  '5col': 'grid-cols-5 sm:grid-cols-6 lg:grid-cols-8',
  compact: 'grid-cols-7 sm:grid-cols-9 lg:grid-cols-12',
};

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  items,
  density,
  isSelectionMode,
  selectedIds,
  onChangeDensity,
  onOpenViewer,
  onToggleSelect,
  onClearSearch,
  hasActiveSearch,
}) => {
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());
  const [activeScrubMonth, setActiveScrubMonth] = useState<string | null>(null);

  const sections = useMemo(() => groupMediaByMonth(items), [items]);

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    onChangeDensity(
      stepGridDensity(density, e.deltaY > 0 ? 'zoomOut' : 'zoomIn')
    );
  };

  const scrollToMonth = (monthKey: string) => {
    setActiveScrubMonth(monthKey);
    const el = document.getElementById(`month-section-${monthKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.setTimeout(() => {
      setActiveScrubMonth((curr) => (curr === monthKey ? null : curr));
    }, 1100);
  };

  if (items.length === 0) {
    return (
      <section
        aria-label="Photo library grid"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center"
      >
        <div className="liquid-glass-card rounded-3xl p-10 max-w-md mx-auto">
          <p
            className="text-base font-semibold mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {hasActiveSearch ? 'No matching files' : 'No photos in this view'}
          </p>
          <p
            className="text-sm mb-5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {hasActiveSearch
              ? 'Deterministic search checks filenames, dates, folders, and Leica focal lengths.'
              : 'Adjust your Included Folders whitelist or mount an external USB-OTG drive.'}
          </p>
          {hasActiveSearch && onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: 'var(--pill-active-bg)',
                color: 'var(--pill-active-text)',
              }}
            >
              Clear Filter
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      id="section-library"
      aria-label="Photo library grid"
      onWheel={handleWheelZoom}
      className="relative max-w-7xl mx-auto"
    >
      {/* Density Controls Strip (Pinch / Zoom Density Switcher) */}
      <div className="px-3 sm:px-5 pb-2.5 flex items-center justify-between gap-2">
        <div
          className="text-xs flex items-center gap-2 whitespace-nowrap shrink-0"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="font-mono tabular-nums">{items.length} media</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            {density === '3col'
              ? 'Standard Grid'
              : density === '5col'
                ? 'High-Density Grid'
                : 'Compact Overview'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChangeDensity(stepGridDensity(density, 'zoomIn'))}
            disabled={density === '3col'}
            aria-label="Zoom in grid thumbnails"
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: 'var(--text-primary)' }}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div
            className="flex items-center p-0.5 rounded-lg border border-[var(--hairline)] bg-black/[0.03] dark:bg-white/[0.05]"
            role="group"
            aria-label="Grid column density"
          >
            {(
              [
                { id: '3col', label: '3 Col' },
                { id: '5col', label: '5 Col' },
                { id: 'compact', label: 'Compact' },
              ] as { id: GridDensity; label: string }[]
            ).map((opt) => {
              const active = density === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeDensity(opt.id)}
                  aria-pressed={active}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors"
                  style={{
                    backgroundColor: active
                      ? 'var(--pill-active-bg)'
                      : 'transparent',
                    color: active
                      ? 'var(--pill-active-text)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onChangeDensity(stepGridDensity(density, 'zoomOut'))}
            disabled={density === 'compact'}
            aria-label="Zoom out grid thumbnails"
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: 'var(--text-primary)' }}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month-grouped Edge-to-Edge Tight Thumbnail Grids (1.5px gaps) */}
      <div className="space-y-4 sm:px-5">
        {sections.map((section) => (
          <div
            key={section.monthKey}
            id={`month-section-${section.monthKey}`}
            className="scroll-mt-20"
          >
            {/* Floating Translucent Date Header */}
            <div className="sticky top-[68px] sm:top-[74px] z-20 px-3 sm:px-0 py-1.5 pointer-events-none">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold liquid-glass-surface pointer-events-auto"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>{section.monthLabel}</span>
                <span
                  className="font-mono tabular-nums font-normal"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {section.items.length}
                </span>
              </span>
            </div>

            <div
              className={`grid ${GRID_CLASS_BY_DENSITY[density]} gap-[2px] sm:rounded-xl overflow-hidden`}
              data-testid={`grid-section-${section.monthKey}`}
            >
              {section.items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const failed = failedSrcs.has(item.src);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      isSelectionMode
                        ? onToggleSelect(item.id)
                        : onOpenViewer(item)
                    }
                    aria-label={`${isSelectionMode ? (isSelected ? 'Deselect ' : 'Select ') : 'Open '}${item.filename}`}
                    className="group relative aspect-square w-full overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                    style={{ backgroundColor: 'var(--surface-card)' }}
                  >
                    {failed ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-zinc-800 to-zinc-950 text-zinc-400">
                        <ImageOff className="w-5 h-5 mb-1" />
                        <span className="text-[10px] truncate max-w-full">
                          {item.filename}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.src}
                        alt={item.alt}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedSrcs((prev) => new Set(prev).add(item.src))
                        }
                        className={`w-full h-full object-cover transition-transform duration-200 ${
                          isSelected
                            ? 'scale-[0.88] rounded-lg'
                            : 'group-hover:scale-[1.03]'
                        }`}
                      />
                    )}

                    {/* Subtle Video Duration Overlay */}
                    {item.kind === 'video' && density !== 'compact' && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-mono tabular-nums font-medium inline-flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        {formatDuration(item.exif.durationSec)}
                      </span>
                    )}

                    {/* Subtle RAW Indicator */}
                    {item.kind === 'raw' && density !== 'compact' && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[9px] font-mono font-semibold tracking-wide">
                        RAW
                      </span>
                    )}

                    {/* Favorite Heart Indicator */}
                    {item.isFavorite &&
                      !isSelectionMode &&
                      density === '3col' && (
                        <span
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/45 flex items-center justify-center"
                          aria-hidden="true"
                        >
                          <Heart className="w-3 h-3 text-white fill-white" />
                        </span>
                      )}

                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                      <span
                        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#007AFF] border-white text-white'
                            : 'bg-black/35 border-white/80 text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tactile Right-Edge Date Scrubber Pill */}
      {sections.length > 1 && (
        <aside
          aria-label="Date scrubber"
          className="hidden sm:flex fixed right-3 top-1/2 -translate-y-1/2 z-20 flex-col items-end gap-1.5"
        >
          <div className="liquid-glass-surface rounded-full py-2 px-1.5 flex flex-col items-center gap-1.5">
            {sections.map((sec) => {
              const shortLabel = sec.monthLabel.slice(0, 3);
              const active = activeScrubMonth === sec.monthKey;
              return (
                <button
                  key={sec.monthKey}
                  type="button"
                  onClick={() => scrollToMonth(sec.monthKey)}
                  aria-label={`Jump to ${sec.monthLabel}`}
                  className="px-1.5 py-1 rounded-full text-[10px] font-mono font-semibold transition-colors"
                  style={{
                    backgroundColor: active
                      ? 'var(--pill-active-bg)'
                      : 'transparent',
                    color: active
                      ? 'var(--pill-active-text)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </aside>
      )}
    </section>
  );
};
