import React from 'react';
import {
  Copy,
  FolderInput,
  Heart,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react';
import { ActiveTab } from '../types/media';

interface FloatingBottomPillProps {
  activeTab: ActiveTab;
  isSelectionMode: boolean;
  selectedCount: number;
  isTrashView: boolean;
  onSelectTab: (tab: ActiveTab) => void;
  onToggleSelectionMode: () => void;
  onBatchFavorite: () => void;
  onBatchMove: () => void;
  onBatchCopy: () => void;
  onBatchShare: () => void;
  onBatchDeleteOrRestore: () => void;
}

export const FloatingBottomPill: React.FC<FloatingBottomPillProps> = ({
  activeTab,
  isSelectionMode,
  selectedCount,
  isTrashView,
  onSelectTab,
  onToggleSelectionMode,
  onBatchFavorite,
  onBatchMove,
  onBatchCopy,
  onBatchShare,
  onBatchDeleteOrRestore,
}) => {
  if (isSelectionMode) {
    return (
      <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none px-4 flex justify-center">
        <div
          className="pointer-events-auto liquid-glass-surface rounded-full h-14 px-3 flex items-center gap-1 sm:gap-2"
          role="toolbar"
          aria-label="Selection actions"
        >
          <span
            className="px-2.5 text-xs font-mono tabular-nums font-semibold whitespace-nowrap"
            style={{ color: 'var(--text-primary)' }}
          >
            {selectedCount} selected
          </span>

          <div
            className="h-5 w-px mx-0.5"
            style={{ backgroundColor: 'var(--hairline)' }}
          />

          {!isTrashView && (
            <>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onBatchFavorite}
                aria-label="Favorite selected items"
                className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center disabled:opacity-35 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--text-primary)' }}
              >
                <Heart className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onBatchCopy}
                aria-label="Copy selected items"
                className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center disabled:opacity-35 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--text-primary)' }}
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onBatchMove}
                aria-label="Move selected items"
                className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center disabled:opacity-35 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--text-primary)' }}
              >
                <FolderInput className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onBatchShare}
                aria-label="Share selected items"
                className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center disabled:opacity-35 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--text-primary)' }}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={onBatchDeleteOrRestore}
            aria-label={isTrashView ? 'Restore selected items' : 'Delete selected items'}
            className="min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center disabled:opacity-35 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: isTrashView ? 'var(--accent)' : '#ff453a' }}
          >
            {isTrashView ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleSelectionMode}
            className="ml-1 px-4 h-10 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--pill-active-bg)',
              color: 'var(--pill-active-text)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <nav
      aria-label="Primary gallery navigation"
      className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none px-4 flex justify-center items-center gap-2.5"
    >
      <div className="pointer-events-auto liquid-glass-surface rounded-full p-1.5 flex items-center gap-1">
        {(
          [
            { id: 'library', label: 'Library' },
            { id: 'albums', label: 'Albums' },
            { id: 'drives', label: 'Drives' },
          ] as { id: ActiveTab; label: string }[]
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className="px-4 sm:px-5 h-10 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              style={{
                backgroundColor: active
                  ? 'var(--pill-active-bg)'
                  : 'transparent',
                color: active
                  ? 'var(--pill-active-text)'
                  : 'var(--text-primary)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggleSelectionMode}
        className="pointer-events-auto liquid-glass-surface h-[52px] px-4 sm:px-5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        style={{ color: 'var(--text-primary)' }}
      >
        Select
      </button>
    </nav>
  );
};
