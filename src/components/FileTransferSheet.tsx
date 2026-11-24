import React from 'react';
import { Folder, HardDrive, X } from 'lucide-react';
import { ALBUM_DEFINITIONS } from '../data/seedLibrary';
import { ExternalDrive } from '../types/media';

interface FileTransferSheetProps {
  mode: 'copy' | 'move';
  itemCount: number;
  drives: ExternalDrive[];
  onSelectAlbumTarget: (albumId: string, albumTitle: string) => void;
  onSelectDriveTarget: (drive: ExternalDrive) => void;
  onClose: () => void;
}

export const FileTransferSheet: React.FC<FileTransferSheetProps> = ({
  mode,
  itemCount,
  drives,
  onSelectAlbumTarget,
  onSelectDriveTarget,
  onClose,
}) => {
  const mountedDrives = drives.filter((d) => d.isMounted);
  const verb = mode === 'copy' ? 'Copy' : 'Move';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${verb} ${itemCount} item(s)`}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[var(--hairline)] p-5 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {verb} {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Choose a local album or mounted USB-OTG / NVMe destination
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel file transfer"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto">
          {mountedDrives.length > 0 && (
            <div>
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                External Drives (SAF / USB-OTG)
              </p>
              <div className="space-y-1.5">
                {mountedDrives.map((drive) => (
                  <button
                    key={drive.id}
                    type="button"
                    onClick={() => onSelectDriveTarget(drive)}
                    className="w-full p-3 rounded-xl border border-[var(--hairline)] flex items-center gap-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <HardDrive
                      className="w-4 h-4 shrink-0"
                      style={{ color: 'var(--accent)' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {drive.label}
                      </p>
                      <p
                        className="text-[11px] font-mono truncate"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {drive.mountPath}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p
              className="text-xs font-semibold mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Internal Storage Albums
            </p>
            <div className="space-y-1.5">
              {ALBUM_DEFINITIONS.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => onSelectAlbumTarget(album.id, album.title)}
                  className="w-full p-3 rounded-xl border border-[var(--hairline)] flex items-center gap-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Folder
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {album.title}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {album.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
