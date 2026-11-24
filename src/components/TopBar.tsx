import React, { useState } from 'react';
import {
  ArrowLeft,
  Code2,
  FolderCog,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { CollectionFilter, ThemeMode } from '../types/media';
import { AppMonochromeIcon } from './AppMonochromeIcon';

interface TopBarProps {
  activeFilter: CollectionFilter;
  totalVisibleCount: number;
  themeMode: ThemeMode;
  searchQuery: string;
  onBackToLibrary: () => void;
  onSearchChange: (q: string) => void;
  onSetThemeMode: (mode: ThemeMode) => void;
  onOpenFolders: () => void;
  onOpenAndroidSource: () => void;
}

const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  amoled: 'AMOLED',
  glass: 'Glass',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeFilter,
  totalVisibleCount,
  themeMode,
  searchQuery,
  onBackToLibrary,
  onSearchChange,
  onSetThemeMode,
  onOpenFolders,
  onOpenAndroidSource,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);

  const cycleTheme = () => {
    const next: ThemeMode =
      themeMode === 'light'
        ? 'amoled'
        : themeMode === 'amoled'
          ? 'glass'
          : 'light';
    onSetThemeMode(next);
  };

  const isSubView = activeFilter.type !== 'all';

  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none px-3 sm:px-5 pt-2.5 sm:pt-3.5">
      <div className="max-w-7xl mx-auto pointer-events-auto liquid-glass-surface rounded-2xl h-13 sm:h-14 px-3 sm:px-4 flex items-center justify-between gap-3">
        {/* Zone 1: Brand / Active Album Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isSubView ? (
            <button
              type="button"
              onClick={onBackToLibrary}
              aria-label="Back to Photos Library"
              className="min-w-[40px] min-h-[40px] -ml-1.5 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <AppMonochromeIcon
              size={30}
              variant={themeMode === 'light' ? 'dark' : 'dark'}
              mask="squircle"
            />
          )}

          <div className="min-w-0 flex items-baseline gap-2.5">
            <h1
              className="text-base sm:text-lg font-bold tracking-tight truncate whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              {activeFilter.title}
            </h1>
            <span
              className="hidden sm:inline text-xs font-mono tabular-nums whitespace-nowrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              {totalVisibleCount} items
            </span>
          </div>
        </div>

        {/* Zone 2: Deterministic Search (Filename / Date / Folder / Lens — Zero AI) */}
        {searchOpen ? (
          <div className="flex-1 max-w-md flex items-center gap-2 px-3 h-9 rounded-xl border border-[var(--hairline)] bg-black/5 dark:bg-white/10">
            <Search
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            />
            <label htmlFor="deterministic-search" className="sr-only">
              Filter by filename, date, folder, or focal length
            </label>
            <input
              id="deterministic-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filename, 23mm, 100mm, DNG, 2026-11..."
              autoFocus
              className="w-full bg-transparent text-xs sm:text-sm outline-none placeholder:text-[var(--text-tertiary)]"
              style={{ color: 'var(--text-primary)' }}
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setSearchOpen(false);
              }}
              aria-label="Close search"
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/15"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}

        {/* Zone 3: Theme Engine Switcher, Folder Isolation, and Kotlin Project CTA */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {!searchOpen && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Filter library by filename, date, or lens"
              className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFolders}
            aria-label="Manage included folders"
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            style={{ color: 'var(--text-primary)' }}
          >
            <FolderCog className="w-4 h-4" />
          </button>

          {/* Instant 3-Mode Theme Switcher (Desktop segmented + Mobile quick toggle) */}
          <div
            className="hidden md:flex items-center p-0.5 rounded-xl border border-[var(--hairline)] bg-black/[0.04] dark:bg-white/[0.06]"
            role="group"
            aria-label="Theme mode"
          >
            {(['light', 'amoled', 'glass'] as ThemeMode[]).map((mode) => {
              const active = themeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSetThemeMode(mode)}
                  aria-pressed={active}
                  className="px-2.5 py-1.5 rounded-[10px] text-xs font-medium whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5"
                  style={{
                    backgroundColor: active
                      ? 'var(--pill-active-bg)'
                      : 'transparent',
                    color: active
                      ? 'var(--pill-active-text)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {mode === 'light' && <Sun className="w-3.5 h-3.5" />}
                  {mode === 'amoled' && <Moon className="w-3.5 h-3.5" />}
                  {mode === 'glass' && <Sparkles className="w-3.5 h-3.5" />}
                  <span>{THEME_LABELS[mode]}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Switch theme mode, currently ${THEME_LABELS[themeMode]}`}
            className="md:hidden min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: 'var(--text-primary)' }}
          >
            {themeMode === 'light' && <Sun className="w-4 h-4" />}
            {themeMode === 'amoled' && <Moon className="w-4 h-4" />}
            {themeMode === 'glass' && <Sparkles className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenAndroidSource}
            className="h-9 px-3 sm:px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            style={{
              backgroundColor: 'var(--pill-active-bg)',
              color: 'var(--pill-active-text)',
            }}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Android Source</span>
            <span className="sm:hidden">Kotlin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
