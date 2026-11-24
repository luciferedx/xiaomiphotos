export type ThemeMode = 'light' | 'amoled' | 'glass';

export type GridDensity = '3col' | '5col' | 'compact';

export type ActiveTab = 'library' | 'albums' | 'drives';

export type MediaKind = 'photo' | 'raw' | 'video' | 'screenshot';

export type StorageOrigin = 'internal' | 'external';

export type CropAspectPreset =
  | 'freeform'
  | 'original'
  | '1:1'
  | '4:3'
  | '16:9'
  | '9:16';

export interface ExifMetadata {
  cameraModel: string;
  lensName: string;
  focalLengthMm: 14 | 23 | 70 | 100;
  aperture: string;
  iso: number;
  shutterSpeed: string;
  resolutionLabel: string;
  widthPx: number;
  heightPx: number;
  fileSizeMb: number;
  colorProfile: 'DCI-P3' | 'Display P3 · 14-bit DNG' | 'Dolby Vision · 10-bit HLG' | 'sRGB';
  format: 'JPEG' | 'HEIC' | 'DNG' | 'MP4';
  durationSec?: number;
}

export interface MediaItem {
  id: string;
  filename: string;
  src: string;
  alt: string;
  capturedAt: string; // ISO date string
  monthKey: string; // e.g. "2026-11"
  monthLabel: string; // e.g. "November 2026"
  folderId: string;
  folderName: string;
  albumIds: string[];
  storageOrigin: StorageOrigin;
  driveId?: string;
  filePath: string;
  kind: MediaKind;
  isFavorite: boolean;
  isTrashed: boolean;
  exif: ExifMetadata;
}

export interface MediaFolder {
  id: string;
  name: string;
  relativePath: string;
  includedByDefault: boolean;
  included: boolean;
  isClutterSource: boolean;
  description: string;
}

export interface ExternalDrive {
  id: string;
  label: string;
  controller: string;
  mountPath: string;
  treeUri: string;
  capacityGb: number;
  usedGb: number;
  isMounted: boolean;
  hasPersistablePermission: boolean;
  busSpeed: string;
}

export interface NormalizedCropRect {
  x: number; // 0..1
  y: number; // 0..1
  width: number; // 0.08..1
  height: number; // 0.08..1
}

export interface EditTransformState {
  mirrorX: boolean;
  mirrorY: boolean;
  quarterTurns: 0 | 1 | 2 | 3; // 90 deg increments clockwise
  straightenDeg: number; // -45 to +45
  aspectPreset: CropAspectPreset;
  aspectOrientation: 'landscape' | 'portrait';
  cropRect: NormalizedCropRect;
}

export interface CollectionFilter {
  type: 'all' | 'album' | 'mediaType' | 'drive' | 'trash' | 'favorites';
  id?: string;
  title: string;
}

export interface AndroidSourceFile {
  path: string;
  category: 'Gradle' | 'Manifest & Icons' | 'Theme & Glass' | 'Storage & USB-OTG' | 'UI Screens' | 'Image Pipeline';
  language: 'kotlin' | 'xml' | 'gradle';
  summary: string;
  content: string;
}
