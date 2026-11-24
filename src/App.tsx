import React, { useEffect, useMemo, useState } from 'react';
import { AndroidSourceModal } from './components/AndroidSourceModal';
import { CollectionsSection } from './components/CollectionsSection';
import { FileTransferSheet } from './components/FileTransferSheet';
import { FloatingBottomPill } from './components/FloatingBottomPill';
import { GalleryGrid } from './components/GalleryGrid';
import { IncludedFoldersSheet } from './components/IncludedFoldersSheet';
import { MediaViewerModal } from './components/MediaViewerModal';
import { MiniImageEditorModal } from './components/MiniImageEditorModal';
import { TopBar } from './components/TopBar';
import {
  INITIAL_DRIVES,
  INITIAL_FOLDERS,
  INITIAL_MEDIA_ITEMS,
} from './data/seedLibrary';
import {
  ActiveTab,
  CollectionFilter,
  ExternalDrive,
  GridDensity,
  MediaFolder,
  MediaItem,
  ThemeMode,
} from './types/media';
import {
  filterVisibleMedia,
  renameMediaItem,
  resolveDriveDetachState,
  setTrashState,
  transferMediaItems,
} from './utils/galleryLogic';

const THEME_STORAGE_KEY = 'photos_ultra_theme_mode';

function readInitialTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'amoled' || saved === 'glass') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted contexts
  }
  return 'amoled';
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readInitialTheme);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [folders, setFolders] = useState<MediaFolder[]>(INITIAL_FOLDERS);
  const [drives, setDrives] = useState<ExternalDrive[]>(INITIAL_DRIVES);

  const [density, setDensity] = useState<GridDensity>('3col');
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [activeFilter, setActiveFilter] = useState<CollectionFilter>({
    type: 'all',
    title: 'Photos',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewerItemId, setViewerItemId] = useState<string | null>(null);
  const [editorItemId, setEditorItemId] = useState<string | null>(null);
  const [foldersSheetOpen, setFoldersSheetOpen] = useState(false);
  const [androidSourceOpen, setAndroidSourceOpen] = useState(false);
  const [transferRequest, setTransferRequest] = useState<{
    ids: string[];
    mode: 'copy' | 'move';
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  // Sync persistent 3-mode Theme Engine with root document classes (zero flicker)
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-amoled', 'theme-glass', 'dark');
    if (themeMode === 'light') {
      html.classList.add('theme-light');
    } else if (themeMode === 'amoled') {
      html.classList.add('theme-amoled', 'dark');
    } else {
      html.classList.add('theme-glass', 'dark');
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage write errors
    }
  }, [themeMode]);

  // Sync floating bottom pill active tab smoothly when scrolling unified view
  useEffect(() => {
    if (activeFilter.type !== 'all') return;
    const onScroll = () => {
      const drivesEl = document.getElementById('section-drives');
      const albumsEl = document.getElementById('section-albums');
      const threshold = window.innerHeight * 0.48;
      if (drivesEl && drivesEl.getBoundingClientRect().top <= threshold) {
        setActiveTab('drives');
      } else if (albumsEl && albumsEl.getBoundingClientRect().top <= threshold) {
        setActiveTab('albums');
      } else {
        setActiveTab('library');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeFilter.type]);

  const visibleItems = useMemo(
    () =>
      filterVisibleMedia(
        mediaItems,
        folders,
        drives,
        activeFilter,
        searchQuery
      ),
    [mediaItems, folders, drives, activeFilter, searchQuery]
  );

  const activeViewerItem = useMemo(
    () =>
      viewerItemId
        ? mediaItems.find((m) => m.id === viewerItemId) || null
        : null,
    [viewerItemId, mediaItems]
  );

  const activeEditorItem = useMemo(
    () =>
      editorItemId
        ? mediaItems.find((m) => m.id === editorItemId) || null
        : null,
    [editorItemId, mediaItems]
  );

  const heroBackdropSrc = visibleItems[0]?.src || mediaItems[0]?.src;

  // Navigation handlers
  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'library') {
      setActiveFilter({ type: 'all', title: 'Photos' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'albums') {
      if (activeFilter.type !== 'all') {
        setActiveFilter({ type: 'all', title: 'Photos' });
      }
      window.setTimeout(() => {
        document
          .getElementById('section-albums')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    } else if (tab === 'drives') {
      if (activeFilter.type !== 'all') {
        setActiveFilter({ type: 'all', title: 'Photos' });
      }
      window.setTimeout(() => {
        document
          .getElementById('section-drives')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  };

  const handleSelectCollection = (filter: CollectionFilter) => {
    setActiveFilter(filter);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setActiveTab(filter.type === 'drive' ? 'drives' : 'albums');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLibrary = () => {
    setActiveFilter({ type: 'all', title: 'Photos' });
    setActiveTab('library');
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  // Selection helpers
  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleFavorite = (id: string) => {
    setMediaItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m))
    );
  };

  const handleBatchFavorite = () => {
    if (selectedIds.size === 0) return;
    setMediaItems((prev) =>
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, isFavorite: true } : m))
    );
    showNotice(`Added ${selectedIds.size} item(s) to Favorites`);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteOrRestoreIds = (ids: string[], restore: boolean) => {
    const idSet = new Set(ids);
    setMediaItems((prev) => setTrashState(prev, idSet, !restore));
    if (viewerItemId && idSet.has(viewerItemId)) {
      setViewerItemId(null);
    }
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    showNotice(
      restore
        ? `Restored ${ids.length} item(s) to Library`
        : `Moved ${ids.length} item(s) to Recently Deleted`
    );
  };

  const handleRenameItem = (id: string, newName: string) => {
    setMediaItems((prev) => renameMediaItem(prev, id, newName));
    showNotice(`Renamed to ${newName}`);
  };

  const handleToggleFolder = (folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, included: !f.included } : f))
    );
  };

  const handleResetFolders = () => {
    setFolders((prev) =>
      prev.map((f) => ({ ...f, included: f.includedByDefault }))
    );
    showNotice('Folder isolation reset to DCIM/Camera');
  };

  // Crash-safe USB-OTG Mount / Unmount (Hot-Unplug Simulation)
  const handleToggleDriveMount = (driveId: string) => {
    const targetDrive = drives.find((d) => d.id === driveId);
    if (!targetDrive) return;
    const willMount = !targetDrive.isMounted;

    setDrives((prev) =>
      prev.map((d) => (d.id === driveId ? { ...d, isMounted: willMount } : d))
    );

    if (!willMount) {
      const resolution = resolveDriveDetachState({
        detachedDriveId: driveId,
        activeFilter,
        activeViewerItem,
      });
      if (resolution.closeViewer) {
        setViewerItemId(null);
        setEditorItemId(null);
      }
      if (resolution.wasViewingDetachedDrive) {
        setActiveFilter(resolution.nextFilter);
        setActiveTab('library');
        showNotice(`${targetDrive.label} ejected safely — returned to Library`);
      } else {
        showNotice(`${targetDrive.label} safely ejected`);
      }
    } else {
      showNotice(`${targetDrive.label} mounted via persisted SAF URI`);
    }
  };

  // Copy / Move execution across Internal Albums & External USB-OTG Drives
  const handleTransferToAlbum = (albumId: string, albumTitle: string) => {
    if (!transferRequest) return;
    setMediaItems((prev) =>
      transferMediaItems({
        items: prev,
        ids: new Set(transferRequest.ids),
        mode: transferRequest.mode,
        target: {
          kind: 'album',
          albumId,
          folderId: 'dcim-camera',
          folderName: 'DCIM/Camera',
          basePath: '/storage/emulated/0/DCIM/Camera',
        },
        idPrefix: `copy-${Date.now()}`,
      })
    );
    showNotice(
      `${transferRequest.mode === 'copy' ? 'Copied' : 'Moved'} ${transferRequest.ids.length} item(s) to ${albumTitle}`
    );
    setTransferRequest(null);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleTransferToDrive = (drive: ExternalDrive) => {
    if (!transferRequest) return;
    setMediaItems((prev) =>
      transferMediaItems({
        items: prev,
        ids: new Set(transferRequest.ids),
        mode: transferRequest.mode,
        target: { kind: 'drive', drive },
        idPrefix: `usbcopy-${Date.now()}`,
      })
    );
    showNotice(
      `${transferRequest.mode === 'copy' ? 'Copied' : 'Moved'} ${transferRequest.ids.length} item(s) to ${drive.label}`
    );
    setTransferRequest(null);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Mini Photo Editor Export (Save Copy or Overwrite Original)
  const handleEditorExport = (params: {
    mode: 'copy' | 'overwrite';
    dataUrl: string;
    width: number;
    height: number;
  }) => {
    if (!activeEditorItem) return;
    const { mode, dataUrl, width, height } = params;
    const mp = ((width * height) / 1_000_000).toFixed(1);
    const updatedResLabel = `${width} × ${height} · ${mp}MP`;

    if (mode === 'overwrite') {
      setMediaItems((prev) =>
        prev.map((m) =>
          m.id === activeEditorItem.id
            ? {
                ...m,
                src: dataUrl,
                exif: {
                  ...m.exif,
                  widthPx: width,
                  heightPx: height,
                  resolutionLabel: updatedResLabel,
                },
              }
            : m
        )
      );
      setEditorItemId(null);
      setViewerItemId(activeEditorItem.id);
      showNotice(
        `Overwrote ${activeEditorItem.filename} (${activeEditorItem.storageOrigin === 'external' ? 'USB-OTG' : 'Internal'})`
      );
    } else {
      const dotIdx = activeEditorItem.filename.lastIndexOf('.');
      const base =
        dotIdx > 0
          ? activeEditorItem.filename.slice(0, dotIdx)
          : activeEditorItem.filename;
      const copyFilename = `${base}_edited.jpg`;
      const lastSlash = activeEditorItem.filePath.lastIndexOf('/');
      const dir =
        lastSlash >= 0 ? activeEditorItem.filePath.slice(0, lastSlash + 1) : '/';
      const newId = `edited-${Date.now()}`;

      const copyItem: MediaItem = {
        ...activeEditorItem,
        id: newId,
        filename: copyFilename,
        filePath: `${dir}${copyFilename}`,
        src: dataUrl,
        capturedAt: new Date().toISOString(),
        kind: 'photo',
        exif: {
          ...activeEditorItem.exif,
          widthPx: width,
          heightPx: height,
          resolutionLabel: updatedResLabel,
          format: 'JPEG',
        },
      };

      setMediaItems((prev) => [copyItem, ...prev]);
      setEditorItemId(null);
      setViewerItemId(newId);
      showNotice(`Saved copy: ${copyFilename}`);
    }
  };

  return (
    <div
      className="min-h-screen relative transition-colors duration-200 overflow-x-clip"
      style={{
        backgroundColor: 'var(--surface-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Liquid Glass Mode Ambient Hero Refraction Layer */}
      {themeMode === 'glass' && heroBackdropSrc && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        >
          <img
            src={heroBackdropSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-125 blur-[72px] saturate-[1.85] opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07080c]/42 via-[#07080c]/36 to-[#07080c]/72" />
        </div>
      )}

      {/* Top Floating Translucent Header */}
      <TopBar
        activeFilter={activeFilter}
        totalVisibleCount={visibleItems.length}
        themeMode={themeMode}
        searchQuery={searchQuery}
        onBackToLibrary={handleBackToLibrary}
        onSearchChange={setSearchQuery}
        onSetThemeMode={setThemeMode}
        onOpenFolders={() => setFoldersSheetOpen(true)}
        onOpenAndroidSource={() => setAndroidSourceOpen(true)}
      />

      {/* Unified Single-View Content (Top: Tight Library Grid -> Bottom: Collections & Drives) */}
      <main className="relative z-10 pt-[72px] sm:pt-[80px]">
        <GalleryGrid
          items={visibleItems}
          density={density}
          isSelectionMode={isSelectionMode}
          selectedIds={selectedIds}
          onChangeDensity={setDensity}
          onOpenViewer={(item) => setViewerItemId(item.id)}
          onToggleSelect={toggleSelectItem}
          onClearSearch={() => setSearchQuery('')}
          hasActiveSearch={searchQuery.trim().length > 0}
        />

        {activeFilter.type === 'all' && (
          <CollectionsSection
            allItems={mediaItems}
            folders={folders}
            drives={drives}
            onSelectCollection={handleSelectCollection}
            onToggleDriveMount={handleToggleDriveMount}
            onOpenFolders={() => setFoldersSheetOpen(true)}
          />
        )}

        {/* Sub-view bottom breathing room */}
        {activeFilter.type !== 'all' && <div className="h-28" />}
      </main>

      {/* Floating iOS-Style Bottom Pill Bar */}
      <FloatingBottomPill
        activeTab={activeTab}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        isTrashView={activeFilter.type === 'trash'}
        onSelectTab={handleSelectTab}
        onToggleSelectionMode={() => {
          setIsSelectionMode((prev) => !prev);
          setSelectedIds(new Set());
        }}
        onBatchFavorite={handleBatchFavorite}
        onBatchCopy={() =>
          setTransferRequest({ ids: Array.from(selectedIds), mode: 'copy' })
        }
        onBatchMove={() =>
          setTransferRequest({ ids: Array.from(selectedIds), mode: 'move' })
        }
        onBatchShare={() => {
          showNotice(`Prepared ${selectedIds.size} file(s) for system Share Sheet`);
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        }}
        onBatchDeleteOrRestore={() =>
          handleDeleteOrRestoreIds(
            Array.from(selectedIds),
            activeFilter.type === 'trash'
          )
        }
      />

      {/* Full-Screen 120Hz-Style Media Viewer & Leica EXIF Sheet */}
      {activeViewerItem && !activeEditorItem && (
        <MediaViewerModal
          item={activeViewerItem}
          allVisibleItems={visibleItems}
          onClose={() => setViewerItemId(null)}
          onNavigate={(nextItem) => setViewerItemId(nextItem.id)}
          onOpenEditor={(item) => setEditorItemId(item.id)}
          onToggleFavorite={handleToggleFavorite}
          onRename={handleRenameItem}
          onRequestTransfer={(ids, mode) => setTransferRequest({ ids, mode })}
          onDeleteOrRestore={(id) =>
            handleDeleteOrRestoreIds([id], activeViewerItem.isTrashed)
          }
          onShare={(item) =>
            showNotice(`Shared ${item.filename} via FileProvider URI`)
          }
        />
      )}

      {/* Built-In Mini Photo Editor (Mirror, Rotate, Crop Only) */}
      {activeEditorItem && (
        <MiniImageEditorModal
          item={activeEditorItem}
          onCancel={() => setEditorItemId(null)}
          onExportComplete={handleEditorExport}
        />
      )}

      {/* Strict Folder Isolation Manager */}
      {foldersSheetOpen && (
        <IncludedFoldersSheet
          folders={folders}
          allItems={mediaItems}
          onToggleFolder={handleToggleFolder}
          onResetDefaults={handleResetFolders}
          onClose={() => setFoldersSheetOpen(false)}
        />
      )}

      {/* Copy / Move Destination Sheet */}
      {transferRequest && (
        <FileTransferSheet
          mode={transferRequest.mode}
          itemCount={transferRequest.ids.length}
          drives={drives}
          onSelectAlbumTarget={handleTransferToAlbum}
          onSelectDriveTarget={handleTransferToDrive}
          onClose={() => setTransferRequest(null)}
        />
      )}

      {/* Complete Android 16 / HyperOS 3 Kotlin & Jetpack Compose Project Studio */}
      {androidSourceOpen && (
        <AndroidSourceModal onClose={() => setAndroidSourceOpen(false)} />
      )}

      {/* Transient Accessible Action Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full liquid-glass-surface text-xs font-semibold shadow-xl whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
