import React from 'react';
import { Check, Folder, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { MediaFolder, MediaItem } from '../types/media';

interface IncludedFoldersSheetProps {
  folders: MediaFolder[];
  allItems: MediaItem[];
  onToggleFolder: (folderId: string) => void;
  onResetDefaults: () => void;
  onClose: () => void;
}

export const IncludedFoldersSheet: React.FC<IncludedFoldersSheetProps> = ({
  folders,
  allItems,
  onToggleFolder,
  onResetDefaults,
  onClose,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Included Folders Manager"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-[var(--hairline)] p-5 sm:p-6 shadow-2xl max-h-[86vh] flex flex-col"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Included Folders
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Strict folder isolation keeps messaging apps and caches out of your main Library.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close included folders"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-[var(--hairline)] -mx-2 px-2">
          {folders.map((folder) => {
            const count = allItems.filter(
              (item) =>
                !item.isTrashed &&
                item.storageOrigin === 'internal' &&
                item.folderId === folder.id
            ).length;

            return (
              <button
                key={folder.id}
                type="button"
                role="switch"
                aria-checked={folder.included}
                aria-label={`${folder.included ? 'Exclude' : 'Include'} ${folder.name}`}
                onClick={() => onToggleFolder(folder.id)}
                className="w-full py-3.5 px-2 flex items-center justify-between gap-3 text-left rounded-xl transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: folder.isClutterSource
                        ? 'rgba(255, 159, 10, 0.14)'
                        : 'rgba(10, 132, 255, 0.14)',
                      color: folder.isClutterSource
                        ? '#ff9f0a'
                        : 'var(--accent)',
                    }}
                  >
                    {folder.isClutterSource ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <Folder className="w-4 h-4" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {folder.name}
                      </span>
                      <span
                        className="text-xs font-mono tabular-nums"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {count}
                      </span>
                    </div>
                    <p
                      className="text-[11px] font-mono truncate mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {folder.relativePath}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {folder.description}
                    </p>
                  </div>
                </div>

                <span
                  className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: folder.included
                      ? 'var(--accent)'
                      : 'transparent',
                    borderColor: folder.included
                      ? 'var(--accent)'
                      : 'var(--hairline)',
                    color: '#FFFFFF',
                  }}
                >
                  {folder.included && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-[var(--hairline)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onResetDefaults}
            className="h-10 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border border-[var(--hairline)] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Camera Only Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-xl text-xs font-semibold"
            style={{
              backgroundColor: 'var(--pill-active-bg)',
              color: 'var(--pill-active-text)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
