// src/utils/compress.js
import * as ImageManipulator from 'expo-image-manipulator';

export const PRESETS = [
  {
    id: 'compact',
    label: 'Compact',
    tag: '~200 KB',
    sub: 'Email · WhatsApp',
    quality: 0.55,
    maxW: 1280,
    color: '#10B981',
    icon: '⬡',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    tag: '~500 KB',
    sub: 'Field Reports',
    quality: 0.72,
    maxW: 1920,
    color: '#3B82F6',
    icon: '⬡',
    default: true,
  },
  {
    id: 'detailed',
    label: 'Detailed',
    tag: '~1.5 MB',
    sub: 'Inspections',
    quality: 0.85,
    maxW: 2560,
    color: '#F59E0B',
    icon: '⬡',
  },
  {
    id: 'archival',
    label: 'Archival',
    tag: '~4 MB',
    sub: 'Legal · Archive',
    quality: 0.96,
    maxW: 4096,
    color: '#EF4444',
    icon: '⬡',
  },
];

export const DEFAULT_PRESET = PRESETS.find(p => p.default);

export async function compressImage(uri, preset) {
  const p = preset || DEFAULT_PRESET;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: p.maxW } }],
    { compress: p.quality, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result; // { uri, width, height }
}

// Convert file uri → base64 for PDF embedding
import * as FileSystem from 'expo-file-system';
export async function toBase64(uri) {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${b64}`;
}
