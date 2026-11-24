import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, FolderTree, X } from 'lucide-react';
import { ANDROID_PROJECT_FILES } from '../data/androidProjectFiles';
import { AndroidSourceFile } from '../types/media';
import { buildZipArchive } from '../utils/zipBuilder';
import { AppMonochromeIcon } from './AppMonochromeIcon';

interface AndroidSourceModalProps {
  onClose: () => void;
}

const CATEGORIES: Array<'All' | AndroidSourceFile['category']> = [
  'All',
  'Gradle',
  'Manifest & Icons',
  'Theme & Glass',
  'Storage & USB-OTG',
  'UI Screens',
  'Image Pipeline',
];

export const AndroidSourceModal: React.FC<AndroidSourceModalProps> = ({
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'All' | AndroidSourceFile['category']
  >('All');
  const [selectedPath, setSelectedPath] = useState<string>(
    ANDROID_PROJECT_FILES[0].path
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const visibleFiles = useMemo(
    () =>
      selectedCategory === 'All'
        ? ANDROID_PROJECT_FILES
        : ANDROID_PROJECT_FILES.filter((f) => f.category === selectedCategory),
    [selectedCategory]
  );

  const activeFile =
    ANDROID_PROJECT_FILES.find((f) => f.path === selectedPath) ||
    visibleFiles[0] ||
    ANDROID_PROJECT_FILES[0];

  const handleCopyFile = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedPath(activeFile.path);
      window.setTimeout(() => setCopiedPath(null), 1600);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  const handleDownloadZip = () => {
    const zipBytes = buildZipArchive(
      ANDROID_PROJECT_FILES.map((file) => ({
        path: `Photos-Xiaomi15Ultra/${file.path}`,
        content: file.content,
      }))
    );
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
      type: 'application/zip',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Photos-Xiaomi15Ultra-Android16.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  };

  const lines = useMemo(() => activeFile.content.split('\n'), [activeFile]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Android 16 Kotlin and Jetpack Compose Source Project"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[92vh] rounded-3xl bg-[#0D0E12] text-white border border-white/15 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Studio Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <AppMonochromeIcon size={34} variant="dark" mask="squircle" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                Photos — Android 16 / HyperOS 3 Project Source
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                Jetpack Compose · Kotlin 2.1 · Coil 3 · Media3 ExoPlayer · Haze AGSL Glass · SAF USB-OTG · {ANDROID_PROJECT_FILES.length} files
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadZip}
              className="h-9 px-4 rounded-xl bg-white text-black text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              {downloaded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>ZIP Ready</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Android Project (.zip)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Android source studio"
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Strip + HyperOS 3 Adaptive Icon Showcase */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] shrink-0">
          <div
            className="flex items-center gap-1 overflow-x-auto no-scrollbar"
            role="tablist"
            aria-label="Android source categories"
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedCategory(cat);
                    const nextList =
                      cat === 'All'
                        ? ANDROID_PROJECT_FILES
                        : ANDROID_PROJECT_FILES.filter(
                            (f) => f.category === cat
                          );
                    if (nextList[0]) setSelectedPath(nextList[0].path);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Minimal Monochrome Adaptive Icon Mask Preview */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-zinc-400">
            <span>HyperOS 3 Icon Masks:</span>
            <div className="flex items-center gap-2">
              <AppMonochromeIcon size={24} variant="dark" mask="squircle" />
              <AppMonochromeIcon size={24} variant="light" mask="rounded" />
              <AppMonochromeIcon size={24} variant="dark" mask="circle" />
              <AppMonochromeIcon size={24} variant="monet" mask="squircle" />
            </div>
          </div>
        </div>

        {/* Two-Pane Project Tree + Code Inspector */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left File Tree */}
          <aside
            aria-label="Android project files"
            className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto p-3 space-y-1 max-h-44 md:max-h-none shrink-0 bg-[#0A0B0E]"
          >
            <div className="px-2 py-1.5 flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Photos-Xiaomi15Ultra/</span>
            </div>
            {visibleFiles.map((file) => {
              const active = file.path === activeFile.path;
              const shortName = file.path.split('/').pop() || file.path;
              const parentDir = file.path.includes('/')
                ? file.path.slice(0, file.path.lastIndexOf('/'))
                : 'root';
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-start gap-2.5 ${
                    active
                      ? 'bg-white/12 text-white'
                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                  }`}
                >
                  <FileCode2 className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold truncate">
                      {shortName}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-500 truncate">
                      {parentDir}
                    </p>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Right Code Panel */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#0E1016]">
            <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-mono font-semibold text-white truncate">
                  {activeFile.path}
                </p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {activeFile.summary}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyFile}
                className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copiedPath === activeFile.path ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03]">
                      <td className="pr-4 text-right select-none text-zinc-600 tabular-nums align-top w-10">
                        {idx + 1}
                      </td>
                      <td className="whitespace-pre text-zinc-200">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
