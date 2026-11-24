import {
  CollectionFilter,
  ExternalDrive,
  GridDensity,
  MediaFolder,
  MediaItem,
} from '../types/media';

export interface MonthSection {
  monthKey: string;
  monthLabel: string;
  items: MediaItem[];
}

/**
 * Deterministic filter implementing Strict Folder Isolation + Collection filtering
 * + zero-AI filename/date/folder/focal-length search.
 */
export function filterVisibleMedia(
  allItems: MediaItem[],
  folders: MediaFolder[],
  drives: ExternalDrive[],
  activeFilter: CollectionFilter,
  searchQuery: string
): MediaItem[] {
  const includedFolderIds = new Set(
    folders.filter((f) => f.included).map((f) => f.id)
  );
  const mountedDriveIds = new Set(
    drives.filter((d) => d.isMounted).map((d) => d.id)
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return allItems
    .filter((item) => {
      // Trash isolation
      if (activeFilter.type === 'trash') {
        return item.isTrashed;
      }
      if (item.isTrashed) {
        return false;
      }

      // External drive mount safety: never show unmounted drive items
      if (item.storageOrigin === 'external') {
        if (!item.driveId || !mountedDriveIds.has(item.driveId)) {
          return false;
        }
      }

      // Filter by active collection
      switch (activeFilter.type) {
        case 'all':
          // Strict folder isolation: main Library shows ONLY internal whitelisted folders
          if (item.storageOrigin !== 'internal') return false;
          if (!includedFolderIds.has(item.folderId)) return false;
          break;
        case 'favorites':
          if (!item.isFavorite) return false;
          break;
        case 'album':
          if (!activeFilter.id || !item.albumIds.includes(activeFilter.id)) {
            return false;
          }
          break;
        case 'mediaType':
          if (activeFilter.id && item.kind !== activeFilter.id) {
            return false;
          }
          break;
        case 'drive':
          if (item.storageOrigin !== 'external' || item.driveId !== activeFilter.id) {
            return false;
          }
          break;
      }

      // Deterministic search: filename, date, folder, lens/focal length, format
      if (normalizedQuery.length > 0) {
        const haystack = [
          item.filename,
          item.monthLabel,
          item.capturedAt.slice(0, 10),
          item.folderName,
          item.filePath,
          `${item.exif.focalLengthMm}mm`,
          item.exif.lensName,
          item.exif.format,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      }

      return true;
    })
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

/**
 * Group chronologically sorted media items into month sections for floating date headers
 * and right-edge scrubber indexing.
 */
export function groupMediaByMonth(items: MediaItem[]): MonthSection[] {
  const map = new Map<string, MonthSection>();
  for (const item of items) {
    const existing = map.get(item.monthKey);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(item.monthKey, {
        monthKey: item.monthKey,
        monthLabel: item.monthLabel,
        items: [item],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.monthKey.localeCompare(a.monthKey)
  );
}

/**
 * Cycle grid density when zooming in/out (pinch or wheel).
 */
export function stepGridDensity(
  current: GridDensity,
  direction: 'zoomIn' | 'zoomOut'
): GridDensity {
  const order: GridDensity[] = ['3col', '5col', 'compact'];
  const idx = order.indexOf(current);
  if (direction === 'zoomOut') {
    return order[Math.min(order.length - 1, idx + 1)];
  }
  return order[Math.max(0, idx - 1)];
}

/**
 * Crash-safe USB-OTG hot-unplug state resolver:
 * If the user is actively viewing a drive or a photo inside a drive that was just detached,
 * fall back cleanly to the main Library feed with a user-facing notice.
 */
export function resolveDriveDetachState(params: {
  detachedDriveId: string;
  activeFilter: CollectionFilter;
  activeViewerItem: MediaItem | null;
}): {
  nextFilter: CollectionFilter;
  closeViewer: boolean;
  wasViewingDetachedDrive: boolean;
} {
  const viewingDetachedCollection =
    params.activeFilter.type === 'drive' &&
    params.activeFilter.id === params.detachedDriveId;
  const viewingDetachedPhoto =
    params.activeViewerItem?.storageOrigin === 'external' &&
    params.activeViewerItem.driveId === params.detachedDriveId;

  if (viewingDetachedCollection || viewingDetachedPhoto) {
    return {
      nextFilter: { type: 'all', title: 'Photos' },
      closeViewer: Boolean(viewingDetachedPhoto),
      wasViewingDetachedDrive: true,
    };
  }

  return {
    nextFilter: params.activeFilter,
    closeViewer: false,
    wasViewingDetachedDrive: false,
  };
}

/**
 * Deterministic copy/move/rename/delete/restore pure helpers.
 */
export function renameMediaItem(
  items: MediaItem[],
  itemId: string,
  rawNewName: string
): MediaItem[] {
  const trimmed = rawNewName.trim();
  if (!trimmed) return items;
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const lastSlash = item.filePath.lastIndexOf('/');
    const dir = lastSlash >= 0 ? item.filePath.slice(0, lastSlash + 1) : '/';
    return {
      ...item,
      filename: trimmed,
      filePath: `${dir}${trimmed}`,
    };
  });
}

export function setTrashState(
  items: MediaItem[],
  ids: Set<string>,
  trashed: boolean
): MediaItem[] {
  return items.map((item) =>
    ids.has(item.id) ? { ...item, isTrashed: trashed } : item
  );
}

export function transferMediaItems(params: {
  items: MediaItem[];
  ids: Set<string>;
  mode: 'copy' | 'move';
  target:
    | { kind: 'album'; albumId: string; folderId: string; folderName: string; basePath: string }
    | { kind: 'drive'; drive: ExternalDrive };
  idPrefix?: string;
}): MediaItem[] {
  const { items, ids, mode, target, idPrefix = 'copy' } = params;

  if (mode === 'move') {
    return items.map((item) => {
      if (!ids.has(item.id)) return item;
      if (target.kind === 'drive') {
        return {
          ...item,
          storageOrigin: 'external',
          driveId: target.drive.id,
          folderId: `ext-${target.drive.id}`,
          folderName: target.drive.label,
          filePath: `${target.drive.mountPath}/${item.filename}`,
        };
      }
      const nextAlbums = item.albumIds.includes(target.albumId)
        ? item.albumIds
        : [...item.albumIds, target.albumId];
      return {
        ...item,
        storageOrigin: 'internal',
        driveId: undefined,
        folderId: target.folderId,
        folderName: target.folderName,
        albumIds: nextAlbums,
        filePath: `${target.basePath}/${item.filename}`,
      };
    });
  }

  // Copy mode preserves originals and creates deterministic duplicates
  const duplicates: MediaItem[] = [];
  let counter = 1;
  for (const item of items) {
    if (!ids.has(item.id)) continue;
    const dotIdx = item.filename.lastIndexOf('.');
    const base = dotIdx > 0 ? item.filename.slice(0, dotIdx) : item.filename;
    const ext = dotIdx > 0 ? item.filename.slice(dotIdx) : '';
    const copyName = `${base}_copy${ext}`;
    const newId = `${idPrefix}-${item.id}-${counter++}`;

    if (target.kind === 'drive') {
      duplicates.push({
        ...item,
        id: newId,
        filename: copyName,
        storageOrigin: 'external',
        driveId: target.drive.id,
        folderId: `ext-${target.drive.id}`,
        folderName: target.drive.label,
        filePath: `${target.drive.mountPath}/${copyName}`,
      });
    } else {
      const nextAlbums = item.albumIds.includes(target.albumId)
        ? item.albumIds
        : [...item.albumIds, target.albumId];
      duplicates.push({
        ...item,
        id: newId,
        filename: copyName,
        storageOrigin: 'internal',
        driveId: undefined,
        folderId: target.folderId,
        folderName: target.folderName,
        albumIds: nextAlbums,
        filePath: `${target.basePath}/${copyName}`,
      });
    }
  }

  return [...duplicates, ...items];
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
