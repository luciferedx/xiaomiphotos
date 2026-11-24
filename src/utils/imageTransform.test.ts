import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampCropRect,
  createInitialTransformState,
  fitCropRectToAspect,
  getPresetTargetRatio,
  getTotalRotationDegrees,
  hasPendingEdits,
  normalizeStraightenAngle,
  rotateQuarterTurn,
} from './imageTransform';
import { buildZipArchive, crc32 } from './zipBuilder';

test('mirror, 90deg rotation, and straighten detent math work accurately', () => {
  assert.equal(rotateQuarterTurn(0, 'cw'), 1);
  assert.equal(rotateQuarterTurn(3, 'cw'), 0);
  assert.equal(rotateQuarterTurn(0, 'ccw'), 3);

  assert.deepEqual(normalizeStraightenAngle(0.6), { angle: 0, snappedToZero: true });
  assert.deepEqual(normalizeStraightenAngle(-0.9), { angle: 0, snappedToZero: true });
  assert.deepEqual(normalizeStraightenAngle(12.4), { angle: 12.5, snappedToZero: false });
  assert.deepEqual(normalizeStraightenAngle(60), { angle: 45, snappedToZero: false });

  const state = createInitialTransformState();
  assert.equal(hasPendingEdits(state), false);
  const rotated = { ...state, quarterTurns: 1 as const, straightenDeg: -5 };
  assert.equal(getTotalRotationDegrees(rotated), 85);
  assert.equal(hasPendingEdits(rotated), true);
});

test('crop aspect ratio fitting and bounds clamping preserve strict [0..1] geometry', () => {
  const squareRatio = getPresetTargetRatio('1:1', 'landscape', 4 / 3);
  assert.equal(squareRatio, 1);

  const squareOn4x3 = fitCropRectToAspect(1, 4 / 3);
  assert.ok(Math.abs(squareOn4x3.width - 0.75) < 0.001);
  assert.equal(squareOn4x3.height, 1);
  assert.ok(Math.abs(squareOn4x3.x - 0.125) < 0.001);

  const portrait43 = getPresetTargetRatio('4:3', 'portrait', 4 / 3);
  assert.ok(portrait43 && Math.abs(portrait43 - 0.75) < 0.001);

  const clamped = clampCropRect({ x: -0.2, y: 0.95, width: 0.02, height: 0.5 });
  assert.equal(clamped.x, 0);
  assert.ok(clamped.width >= 0.12);
  assert.ok(clamped.y + clamped.height <= 1.0001);
});

test('ZIP builder writes valid PKZIP signatures and IEEE CRC-32 checksum', () => {
  const bytes = new TextEncoder().encode('123456789');
  // Standard IEEE 802.3 CRC-32 check vector for "123456789" is 0xCBF43926
  assert.equal(crc32(bytes), 0xcbf43926);

  const archive = buildZipArchive([
    { path: 'Photos/settings.gradle.kts', content: 'rootProject.name = "Photos"\n' },
    { path: 'Photos/app/src/main/res/values/strings.xml', content: '<resources><string name="app_name">Photos</string></resources>' },
  ]);
  const view = new DataView(archive.buffer);
  // Local file header magic PK\x03\x04
  assert.equal(view.getUint32(0, true), 0x04034b50);
  // EOCD magic PK\x05\x06 at archive.length - 22
  assert.equal(view.getUint32(archive.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(archive.length - 12, true), 2);
});
