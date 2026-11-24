import React from 'react';
import {
  Camera,
  ChevronRight,
  Film,
  FolderCheck,
  HardDrive,
  Heart,
  MonitorSmartphone,
  PlugZap,
  Trash2,
  Unplug,
} from 'lucide-react';
import { ALBUM_DEFINITIONS } from '../data/seedLibrary';
import {
  CollectionFilter,
  ExternalDrive,
  MediaFolder,
  MediaItem,
} from '../types/media';

interface CollectionsSectionProps {
  allItems: MediaItem[];
  folders: MediaFolder[];
  drives: ExternalDrive[];
  onSelectCollection: (filter: CollectionFilter) => void;
  onToggleDriveMount: (driveId: string) => void;
  onOpenFolders: () => void;
}

export const CollectionsSection: React.FC<CollectionsSectionProps> = ({
  allItems,
  folders,
  drives,
  onSelectCollection,
  onToggleDriveMount,
  onOpenFolders,
}) => {
  const activeItems = allItems.filter((item) => !item.isTrashed);
  const mountedDriveIds = new Set(
    drives.filter((d) => d.isMounted).map((d) => d.id)
  );
  const reachableActive = activeItems.filter(
    (item) =>
      item.storageOrigin === 'internal' ||
      (item.driveId && mountedDriveIds.has(item.driveId))
  );

  const videoCount = reachableActive.filter((i) => i.kind === 'video').length;
  const favCount = reachableActive.filter((i) => i.isFavorite).length;
  const rawCount = reachableActive.filter((i) => i.kind === 'raw').length;
  const screenshotCount = reachableActive.filter(
    (i) => i.kind === 'screenshot'
  ).length;
  const trashCount = allItems.filter((i) => i.isTrashed).length;
  const includedFolderCount = folders.filter((f) => f.included).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-28 space-y-12">
      {/* Hairline section separator */}
      <div
        className="h-px w-full"
        style={{ backgroundColor: 'var(--hairline)' }}
      />

      {/* Section 1: Albums & Pinned Collections */}
      <section id="section-albums" aria-labelledby="heading-albums" className="scroll-mt-24">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2
              id="heading-albums"
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Albums &amp; Pinned Collections
            </h2>
            <p
              className="text-xs sm:text-sm mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Deterministic lens, folder, and curated sets with zero automated clutter
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {ALBUM_DEFINITIONS.map((album) => {
            const albumItems = reachableActive.filter((i) =>
              i.albumIds.includes(album.id)
            );
            const cover = albumItems[0];
            return (
              <button
                key={album.id}
                type="button"
                onClick={() =>
                  onSelectCollection({
                    type: 'album',
                    id: album.id,
                    title: album.title,
                  })
                }
                className="group text-left liquid-glass-card rounded-2xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-900 relative">
                  {cover ? (
                    <img
                      src={cover.src}
                      alt={album.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                      Empty
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/65 to-transparent" />
                  <span className="absolute bottom-2 right-2.5 text-[11px] font-mono tabular-nums font-semibold text-white">
                    {albumItems.length}
                  </span>
                </div>

                <div className="p-3">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {album.title}
                  </p>
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {album.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Media Types & Folder Isolation Utilities (2-column balanced desktop split) */}
      <section aria-labelledby="heading-utilities" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="liquid-glass-card rounded-2xl p-5">
          <h3
            id="heading-utilities"
            className="text-base font-bold tracking-tight mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Media Types
          </h3>
          <div className="divide-y divide-[var(--hairline)]">
            {[
              {
                label: 'Videos',
                detail: '4K & 8K Dolby Vision',
                count: videoCount,
                icon: Film,
                filter: { type: 'mediaType', id: 'video', title: 'Videos' } as CollectionFilter,
              },
              {
                label: 'Favorites',
                detail: 'Starred captures',
                count: favCount,
                icon: Heart,
                filter: { type: 'favorites', title: 'Favorites' } as CollectionFilter,
              },
              {
                label: 'RAW / DNG',
                detail: '14-bit Leica UltraRAW',
                count: rawCount,
                icon: Camera,
                filter: { type: 'mediaType', id: 'raw', title: 'RAW / DNG' } as CollectionFilter,
              },
              {
                label: 'Screenshots',
                detail: 'Isolated from main feed',
                count: screenshotCount,
                icon: MonitorSmartphone,
                filter: {
                  type: 'mediaType',
                  id: 'screenshot',
                  title: 'Screenshots',
                } as CollectionFilter,
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => onSelectCollection(row.filter)}
                  className="w-full min-h-[54px] py-2.5 flex items-center justify-between gap-3 text-left transition-opacity hover:opacity-80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: 'rgba(128,128,128,0.12)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {row.label}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {row.detail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-xs font-mono tabular-nums font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {row.count}
                    </span>
                    <ChevronRight
                      className="w-4 h-4"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Folder Isolation & Recycle Bin */}
        <div className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3
              className="text-base font-bold tracking-tight mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Utilities &amp; Storage Guardrails
            </h3>
            <div className="divide-y divide-[var(--hairline)]">
              <button
                type="button"
                onClick={onOpenFolders}
                className="w-full min-h-[58px] py-3 flex items-center justify-between gap-3 text-left transition-opacity hover:opacity-80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'rgba(128,128,128,0.12)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <FolderCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Included Folders
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      DCIM/Camera whitelisted · WhatsApp &amp; cache isolated
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-xs font-mono tabular-nums font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {includedFolderCount}/{folders.length}
                  </span>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSelectCollection({
                    type: 'trash',
                    title: 'Recently Deleted',
                  })
                }
                className="w-full min-h-[58px] py-3 flex items-center justify-between gap-3 text-left transition-opacity hover:opacity-80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'rgba(255,69,58,0.14)',
                      color: '#ff453a',
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Recently Deleted
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Recoverable trash bin across local storage
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-xs font-mono tabular-nums font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {trashCount}
                  </span>
                  <ChevronRight
                    className="w-4 h-4"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                </div>
              </button>
            </div>
          </div>

          <p
            className="text-xs pt-4 mt-4 border-t border-[var(--hairline)] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Zero cloud prompts, zero facial clustering, and zero background indexing outside your whitelisted folders.
          </p>
        </div>
      </section>

      {/* Section 3: External NVMe & USB-OTG Drives */}
      <section id="section-drives" aria-labelledby="heading-drives" className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <div>
            <h2
              id="heading-drives"
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              External Drives (USB-OTG &amp; NVMe)
            </h2>
            <p
              className="text-xs sm:text-sm mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              SAF persistable DocumentTree access with crash-safe hot-unplug detection
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drives.map((drive) => {
            const driveItems = activeItems.filter(
              (item) => item.driveId === drive.id
            );
            const usagePct = Math.round((drive.usedGb / drive.capacityGb) * 100);

            return (
              <div
                key={drive.id}
                className="liquid-glass-card rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: drive.isMounted
                          ? 'rgba(10,132,255,0.14)'
                          : 'rgba(128,128,128,0.14)',
                        color: drive.isMounted
                          ? 'var(--accent)'
                          : 'var(--text-tertiary)',
                      }}
                    >
                      <HardDrive className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-base font-bold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {drive.label}
                      </p>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {drive.controller} · {drive.busSpeed}
                      </p>
                      <p
                        className="text-[11px] font-mono mt-1 truncate"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {drive.isMounted
                          ? `${driveItems.length} files · ${drive.usedGb} GB / ${drive.capacityGb} GB`
                          : 'Detached · Persisted SAF URI retained'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Storage usage bar */}
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: drive.isMounted ? `${usagePct}%` : '0%',
                        backgroundColor: 'var(--accent)',
                      }}
                    />
                  </div>
                  <p
                    className="text-[11px] font-mono truncate"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {drive.mountPath}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!drive.isMounted}
                    onClick={() =>
                      onSelectCollection({
                        type: 'drive',
                        id: drive.id,
                        title: drive.label,
                      })
                    }
                    className="flex-1 h-10 px-4 rounded-xl text-xs font-semibold whitespace-nowrap disabled:opacity-40 transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--pill-active-bg)',
                      color: 'var(--pill-active-text)',
                    }}
                  >
                    Browse Drive ({driveItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleDriveMount(drive.id)}
                    aria-label={
                      drive.isMounted
                        ? `Safely eject ${drive.label}`
                        : `Mount ${drive.label}`
                    }
                    className="h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap border border-[var(--hairline)] flex items-center gap-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {drive.isMounted ? (
                      <>
                        <Unplug className="w-3.5 h-3.5" />
                        <span>Safely Eject</span>
                      </>
                    ) : (
                      <>
                        <PlugZap className="w-3.5 h-3.5" />
                        <span>Mount USB</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
