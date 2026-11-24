import { AndroidSourceFile } from '../types/media';
import { ANDROID_CORE_FILES } from './androidCoreFiles';
import { ANDROID_SCREEN_FILES } from './androidScreenFiles';

export const ANDROID_PROJECT_FILES: AndroidSourceFile[] = [
  ...ANDROID_CORE_FILES,
  ...ANDROID_SCREEN_FILES,
];
