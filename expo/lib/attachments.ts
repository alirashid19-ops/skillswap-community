import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AssignmentAttachment } from '../types';

const MAX_BYTES = 4 * 1024 * 1024;

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Opens the photo library and returns a compressed image attachment, or null when cancelled. Throws Error('FILE_TOO_LARGE') above 4 MB. */
export async function pickImageAttachment(): Promise<AssignmentAttachment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) return null;
  const sizeBytes = Math.round((asset.base64.length * 3) / 4);
  if (sizeBytes > MAX_BYTES) throw new Error('FILE_TOO_LARGE');
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  return {
    id: generateId('att'),
    name: asset.fileName ?? `photo-${Date.now()}.${extension}`,
    kind: 'image',
    mimeType,
    sizeBytes,
    data: asset.base64,
  };
}

/** Writes the attachment into the app cache and opens the share sheet so the user can save it to Files / Photos. */
export async function downloadAttachment(att: AssignmentAttachment): Promise<void> {
  const safeName = att.name.replace(/[^\w.-]+/g, '_');
  const fileUri = `${FileSystem.cacheDirectory}${att.id}-${safeName}`;
  await FileSystem.writeAsStringAsync(fileUri, att.data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: att.mimeType });
  }
}
