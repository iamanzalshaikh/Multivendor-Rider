import { requireOptionalNativeModule } from 'expo-modules-core';

import { dialog } from '@/lib/dialog';

type ImagePickerModule = typeof import('expo-image-picker');

function loadImagePicker(): ImagePickerModule | null {
  if (requireOptionalNativeModule('ExponentImagePicker') == null) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as ImagePickerModule;
  } catch {
    return null;
  }
}

function nativeUnavailableMessage() {
  dialog.alert(
    'Photo upload unavailable',
    'Rebuild the app to enable camera and gallery:\n\nnpx expo run:android\n\n(or use a dev client build after installing expo-image-picker)',
  );
}

export async function pickDocumentImage(label: string): Promise<string | null> {
  const ImagePicker = loadImagePicker();
  if (!ImagePicker) {
    nativeUnavailableMessage();
    return null;
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    dialog.alert('Permission needed', `Allow photo access to upload your ${label}.`);
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.5,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const uri = result.assets[0].uri;
  if (__DEV__) console.log('[pickDocumentImage] gallery', { label, uri: uri.slice(0, 100) });
  return uri;
}

export async function takeDocumentPhoto(label: string): Promise<string | null> {
  const ImagePicker = loadImagePicker();
  if (!ImagePicker) {
    nativeUnavailableMessage();
    return null;
  }

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    dialog.alert('Permission needed', `Allow camera access to capture your ${label}.`);
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.5,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const uri = result.assets[0].uri;
  if (__DEV__) console.log('[pickDocumentImage] camera', { label, uri: uri.slice(0, 100) });
  return uri;
}
