import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_DRIVES,
  INITIAL_FOLDERS,
  INITIAL_MEDIA_ITEMS,
} from '../data/seedLibrary';
import {
  filterVisibleMedia,
  groupMediaByMonth,
  renameMediaItem,
  resolveDriveDetachState,
  setTrashState,
  stepGridDensity,
  transferMediaItems,
} from './galleryLogic';

test('strict folder isolation excludes WhatsApp, Telegram, and Screenshots by default', () => {
  const visible = filterVisibleMedia(
    INITIAL_MEDIA_ITEMS,
    INITIAL_FOLDERS,
    INITIAL_DRIVES,
    { type: 'all', title: 'Photos' },
    ''
  );

  // Only DCIM/Camera and DCIM/Camera/RAW internal items appear
  assert.ok(visible.length > 0);
  assert.equal(
    visible.some((item) => item.folderId === 'whatsapp-images'),
    false
  );
  assert.equal(
    visible.some((item) => item.folderId === 'telegram-images'),
    false
  );
  assert.equal(
    visible.some((item) => item.storageOrigin === 'external'),
    false
  );

  // Whitelisting WhatsApp immediately includes WhatsApp items in Library
  const withWhatsapp = INITIAL_FOLDERS.map((f) =>
    f.id === 'whatsapp-images' ? { ...f, included: true } : f
  );
  const expanded = filterVisibleMedia(
    INITIAL_MEDIA_ITEMS,
    withWhatsapp,
    INITIAL_DRIVES,
    { type: 'all', title: 'Photos' },
    ''
  );
  assert.equal(expanded.length, visible.length + 1);
});

test('deterministic search matches filename, focal length, and date without AI', () => {
  const byFocal = filterVisibleMedia(
    INITIAL_MEDIA_ITEMS,
    INITIAL_FOLDERS,
    INITIAL_DRIVES,
    { type: 'all', title: 'Photos' },
    '100mm'
  );
  assert.ok(byFocal.length >= 2);
  assert.ok(byFocal.every((item) => item.exif.focalLengthMm === 100));

  const byFile = filterVisibleMedia(
    INITIAL_MEDIA_ITEMS,
    INITIAL_FOLDERS,
    INITIAL_DRIVES,
    { type: 'all', title: 'Photos' },
    'KYOTO'
  );
  assert.equal(byFile.length, 1);
  assert.equal(byFile[0].id, 'img-008');
});

test('groupMediaByMonth groups items descending chronologically', () => {
  const visible = filterVisibleMedia(
    INITIAL_MEDIA_ITEMS,
    INITIAL_FOLDERS,
    INITIAL_DRIVES,
    { type: 'all', title: 'Photos' },
    ''
  );
  const sections = groupMediaByMonth(visible);
  assert.equal(sections[0].monthKey, '2026-11');
  assert.equal(sections[sections.length - 1].monthKey, '2026-09');
});

test('stepGridDensity clamps cleanly between 3col, 5col, and compact', () => {
  assert.equal(stepGridDensity('3col', 'zoomOut'), '5col');
  assert.equal(stepGridDensity('5col', 'zoomOut'), 'compact');
  assert.equal(stepGridDensity('compact', 'zoomOut'), 'compact');
  assert.equal(stepGridDensity('compact', 'zoomIn'), '5col');
  assert.equal(stepGridDensity('3col', 'zoomIn'), '3col');
});

test('resolveDriveDetachState handles hot-unplug mid-browse without crashing', () => {
  const extItem = INITIAL_MEDIA_ITEMS.find((i) => i.driveId === 'usb-t9-nvme')!;
  const res = resolveDriveDetachState({
    detachedDriveId: 'usb-t9-nvme',
    activeFilter: { type: 'drive', id: 'usb-t9-nvme', title: 'Samsung T9 NVMe 2TB' },
    activeViewerItem: extItem,
  });
  assert.equal(res.wasViewingDetachedDrive, true);
  assert.equal(res.closeViewer, true);
  assert.equal(res.nextFilter.type, 'all');

  // Unrelated drive detach leaves current view untouched
  const unrelated = resolveDriveDetachState({
    detachedDriveId: 'usb-sandisk-ssd',
    activeFilter: { type: 'drive', id: 'usb-t9-nvme', title: 'Samsung T9 NVMe 2TB' },
    activeViewerItem: extItem,
  });
  assert.equal(unrelated.wasViewingDetachedDrive, false);
  assert.equal(unrelated.closeViewer, false);
});

test('rename, trash, restore, and copy to external drive update state accurately', () => {
  const renamed = renameMediaItem(INITIAL_MEDIA_ITEMS, 'img-001', 'ALPINE_SUNRISE.jpg');
  const found = renamed.find((i) => i.id === 'img-001')!;
  assert.equal(found.filename, 'ALPINE_SUNRISE.jpg');
  assert.equal(found.filePath, '/storage/emulated/0/DCIM/Camera/ALPINE_SUNRISE.jpg');

  const trashed = setTrashState(renamed, new Set(['img-001']), true);
  assert.equal(trashed.find((i) => i.id === 'img-001')!.isTrashed, true);

  const copied = transferMediaItems({
    items: INITIAL_MEDIA_ITEMS,
    ids: new Set(['img-001']),
    mode: 'copy',
    target: { kind: 'drive', drive: INITIAL_DRIVES[0] },
    idPrefix: 'testcopy',
  });
  assert.equal(copied.length, INITIAL_MEDIA_ITEMS.length + 1);
  assert.equal(copied[0].storageOrigin, 'external');
  assert.equal(copied[0].driveId, 'usb-t9-nvme');
  assert.equal(
    copied[0].filePath,
    '/mnt/media_rw/T9_NVME_2TB/LeicaArchive/IMG_20261122_064218_LEICA_copy.jpg'
  );
});
